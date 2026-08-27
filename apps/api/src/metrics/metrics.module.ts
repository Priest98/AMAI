import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { LearningService } from './learning.service';

@Module({
  providers: [MetricsService, LearningService],
  exports: [MetricsService, LearningService],
})
export class MetricsModule {}
