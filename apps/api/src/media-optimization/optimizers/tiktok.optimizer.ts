import { Injectable } from '@nestjs/common';
import { PlatformOptimizer } from '../interfaces/platform-optimizer.interface';
import { PLATFORM_MEDIA_RULES } from '../config/platform-media-rules.config';

@Injectable()
export class TikTokOptimizer implements PlatformOptimizer {
  readonly platformKey = 'TIKTOK';
  readonly rules = PLATFORM_MEDIA_RULES.TIKTOK;
}
