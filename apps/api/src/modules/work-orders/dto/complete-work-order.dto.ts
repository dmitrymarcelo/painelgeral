import { IsOptional, IsString } from 'class-validator';

export class CompleteWorkOrderDto {
  @IsOptional()
  @IsString()
  note?: string;
}
