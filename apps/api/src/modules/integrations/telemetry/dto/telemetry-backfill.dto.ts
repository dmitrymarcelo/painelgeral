import { IsDateString, IsOptional, IsString } from 'class-validator';

export class TelemetryBackfillDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  assetCode?: string;
}
