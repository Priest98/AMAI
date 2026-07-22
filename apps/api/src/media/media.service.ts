import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MediaType } from '@marketing-os/database';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService
  ) {}

  async uploadAsset(brandId: string, file: Express.Multer.File, folderId?: string) {
    if (!file) throw new BadRequestException('No file provided');

    // 1. Upload to Storage
    const uploadedData = await this.storage.uploadFile(file, brandId);

    // 2. Determine MediaType enum
    let type: MediaType = MediaType.IMAGE;
    if (file.mimetype.startsWith('video/')) {
      type = MediaType.VIDEO;
    }

    // 3. Save to DB
    return this.prisma.mediaAsset.create({
      data: {
        brandId,
        folderId: folderId || null,
        url: uploadedData.url,
        type,
        size: uploadedData.size,
        mimeType: uploadedData.mimeType,
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
