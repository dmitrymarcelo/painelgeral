import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { getTenantId } from '../../common/utils/tenant.util';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles('ADMIN', 'GESTOR')
  findAll(
    @Req() request: Request,
    @Query() query: AuditLogsQueryDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.auditLogsService.findAll(
      getTenantId(request),
      query,
      pagination,
    );
  }
}
