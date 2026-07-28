import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-caption')
  async generateCaption(
    @Body() dto: { brandId?: string; userId?: string; topic: string; platform: string; tone: string }
  ) {
    const brandId = dto.brandId || 'primary_brand';
    const userId = dto.userId || 'system_user';
    return this.aiService.generateCaption(brandId, userId, dto.topic, dto.platform, dto.tone);
  }

  @Post('generate-hashtags')
  async generateHashtags(
    @Body() dto: { topic?: string; platform?: string; niche?: string }
  ) {
    return this.aiService.generateHashtags(dto.topic, dto.platform, dto.niche);
  }

  @Get('best-time')
  async predictBestPostingTime(
    @Query('platform') platform: string = 'Instagram',
    @Query('brandId') brandId: string = 'primary_brand'
  ) {
    return this.aiService.predictBestPostingTime(platform, brandId);
  }
}
