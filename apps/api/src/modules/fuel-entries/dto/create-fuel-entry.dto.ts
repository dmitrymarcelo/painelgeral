import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateFuelEntryDto {
  @IsString()
  assetId!: string;

  @IsNumber()
  @Min(0)
  liters!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  odometerKm?: number;

  @IsDateString()
  fueledAt!: string;

  @IsOptional()
  @IsString()
  stationName?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
