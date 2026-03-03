import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QrService {
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
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');
    return tenant.id;
  }

  async resolve(tenantId: string, code: string, roles: string[] = []) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const asset = await this.prisma.asset.findFirst({
      where: {
        tenantId: tenantDbId,
        OR: [{ qrCode: code }, { code }, { plate: code }],
      },
    });

    if (!asset) {
      throw new NotFoundException('QR/ativo não encontrado.');
    }

    const [workOrders] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: {
          tenantId: tenantDbId,
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
    ]);

    const allowedActions: string[] = [];
    if (roles.includes('ADMIN') || roles.includes('GESTOR')) {
      allowedActions.push(
        'CREATE_WORK_ORDER',
        'SCHEDULE_MAINTENANCE',
        'ASSIGN_TECHNICIAN',
      );
    }
    allowedActions.push('OPEN_ASSET_DETAILS');

    return {
      asset,
      workOrders,
      checklistRuns: [],
      allowedActions,
    };
  }
}
