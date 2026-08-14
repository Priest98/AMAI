import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiLayerModule } from '../ai-layer/ai-layer.module';

// AiController (POST /ai/generate-caption, /ai/generate-hashtags, GET
// /ai/best-time) was removed during the V2 full-system audit: it had zero
// route guards (no JwtAuthGuard, no BrandAccessGuard, no EntitlementGuard),
// accepted a client-supplied brandId with a 'primary_brand' fallback
// straight from the request body, and had zero references anywhere in
// apps/web -- a completely dead, unauthenticated surface that let anyone
// burn the app's AI provider quota for free and bypass the entitlement
// system entirely (the exact "Free user bypasses limits by calling the API
// directly" failure mode the billing spec explicitly warns against). All
// real AI generation goes through the brand-scoped, fully-guarded pipeline
// in engine.service.ts instead. AiService itself is still used (exported
// below, consumed by EngineModule) -- only the orphaned controller is gone.
@Module({
  imports: [AiLayerModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
