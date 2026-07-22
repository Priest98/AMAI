import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AutoPilotCron } from './autopilot.cron';
import { GoogleDriveService } from './google-drive.service';
import { AutoPilotService } from './autopilot.service';
import { AutoPilotController } from './autopilot.controller';
import { AiModule } from '../ai/ai.module';
import { AiService } from '../ai/ai.service';
import { QueueModule } from '../queue/queue.module';
import { GrowthModule } from '../growth/growth.module';

@Module({
  imports: [ScheduleModule.forRoot(), AiModule, QueueModule, GrowthModule],
  controllers: [AutoPilotController],
  providers: [AutoPilotCron, GoogleDriveService, AutoPilotService, AiService],
})
export class AutoPilotModule {}
