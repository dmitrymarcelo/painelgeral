import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { getTenantId } from '../../common/utils/tenant.util';
import { CreateFuelEntryDto } from './dto/create-fuel-entry.dto';
import { FuelEntriesQueryDto } from './dto/fuel-entries-query.dto';
import { FuelEntriesService } from './fuel-entries.service';

@Controller('fuel-entries')
export class FuelEntriesController {
  constructor(private readonly fuelEntriesService: FuelEntriesService) {}

  @Post()
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  create(@Req() request: Request, @Body() dto: CreateFuelEntryDto) {
    return this.fuelEntriesService.create(getTenantId(request), dto);
  }

  @Get()
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  list(@Req() request: Request, @Query() query: FuelEntriesQueryDto) {
    return this.fuelEntriesService.list(getTenantId(request), query);
  }

  @Get('summary')
  @Roles('ADMIN', 'GESTOR')
  summary(@Req() request: Request) {
    return this.fuelEntriesService.summary(getTenantId(request));
  }
}
