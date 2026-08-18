/**
 * Provider-agnostic message/result shapes for the AI Layer. Every provider
 * adapter (Groq, Gemini, and any future one — OpenAI, Anthropic, DeepSeek,
 * ...) speaks this shape; the rest of the application never sees a
 * provider-specific request/response format. This is what makes swapping
 * or adding a provider a config + one new adapter file, not a refactor of
 * AiService, EngineService, or anything downstream.
 */
export type AiMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: AiMessageContent;
}

export interface AiCompletionOptions {
  /** Floor/ceiling requested by the caller; adapters may raise the floor
   *  for their own model quirks (e.g. a "thinking" model that needs budget
   *  for its reasoning block before the real answer). */
  maxTokens: number;
  /** Per-call wall-clock bound in ms. Every adapter must respect this so a
   *  slow/hung provider always loses to the next provider (or the static
   *  fallback template) well before Vercel's own platform timeout. */
  timeoutMs: number;
}

export interface AiCompletionResult {
  text: string;
  /** Raw provider response, kept only for logging/debugging -- callers
   *  should never depend on its shape. */
  raw?: unknown;
  /**
   * Real token count reported by the provider for this call (Groq:
   * usage.total_tokens; Gemini: usageMetadata.totalTokenCount), normalized
   * to one provider-agnostic field so AiUsageLog can record actual cost
   * data rather than a guess. Undefined if the provider's response didn't
   * include usage data -- callers should record that honestly (e.g. 0 or
   * null) rather than substituting a made-up number.
   */
  tokensUsed?: number;
}

/**
 * One adapter per provider. Adapters own exactly two things: (1) turning
 * AiChatMessage[] into that provider's wire format and making the HTTP
 * call, and (2) provider-specific response quirks (e.g. Groq's qwen model
 * leaking <think>...</think> reasoning text that must be stripped before
 * the caller ever sees it). Everything else -- which provider to try,
 * which key to use, retries, timeouts as a policy, structured logging --
 * belongs to AiGatewayService / ApiKeyManagerService, not here.
 */
export interface AiProviderAdapter {
  readonly name: string;
  /** Whether multiple API keys can be round-robined for this provider
   *  (true for key-based REST providers like Groq; false for providers
   *  where the SDK/client is constructed once with a single key, like the
   *  current Gemini integration). */
  readonly supportsMultipleKeys: boolean;

  isConfigured(): boolean;

  /**
   * Executes one completion call. `apiKey` is only passed for
   * multi-key-capable adapters (ApiKeyManagerService resolves which key to
   * use) -- single-key adapters read their key from env directly. Must
   * throw on any failure (network, non-2xx, empty response) rather than
   * returning null, so AiGatewayService can distinguish "this key/provider
   * failed, try the next one" from "this is the final answer, possibly
   * empty."
   */
  complete(
    messages: AiChatMessage[],
    options: AiCompletionOptions,
    apiKey?: string,
  ): Promise<AiCompletionResult>;
}
