import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/interfaces/request-context.interface';
import { getTenantId } from '../../common/utils/tenant.util';
import { AddMaintenanceRuleDto } from './dto/add-maintenance-rule.dto';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';
import { MaintenancePlansService } from './maintenance-plans.service';

@Controller('maintenance-plans')
export class MaintenancePlansController {
  constructor(
    private readonly maintenancePlansService: MaintenancePlansService,
  ) {}

  @Get()
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  findAll(@Req() request: Request) {
    return this.maintenancePlansService.findAll(getTenantId(request));
  }

  @Post()
  @Roles('ADMIN', 'GESTOR')
  create(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: CreateMaintenancePlanDto,
  ) {
    return this.maintenancePlansService.create(
      getTenantId(request),
      user?.sub,
      dto,
    );
  }

  @Patch(':id')
  @Roles('ADMIN', 'GESTOR')
  update(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenancePlanDto,
  ) {
    return this.maintenancePlansService.update(
      getTenantId(request),
      user?.sub,
      id,
      dto,
    );
  }

  @Post(':id/rules')
  @Roles('ADMIN', 'GESTOR')
  addRule(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() dto: AddMaintenanceRuleDto,
  ) {
    return this.maintenancePlansService.addRule(
      getTenantId(request),
      user?.sub,
      id,
      dto,
    );
  }
}
