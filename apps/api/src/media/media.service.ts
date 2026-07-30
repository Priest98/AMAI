import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MediaStatus, ContentSource } from '@prisma/client';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private events: EventEmitter2,
  ) {}

  async uploadAsset(brandId: string, file: Express.Multer.File, folderId?: string) {
    if (!file) throw new BadRequestException('No file provided');

    const uploadedData = await this.storage.uploadFile(file, brandId);

    return this.createAssetRecord(brandId, {
      filename: file.originalname || 'uploaded_media',
      url: uploadedData.url,
      size: uploadedData.size || file.size || 0,
      mimeType: uploadedData.mimeType || file.mimetype,
      folderId,
    });
  }

  /**
   * Registers a file that the browser already uploaded directly to Vercel
   * Blob storage (via the client-direct-upload flow), bypassing the
   * serverless function's ~4.5MB request-body cap that blocked large video
   * uploads through the legacy multipart `uploadAsset` path above.
   */
  async registerUploadedAsset(
    brandId: string,
    dto: { url: string; size: number; mimeType: string; filename: string; folderId?: string },
  ) {
    if (!dto?.url) throw new BadRequestException('No file URL provided');
    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(dto.url)) {
      throw new BadRequestException('Invalid upload URL.');
    }

    return this.createAssetRecord(brandId, dto);
  }

  private async createAssetRecord(
    brandId: string,
    dto: { url: string; size?: number; mimeType: string; filename?: string; folderId?: string },
  ) {
    const asset = await this.prisma.mediaAsset.create({
      data: {
        brandId,
        folderId: dto.folderId || null,
        filename: dto.filename || 'uploaded_media',
        blobUrl: dto.url,
        sizeBytes: dto.size || 0,
        mimeType: dto.mimeType,
        source: ContentSource.DIRECT_UPLOAD,
        status: MediaStatus.PENDING,
      }
    });

    // Upload is always the trigger — the AMAI Engine picks this up
    // regardless of Active/Paused state (Paused only blocks publishing).
    this.events.emit('media.uploaded', { mediaAssetId: asset.id });

    return asset;
  }

  async deleteAsset(brandId: string, assetId: string) {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id: assetId, brandId } });
    if (!asset) throw new NotFoundException('Media asset not found.');

    if (asset.blobUrl) {
      await this.storage.deleteFile(asset.blobUrl);
    }
    await this.prisma.mediaAsset.delete({ where: { id: assetId } });
    return { success: true, id: assetId };
  }

  async getAssets(brandId: string, folderId?: string) {
    // Projected + capped: the Media Library grid only ever renders these
    // seven fields (not batchId/batchName/relativePath/userId/platform/
    // providerPostId/publishedAt/updatedAt), and an unbounded findMany()
    // would eventually pull the brand's entire upload history on every
    // page load as the library grows. 300 is a generous ceiling for the
    // grid view today; if libraries grow past that this should become
    // real cursor pagination with a "load more" affordance in the UI.
    return this.prisma.mediaAsset.findMany({
      where: {
        brandId,
        folderId: folderId || null,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        blobUrl: true,
        status: true,
        lastErrorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async createFolder(brandId: string, name: string, parentId?: string) {
    return this.prisma.mediaFolder.create({
      data: {
        brandId,
        name,
        parentId: parentId || null
      }
    });
  }

  async getFolders(brandId: string, parentId?: string) {
    return this.prisma.mediaFolder.findMany({
      where: {
        brandId,
        parentId: parentId || null
      },
      include: {
        _count: {
          select: { assets: true, children: true }
        }
      }
    });
  }
}
