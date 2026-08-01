import { Injectable } from '@nestjs/common';
import { PlatformOptimizer } from '../interfaces/platform-optimizer.interface';
import { PLATFORM_MEDIA_RULES } from '../config/platform-media-rules.config';

@Injectable()
export class FacebookOptimizer implements PlatformOptimizer {
  readonly platformKey = 'FACEBOOK';
  readonly rules = PLATFORM_MEDIA_RULES.FACEBOOK;
}
