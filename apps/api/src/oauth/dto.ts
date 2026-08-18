import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Security audit fix (4.1): same rationale as posts/dto.ts.

export class UpdateGoogleFolderDto {
  @IsOptional()
  @IsString()
  brandId?: string;

  @IsString()
  @IsNotEmpty()
  folderId!: string;

  @IsOptional()
  @IsString()
  folderName?: string;
}

/** Shared by both instagram/refresh and tiktok/refresh -- identical shape. */
export class RefreshAccountDto {
  @IsString()
  @IsNotEmpty()
  accountId!: string;
}

export class RenameAccountDto {
  @IsString()
  @IsNotEmpty()
  handle!: string;

  @IsOptional()
  @IsString()
  brandId?: string;
}
