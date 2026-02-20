import { IsOptional, IsString } from 'class-validator';

export class AddChecklistSignatureDto {
  @IsString()
  signerName!: string;

  @IsString()
  dataUrl!: string;

  @IsOptional()
  @IsString()
  signedById?: string;
}
