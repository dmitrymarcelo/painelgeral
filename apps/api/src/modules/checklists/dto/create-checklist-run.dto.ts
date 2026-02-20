import { IsOptional, IsString } from 'class-validator';

export class CreateChecklistRunDto {
  @IsString()
  templateId!: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  workOrderId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  // Compatibilidade com payload offline do app
  @IsOptional()
  @IsString()
  checklistId?: string;

  @IsOptional()
  @IsString()
  asset?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  technician?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  completedAt?: string;

  @IsOptional()
  completedItems?: number;

  @IsOptional()
  totalItems?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
