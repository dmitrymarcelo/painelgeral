import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus, AssetType, ImportStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AssetQueryDto } from './dto/asset-query.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { ImportAssetsCsvDto } from './dto/import-assets-csv.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(tenantId: string, query: AssetQueryDto) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    return this.prisma.asset.findMany({
      where: {
        tenantId: tenantDbId,
        type: query.type,
        status: query.status,
        OR: query.search
          ? [
              { code: { contains: query.search, mode: 'insensitive' } },
              { plate: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
              { manufacturer: { contains: query.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    userId: string | undefined,
    dto: CreateAssetDto,
  ) {
    const tenantDbId = await this.resolveTenantId(tenantId);

    const asset = await this.prisma.asset.create({
      data: {
        tenantId: tenantDbId,
        code: dto.code,
        plate: dto.plate,
        type: dto.type,
        model: dto.model,
        manufacturer: dto.manufacturer,
        status: dto.status ?? AssetStatus.DISPONIVEL,
        odometerKm: dto.odometerKm,
        engineHours: dto.engineHours,
        locationName: dto.locationName,
        qrCode: dto.qrCode,
      },
    });

    await this.prisma.assetStatusHistory.create({
      data: {
        tenantId: tenantDbId,
        assetId: asset.id,
        status: asset.status,
        reason: 'Cadastro inicial',
        changedById: userId,
      },
    });

    await this.auditLogsService.record({
      tenantId: tenantDbId,
      userId,
      action: 'CREATE',
      resource: 'assets',
      resourceId: asset.id,
      payload: dto,
    });

    return asset;
  }

  async findOne(tenantId: string, id: string) {
    const tenantDbId = await this.resolveTenantId(tenantId);

    const asset = await this.prisma.asset.findFirst({
      where: { tenantId: tenantDbId, id },
    });

    if (!asset) {
      throw new NotFoundException('Ativo não encontrado.');
    }

    return asset;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateAssetDto,
  ) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const current = await this.findOne(tenantDbId, id);

    const updated = await this.prisma.asset.update({
      where: { id },
      data: dto,
    });

    if (dto.status && dto.status !== current.status) {
      await this.prisma.assetStatusHistory.create({
        data: {
          tenantId: tenantDbId,
          assetId: id,
          status: dto.status,
          reason: 'Atualização de ativo',
          changedById: userId,
        },
      });
    }

    await this.auditLogsService.record({
      tenantId: tenantDbId,
      userId,
      action: 'UPDATE',
      resource: 'assets',
      resourceId: id,
      payload: dto,
    });

    return updated;
  }

  async history(tenantId: string, id: string) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    await this.findOne(tenantDbId, id);

    return this.prisma.assetStatusHistory.findMany({
      where: { tenantId: tenantDbId, assetId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async importCsv(
    tenantId: string,
    userId: string | undefined,
    dto: ImportAssetsCsvDto,
  ) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const delimiter = dto.delimiter ?? ';';
    const rows = dto.csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length < 2) {
      throw new BadRequestException('CSV sem conteúdo válido.');
    }

    const header = rows[0]
      .split(delimiter)
      .map((part) => part.trim().toLowerCase());

    const requiredFields = ['code', 'type', 'model'];
    for (const field of requiredFields) {
      if (!header.includes(field)) {
        throw new BadRequestException(
          `Campo obrigatório ausente no CSV: ${field}`,
        );
      }
    }

    const importJob = await this.prisma.importJob.create({
      data: {
        tenantId: tenantDbId,
        resource: 'assets',
        status: ImportStatus.PROCESSANDO,
        totalRows: rows.length - 1,
        createdById: userId,
      },
    });

    let successRows = 0;
    let errorRows = 0;

    for (let i = 1; i < rows.length; i += 1) {
      const values = rows[i].split(delimiter).map((part) => part.trim());
      const payload: Record<string, string> = {};
      header.forEach((column, index) => {
        payload[column] = values[index] ?? '';
      });

      const importRow = await this.prisma.importRow.create({
        data: {
          tenantId: tenantDbId,
          importJobId: importJob.id,
          rowNumber: i,
          payload,
          status: ImportStatus.PENDENTE,
        },
      });

      try {
        const type = payload.type as AssetType;
        if (!Object.values(AssetType).includes(type)) {
          throw new Error(`Tipo de ativo inválido: ${payload.type}`);
        }

        await this.prisma.asset.upsert({
          where: {
            tenantId_code: {
              tenantId: tenantDbId,
              code: payload.code,
            },
          },
          update: {
            plate: payload.plate || null,
            type,
            model: payload.model,
            manufacturer: payload.manufacturer || null,
            status: (payload.status as AssetStatus) || AssetStatus.DISPONIVEL,
            locationName: payload.locationName || null,
          },
          create: {
            tenantId: tenantDbId,
            code: payload.code,
            plate: payload.plate || null,
            type,
            model: payload.model,
            manufacturer: payload.manufacturer || null,
            status: (payload.status as AssetStatus) || AssetStatus.DISPONIVEL,
            locationName: payload.locationName || null,
            qrCode: payload.qrCode || null,
          },
        });

        await this.prisma.importRow.update({
          where: { id: importRow.id },
          data: { status: ImportStatus.CONCLUIDO },
        });

        successRows += 1;
      } catch (error) {
        errorRows += 1;

        await this.prisma.importRow.update({
          where: { id: importRow.id },
          data: { status: ImportStatus.COM_ERROS },
        });

        await this.prisma.importError.create({
          data: {
            tenantId: tenantDbId,
            importJobId: importJob.id,
            importRowId: importRow.id,
            code: 'IMPORT_ASSET_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Erro inesperado na importação',
          },
        });
      }
    }

    const status =
      errorRows > 0 ? ImportStatus.COM_ERROS : ImportStatus.CONCLUIDO;

    await this.prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status,
        successRows,
        errorRows,
      },
    });

    await this.auditLogsService.record({
      tenantId: tenantDbId,
      userId,
      action: 'IMPORT_CSV',
      resource: 'assets',
      resourceId: importJob.id,
      payload: { totalRows: rows.length - 1, successRows, errorRows },
    });

    return {
      importJobId: importJob.id,
      totalRows: rows.length - 1,
      successRows,
      errorRows,
      status,
    };
  }

  private async resolveTenantId(tenantRef: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ id: tenantRef }, { slug: tenantRef }],
      },
      select: { id: true },
    });

    return tenant?.id ?? tenantRef;
  }
}
