import { Controller, Post, Get, Delete, Body, Param, Req, UploadedFile, UseInterceptors, BadRequestException, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { EntitlementGuard, RequireEntitlement } from '../billing/entitlement.guard';
import { RegisterAssetDto, CreateFolderDto } from './dto';

@UseGuards(JwtAuthGuard, BrandAccessGuard)
@Controller('brands/:brandId/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Legacy small-file upload path (multipart form data through the
   * serverless function itself). Still used as a fallback, but Vercel's
   * ~4.5MB request-body cap means anything bigger than that — most videos —
   * never reaches this handler at all (rejected with a platform-level 413
   * before this code runs). Large files should go through the
   * client-direct-upload flow (`/api/media-upload-token` in the web app)
   * and land here via `register` below instead.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      // Basic MIME type validation
      if (!file.mimetype.match(/image\/(jpeg|png|gif|webp)|video\/(mp4|quicktime|webm|x-matroska)/)) {
        return cb(new BadRequestException('Only images and specific video formats are allowed'), false);
      }
      cb(null, true);
    }
  }))
  async uploadAsset(
    @Param('brandId') brandId: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId?: string
  ) {
    return this.mediaService.uploadAsset(brandId, file, folderId, req.user?.id);
  }

  /**
   * Registers a file the browser already uploaded directly to Vercel Blob
   * storage (client-direct-upload flow). This is the path large videos take
   * since they can't fit through the serverless function's body-size cap.
   *
   * Deliberately fast: only validates and writes the DB record, then
   * returns immediately (status PENDING) instead of blocking the response
   * on the AI pipeline. The caller (UploadDropzone) fires POST
   * .../assets/:assetId/process right after this resolves, without
   * awaiting it, so uploads aren't serialized behind AMAI Engine
   * processing and can run with real concurrency.
   */
  @Post('register')
  async registerAsset(
    @Param('brandId') brandId: string,
    @Req() req: any,
    @Body() dto: RegisterAssetDto,
  ) {
    return this.mediaService.registerUploadedAsset(brandId, dto, req.user?.id);
  }

  /**
   * Kicks off the AMAI Engine pipeline (vision analysis, caption/hashtag
   * generation, scheduling) for an already-registered asset. Split out from
   * register/upload so the upload response stays fast — this is its own
   * request/response cycle with its own execution budget, bounded by
   * EngineService's internal pipeline timeout so it always resolves
   * (success or a clean, retryable MediaStatus.FAILED) well inside
   * Vercel's platform timeout.
   */
  // Security audit fix (6.2): entitlements.recordAiGeneration() already caps
  // total AI calls per billing period, but that check itself costs a DB
  // round-trip on every hit, so a burst of requests within a single minute
  // could still be used to hammer the DB / third-party AI APIs before the
  // monthly-limit rejection kicks in. This is a looser per-minute ceiling
  // than the auth endpoints since legitimate usage (batch carousel
  // uploads) can burst.
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @UseGuards(EntitlementGuard)
  @RequireEntitlement('generate_ai_content')
  @Post('assets/:assetId/process')
  async processAsset(
    @Param('brandId') brandId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.mediaService.triggerProcessing(brandId, assetId);
  }

  @Get('assets')
  async getAssets(
    @Param('brandId') brandId: string,
    @Query('folderId') folderId?: string
  ) {
    return this.mediaService.getAssets(brandId, folderId);
  }

  @Delete('assets/:assetId')
  async deleteAsset(
    @Param('brandId') brandId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.mediaService.deleteAsset(brandId, assetId);
  }

  @Post('folders')
  async createFolder(
    @Param('brandId') brandId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.mediaService.createFolder(brandId, dto.name, dto.parentId);
  }

  @Get('folders')
  async getFolders(
    @Param('brandId') brandId: string,
    @Query('parentId') parentId?: string
  ) {
    return this.mediaService.getFolders(brandId, parentId);
  }
}
