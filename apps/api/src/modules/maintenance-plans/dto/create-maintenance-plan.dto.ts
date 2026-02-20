import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateMaintenancePlanDto {
  @IsString()
  assetId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
