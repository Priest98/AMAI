import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import {
  AiChatMessage,
  AiCompletionOptions,
  AiCompletionResult,
  AiProviderAdapter,
} from '../interfaces/ai-provider.interface';
import { withTimeout } from '../util/with-timeout';

const MODEL = 'gemini-flash-latest';

/**
 * Gemini adapter. Single-key today (the @google/genai client is
 * constructed once from GEMINI_API_KEY at module init, matching the
 * original AiService's behavior) -- supportsMultipleKeys is false, so
 * ApiKeyManagerService never tries to round-robin this provider. Adding
 * multi-key support later is a matter of constructing the client per-call
 * with a resolved key instead of once at startup; not needed today since
 * this app only ever configures one Gemini key.
 *
 * Handles both text-only completions and vision calls (an `image_url`
 * content part gets downloaded and converted to Gemini's inlineData
 * base64 shape, since that's the only image input format its SDK accepts
 * — this mirrors exactly what the original AiService.analyzeImage did).
 */
@Injectable()
export class GeminiProvider implements AiProviderAdapter {
  readonly name = 'gemini';
  readonly supportsMultipleKeys = false;
  private readonly logger = new Logger(GeminiProvider.name);
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'placeholder' });
  }

  isConfigured(): boolean {
    return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'placeholder');
  }

  async complete(messages: AiChatMessage[], options: AiCompletionOptions): Promise<AiCompletionResult> {
    const contents = await this.toGeminiContents(messages, options.timeoutMs);

    const response = await withTimeout(
      this.client.models.generateContent({ model: MODEL, contents }),
      options.timeoutMs,
      'Gemini completion',
    );

    const text = response.text?.trim();
    if (!text) throw new Error('Gemini returned an empty response.');
    return { text, raw: response };
  }

  /**
   * Converts the provider-agnostic message array into Gemini's
   * `contents` shape. Only the last user message's content is used —
   * matches the original single-turn caption/vision calls this adapter
   * replaces (no multi-turn conversations exist in this app yet).
   */
  private async toGeminiContents(messages: AiChatMessage[], timeoutMs: number) {
    const last = messages[messages.length - 1];
    if (!last) throw new Error('Gemini call made with no messages.');

    if (typeof last.content === 'string') {
      return last.content;
    }

    const parts: any[] = [];
    for (const part of last.content) {
      if (part.type === 'text') {
        parts.push({ text: part.text });
      } else if (part.type === 'image_url') {
        const imageRes = await withTimeout(fetch(part.image_url.url), timeoutMs, 'Gemini image download');
        if (!imageRes.ok) throw new Error(`Could not download image for Gemini vision call (${imageRes.status}).`);
        const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await imageRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        parts.push({ inlineData: { mimeType, data: base64 } });
      }
    }
    return [{ role: 'user', parts }];
  }
}
