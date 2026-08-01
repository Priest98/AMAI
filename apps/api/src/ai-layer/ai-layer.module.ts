import { Module } from '@nestjs/common';
import { AiGatewayService } from './ai-gateway.service';
import { ApiKeyManagerService } from './key-manager/api-key-manager.service';
import { GroqProvider } from './providers/groq.provider';
import { GeminiProvider } from './providers/gemini.provider';

/**
 * The AI Layer: provider abstraction + gateway + key manager. This is the
 * only module that knows Groq/Gemini/etc. exist as concrete things — it
 * exports just AiGatewayService, which is the sole surface the rest of the
 * app (via AiModule/AiService) is allowed to depend on.
 */
@Module({
  providers: [AiGatewayService, ApiKeyManagerService, GroqProvider, GeminiProvider],
  exports: [AiGatewayService],
})
export class AiLayerModule {}
