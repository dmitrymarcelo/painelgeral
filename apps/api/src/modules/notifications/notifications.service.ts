import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(
    v: string | number | bigint | null | undefined,
  ): bigint | null | undefined {
    if (v === null || v === undefined) return v as undefined;
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(v);
    const s = String(v).trim();
    if (/^\d+$/.test(s)) return BigInt(s);
    return undefined;
  }

  private async resolveTenantId(tenantRef: string): Promise<bigint> {
    if (/^\d+$/.test(tenantRef)) return BigInt(tenantRef);
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantRef },
      select: { id: true },
    });
    if (!tenant) throw new Error('Tenant inválido');
    return tenant.id;
  }

  async list(tenantId: string, userId: string) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    return this.prisma.notification.findMany({
      where: { tenantId: tenantDbId, userId: this.toBigInt(userId)! },
      orderBy: { createdAt: 'desc' },
      include: { deliveries: true },
      take: 100,
    });
  }

  async markRead(tenantId: string, notificationId: string, isRead: boolean) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const notification = await this.prisma.notification.findFirst({
      where: { id: this.toBigInt(notificationId)!, tenantId: tenantDbId },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada.');
    }

    return this.prisma.notification.update({
      where: { id: this.toBigInt(notificationId)! },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
    });
  }

  async create(input: {
    tenantId: string | bigint;
    userId: string | bigint;
    title: string;
    body: string;
    channels?: NotificationChannel[];
  }) {
    const channels = input.channels?.length
      ? input.channels
      : [
          NotificationChannel.IN_APP,
          NotificationChannel.PUSH,
          NotificationChannel.EMAIL,
        ];

    const tenantDbId = await this.resolveTenantId(String(input.tenantId));
    return this.prisma.notification.create({
      data: {
        tenantId: tenantDbId,
        userId: this.toBigInt(input.userId)!,
        title: input.title,
        body: input.body,
        deliveries: {
          create: channels.map((channel) => ({
            tenantId: tenantDbId,
            channel,
            status: 'PENDING',
          })),
        },
      },
      include: { deliveries: true },
    });
  }
}
