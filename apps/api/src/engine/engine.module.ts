import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EngineService } from './engine.service';
import { EngineController } from './engine.controller';
import { EngineCron } from './engine.cron';
import { GoogleDriveService } from './google-drive.service';
import { AiModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';
import { EncryptionModule } from '../encryption/encryption.module';

@Module({
  imports: [ScheduleModule.forRoot(), AiModule, QueueModule, EncryptionModule],
  controllers: [EngineController],
  providers: [EngineService, EngineCron, GoogleDriveService],
  exports: [EngineService],
})
export class EngineModule {}
