import { Injectable } from '@nestjs/common';
import { PlatformOptimizer } from '../interfaces/platform-optimizer.interface';
import { InstagramOptimizer } from './instagram.optimizer';
import { TikTokOptimizer } from './tiktok.optimizer';
import { FacebookOptimizer } from './facebook.optimizer';
import { LinkedInOptimizer } from './linkedin.optimizer';
import { XOptimizer } from './x.optimizer';
import { YouTubeShortsOptimizer } from './youtube-shorts.optimizer';

/**
 * Maps a platform key to its optimizer. This is the one place that knows
 * every platform optimizer that exists — MediaOptimizationService only
 * ever asks this registry "give me the optimizer for X", it never
 * imports a platform-specific class directly. Adding a new platform:
 * write the optimizer class, add one line here.
 */
@Injectable()
export class OptimizerRegistryService {
  private readonly optimizers: Record<string, PlatformOptimizer>;

  constructor(
    instagram: InstagramOptimizer,
    tiktok: TikTokOptimizer,
    facebook: FacebookOptimizer,
    linkedin: LinkedInOptimizer,
    x: XOptimizer,
    youtubeShorts: YouTubeShortsOptimizer,
  ) {
    this.optimizers = {
      INSTAGRAM: instagram,
      TIKTOK: tiktok,
      FACEBOOK: facebook,
      LINKEDIN: linkedin,
      X: x,
      YOUTUBE_SHORTS: youtubeShorts,
    };
  }

  get(platformKey: string): PlatformOptimizer | null {
    return this.optimizers[platformKey.toUpperCase()] || null;
  }

  all(): PlatformOptimizer[] {
    return Object.values(this.optimizers);
  }

  supportedPlatforms(): string[] {
    return Object.keys(this.optimizers);
  }
}
