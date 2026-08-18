import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Platform, PostStatus } from '@prisma/client';

// Security audit fix (4.1): these endpoints used to accept plain inline
// TypeScript object-literal types on @Body(). That's a compile-time-only
// shape check -- at runtime, NestJS's global ValidationPipe only validates
// classes decorated with class-validator decorators, so a caller with a
// valid JWT could POST literally anything in the body (wrong types, extra
// fields, missing required fields causing a downstream crash) and it would
// sail straight through to the service layer. Converting to real DTO
// classes here closes that gap for the post-composer/approval-queue
// endpoints without changing any of the actual field names or behaviour.

export class PostTargetDto {
  @IsEnum(Platform)
  platform!: Platform;

  @IsString()
  @IsNotEmpty()
  socialAccountId!: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  caption!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaAssetIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostTargetDto)
  targets?: PostTargetDto[];

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}

export class ComposeManualPostDto {
  @IsArray()
  @IsString({ each: true })
  mediaAssetIds!: string[];

  @IsEnum({ SINGLE: 'SINGLE', CAROUSEL: 'CAROUSEL' })
  postType!: 'SINGLE' | 'CAROUSEL';
}

// approvePost's targets omit `metadata` in the original inline type (unlike
// CreatePostDto's), so this is a separate, narrower class rather than reuse.
export class ApprovePostTargetDto {
  @IsEnum(Platform)
  platform!: Platform;

  @IsString()
  @IsNotEmpty()
  socialAccountId!: string;
}

export class ApprovePostDto {
  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @IsString()
  ctaText?: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovePostTargetDto)
  targets?: ApprovePostTargetDto[];

  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}

export class EditPostDto {
  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @IsString()
  ctaText?: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovePostTargetDto)
  targets?: ApprovePostTargetDto[];
}
