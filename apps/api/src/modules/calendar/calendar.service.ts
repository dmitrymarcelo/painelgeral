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

  async findAll(tenantId: string, query: CalendarQueryDto) {
    // Regra de negocio: filtro por janela temporal suporta as visoes mensal/semanal do frontend.
    return this.prisma.calendarEvent.findMany({
      where: {
        tenantId,
        type: query.type,
        status: query.status,
        assetId: query.assetId,
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
    // CONTRATO BACKEND: converte datas ISO em `Date` no service para manter controller enxuto.
    const event = await this.prisma.calendarEvent.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        assetId: dto.assetId,
        workOrderId: dto.workOrderId,
      },
    });

    await this.auditLogsService.record({
      tenantId,
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
      where: { id },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
    });

    await this.auditLogsService.record({
      tenantId,
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
    await this.prisma.calendarEvent.delete({ where: { id } });

    await this.auditLogsService.record({
      tenantId,
      userId,
      action: 'DELETE',
      resource: 'calendar_events',
      resourceId: id,
    });

    return { success: true };
  }

  private async ensureExists(tenantId: string, id: string) {
    const exists = await this.prisma.calendarEvent.findFirst({
      where: { tenantId, id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Evento nao encontrado.');
    }
  }
}

