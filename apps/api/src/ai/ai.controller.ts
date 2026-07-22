import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('brands/:brandId/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-caption')
  async generateCaption(
    @Headers('x-user-id') userId: string,
    @Body() dto: { brandId: string; topic: string; platform: string; tone: string }
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.aiService.generateCaption(dto.brandId, userId, dto.topic, dto.platform, dto.tone);
  }
}
