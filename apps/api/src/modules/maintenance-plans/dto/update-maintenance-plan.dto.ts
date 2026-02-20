import { PartialType } from '@nestjs/mapped-types';
import { CreateMaintenancePlanDto } from './create-maintenance-plan.dto';

export class UpdateMaintenancePlanDto extends PartialType(
  CreateMaintenancePlanDto,
) {}
