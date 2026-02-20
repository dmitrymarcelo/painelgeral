import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChecklistRunStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AddChecklistAttachmentDto } from './dto/add-checklist-attachment.dto';
import { AddChecklistSignatureDto } from './dto/add-checklist-signature.dto';
import { ChecklistTaskQueryDto } from './dto/checklist-task-query.dto';
import { CreateChecklistRunDto } from './dto/create-checklist-run.dto';
import { CreateChecklistTemplateDto } from './dto/create-checklist-template.dto';
import { SubmitChecklistRunDto } from './dto/submit-checklist-run.dto';
import { UpdateChecklistProgressDto } from './dto/update-checklist-progress.dto';

@Injectable()
export class ChecklistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async listTemplates(tenantId: string) {
    return this.prisma.checklistTemplate.findMany({
      where: { tenantId, isActive: true },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTemplate(
    tenantId: string,
    userId: string | undefined,
    dto: CreateChecklistTemplateDto,
  ) {
    if (dto.items.length === 0) {
      throw new BadRequestException('Template precisa de ao menos 1 item.');
    }

    const template = await this.prisma.checklistTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        items: {
          create: dto.items.map((item, index) => ({
            tenantId,
            label: item.label,
            itemType: item.itemType ?? 'BOOLEAN',
            required: item.required ?? true,
            sortOrder: index,
          })),
        },
      },
      include: { items: true },
    });

    await this.auditLogsService.record({
      tenantId,
      userId,
      action: 'CREATE_TEMPLATE',
      resource: 'checklists',
      resourceId: template.id,
      payload: dto,
    });

