import { Injectable, Logger } from '@nestjs/common';
import {
  AiChatMessage,
  AiCompletionOptions,
  AiCompletionResult,
  AiProviderAdapter,
} from '../interfaces/ai-provider.interface';
import { withTimeout } from '../util/with-timeout';

/**
 * Groq Chat Completions adapter (OpenAI-compatible REST shape, plain
 * fetch — no SDK dependency, consistent with the rest of this codebase).
 * Multi-key capable: ApiKeyManagerService resolves which of the
 * configured GROQ_API_KEY[_N] values to use per call and passes it in.
 *
 * qwen/qwen3.6-27b is used for every call (vision and text alike) because
 * it's multimodal, so one model/endpoint covers both analyzeImage and the
 * pure-text caption/hashtag calls. It's also a "thinking" model that
 * emits a visible <think>...</think> chain-of-thought block before its
 * real answer -- this was found leaking raw reasoning text into
 * production captions (real AiUsageLog rows), so stripping it here is
 * load-bearing production behavior, not cosmetic.
 */
@Injectable()
export class GroqProvider implements AiProviderAdapter {
  readonly name = 'groq';
  readonly supportsMultipleKeys = true;
  private readonly logger = new Logger(GroqProvider.name);
  private static readonly MODEL = 'qwen/qwen3.6-27b';
  // A tight token budget (e.g. 30 for a short vision caption) can be
  // entirely consumed by the <think> block, leaving nothing for the real
  // answer -- every Groq call gets at least this much headroom regardless
  // of what the caller asked for.
  private static readonly MIN_TOKENS = 600;

  isConfigured(): boolean {
    // At least one GROQ_API_KEY[_N] present is enough to consider the
    // provider configured; ApiKeyManagerService is the source of truth for
    // exactly which keys exist.
    return !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'placeholder');
  }

  async complete(
    messages: AiChatMessage[],
    options: AiCompletionOptions,
    apiKey?: string,
  ): Promise<AiCompletionResult> {
    if (!apiKey) throw new Error('Groq call made without a resolved API key.');

    const maxTokens = Math.max(options.maxTokens, GroqProvider.MIN_TOKENS);

    const response = await withTimeout(
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: GroqProvider.MODEL, messages, max_tokens: maxTokens }),
      }),
      options.timeoutMs,
      'Groq completion',
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Groq ${response.status}: ${errText || 'request failed'}`);
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

    return { text: cleaned, raw: data };
  }
}
