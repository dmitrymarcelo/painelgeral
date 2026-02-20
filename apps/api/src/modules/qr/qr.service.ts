import { Injectable, NotFoundException } from '@nestjs/common';
import { ChecklistRunStatus, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QrService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(tenantId: string, code: string, roles: string[] = []) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        tenantId,
        OR: [{ qrCode: code }, { code }, { plate: code }],
      },
    });

    if (!asset) {
      throw new NotFoundException('QR/ativo não encontrado.');
    }

    const [workOrders, checklistRuns] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: {
          tenantId,
          assetId: asset.id,
          status: {
            in: [
              WorkOrderStatus.ABERTA,
              WorkOrderStatus.EM_ANDAMENTO,
              WorkOrderStatus.AGUARDANDO,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.checklistRun.findMany({
        where: {
          tenantId,
          assetId: asset.id,
          status: {
            in: [ChecklistRunStatus.PENDENTE, ChecklistRunStatus.EM_CURSO],
          },
        },
        include: { template: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const allowedActions: string[] = [];
    if (roles.includes('ADMIN') || roles.includes('GESTOR')) {
      allowedActions.push(
        'CREATE_WORK_ORDER',
        'SCHEDULE_MAINTENANCE',
        'ASSIGN_TECHNICIAN',
      );
    }
    if (
      roles.includes('ADMIN') ||
      roles.includes('GESTOR') ||
      roles.includes('TECNICO')
    ) {
      allowedActions.push('START_CHECKLIST', 'OPEN_ASSET_DETAILS');
    }

    return {
      asset,
      workOrders,
      checklistRuns,
      allowedActions,
    };
  }
}
