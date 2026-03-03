import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignWorkOrderDto } from './dto/assign-work-order.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrderQueryDto } from './dto/work-order-query.dto';

/**
 * RESPONSABILIDADE:
 * Regras de negocio de O.S. (create/update/assign/start/complete) com historico e notificacoes.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - `WorkOrdersController` expoe os endpoints.
 * - Prisma persiste em `workOrder`, `workOrderHistory`, `workOrderAssignment`.
 * - `NotificationsService` envia avisos de atribuicao.
 *
 * CONTRATO BACKEND: frontend espera O.S. com `asset`, `assignments.user`, `history` e
 * status consistentes com as transicoes validadas neste service.
 */
@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private toBigInt(
    v: string | number | bigint | null | undefined,
  ): bigint | null | undefined {
    if (v === null || v === undefined) return v as undefined;
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(v);
    const s = String(v).trim();
    if (/^\d+$/.test(s)) return BigInt(s);
    throw new BadRequestException('ID inválido');
  }

  private async resolveTenantId(tenantRef: string): Promise<bigint> {
    if (/^\d+$/.test(tenantRef)) {
      return BigInt(tenantRef);
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantRef },
      select: { id: true },
    });
    if (!tenant) {
      throw new BadRequestException('Tenant inválido');
    }
    return tenant.id;
  }

  async findAll(tenantId: string, query: WorkOrderQueryDto) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    return this.prisma.workOrder.findMany({
      where: {
        tenantId: tenantDbId,
        status: query.status,
        priority: query.priority,
        OR: query.search
          ? [
              { code: { contains: query.search } },
              { service: { contains: query.search } },
              {
                asset: {
                  model: { contains: query.search },
                },
              },
              {
                asset: {
                  plate: { contains: query.search },
                },
              },
            ]
          : undefined,
      },
      include: {
        asset: true,
        assignments: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    userId: string | undefined,
    dto: CreateWorkOrderDto,
  ) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const openedById =
      this.toBigInt(userId) ?? (await this.getSystemUserId(tenantDbId));

    const sequence = await this.prisma.workOrder.count({
      where: { tenantId: tenantDbId },
    });
    const code = `OS-${new Date().getFullYear()}-${String(sequence + 1).padStart(4, '0')}`;

    const workOrder = await this.prisma.workOrder.create({
      data: {
        tenantId: tenantDbId,
        code,
        assetId: this.toBigInt(dto.assetId)!,
        service: dto.service,
        description: dto.description,
        priority: dto.priority,
        status: dto.status ?? WorkOrderStatus.ABERTA,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        openedById,
      },
      include: { asset: true },
    });

    await this.prisma.workOrderHistory.create({
      data: {
        tenantId: tenantDbId,
        workOrderId: workOrder.id,
        toStatus: workOrder.status,
        note: 'Abertura da ordem',
        createdById: openedById,
      },
    });

    await this.auditLogsService.record({
      tenantId: tenantDbId,
      userId: openedById?.toString(),
      action: 'CREATE',
      resource: 'work_orders',
      resourceId: workOrder.id,
      payload: dto,
    });

    return workOrder;
  }

  async findOne(tenantId: string, id: string) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { tenantId: tenantDbId, id: this.toBigInt(id)! },
      include: {
        asset: true,
        tasks: true,
        assignments: { include: { user: true } },
        history: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!workOrder) {
      throw new NotFoundException('O.S. nao encontrada.');
    }

    return workOrder;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateWorkOrderDto,
  ) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const current = await this.findOne(tenantId, id);

    const updated = await this.prisma.workOrder.update({
      where: { id: this.toBigInt(id)! },
      data: {
        ...{
          service: dto.service,
          description: dto.description,
          priority: dto.priority,
          status: dto.status,
          assetId:
            dto.assetId !== undefined
              ? (this.toBigInt(dto.assetId) as bigint | undefined)
              : undefined,
        },
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });

    if (dto.status && dto.status !== current.status) {
      await this.prisma.workOrderHistory.create({
        data: {
          tenantId: tenantDbId,
          workOrderId: this.toBigInt(id)!,
          fromStatus: current.status,
          toStatus: dto.status,
          note: 'Mudanca de status manual',
          createdById: this.toBigInt(userId),
        },
      });
    }

    await this.auditLogsService.record({
      tenantId: tenantDbId,
      userId,
      action: 'UPDATE',
      resource: 'work_orders',
      resourceId: id,
      payload: dto,
    });

    return updated;
  }

  async assign(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: AssignWorkOrderDto,
  ) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    await this.findOne(tenantId, id);

    const assignment = await this.prisma.workOrderAssignment.upsert({
      where: {
        tenantId_workOrderId_userId: {
          tenantId: tenantDbId,
          workOrderId: this.toBigInt(id)!,
          userId: this.toBigInt(dto.userId)!,
        },
      },
      update: {},
      create: {
        tenantId: tenantDbId,
        workOrderId: this.toBigInt(id)!,
        userId: this.toBigInt(dto.userId)!,
      },
      include: { user: true },
    });

    // CONTRATO BACKEND: notificacao deve carregar referencia da O.S. para deep-link no frontend.
    await this.notificationsService.create({
      tenantId: tenantDbId.toString(),
      userId: dto.userId,
      title: 'Nova O.S. atribuida',
      body: `Voce recebeu a ordem ${id}.`,
    });

    await this.auditLogsService.record({
      tenantId: tenantDbId,
      userId,
      action: 'ASSIGN',
      resource: 'work_orders',
      resourceId: id,
      payload: dto,
    });

    return assignment;
  }

  async start(tenantId: string, userId: string | undefined, id: string) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const current = await this.findOne(tenantId, id);
    // Regra de negocio: apenas O.S. abertas/aguardando podem iniciar execucao.
    if (
      current.status !== WorkOrderStatus.ABERTA &&
      current.status !== WorkOrderStatus.AGUARDANDO
    ) {
      throw new BadRequestException('Transicao invalida para iniciar O.S.');
    }

    const updated = await this.prisma.workOrder.update({
      where: { id: this.toBigInt(id)! },
      data: {
        status: WorkOrderStatus.EM_ANDAMENTO,
        startedAt: new Date(),
      },
    });

    await this.prisma.workOrderHistory.create({
      data: {
        tenantId: tenantDbId,
        workOrderId: this.toBigInt(id)!,
        fromStatus: current.status,
        toStatus: WorkOrderStatus.EM_ANDAMENTO,
        note: 'Inicio da execucao',
        createdById: this.toBigInt(userId),
      },
    });

    return updated;
  }

  private async getSystemUserId(tenantId: bigint) {
    // Regra de negocio: fallback para abertura automatica quando nenhuma sessao de usuario e enviada.
    const user = await this.prisma.user.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException(
        'Nenhum usuario ativo encontrado para o tenant.',
      );
    }

    return user.id;
  }

  async complete(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: CompleteWorkOrderDto,
  ) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const current = await this.findOne(tenantId, id);
    // Regra de negocio: conclusao exige O.S. em andamento para preservar trilha de status.

    if (current.status !== WorkOrderStatus.EM_ANDAMENTO) {
      throw new BadRequestException(
        'Somente O.S. em andamento pode ser concluida.',
      );
    }

    const updated = await this.prisma.workOrder.update({
      where: { id: this.toBigInt(id)! },
      data: {
        status: WorkOrderStatus.CONCLUIDA,
        completedAt: new Date(),
      },
    });

    await this.prisma.workOrderHistory.create({
      data: {
        tenantId: tenantDbId,
        workOrderId: this.toBigInt(id)!,
        fromStatus: current.status,
        toStatus: WorkOrderStatus.CONCLUIDA,
        note: dto.note ?? 'Concluida',
        createdById: this.toBigInt(userId),
      },
    });

    await this.auditLogsService.record({
      tenantId: tenantDbId,
      userId,
      action: 'COMPLETE',
      resource: 'work_orders',
      resourceId: id,
      payload: dto,
    });

    return updated;
  }
}
