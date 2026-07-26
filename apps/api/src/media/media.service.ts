import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MediaType } from '@prisma/client';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService
  ) {}

  async uploadAsset(brandId: string, file: Express.Multer.File, folderId?: string) {
    if (!file) throw new BadRequestException('No file provided');

    const uploadedData = await this.storage.uploadFile(file, brandId);

    let type: MediaType = MediaType.IMAGE;
    if (file.mimetype.startsWith('video/')) {
      type = MediaType.VIDEO;
    }

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