    return template;
  }

  async listTasks(
    tenantId: string,
    userId: string | undefined,
    query: ChecklistTaskQueryDto,
  ) {
    return this.prisma.checklistRun.findMany({
      where: {
        tenantId,
        assignedToId: userId,
        status: query.status as ChecklistRunStatus | undefined,
      },
      include: {
        template: true,
        asset: true,
        workOrder: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRun(
    tenantId: string,
    userId: string | undefined,
    dto: CreateChecklistRunDto,
  ) {
    const idempotencyKey =
      dto.idempotencyKey ??
      (dto.checklistId && dto.completedAt
        ? `${dto.checklistId}:${dto.completedAt}`
        : undefined);

    if (idempotencyKey) {
      const existing = await this.prisma.checklistRun.findFirst({
        where: {
          tenantId,
          idempotencyKey,
        },
      });

      if (existing) {
        return existing;
      }
    }

    const templateId = await this.ensureTemplateId(tenantId, dto);
    const assetId = await this.resolveAssetId(tenantId, dto);
    const assignedToId =
      dto.assignedToId ??
      userId ??
      (dto.technician
        ? await this.resolveUserIdByName(tenantId, dto.technician)
        : undefined);
    const completedAt = dto.completedAt ? new Date(dto.completedAt) : null;
    const status = completedAt
      ? ChecklistRunStatus.CONCLUIDO
      : ChecklistRunStatus.PENDENTE;

    const run = await this.prisma.checklistRun.create({
      data: {
        tenantId,
        templateId,
        assetId,
        workOrderId: dto.workOrderId,
        assignedToId,
        idempotencyKey,
        status,
        completedAt,
      },
    });

    await this.auditLogsService.record({
      tenantId,
      userId,
      action: 'CREATE_RUN',
      resource: 'checklists',
      resourceId: run.id,
      payload: dto,
    });

    return run;
  }

  async listRuns(tenantId: string) {
    const runs = await this.prisma.checklistRun.findMany({
      where: { tenantId },
      include: {
        asset: true,
        template: true,
        assignedTo: true,
        answers: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return runs.map((run) => ({
      id: run.id,
      checklistId: run.templateId,
      asset: run.asset?.model ?? 'Ativo nÃ£o identificado',
      type: run.template.name,
      reference: run.asset?.plate ?? run.asset?.code ?? '-',
      technician: run.assignedTo?.name ?? 'NÃ£o informado',
      completedItems: run.answers.length,
      totalItems: run.answers.length,
      notes: '',
      completedAt: run.completedAt ?? run.createdAt,
      status:
        run.status === ChecklistRunStatus.CONCLUIDO ? 'synced' : 'pending',
    }));
  }

  async updateProgress(
    tenantId: string,
    userId: string | undefined,
    runId: string,
    dto: UpdateChecklistProgressDto,
  ) {
    const run = await this.ensureRun(tenantId, runId);

    await this.prisma.$transaction(async (tx) => {
      for (const answer of dto.answers) {
        await tx.checklistAnswer.upsert({
          where: {
            tenantId_runId_templateItemId: {
              tenantId,
              runId,
              templateItemId: answer.templateItemId,
            },
          },
          update: {
            value: answer.value,
            note: answer.note,
          },
          create: {
            tenantId,
            runId,
            templateItemId: answer.templateItemId,
            value: answer.value,
            note: answer.note,
          },
        });
      }

      await tx.checklistRun.update({
        where: { id: run.id },
        data: {
          status: ChecklistRunStatus.EM_CURSO,
          startedAt: run.startedAt ?? new Date(),
        },
      });
    });

    return this.prisma.checklistRun.findFirst({
      where: { tenantId, id: runId },
      include: { answers: true },
    });
  }

  async submitRun(
    tenantId: string,
    userId: string | undefined,
    runId: string,
    dto: SubmitChecklistRunDto,
  ) {
    const run = await this.ensureRun(tenantId, runId);

    const updated = await this.prisma.checklistRun.update({
      where: { id: run.id },
      data: {
        status: ChecklistRunStatus.CONCLUIDO,
        completedAt: new Date(),
      },
      include: { answers: true, attachments: true, signatures: true },
    });

    await this.auditLogsService.record({
      tenantId,
      userId,
      action: 'SUBMIT_RUN',
      resource: 'checklists',
      resourceId: runId,
      payload: dto,
    });

    return updated;
  }

  async addAttachment(
    tenantId: string,
    userId: string | undefined,
    runId: string,
    dto: AddChecklistAttachmentDto,
  ) {
    await this.ensureRun(tenantId, runId);

    const attachment = await this.prisma.checklistAttachment.create({
      data: {
        tenantId,
        runId,
        url: dto.url,
        mimeType: dto.mimeType,
        size: dto.size,
        note: dto.note,
      },
    });

    await this.auditLogsService.record({
      tenantId,
      userId,
      action: 'ADD_ATTACHMENT',
      resource: 'checklists',
      resourceId: runId,
      payload: dto,
    });

    return attachment;
  }

  async addSignature(
    tenantId: string,
    userId: string | undefined,
    runId: string,
    dto: AddChecklistSignatureDto,
  ) {
    await this.ensureRun(tenantId, runId);

    const signature = await this.prisma.checklistSignature.create({
      data: {
        tenantId,
        runId,
        signedById: dto.signedById ?? userId,
        signerName: dto.signerName,
        dataUrl: dto.dataUrl,
      },
    });

    await this.auditLogsService.record({
      tenantId,
      userId,
      action: 'ADD_SIGNATURE',
      resource: 'checklists',
      resourceId: runId,
      payload: { signerName: dto.signerName },
    });

    return signature;
  }

  private async ensureRun(tenantId: string, runId: string) {
    const run = await this.prisma.checklistRun.findFirst({
      where: { tenantId, id: runId },
    });

    if (!run) {
      throw new NotFoundException('Execução de checklist não encontrada.');
    }

    return run;
  }

  private async ensureTemplateId(tenantId: string, dto: CreateChecklistRunDto) {
    if (dto.templateId) {
      return dto.templateId;
    }

    const templateName =
      dto.type ?? dto.checklistId ?? 'Checklist Preventivo de Campo';

    const existing = await this.prisma.checklistTemplate.findFirst({
      where: { tenantId, name: templateName },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const created = await this.prisma.checklistTemplate.create({
      data: {
        tenantId,
        name: templateName,
        description: 'Template criado automaticamente a partir do app mÃ³vel.',
        items: {
          create: [
            {
              tenantId,
              label: 'Registro operacional',
              itemType: 'BOOLEAN',
              required: false,
              sortOrder: 0,
            },
          ],
        },
      },
      select: { id: true },
    });

    return created.id;
  }

  private async resolveAssetId(tenantId: string, dto: CreateChecklistRunDto) {
    if (dto.assetId) {
      return dto.assetId;
    }

    if (!dto.asset) {
      return undefined;
    }

    const asset = await this.prisma.asset.findFirst({
      where: {
        tenantId,
        OR: [
          { model: { contains: dto.asset, mode: 'insensitive' } },
          { code: { contains: dto.asset, mode: 'insensitive' } },
          { plate: { contains: dto.asset, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    return asset?.id;
  }

  private async resolveUserIdByName(tenantId: string, technicianName: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        name: { contains: technicianName, mode: 'insensitive' },
      },
      select: { id: true },
    });

    return user?.id;
  }
}
