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

  async findAll(tenantId: string) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    return this.prisma.maintenancePlan.findMany({
      where: { tenantId: tenantDbId },
      include: { rules: true, asset: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    userId: string | undefined,
    dto: CreateMaintenancePlanDto,
  ) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const plan = await this.prisma.maintenancePlan.create({
      data: {
        tenantId: tenantDbId,
        assetId: this.toBigInt(dto.assetId)!,
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: { rules: true },
    });

    await this.auditLogsService.record({
      tenantId: tenantDbId,
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
      where: { id: this.toBigInt(id)! },
      data: {
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive,
        assetId:
          dto.assetId !== undefined
            ? (this.toBigInt(dto.assetId) as bigint | undefined)
            : undefined,
      },
      include: { rules: true },
    });

    await this.auditLogsService.record({
      tenantId: await this.resolveTenantId(tenantId),
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
        tenantId: await this.resolveTenantId(tenantId),
        planId: this.toBigInt(id)!,
        triggerType: dto.triggerType,
        intervalValue: dto.intervalValue,
        warningValue: dto.warningValue,
      },
    });

    await this.auditLogsService.record({
      tenantId: await this.resolveTenantId(tenantId),
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
      where: {
        tenantId: await this.resolveTenantId(tenantId),
        id: this.toBigInt(id)!,
      },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Plano de manutencao nao encontrado.');
    }
  }
}
