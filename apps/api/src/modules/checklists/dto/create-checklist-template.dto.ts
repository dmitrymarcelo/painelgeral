import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ChecklistTemplateItemDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  itemType?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class CreateChecklistTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistTemplateItemDto)
  items!: ChecklistTemplateItemDto[];
}
