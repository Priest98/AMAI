import { Controller, Post, Patch, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { PostsService } from './posts.service';
import { EngineService } from '../engine/engine.service';
import { PostStatus } from '@prisma/client';
import { CreatePostDto, ComposeManualPostDto, ApprovePostDto, EditPostDto } from './dto';

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
    @Body() dto: CreatePostDto,
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

  // Dashboard summary — counts only, not full post payloads. Declared before
  // no path params collide since this is a static 'stats' segment, not a
  // dynamic :postId, so it can never be shadowed by the routes below.
  @Get('stats')
  async getStats(@Param('brandId') brandId: string) {
    return this.postsService.getStats(brandId);
  }

  // Real week-over-week performance deltas for the dashboard home page --
  // same static-segment reasoning as 'stats' above.
  @Get('performance-summary')
  async getPerformanceSummary(@Param('brandId') brandId: string) {
    return this.postsService.getPerformanceSummary(brandId);
  }

  // ─────────────────────────────────────────────────────────────
  // Manual composer — Single Image / Carousel. A static 'compose' segment,
  // same reasoning as 'stats' above: declared before the dynamic :postId
  // routes so it's never shadowed by them.
  // ─────────────────────────────────────────────────────────────

  @Post('compose')
  async composeManualPost(
    @Param('brandId') brandId: string,
    @Body() dto: ComposeManualPostDto,
  ) {
    return this.engineService.composeManualPost(brandId, dto);
  }

  // ─────────────────────────────────────────────────────────────
  // Approval Queue actions — every post Oyinca prepares lands
  // here first (Manual Approval), or is auto-scheduled (Auto Approval).
  // ─────────────────────────────────────────────────────────────

  @Post(':postId/approve')
  async approvePost(
    @Param('brandId') brandId: string,
    @Param('postId') postId: string,
    @Body() dto: ApprovePostDto,
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
    @Body() dto: EditPostDto,
  ) {
    return this.engineService.editPost(brandId, postId, dto);
  }
}
