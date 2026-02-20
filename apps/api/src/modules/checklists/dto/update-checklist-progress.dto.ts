import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

class ChecklistAnswerDto {
  @IsString()
  templateItemId!: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateChecklistProgressDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistAnswerDto)
  answers!: ChecklistAnswerDto[];
}
