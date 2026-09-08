import { Module } from '@nestjs/common';
import { BusinessBrainService } from './business-brain.service';
import { BusinessBrainController } from './business-brain.controller';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { ContextPackService } from './context/context-pack.service';
import { SkillSelectorService } from './skills/skill-selector.service';
import { CapabilitiesModule } from '../capabilities/capabilities.module';
import { AiLayerModule } from '../ai-layer/ai-layer.module';
import { OyincaBrainService } from './oyinca-brain.service';

@Module({
  imports: [AiModule, AiLayerModule, BillingModule, CapabilitiesModule],
  controllers: [BusinessBrainController],
  providers: [BusinessBrainService, ContextPackService, SkillSelectorService, OyincaBrainService],
  exports: [BusinessBrainService, ContextPackService, SkillSelectorService, OyincaBrainService],
})
export class BusinessBrainModule {}
