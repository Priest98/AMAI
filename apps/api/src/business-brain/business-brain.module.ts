import { Module } from '@nestjs/common';
import { BusinessBrainService } from './business-brain.service';
import { BusinessBrainController } from './business-brain.controller';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { ContextPackService } from './context/context-pack.service';
import { SkillSelectorService } from './skills/skill-selector.service';
import { CapabilitiesModule } from '../capabilities/capabilities.module';

@Module({
  imports: [AiModule, BillingModule, CapabilitiesModule],
  controllers: [BusinessBrainController],
  providers: [BusinessBrainService, ContextPackService, SkillSelectorService],
  exports: [BusinessBrainService, ContextPackService, SkillSelectorService],
})
export class BusinessBrainModule {}
