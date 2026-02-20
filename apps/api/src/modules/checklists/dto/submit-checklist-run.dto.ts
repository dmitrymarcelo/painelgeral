import { IsOptional, IsString } from 'class-validator';

export class SubmitChecklistRunDto {
  @IsOptional()
  @IsString()
  note?: string;
}
