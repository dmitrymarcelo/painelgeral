import { IsOptional, IsString } from 'class-validator';

export class AuditLogsQueryDto {
  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
