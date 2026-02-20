import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddChecklistAttachmentDto {
  @IsString()
  url!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  size!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
