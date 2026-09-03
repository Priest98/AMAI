import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { LearningService } from './learning.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [MetricsService, LearningService],
  exports: [MetricsService, LearningService],
})
export class MetricsModule {}
