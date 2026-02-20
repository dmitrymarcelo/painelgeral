import { TriggerType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export class AddMaintenanceRuleDto {
  @IsEnum(TriggerType)
  triggerType!: TriggerType;

  @IsNumber()
  intervalValue!: number;

  @IsOptional()
  @IsNumber()
  warningValue?: number;
}
