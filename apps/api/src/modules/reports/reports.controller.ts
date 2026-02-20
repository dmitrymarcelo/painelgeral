import { Controller, Get, Header, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { getTenantId } from '../../common/utils/tenant.util';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  dashboard(@Req() request: Request, @Query() query: ReportsQueryDto) {
    return this.reportsService.dashboard(getTenantId(request), query);
  }

  @Get('performance')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  performance(@Req() request: Request, @Query() query: ReportsQueryDto) {
    return this.reportsService.performance(getTenantId(request), query);
  }

  @Get('export/csv')
  @Roles('ADMIN', 'GESTOR')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(@Req() request: Request) {
    return this.reportsService.exportCsv(getTenantId(request));
  }

  @Get('export/pdf')
  @Roles('ADMIN', 'GESTOR')
  async exportPdf(@Req() request: Request, @Res() response: Response) {
    const pdf = await this.reportsService.exportPdf(getTenantId(request));
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      'inline; filename="relatorio-frota.pdf"',
    );
    response.send(pdf);
  }
}
