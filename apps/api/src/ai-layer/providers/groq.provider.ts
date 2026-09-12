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
 * qwen/qwen3.6-27b is used for vision and text. Its reasoning mode must be
 * disabled for product copy: otherwise a short completion budget can be
 * consumed by hidden work before the caption begins, and the larger budget
 * needed to compensate exhausts Groq's output-token quota under a small
 * burst. Groq supports reasoning_effort=none and reasoning_format=hidden
 * for this model, so request the final answer directly.
 */
@Injectable()
export class GroqProvider implements AiProviderAdapter {
  readonly name = 'groq';
  readonly model = process.env.GROQ_MODEL || GroqProvider.MODEL;
  readonly supportsMultipleKeys = true;
  private readonly logger = new Logger(GroqProvider.name);
  private static readonly MODEL = 'qwen/qwen3.6-27b';

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

    const response = await withTimeout(
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(options.timeoutMs),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || GroqProvider.MODEL,
          messages,
          max_completion_tokens: options.maxTokens,
          reasoning_effort: 'none',
          reasoning_format: 'hidden',
        }),
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

    const tokensUsed = typeof data?.usage?.total_tokens === 'number' ? data.usage.total_tokens : undefined;
    return { text: cleaned, raw: data, tokensUsed };
  }
}
