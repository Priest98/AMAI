import { Module } from '@nestjs/common';
import { EngineService } from './engine.service';
import { EngineController } from './engine.controller';
import { EngineJobsService } from './engine-jobs.service';
import { GoogleDriveService } from './google-drive.service';
import { SchedulingService } from './scheduling.service';
import { AiModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { CronController } from '../cron/cron.controller';

@Module({
  imports: [AiModule, QueueModule, EncryptionModule],
  controllers: [EngineController, CronController],
  providers: [EngineService, EngineJobsService, GoogleDriveService, SchedulingService],
  exports: [EngineService],
})
export class EngineModule {}
