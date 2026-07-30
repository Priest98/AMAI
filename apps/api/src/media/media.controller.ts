import { Controller, Post, Get, Delete, Body, Param, UploadedFile, UseInterceptors, BadRequestException, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';

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
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId?: string
  ) {
    return this.mediaService.uploadAsset(brandId, file, folderId);
  }

  /**
   * Registers a file the browser already uploaded directly to Vercel Blob
   * storage (client-direct-upload flow). This is the path large videos take
   * since they can't fit through the serverless function's body-size cap.
   */
  @Post('register')
  async registerAsset(
    @Param('brandId') brandId: string,
    @Body() dto: { url: string; size: number; mimeType: string; filename: string; folderId?: string },
  ) {
    return this.mediaService.registerUploadedAsset(brandId, dto);
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
    @Body() dto: { name: string; parentId?: string }
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
