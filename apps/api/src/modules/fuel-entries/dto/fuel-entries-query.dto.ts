import { IsDateString, IsOptional, IsString } from 'class-validator';

export class FuelEntriesQueryDto {
  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
