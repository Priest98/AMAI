import { Controller, Post, Get, Body, Param, UploadedFile, UseInterceptors, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';

@Controller('brands/:brandId/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      // Basic MIME type validation
      if (!file.mimetype.match(/image\/(jpeg|png|gif|webp)|video\/(mp4|quicktime)/)) {
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

  @Get('assets')
  async getAssets(
    @Param('brandId') brandId: string,
    @Query('folderId') folderId?: string
  ) {
    return this.mediaService.getAssets(brandId, folderId);
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
