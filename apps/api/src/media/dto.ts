import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// Security audit fix (4.1): same rationale as posts/dto.ts -- these were
// previously inline @Body() object-literal types with zero runtime
// validation. Intentionally NOT re-implementing the MIME-type allowlist
// here as a strict @IsIn -- MediaService.assertAllowedMimeType() already
// owns that check (case-insensitively, with its own user-facing error
// message) and is the single source of truth for it. Duplicating a
// case-sensitive version here would risk silently rejecting inputs the
// service would otherwise accept.

export class RegisterAssetDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsNumber()
  @Min(0)
  size!: number;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsOptional()
  @IsString()
  folderId?: string;
}

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
