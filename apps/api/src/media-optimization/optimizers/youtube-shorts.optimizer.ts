import { Injectable } from '@nestjs/common';
import { PlatformOptimizer } from '../interfaces/platform-optimizer.interface';
import { PLATFORM_MEDIA_RULES } from '../config/platform-media-rules.config';

@Injectable()
export class YouTubeShortsOptimizer implements PlatformOptimizer {
  readonly platformKey = 'YOUTUBE_SHORTS';
  readonly rules = PLATFORM_MEDIA_RULES.YOUTUBE_SHORTS;
}
