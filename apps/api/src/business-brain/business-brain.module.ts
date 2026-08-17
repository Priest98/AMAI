import { Module } from '@nestjs/common';
import { BusinessBrainService } from './business-brain.service';
import { BusinessBrainController } from './business-brain.controller';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [AiModule, BillingModule],
  controllers: [BusinessBrainController],
  providers: [BusinessBrainService],
  exports: [BusinessBrainService],
})
export class BusinessBrainModule {}
