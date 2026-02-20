import { AssetStatus, AssetType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class AssetQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;
}
