import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportsQueryDto } from './dto/reports-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(tenantId: string, query: ReportsQueryDto) {
    const whereDate = {
      createdAt: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    };

    const [
      assetsTotal,
      workOrdersOpen,
      workOrdersInProgress,
      workOrdersDone,
      overdue,
    ] = await Promise.all([
      this.prisma.asset.count({ where: { tenantId } }),
      this.prisma.workOrder.count({
        where: { tenantId, status: 'ABERTA', ...whereDate },
      }),
      this.prisma.workOrder.count({
        where: { tenantId, status: 'EM_ANDAMENTO', ...whereDate },
      }),
      this.prisma.workOrder.count({
        where: { tenantId, status: 'CONCLUIDA', ...whereDate },
      }),
      this.prisma.workOrder.count({
        where: {
          tenantId,
          status: { in: ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO'] },
          dueAt: { lt: new Date() },
        },
      }),
    ]);

    return {
      assetsTotal,
      workOrdersOpen,
      workOrdersInProgress,
      workOrdersDone,
      overdue,
      compliance:
        assetsTotal > 0
          ? Math.max(
              0,
              Math.round(((assetsTotal - overdue) / assetsTotal) * 100),
            )
          : 100,
    };
  }

  async performance(tenantId: string, query: ReportsQueryDto) {
    const [
      fuelSummary,
      openChecklists,
      inProgressChecklists,
      completedChecklists,
    ] = await Promise.all([
      this.prisma.fuelEntry.aggregate({
        where: {
          tenantId,
          fueledAt: {
            gte: query.from ? new Date(query.from) : undefined,
            lte: query.to ? new Date(query.to) : undefined,
          },
        },
        _sum: { totalPrice: true },
      }),
      this.prisma.checklistRun.count({
        where: { tenantId, status: 'PENDENTE' },
      }),
      this.prisma.checklistRun.count({
        where: { tenantId, status: 'EM_CURSO' },
      }),
      this.prisma.checklistRun.count({
        where: { tenantId, status: 'CONCLUIDO' },
      }),
    ]);

    const totalRuns =
      openChecklists + inProgressChecklists + completedChecklists;

    return {
      utilization:
        totalRuns > 0
          ? Number(((completedChecklists / totalRuns) * 100).toFixed(1))
          : 0,
      incidents: openChecklists,
      totalFuelCost: fuelSummary._sum.totalPrice ?? 0,
      checklists: {
        pending: openChecklists,
        inProgress: inProgressChecklists,
        completed: completedChecklists,
      },
    };
  }

  async exportCsv(tenantId: string) {
    const rows = await this.prisma.workOrder.findMany({
      where: { tenantId },
      include: { asset: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const header = 'codigo,ativo,placa,servico,status,prioridade,prazo\n';
    const body = rows
      .map((row) =>
        [
          row.code,
          row.asset.model,
          row.asset.plate ?? '',
          row.service,
          row.status,
          row.priority,
          row.dueAt ? row.dueAt.toISOString() : '',
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(','),
      )
      .join('\n');

    return `${header}${body}`;
  }

  async exportPdf(tenantId: string) {
    const report = await this.dashboard(tenantId, {});

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('Relatório Consolidado - Frota Pro', {
      x: 50,
      y: 790,
      size: 18,
      font,
      color: rgb(0.06, 0.12, 0.24),
    });

    const lines = [
      `Ativos totais: ${report.assetsTotal}`,
      `O.S. abertas: ${report.workOrdersOpen}`,
      `O.S. em andamento: ${report.workOrdersInProgress}`,
      `O.S. concluídas: ${report.workOrdersDone}`,
      `Atrasadas: ${report.overdue}`,
      `Conformidade: ${report.compliance}%`,
    ];

    lines.forEach((line, index) => {
      page.drawText(line, {
        x: 50,
        y: 740 - index * 24,
        size: 12,
        font: bodyFont,
        color: rgb(0.16, 0.2, 0.28),
      });
    });

    return Buffer.from(await pdfDoc.save());
  }
}
