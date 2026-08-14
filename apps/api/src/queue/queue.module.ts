import { Module } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { MediaOptimizationModule } from '../media-optimization/media-optimization.module';
import { BillingModule } from '../billing/billing.module';

// Previously wired up BullMQ (BullModule.forRoot/registerQueue) here. That
// required a real Redis connection and a persistent worker process to pull
// delayed jobs, neither of which fits Vercel's serverless model. Publishing
// is now a plain synchronous service called by a Vercel Cron endpoint —
// see PublishingService and CronController.
@Module({
  imports: [MediaOptimizationModule, BillingModule],
  providers: [PublishingService],
  exports: [PublishingService],
})
export class QueueModule {}
