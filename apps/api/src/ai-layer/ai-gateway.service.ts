import { Injectable, Logger } from '@nestjs/common';
import { AiChatMessage, AiProviderAdapter, AiProviderRequestError } from './interfaces/ai-provider.interface';
import { ApiKeyManagerService } from './key-manager/api-key-manager.service';
import { GroqProvider } from './providers/groq.provider';
import { GeminiProvider } from './providers/gemini.provider';

export interface AiGatewayRequest {
  messages: AiChatMessage[];
  maxTokens: number;
  /** Short human-readable label for logs, e.g. "caption generation". */
  label: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Semantic validation belongs to the caller; rejection advances providers. */
  validate?: (text: string) => boolean;
}

export interface AiGatewayResult {
  text: string;
  provider: string;
  keyLabel?: string;
  elapsedMs: number;
  /** Real token count reported by the provider, when it reported one — see AiCompletionResult.tokensUsed. */
  tokensUsed?: number;
  model?: string;
  estimatedCostUsd?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
// A single multi-key provider (Groq) is capped at this many key attempts
// per request so a provider with many benched keys can't turn one AI call
// into a long serial chain of failures before falling through to the next
// provider -- 3 covers "one bad key" without meaningfully delaying the
// pipeline's overall budget.
const configuredAttempts = Number(process.env.AI_MAX_KEY_ATTEMPTS_PER_PROVIDER || 1);
const MAX_KEY_ATTEMPTS_PER_PROVIDER = Number.isFinite(configuredAttempts)
  ? Math.max(1, Math.min(3, Math.floor(configuredAttempts))) : 1;

/**
 * The single entry point every AI request in the application goes
 * through. Owns: which providers exist and in what priority order,
 * resolving a key via ApiKeyManagerService for multi-key providers,
 * per-call timeouts, retrying across keys/providers on failure, and
 * structured logging of every stage. AiService (the Oyinca-facing
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

  private logProviderFailure(
    label: string,
    provider: AiProviderAdapter,
    error: unknown,
    durationMs: number,
    keyLabel?: string,
  ): void {
    const typed = error instanceof AiProviderRequestError ? error : null;
    const rawMessage = error instanceof Error ? error.message : 'Unknown provider failure';
    const message = rawMessage
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
      .replace(/(api[_-]?key|token|secret)\s*[=:]\s*[^\s,}]+/gi, '$1=[REDACTED]')
      .slice(0, 500);
    this.logger.warn(JSON.stringify({
      event: 'ai_provider_request',
      operation: label,
      provider: provider.name,
      model: provider.model,
      status: 'failed',
      httpStatus: typed?.details.httpStatus,
      errorCode: typed?.details.code,
      errorType: typed?.details.type || (error instanceof Error ? error.name : 'unknown'),
      message,
      requestId: typed?.details.requestId,
      retryAfter: typed?.details.retryAfter,
      timeout: typed?.details.timeout || /timed out|abort/i.test(message),
      durationMs,
      keyLabel,
    }));
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
      req.signal?.throwIfAborted();
      const needsVideo = req.messages.some((message) => Array.isArray(message.content) && message.content.some((part) => part.type === 'video_url'));
      if (needsVideo && providerName !== 'gemini') continue;
      const provider = this.providers[providerName];
      if (!provider.isConfigured()) continue;

      this.logger.log(`[${req.label}] provider selected: ${providerName}`);

      if (provider.supportsMultipleKeys) {
        const result = await this.tryMultiKeyProvider(provider, providerName, req, timeoutMs);
        if (result) {
          if (req.validate && !req.validate(result.text)) {
            this.logProviderFailure(req.label, provider, new Error('Provider returned an invalid structured response.'), Date.now() - start, result.keyLabel);
            continue;
          }
          this.logger.log(JSON.stringify({
            event: 'ai_provider_request', operation: req.label, provider: providerName,
            model: provider.model, status: 'success', durationMs: Date.now() - start,
            keyLabel: result.keyLabel,
          }));
          return { ...result, model: provider.model, estimatedCostUsd: this.estimateCost(providerName, result.tokensUsed), elapsedMs: Date.now() - start };
        }
        continue;
      }

      const attemptStart = Date.now();
      try {
        const result = await provider.complete(req.messages, { maxTokens: req.maxTokens, timeoutMs, signal: req.signal });
        if (req.validate && !req.validate(result.text)) throw new Error('Provider returned an invalid structured response.');
        this.logger.log(JSON.stringify({
          event: 'ai_provider_request', operation: req.label, provider: providerName,
          model: provider.model, status: 'success', durationMs: Date.now() - attemptStart,
        }));
        return { text: result.text, provider: providerName, model: provider.model, estimatedCostUsd: this.estimateCost(providerName, result.tokensUsed), elapsedMs: Date.now() - start, tokensUsed: result.tokensUsed };
      } catch (error: any) {
        this.logProviderFailure(req.label, provider, error, Date.now() - attemptStart);
      }
    }

    this.logger.warn(JSON.stringify({
      event: 'ai_gateway_request', operation: req.label,
      status: 'all_providers_failed', durationMs: Date.now() - start,
    }));
    return null;
  }

  private estimateCost(provider: string, tokensUsed?: number): number | undefined {
    if (tokensUsed == null) return undefined;
    const configured = Number(process.env[`AI_ESTIMATED_COST_PER_MILLION_TOKENS_${provider.toUpperCase()}`]);
    if (!Number.isFinite(configured) || configured < 0) return undefined;
    return Number(((tokensUsed / 1_000_000) * configured).toFixed(8));
  }

  private async tryMultiKeyProvider(
    provider: AiProviderAdapter,
    providerName: string,
    req: AiGatewayRequest,
    timeoutMs: number,
  ): Promise<{ text: string; provider: string; keyLabel: string; tokensUsed?: number } | null> {
    for (let attempt = 0; attempt < MAX_KEY_ATTEMPTS_PER_PROVIDER; attempt++) {
      const key = await this.keyManager.getNextKey(providerName);
      if (!key) return null; // provider claims configured but no usable key found

      this.logger.log(`[${req.label}] api key selected: ${key.label} (attempt ${attempt + 1}/${MAX_KEY_ATTEMPTS_PER_PROVIDER})`);
      const attemptStart = Date.now();
      try {
        req.signal?.throwIfAborted();
        const result = await provider.complete(req.messages, { maxTokens: req.maxTokens, timeoutMs, signal: req.signal }, key.value);
        this.logger.log(`[${req.label}] response received from ${providerName}:${key.label} in ${Date.now() - attemptStart}ms`);
        this.keyManager.reportSuccess(providerName, key.label);
        return { text: result.text, provider: providerName, keyLabel: key.label, tokensUsed: result.tokensUsed };
      } catch (error: any) {
        const message = error?.message || `Unknown ${providerName} error`;
        this.keyManager.reportFailure(providerName, key.label, message);
        this.logProviderFailure(req.label, provider, error, Date.now() - attemptStart, key.label);
        // A missing model is provider-wide, so rotating credentials only
        // repeats the same request and delays the configured fallback.
        if (error instanceof AiProviderRequestError && error.details.code === 'model_not_found') {
          break;
        }
        if (attempt < MAX_KEY_ATTEMPTS_PER_PROVIDER - 1) {
          this.logger.log(`[${req.label}] retry executed: trying next ${providerName} key`);
        }
      }
    }
    return null;
  }
}
