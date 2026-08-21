import { Module } from '@nestjs/common';
import { HealthEngineService } from './health-engine.service';
import { TelegramModule } from '../common/telegram.module';

/**
 * Standalone module so HealthEngineService has exactly one instance
 * shared by both consumers: CronController (engine.module.ts -- the
 * scheduled /api/cron/health-check hit) and AdminModule (the dashboard's
 * "run a check now" / System Health endpoints). Neither imports the
 * other's module, so this lives on its own rather than being bolted onto
 * either -- avoids a circular import and avoids a second HealthEngineService
 * instance with its own accidental state.
 */
@Module({
  imports: [TelegramModule],
  providers: [HealthEngineService],
  exports: [HealthEngineService],
})
export class HealthModule {}
