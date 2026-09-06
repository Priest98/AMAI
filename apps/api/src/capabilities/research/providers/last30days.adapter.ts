import { Injectable } from '@nestjs/common';
import { CapabilityExecutionContext } from '../../interfaces/capability-execution.types';
import { ResearchProvider } from '../research-provider.interface';
import {
  assertMarketIntelligence,
  MarketIntelligence,
  ResearchRequest,
} from '../research.types';

const MAX_RESPONSE_BYTES = 1_000_000;

/**
 * A narrow HTTP boundary for a separately deployed, policy-approved
 * research service. It does not execute the upstream skill, shell commands,
 * browser automation, or platform-session credentials inside Oyinca.
 */
@Injectable()
export class Last30DaysAdapter implements ResearchProvider {
  readonly id = 'last30days-http';
  readonly capability = 'research' as const;
  readonly priority = 10;

  isAvailable(): boolean {
    return Boolean(this.baseUrl() && process.env.RESEARCH_PROVIDER_API_KEY);
  }

  async execute(
    request: ResearchRequest,
    context: CapabilityExecutionContext,
  ): Promise<MarketIntelligence> {
    const baseUrl = this.baseUrl();
    const apiKey = process.env.RESEARCH_PROVIDER_API_KEY;
    if (!baseUrl || !apiKey) throw new Error('Research provider is not configured');
    const configuredTimeout = Number(process.env.CAPABILITY_TIMEOUT_MS ?? 20_000);
    const timeoutMs = Math.min(
      context.deadlineMs ?? configuredTimeout,
      Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 20_000,
    );

    const response = await fetch(new URL('/v1/research', baseUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'x-correlation-id': context.correlationId,
      },
      body: JSON.stringify({
        topic: request.topic,
        timeWindow: request.timeWindow ?? '30d',
        locale: request.locale,
        platforms: request.platforms,
        competitorHandles: request.competitorHandles,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Research provider returned HTTP ${response.status}`);
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error('Research response is too large');

    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) throw new Error('Research response is too large');
    const value: unknown = JSON.parse(text);
    assertMarketIntelligence(value);
    return value;
  }

  private baseUrl(): string | null {
    const configured = process.env.RESEARCH_PROVIDER_BASE_URL;
    if (!configured) return null;
    try {
      const url = new URL(configured);
      const localDevelopment = process.env.NODE_ENV !== 'production'
        && ['localhost', '127.0.0.1'].includes(url.hostname);
      if (url.protocol !== 'https:' && !localDevelopment) return null;
      if (url.username || url.password) return null;
      return url.toString();
    } catch {
      return null;
    }
  }
}
