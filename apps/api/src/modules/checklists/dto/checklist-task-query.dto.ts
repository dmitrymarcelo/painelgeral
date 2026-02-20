import { IsOptional, IsString } from 'class-validator';

export class ChecklistTaskQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}
