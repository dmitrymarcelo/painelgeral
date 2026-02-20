import { IsOptional, IsString } from 'class-validator';

export class ImportAssetsCsvDto {
  @IsString()
  csv!: string;

  @IsOptional()
  @IsString()
  delimiter?: string;
}
