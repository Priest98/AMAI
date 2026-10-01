import { Injectable } from '@nestjs/common';
import {
  AiChatMessage,
  AiCompletionOptions,
  AiCompletionResult,
  AiProviderAdapter,
  AiProviderRequestError,
} from '../interfaces/ai-provider.interface';
import { withTimeout } from '../util/with-timeout';

/**
 * Groq Chat Completions adapter (OpenAI-compatible REST shape, plain
 * fetch — no SDK dependency, consistent with the rest of this codebase).
 * Multi-key capable: ApiKeyManagerService resolves which of the
 * configured GROQ_API_KEY[_N] values to use per call and passes it in.
 *
 * qwen/qwen3.8-27b is used for vision and text. Its reasoning mode must be
 * disabled for product copy: otherwise a short completion budget can be
 * consumed by hidden work before the caption begins, and the larger budget
 * needed to compensate exhausts Groq's output-token quota under a small
 * burst. Groq supports reasoning_effort=none and reasoning_format=hidden
 * for this model, so request the final answer directly.
 */
@Injectable()
export class GroqProvider implements AiProviderAdapter {
  readonly name = 'groq';
  readonly model = GroqProvider.resolveModel(process.env.GROQ_MODEL);
  readonly supportsMultipleKeys = true;
  private static readonly MODEL = 'qwen/qwen3.8-27b';
  private static readonly RETIRED_MODELS: Record<string, string> = {
    'qwen/qwen3.6-27b': GroqProvider.MODEL,
  };

  private static resolveModel(configured?: string): string {
    const requested = configured?.trim() || GroqProvider.MODEL;
    return GroqProvider.RETIRED_MODELS[requested] || requested;
  }

  isConfigured(): boolean {
    // At least one GROQ_API_KEY[_N] present is enough to consider the
    // provider configured; ApiKeyManagerService is the source of truth for
    // exactly which keys exist.
    return Object.entries(process.env).some(([name, value]) => /^GROQ_API_KEY(?:_\d+)?$/.test(name) && !!value?.trim() && value !== 'placeholder');
  }

  async complete(
    messages: AiChatMessage[],
    options: AiCompletionOptions,
    apiKey?: string,
  ): Promise<AiCompletionResult> {
    if (!apiKey) throw new Error('Groq call made without a resolved API key.');

    const model = GroqProvider.resolveModel(process.env.GROQ_MODEL);
    const requestBody: Record<string, unknown> = {
      model,
      messages,
      max_completion_tokens: options.maxTokens,
    };
    // Groq rejects reasoning options on models that do not support them.
    // Qwen 3.8 explicitly supports instruct mode + hidden reasoning; an
    // operator-selected model receives only the portable parameters above.
    if (model === 'qwen/qwen3.8-27b') {
      requestBody.reasoning_effort = 'none';
      requestBody.reasoning_format = 'hidden';
    }

    const response = await withTimeout(
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(options.timeoutMs),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }),
      options.timeoutMs,
      'Groq completion',
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      let providerError: any = null;
      try {
        providerError = errText ? JSON.parse(errText)?.error : null;
      } catch {
        // Non-JSON provider bodies are intentionally not copied into logs.
      }
      throw new AiProviderRequestError(
        providerError?.message || `Groq request failed with HTTP ${response.status}.`,
        {
          httpStatus: response.status,
          code: providerError?.code,
          type: providerError?.type,
          requestId: response.headers.get('x-request-id') || undefined,
          retryAfter: response.headers.get('retry-after') || undefined,
        },
      );
    }

    const data: any = await response.json();
    const rawText: string | undefined = data?.choices?.[0]?.message?.content?.trim();
    if (!rawText) throw new Error('Groq returned an empty response.');

    const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // An unclosed <think> tag means the response was cut off mid-reasoning
    // (budget exhausted before the real answer) -- unusable. Throw so the
    // gateway treats this exactly like any other provider failure and
    // falls through, rather than shipping raw chain-of-thought text.
    if (cleaned.includes('<think>')) {
      throw new Error('Groq returned truncated reasoning with no final answer.');
    }
    if (cleaned.length === 0) throw new Error('Groq returned an empty response after cleanup.');

    const tokensUsed = typeof data?.usage?.total_tokens === 'number' ? data.usage.total_tokens : undefined;
    return { text: cleaned, raw: data, tokensUsed };
  }
}
