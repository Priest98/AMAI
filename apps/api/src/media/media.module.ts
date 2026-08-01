import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { EngineModule } from '../engine/engine.module';
import { MediaOptimizationModule } from '../media-optimization/media-optimization.module';

@Module({
  imports: [EngineModule, MediaOptimizationModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
