import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class TelemetryWebhookDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsString()
  assetCode!: string;

  @IsOptional()
  @IsNumber()
  odometerKm?: number;

  @IsOptional()
  @IsNumber()
  engineHours?: number;

  @IsDateString()
  timestamp!: string;

  @IsOptional()
  rawPayload?: Record<string, unknown>;
}
