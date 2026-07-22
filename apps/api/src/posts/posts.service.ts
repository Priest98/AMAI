import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus, Platform } from '@marketing-os/database';

interface CreatePostDto {
  caption: string;
  mediaAssetIds?: string[];
  targets?: { platform: Platform; socialAccountId: string; metadata?: any }[];
  scheduledAt?: string;
  status?: PostStatus;
}

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async createPost(brandId: string, dto: CreatePostDto) {
    return this.prisma.post.create({
      data: {
        brandId,
        caption: dto.caption,
        status: dto.status || PostStatus.DRAFT,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        media: {
          create: dto.mediaAssetIds?.map(assetId => ({
            assetId
          })) || []
        },
        targets: {
          create: dto.targets?.map(target => ({
            platform: target.platform,
            socialAccountId: target.socialAccountId,
            platformSpecificMetadata: target.metadata ? JSON.stringify(target.metadata) : null,
          })) || []
        }
      },
      include: {
        media: true,
        targets: true,
      }
    });
  }

  async getPosts(brandId: string, status?: PostStatus) {
    return this.prisma.post.findMany({
      where: {
        brandId,
        ...(status ? { status } : {})
      },
      include: {
        targets: true,
        media: {
          include: {
            asset: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
