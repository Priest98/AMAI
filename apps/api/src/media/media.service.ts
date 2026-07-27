import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MediaStatus } from '@prisma/client';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService
  ) {}

  async uploadAsset(brandId: string, file: Express.Multer.File, folderId?: string) {
    if (!file) throw new BadRequestException('No file provided');

    const uploadedData = await this.storage.uploadFile(file, brandId);

    return this.prisma.mediaAsset.create({
      data: {
        brandId,
        folderId: folderId || null,
        filename: file.originalname || 'uploaded_media',
        blobUrl: uploadedData.url,
        sizeBytes: uploadedData.size || file.size || 0,
        mimeType: uploadedData.mimeType || file.mimetype,
        status: MediaStatus.PENDING,
      }
    });
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
