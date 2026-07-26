import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus, Platform } from '@prisma/client';

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
      }
    });
  }

  async getPosts(brandId: string, status?: PostStatus) {
    return this.prisma.post.findMany({
      where: {
        brandId,
        ...(status ? { status } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
