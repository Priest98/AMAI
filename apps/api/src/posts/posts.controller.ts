import { Controller, Post, Patch, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { PostsService } from './posts.service';
import { EngineService } from '../engine/engine.service';
import { PostStatus, Platform } from '@prisma/client';

@UseGuards(JwtAuthGuard, BrandAccessGuard)
@Controller('brands/:brandId/posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly engineService: EngineService,
  ) {}

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

  // ─────────────────────────────────────────────────────────────
  // Approval Queue actions — every post the AMAI Engine prepares lands
  // here first (Manual Approval), or is auto-scheduled (Auto Approval).
  // ─────────────────────────────────────────────────────────────

  @Post(':postId/approve')
  async approvePost(
    @Param('brandId') brandId: string,
    @Param('postId') postId: string,
    @Body() dto: {
      caption?: string;
      hashtags?: string[];
      ctaText?: string;
      scheduledAt?: string;
      targets?: { platform: Platform; socialAccountId: string }[];
      publishNow?: boolean;
    },
  ) {
    return this.engineService.approvePost(brandId, postId, dto);
  }

  @Post(':postId/reject')
  async rejectPost(@Param('brandId') brandId: string, @Param('postId') postId: string) {
    return this.engineService.rejectPost(brandId, postId);
  }

  @Post(':postId/retry')
  async retryPost(@Param('brandId') brandId: string, @Param('postId') postId: string) {
    return this.engineService.retryPost(brandId, postId);
  }

  @Patch(':postId')
  async editPost(
    @Param('brandId') brandId: string,
    @Param('postId') postId: string,
    @Body() dto: {
      caption?: string;
      hashtags?: string[];
      ctaText?: string;
      scheduledAt?: string;
      targets?: { platform: Platform; socialAccountId: string }[];
    },
  ) {
    return this.engineService.editPost(brandId, postId, dto);
  }
}
