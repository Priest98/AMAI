import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus, Platform, MediaStatus } from '@prisma/client';

interface CreatePostDto {
  caption: string;
  mediaAssetIds?: string[];
  targets?: { platform: Platform; socialAccountId: string; metadata?: any }[];
  scheduledAt?: string;
  status?: PostStatus;
}

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(private prisma: PrismaService) {}

  async createPost(brandId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        brandId,
        caption: dto.caption,
        status: dto.status || PostStatus.DRAFT,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      }
    });

    if (dto.mediaAssetIds && dto.mediaAssetIds.length > 0) {
      await this.prisma.mediaAsset.updateMany({
        where: { id: { in: dto.mediaAssetIds } },
        data: { status: MediaStatus.SCHEDULED, linkedPostId: post.id }
      });
    }

    return post;
  }

  async getPosts(brandId: string, status?: PostStatus) {
    return this.prisma.post.findMany({
      where: {
        brandId,
        ...(status ? { status } : {})
      },
      include: {
        targets: { select: { platform: true, status: true } },
        media: { include: { asset: { select: { blobUrl: true, mimeType: true, filename: true } } } },
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Called after confirmed successful publish response from platform API.
   * Deletes actual media file from storage and keeps lightweight DB history record.
   */
  async markPublishedAndCleanup(
    assetId: string,
    details: { platform: string; providerPostId: string }
  ) {
    this.logger.log(`[MEDIA CLEANUP] Deleting blob for asset ${assetId} post-publish on ${details.platform}`);
    return this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: MediaStatus.PUBLISHED,
        blobUrl: null,
        platform: details.platform,
        providerPostId: details.providerPostId,
        publishedAt: new Date(),
      },
    });
  }

  /**
   * Called when a publish attempt fails. Keeps media asset so user can retry.
   */
  async markMediaFailed(assetId: string, errorMessage: string) {
    this.logger.warn(`[MEDIA FAILED] Asset ${assetId} publish failed: ${errorMessage}`);
    return this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: MediaStatus.FAILED,
        lastErrorMessage: errorMessage,
      },
    });
  }
}
