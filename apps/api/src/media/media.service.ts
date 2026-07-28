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

    const asset = await this.prisma.mediaAsset.create({
      data: {
        brandId,
        folderId: folderId || null,
        filename: file.originalname || 'uploaded_media',
        blobUrl: uploadedData.url,
        sizeBytes: uploadedData.size || file.size || 0,
        mimeType: uploadedData.mimeType || file.mimetype,
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
    return this.prisma.mediaAsset.findMany({
      where: {
        brandId,
        folderId: folderId || null
      },
      orderBy: { createdAt: 'desc' }
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
