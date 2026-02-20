import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TelemetryBackfillDto } from './dto/telemetry-backfill.dto';
import { TelemetryWebhookDto } from './dto/telemetry-webhook.dto';

@Injectable()
export class TelemetryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async webhook(
    tenantId: string,
    provider: string,
    payload: TelemetryWebhookDto,
  ) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        tenantId,
        OR: [
          { code: payload.assetCode },
          { plate: payload.assetCode },
          { qrCode: payload.assetCode },
        ],
      },
    });

    if (!asset) {
      throw new NotFoundException('Ativo não encontrado para telemetria.');
    }

    const externalEventId =
      payload.eventId ??
      `${provider}-${payload.assetCode}-${payload.timestamp}`;

    try {
      await this.prisma.telematicsReading.create({
        data: {
          tenantId,
          assetId: asset.id,
          provider,
          externalEventId,
          odometerKm: payload.odometerKm,
          engineHours: payload.engineHours,
          recordedAt: new Date(payload.timestamp),
          rawPayload: payload.rawPayload as Prisma.InputJsonValue | undefined,
        },
      });
    } catch {
      return { duplicated: true, externalEventId };
    }

    await this.prisma.asset.update({
      where: { id: asset.id },
      data: {
        odometerKm: payload.odometerKm ?? asset.odometerKm,
        engineHours: payload.engineHours ?? asset.engineHours,
        telemetryLastAt: new Date(payload.timestamp),
      },
    });

    await this.prisma.telemetrySync.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
      update: {
        totalEvents: { increment: 1 },
        lastWebhookAt: new Date(),
      },
      create: {
        tenantId,
        provider,
        totalEvents: 1,
        lastWebhookAt: new Date(),
      },
    });

    await this.triggerPreventiveAlerts(tenantId, asset.id);

    return {
      success: true,
      assetId: asset.id,
      externalEventId,
    };
  }

  async syncStatus(tenantId: string) {
    return this.prisma.telemetrySync.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async backfill(
    tenantId: string,
    provider: string,
    dto: TelemetryBackfillDto,
  ) {
    await this.prisma.telemetrySync.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
      update: {
        lastBackfillAt: new Date(),
      },
      create: {
        tenantId,
        provider,
        totalEvents: 0,
        lastBackfillAt: new Date(),
      },
    });

    return {
      queued: true,
      provider,
      from: dto.from,
      to: dto.to,
      assetCode: dto.assetCode,
    };
  }

  private async triggerPreventiveAlerts(tenantId: string, assetId: string) {
    const plans = await this.prisma.maintenancePlan.findMany({
      where: { tenantId, assetId, isActive: true },
      include: { rules: true, asset: true },
    });

    for (const plan of plans) {
      for (const rule of plan.rules) {
        let currentValue: number | null = null;

        if (rule.triggerType === 'KM') {
          currentValue = plan.asset.odometerKm ?? null;
        }

        if (rule.triggerType === 'HORAS') {
          currentValue = plan.asset.engineHours ?? null;
        }

        if (rule.triggerType === 'DATA') {
          continue;
        }

        if (currentValue === null || rule.nextValue === null) {
          continue;
        }

        const exceeded = currentValue >= rule.nextValue;
        const inWarning =
          !exceeded &&
          typeof rule.warningValue === 'number' &&
          currentValue >= rule.nextValue - rule.warningValue;

        if (!exceeded && !inWarning) {
          continue;
        }

        const targetUsers = await this.prisma.user.findMany({
          where: {
            tenantId,
            isActive: true,
            userRoles: {
              some: {
                role: {
                  code: {
                    in: ['ADMIN', 'GESTOR'],
                  },
                },
              },
            },
          },
          select: { id: true },
        });

        for (const user of targetUsers) {
          await this.notificationsService.create({
            tenantId,
            userId: user.id,
            title: exceeded
              ? 'Preventiva vencida'
              : 'Preventiva próxima do vencimento',
            body: `${plan.title} para ${plan.asset.model} (${plan.asset.code})`,
          });
        }
      }
    }
  }
}
