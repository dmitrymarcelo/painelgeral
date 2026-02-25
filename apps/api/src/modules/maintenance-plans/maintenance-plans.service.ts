import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AddMaintenanceRuleDto } from './dto/add-maintenance-rule.dto';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';

/**
 * RESPONSABILIDADE:
 * Regras de negocio de planos preventivos (cabecalho e regras de gatilho).
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Controller de planos delega create/update/addRule.
 * - Prisma persiste em `maintenancePlan` e `maintenanceRule`.
 * - Audit log registra alteracoes para trilha de aprovacao.
 *
 * CONTRATO BACKEND: a tela de cadastro de planos do frontend deve mapear:
 * `vehicleBindingContext/form` -> `maintenancePlan`
 * `triggerConfig/itens` -> regras e itens relacionados (expansao futura)
 */
@Injectable()
export class MaintenancePlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(tenantId: string) {
    // CONTRATO BACKEND: incluir `rules` e `asset` reduz round-trips no frontend de planejamento.
    return this.prisma.maintenancePlan.findMany({
      where: { tenantId },
      include: { rules: true, asset: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    userId: string | undefined,
    dto: CreateMaintenancePlanDto,
  ) {
    const plan = await this.prisma.maintenancePlan.create({
      data: {
        tenantId,
        assetId: dto.assetId,
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: { rules: true },
    });

    await this.auditLogsService.record({
      tenantId,
      userId,
      action: 'CREATE',
      resource: 'maintenance_plans',
      resourceId: plan.id,
      payload: dto,
    });

    return plan;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateMaintenancePlanDto,
  ) {
    await this.ensureExists(tenantId, id);

    const plan = await this.prisma.maintenancePlan.update({
      where: { id },
      data: dto,
      include: { rules: true },
    });

    await this.auditLogsService.record({
      tenantId,
      userId,
      action: 'UPDATE',
      resource: 'maintenance_plans',
      resourceId: id,
      payload: dto,
    });

    return plan;
  }

  async addRule(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: AddMaintenanceRuleDto,
  ) {
    // Regra de negocio: regras de gatilho sao adicionadas separadamente para permitir composicao.
    await this.ensureExists(tenantId, id);

    const rule = await this.prisma.maintenanceRule.create({
      data: {
        tenantId,
        planId: id,
        triggerType: dto.triggerType,
        intervalValue: dto.intervalValue,
        warningValue: dto.warningValue,
      },
    });

    await this.auditLogsService.record({
      tenantId,
      userId,
      action: 'ADD_RULE',
      resource: 'maintenance_plans',
      resourceId: id,
      payload: dto,
    });

    return rule;
  }

  private async ensureExists(tenantId: string, id: string) {
    const exists = await this.prisma.maintenancePlan.findFirst({
      where: { tenantId, id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Plano de manutencao nao encontrado.');
    }
  }
}

