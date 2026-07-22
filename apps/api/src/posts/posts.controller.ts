import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostStatus, Platform } from '@marketing-os/database';

@Controller('brands/:brandId/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async createPost(
    @Param('brandId') brandId: string,
    @Body() dto: {
      caption: string;
      mediaAssetIds?: string[];
      targets?: { platform: Platform; socialAccountId: string; metadata?: any }[];
      scheduledAt?: string;
      status?: PostStatus;
    }
  ) {
    return this.postsService.createPost(brandId, dto);
  }

  @Get()
  async getPosts(
    @Param('brandId') brandId: string,
    @Query('status') status?: PostStatus
  ) {
    return this.postsService.getPosts(brandId, status);
  }
}
