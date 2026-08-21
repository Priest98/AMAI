import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';

/**
 * TelegramService has no dependencies of its own (just env vars + fetch),
 * so it gets its own tiny module rather than living inside AdminModule or
 * HealthModule specifically -- both of those need it (AdminModule's
 * ErrorCaptureService for reactive alerts, HealthModule's
 * HealthEngineService for proactive alerts), and neither should have to
 * import the other just to share one stateless sender.
 */
@Module({
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
