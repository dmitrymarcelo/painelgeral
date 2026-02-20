import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFuelEntryDto } from './dto/create-fuel-entry.dto';
import { FuelEntriesQueryDto } from './dto/fuel-entries-query.dto';

@Injectable()
export class FuelEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateFuelEntryDto) {
    const totalPrice = dto.liters * dto.unitPrice;

    return this.prisma.fuelEntry.create({
      data: {
        tenantId,
        assetId: dto.assetId,
        liters: dto.liters,
        unitPrice: dto.unitPrice,
        totalPrice,
        odometerKm: dto.odometerKm,
        fueledAt: new Date(dto.fueledAt),
        stationName: dto.stationName,
        note: dto.note,
      },
    });
  }

  async list(tenantId: string, query: FuelEntriesQueryDto) {
    return this.prisma.fuelEntry.findMany({
      where: {
        tenantId,
        assetId: query.assetId,
        fueledAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      include: { asset: true },
      orderBy: { fueledAt: 'desc' },
      take: 200,
    });
  }

  async summary(tenantId: string) {
    const [count, aggregate] = await Promise.all([
      this.prisma.fuelEntry.count({ where: { tenantId } }),
      this.prisma.fuelEntry.aggregate({
        where: { tenantId },
        _sum: {
          liters: true,
          totalPrice: true,
        },
      }),
    ]);

    return {
      entries: count,
      totalLiters: aggregate._sum.liters ?? 0,
      totalCost: aggregate._sum.totalPrice ?? 0,
      avgTicket: count > 0 ? (aggregate._sum.totalPrice ?? 0) / count : 0,
    };
  }
}
