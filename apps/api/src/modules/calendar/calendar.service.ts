import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';

/**
 * RESPONSABILIDADE:
 * Regras de negocio de eventos do calendario (listar, criar, atualizar e remover).
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - `CalendarController` delega requests HTTP para este service.
 * - Prisma persiste em `calendarEvent`.
 * - `AuditLogsService` registra rastreabilidade de alteracoes.
 *
 * CONTRATO BACKEND: datas chegam como ISO string (`startAt`, `endAt`) e a resposta deve
 * retornar o evento persistido com IDs relacionados (ativo/OS) quando existirem.
 */
@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

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

  async findAll(tenantId: string, query: CalendarQueryDto) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    return this.prisma.calendarEvent.findMany({
      where: {
        tenantId: tenantDbId,
        type: query.type,
        status: query.status,
        assetId: this.toBigInt(query.assetId),
        startAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async create(
    tenantId: string,
    userId: string | undefined,
    dto: CreateCalendarEventDto,
  ) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const event = await this.prisma.calendarEvent.create({
      data: {
        tenantId: tenantDbId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        assetId: this.toBigInt(dto.assetId),
        workOrderId: this.toBigInt(dto.workOrderId),
      },
    });

    await this.auditLogsService.record({
      tenantId: tenantDbId,
      userId,
      action: 'CREATE',
      resource: 'calendar_events',
      resourceId: event.id,
      payload: dto,
    });

    return event;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateCalendarEventDto,
  ) {
    await this.ensureExists(tenantId, id);

    const event = await this.prisma.calendarEvent.update({
      where: { id: this.toBigInt(id)! },
      data: {
        ...{
          title: dto.title,
          description: dto.description,
          type: dto.type,
          status: dto.status,
          assetId:
            dto.assetId !== undefined
              ? (this.toBigInt(dto.assetId) as bigint | undefined)
              : undefined,
          workOrderId:
            dto.workOrderId !== undefined
              ? (this.toBigInt(dto.workOrderId) as bigint | undefined)
              : undefined,
        },
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
    });

    await this.auditLogsService.record({
      tenantId: await this.resolveTenantId(tenantId),
      userId,
      action: 'UPDATE',
      resource: 'calendar_events',
      resourceId: id,
      payload: dto,
    });

    return event;
  }

  async remove(tenantId: string, userId: string | undefined, id: string) {
    await this.ensureExists(tenantId, id);
    await this.prisma.calendarEvent.delete({
      where: { id: this.toBigInt(id)! },
    });

    await this.auditLogsService.record({
      tenantId: await this.resolveTenantId(tenantId),
      userId,
      action: 'DELETE',
      resource: 'calendar_events',
      resourceId: id,
    });

    return { success: true };
  }

  private async ensureExists(tenantId: string, id: string) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const exists = await this.prisma.calendarEvent.findFirst({
      where: { tenantId: tenantDbId, id: this.toBigInt(id)! },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Evento nao encontrado.');
    }
  }
}
