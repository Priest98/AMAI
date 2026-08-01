import { Injectable, Logger } from '@nestjs/common';
import { AiChatMessage, AiProviderAdapter } from './interfaces/ai-provider.interface';
import { ApiKeyManagerService } from './key-manager/api-key-manager.service';
import { GroqProvider } from './providers/groq.provider';
import { GeminiProvider } from './providers/gemini.provider';

export interface AiGatewayRequest {
  messages: AiChatMessage[];
  maxTokens: number;
  /** Short human-readable label for logs, e.g. "caption generation". */
  label: string;
  timeoutMs?: number;
}

export interface AiGatewayResult {
  text: string;
  provider: string;
  keyLabel?: string;
  elapsedMs: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
// A single multi-key provider (Groq) is capped at this many key attempts
// per request so a provider with many benched keys can't turn one AI call
// into a long serial chain of failures before falling through to the next
// provider -- 3 covers "one bad key" without meaningfully delaying the
// pipeline's overall budget.
const MAX_KEY_ATTEMPTS_PER_PROVIDER = 3;

/**
 * The single entry point every AI request in the application goes
 * through. Owns: which providers exist and in what priority order,
 * resolving a key via ApiKeyManagerService for multi-key providers,
 * per-call timeouts, retrying across keys/providers on failure, and
 * structured logging of every stage. AiService (the AMAI-Engine-facing
 * façade) and anything else that needs an AI completion call this and
 * this alone -- nothing downstream ever talks to fetch()/an SDK directly.
 *
 * Provider order is configurable via AI_PROVIDER_ORDER (comma-separated,
 * e.g. "groq,gemini,openai") and defaults to "groq,gemini" -- Groq first
 * because its free tier (14,400 req/day) dwarfs Gemini's (20 req/day/model)
 * at this app's actual volumes, confirmed via production 429s earlier in
 * this project. Adding a new provider is: write an adapter implementing
 * AiProviderAdapter, register it in `this.providers` below, and optionally
 * add it to AI_PROVIDER_ORDER -- no changes anywhere else in the app.
 */
@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);
  private readonly providers: Record<string, AiProviderAdapter>;

  constructor(
    private keyManager: ApiKeyManagerService,
    groqProvider: GroqProvider,
    geminiProvider: GeminiProvider,
  ) {
    this.providers = {
      groq: groqProvider,
      gemini: geminiProvider,
    };
  }

  private providerOrder(): string[] {
    const configured = (process.env.AI_PROVIDER_ORDER || 'groq,gemini')
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    return configured.filter((p) => this.providers[p]);
  }

  /**
   * Runs one AI request through the provider chain. Returns null (never
   * throws) once every provider/key combination has been exhausted, so
   * callers can fall through to their own static fallback exactly as
   * before -- this preserves the existing "AI is best-effort, the app
   * always has a deterministic backstop" behavior end to end.
   */
  async generate(req: AiGatewayRequest): Promise<AiGatewayResult | null> {
    const start = Date.now();
    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.logger.log(`[${req.label}] request received`);

    for (const providerName of this.providerOrder()) {
      const provider = this.providers[providerName];
      if (!provider.isConfigured()) continue;

      this.logger.log(`[${req.label}] provider selected: ${providerName}`);

      if (provider.supportsMultipleKeys) {
        const result = await this.tryMultiKeyProvider(provider, providerName, req, timeoutMs);
        if (result) {
          this.logger.log(`[${req.label}] request completed via ${providerName} in ${Date.now() - start}ms`);
          return { ...result, elapsedMs: Date.now() - start };
        }
        continue;
      }

      const attemptStart = Date.now();
      try {
        const result = await provider.complete(req.messages, { maxTokens: req.maxTokens, timeoutMs });
        this.logger.log(`[${req.label}] response received from ${providerName} in ${Date.now() - attemptStart}ms`);
        this.logger.log(`[${req.label}] request completed via ${providerName} in ${Date.now() - start}ms`);
        return { text: result.text, provider: providerName, elapsedMs: Date.now() - start };
      } catch (error: any) {
        const message = error?.message || `Unknown ${providerName} error`;
        this.logger.warn(`[${req.label}] failure handled: ${providerName} — ${message}`);
      }
    }

    this.logger.warn(`[${req.label}] request completed with no provider able to answer, in ${Date.now() - start}ms`);
    return null;
  }

  private async tryMultiKeyProvider(
    provider: AiProviderAdapter,
    providerName: string,
    req: AiGatewayRequest,
    timeoutMs: number,
  ): Promise<{ text: string; provider: string; keyLabel: string } | null> {
    for (let attempt = 0; attempt < MAX_KEY_ATTEMPTS_PER_PROVIDER; attempt++) {
      const key = await this.keyManager.getNextKey(providerName);
      if (!key) return null; // provider claims configured but no usable key found

      this.logger.log(`[${req.label}] api key selected: ${key.label} (attempt ${attempt + 1}/${MAX_KEY_ATTEMPTS_PER_PROVIDER})`);
      const attemptStart = Date.now();
      try {
        const result = await provider.complete(req.messages, { maxTokens: req.maxTokens, timeoutMs }, key.value);
        this.logger.log(`[${req.label}] response received from ${providerName}:${key.label} in ${Date.now() - attemptStart}ms`);
        this.keyManager.reportSuccess(providerName, key.label);
        return { text: result.text, provider: providerName, keyLabel: key.label };
      } catch (error: any) {
        const message = error?.message || `Unknown ${providerName} error`;
        this.keyManager.reportFailure(providerName, key.label, message);
        this.logger.warn(`[${req.label}] failure handled: ${providerName}:${key.label} — ${message}`);
        if (attempt < MAX_KEY_ATTEMPTS_PER_PROVIDER - 1) {
          this.logger.log(`[${req.label}] retry executed: trying next ${providerName} key`);
        }
      }
    }
    return null;
  }
}
