import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findAll(
    tenantId: string,
    query: AuditLogsQueryDto,
    pagination: PaginationDto,
  ) {
    const tenantDbId = this.toBigInt(tenantId)!;
    const where = {
      tenantId: tenantDbId,
      resource: query.resource,
      userId: this.toBigInt(query.userId),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page! - 1) * pagination.pageSize!,
        take: pagination.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async record(input: {
    tenantId: string | bigint;
    userId?: string | bigint;
    action: string;
    resource: string;
    resourceId?: string | bigint;
    payload?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: this.toBigInt(input.tenantId)!,
        userId: this.toBigInt(input.userId),
        action: input.action,
        resource: input.resource,
        resourceId:
          input.resourceId !== undefined && input.resourceId !== null
            ? String(input.resourceId)
            : undefined,
        payload: input.payload as object | undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }
}
