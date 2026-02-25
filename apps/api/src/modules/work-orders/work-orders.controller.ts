/**
 * RESPONSABILIDADE:
 * Endpoints de Ordens de Servico (OS): ciclo completo de abertura, atribuicao, inicio e conclusao.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - `WorkOrdersService` aplica transicoes de status e notificacoes.
 * - Calendario/gestao de manutencao podem derivar ou vincular eventos a O.S.
 *
 * CONTRATO BACKEND:
 * - `GET /work-orders` com filtros de busca/status/prioridade
 * - `POST /work-orders` cria O.S.
 * - `POST /work-orders/:id/assign|start|complete` executa transicoes controladas
 */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/interfaces/request-context.interface';
import { getTenantId } from '../../common/utils/tenant.util';
import { AssignWorkOrderDto } from './dto/assign-work-order.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrderQueryDto } from './dto/work-order-query.dto';
import { WorkOrdersService } from './work-orders.service';

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  @Public()
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  findAll(@Req() request: Request, @Query() query: WorkOrderQueryDto) {
    // CONTRATO BACKEND: retorno deve incluir `asset` e `assignments.user`.
    return this.workOrdersService.findAll(getTenantId(request), query);
  }

  @Post()
  @Public()
  @Roles('ADMIN', 'GESTOR')
  create(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: CreateWorkOrderDto,
  ) {
    return this.workOrdersService.create(getTenantId(request), user?.sub, dto);
  }

  @Get(':id')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  findOne(@Req() request: Request, @Param('id') id: string) {
    return this.workOrdersService.findOne(getTenantId(request), id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GESTOR')
  update(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.workOrdersService.update(
      getTenantId(request),
      user?.sub,
      id,
      dto,
    );
  }

  @Post(':id/assign')
  @Roles('ADMIN', 'GESTOR')
  assign(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() dto: AssignWorkOrderDto,
  ) {
    return this.workOrdersService.assign(
      getTenantId(request),
      user?.sub,
      id,
      dto,
    );
  }

  @Post(':id/start')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  start(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
  ) {
    return this.workOrdersService.start(getTenantId(request), user?.sub, id);
  }

  @Post(':id/complete')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  complete(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() dto: CompleteWorkOrderDto,
  ) {
    return this.workOrdersService.complete(
      getTenantId(request),
      user?.sub,
      id,
      dto,
    );
  }
}
