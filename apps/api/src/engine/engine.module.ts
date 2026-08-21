import { Module } from '@nestjs/common';
import { EngineService } from './engine.service';
import { EngineController } from './engine.controller';
import { EngineJobsService } from './engine-jobs.service';
import { GoogleDriveService } from './google-drive.service';
import { SchedulingService } from './scheduling.service';
import { SupabaseRealtimeService } from './supabase-realtime.service';
import { AiModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { CronController } from '../cron/cron.controller';
import { BusinessBrainModule } from '../business-brain/business-brain.module';
import { BillingModule } from '../billing/billing.module';
import { MediaOptimizationModule } from '../media-optimization/media-optimization.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [AiModule, QueueModule, EncryptionModule, BusinessBrainModule, BillingModule, MediaOptimizationModule, HealthModule],
  controllers: [EngineController, CronController],
  providers: [EngineService, EngineJobsService, GoogleDriveService, SchedulingService, SupabaseRealtimeService],
  exports: [EngineService],
})
export class EngineModule {}
