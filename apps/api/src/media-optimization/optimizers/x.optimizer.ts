import { Injectable } from '@nestjs/common';
import { PlatformOptimizer } from '../interfaces/platform-optimizer.interface';
import { PLATFORM_MEDIA_RULES } from '../config/platform-media-rules.config';

@Injectable()
export class XOptimizer implements PlatformOptimizer {
  readonly platformKey = 'X';
  readonly rules = PLATFORM_MEDIA_RULES.X;
}
