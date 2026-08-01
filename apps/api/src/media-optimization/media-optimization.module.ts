import { Module } from '@nestjs/common';
import { MediaOptimizationService } from './media-optimization.service';
import { OptimizerRegistryService } from './optimizers/optimizer-registry.service';
import { ImageOptimizationEngine } from './engines/image-optimization.engine';
import { VideoOptimizationEngine } from './engines/video-optimization.engine';
import { InstagramOptimizer } from './optimizers/instagram.optimizer';
import { TikTokOptimizer } from './optimizers/tiktok.optimizer';
import { FacebookOptimizer } from './optimizers/facebook.optimizer';
import { LinkedInOptimizer } from './optimizers/linkedin.optimizer';
import { XOptimizer } from './optimizers/x.optimizer';
import { YouTubeShortsOptimizer } from './optimizers/youtube-shorts.optimizer';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [
    MediaOptimizationService,
    OptimizerRegistryService,
    ImageOptimizationEngine,
    VideoOptimizationEngine,
    InstagramOptimizer,
    TikTokOptimizer,
    FacebookOptimizer,
    LinkedInOptimizer,
    XOptimizer,
    YouTubeShortsOptimizer,
  ],
  exports: [MediaOptimizationService],
})
export class MediaOptimizationModule {}
