import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaProxyController } from './media-proxy.controller';
import { EngineModule } from '../engine/engine.module';
import { MediaOptimizationModule } from '../media-optimization/media-optimization.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [EngineModule, MediaOptimizationModule, BillingModule],
  controllers: [MediaController, MediaProxyController],
  providers: [MediaService],
})
export class MediaModule {}
