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

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(tenantId: string, query: WorkOrderQueryDto) {
    return this.prisma.workOrder.findMany({
      where: {
        tenantId,
        status: query.status,
        priority: query.priority,
        OR: query.search
          ? [
              { code: { contains: query.search, mode: 'insensitive' } },
              { service: { contains: query.search, mode: 'insensitive' } },
              {
                asset: {
                  model: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                asset: {
                  plate: { contains: query.search, mode: 'insensitive' },
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
    const openedById = userId ?? (await this.getSystemUserId(tenantId));

    const sequence = await this.prisma.workOrder.count({ where: { tenantId } });
    const code = `OS-${new Date().getFullYear()}-${String(sequence + 1).padStart(4, '0')}`;

    const workOrder = await this.prisma.workOrder.create({
      data: {
        tenantId,
        code,
        assetId: dto.assetId,
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
        tenantId,
        workOrderId: workOrder.id,
        toStatus: workOrder.status,
        note: 'Abertura da ordem',
        createdById: openedById,
      },
    });

    await this.auditLogsService.record({
      tenantId,
      userId: openedById,
      action: 'CREATE',
      resource: 'work_orders',
      resourceId: workOrder.id,
      payload: dto,
    });

    return workOrder;
  }

  async findOne(tenantId: string, id: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { tenantId, id },
      include: {
        asset: true,
        tasks: true,
        assignments: { include: { user: true } },
        history: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!workOrder) {
      throw new NotFoundException('O.S. não encontrada.');
    }

    return workOrder;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateWorkOrderDto,
  ) {
    const current = await this.findOne(tenantId, id);

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        ...dto,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });

    if (dto.status && dto.status !== current.status) {
      await this.prisma.workOrderHistory.create({
        data: {
          tenantId,
          workOrderId: id,
          fromStatus: current.status,
          toStatus: dto.status,
          note: 'Mudança de status manual',
          createdById: userId,
        },
      });
    }

    await this.auditLogsService.record({
      tenantId,
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
    await this.findOne(tenantId, id);

    const assignment = await this.prisma.workOrderAssignment.upsert({
      where: {
        tenantId_workOrderId_userId: {
          tenantId,
          workOrderId: id,
          userId: dto.userId,
        },
      },
      update: {},
      create: {
        tenantId,
        workOrderId: id,
        userId: dto.userId,
      },
      include: { user: true },
    });

    await this.notificationsService.create({
      tenantId,
      userId: dto.userId,
      title: 'Nova O.S. atribuída',
      body: `Você recebeu a ordem ${id}.`,
    });

    await this.auditLogsService.record({
      tenantId,
      userId,
      action: 'ASSIGN',
      resource: 'work_orders',
      resourceId: id,
      payload: dto,
    });

    return assignment;
  }

  async start(tenantId: string, userId: string | undefined, id: string) {
    const current = await this.findOne(tenantId, id);
    if (
      current.status !== WorkOrderStatus.ABERTA &&
      current.status !== WorkOrderStatus.AGUARDANDO
    ) {
      throw new BadRequestException('Transição inválida para iniciar O.S.');
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: WorkOrderStatus.EM_ANDAMENTO,
        startedAt: new Date(),
      },
    });

    await this.prisma.workOrderHistory.create({
      data: {
        tenantId,
        workOrderId: id,
        fromStatus: current.status,
        toStatus: WorkOrderStatus.EM_ANDAMENTO,
        note: 'Início da execução',
        createdById: userId,
      },
    });

    return updated;
  }

  private async getSystemUserId(tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException(
        'Nenhum usu??rio ativo encontrado para o tenant.',
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
    const current = await this.findOne(tenantId, id);

    if (current.status !== WorkOrderStatus.EM_ANDAMENTO) {
      throw new BadRequestException(
        'Somente O.S. em andamento pode ser concluída.',
      );
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: WorkOrderStatus.CONCLUIDA,
        completedAt: new Date(),
      },
    });

    await this.prisma.workOrderHistory.create({
      data: {
        tenantId,
        workOrderId: id,
        fromStatus: current.status,
        toStatus: WorkOrderStatus.CONCLUIDA,
        note: dto.note ?? 'Concluída',
        createdById: userId,
      },
    });

    await this.auditLogsService.record({
      tenantId,
      userId,
      action: 'COMPLETE',
      resource: 'work_orders',
      resourceId: id,
      payload: dto,
    });

    return updated;
  }
}
