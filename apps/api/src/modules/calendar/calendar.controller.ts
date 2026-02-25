/**
 * RESPONSABILIDADE:
 * Endpoints de agenda/calendario de manutencao preventiva.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - `CalendarService` persiste eventos e trilha de auditoria.
 * - Frontend de calendario, notificacoes e OS depende deste contrato.
 *
 * CONTRATO BACKEND:
 * - `GET /calendar/events` com filtros por periodo/status/ativo
 * - `POST/PATCH/DELETE /calendar/events` para ciclo de agendamento
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/interfaces/request-context.interface';
import { getTenantId } from '../../common/utils/tenant.util';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { CalendarService } from './calendar.service';

@Controller('calendar/events')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  findAll(@Req() request: Request, @Query() query: CalendarQueryDto) {
    // CONTRATO BACKEND: retorno deve atender calendario, notificacoes e derivacao de OS.
    return this.calendarService.findAll(getTenantId(request), query);
  }

  @Post()
  @Roles('ADMIN', 'GESTOR')
  create(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: CreateCalendarEventDto,
  ) {
    return this.calendarService.create(getTenantId(request), user?.sub, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GESTOR')
  update(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendarService.update(
      getTenantId(request),
      user?.sub,
      id,
      dto,
    );
  }

  @Delete(':id')
  @Roles('ADMIN', 'GESTOR')
  remove(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
  ) {
    return this.calendarService.remove(getTenantId(request), user?.sub, id);
  }
}
