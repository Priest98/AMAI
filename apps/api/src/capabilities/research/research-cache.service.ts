import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  assertMarketIntelligence,
  MarketIntelligence,
  ResearchRequest,
} from './research.types';

type CachedIntelligence = { intelligence: MarketIntelligence; stale: boolean };

@Injectable()
export class ResearchCacheService {
  constructor(private readonly prisma: PrismaService) {}

  queryHash(request: ResearchRequest, provider = 'any'): string {
    const normalized = {
      provider,
      topic: request.topic.trim().toLocaleLowerCase(),
      timeWindow: request.timeWindow ?? '30d',
      locale: request.locale?.trim().toLocaleLowerCase() ?? '',
      platforms: [...(request.platforms ?? [])].map((value) => value.toLowerCase()).sort(),
      competitorHandles: [...(request.competitorHandles ?? [])].map((value) => value.toLowerCase()).sort(),
      policyVersion: 1,
    };
    return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  }

  async read(
    organizationId: string,
    brandId: string,
    queryHash: string,
    allowStale: boolean,
  ): Promise<CachedIntelligence | null> {
    const staleTtlHours = positiveNumber(process.env.MARKET_INTELLIGENCE_STALE_TTL_HOURS, 168);
    const oldestAllowed = new Date(Date.now() - staleTtlHours * 60 * 60 * 1000);
    const row = await this.prisma.marketIntelligenceSnapshot.findFirst({
      where: {
        organizationId,
        brandId,
        queryHash,
        status: 'SUCCESS',
        ...(allowStale
          ? { generatedAt: { gt: oldestAllowed } }
          : { expiresAt: { gt: new Date() } }),
      },
      orderBy: { generatedAt: 'desc' },
    });
    if (!row) return null;
    const payload: unknown = row.payload;
    assertMarketIntelligence(payload);
    return { intelligence: payload, stale: row.expiresAt.getTime() <= Date.now() };
  }

  async write(
    organizationId: string,
    brandId: string,
    provider: string,
    queryHash: string,
    intelligence: MarketIntelligence,
  ): Promise<void> {
    const cacheTtlHours = positiveNumber(process.env.MARKET_INTELLIGENCE_CACHE_TTL_HOURS, 24);
    const maximumExpiry = Date.now() + cacheTtlHours * 60 * 60 * 1000;
    const providerExpiry = new Date(intelligence.expiresAt).getTime();
    const expiresAt = new Date(Math.min(providerExpiry, maximumExpiry));
    await this.prisma.marketIntelligenceSnapshot.upsert({
      where: { organizationId_brandId_provider_queryHash: { organizationId, brandId, provider, queryHash } },
      create: {
        organizationId,
        brandId,
        provider,
        queryHash,
        topic: intelligence.topic,
        timeWindow: intelligence.timeWindow,
        payload: intelligence as any,
        sourceSummary: intelligence.sources.map(({ url, platform, capturedAt }) => ({ url, platform, capturedAt })),
        confidence: intelligence.confidence,
        status: 'SUCCESS',
        generatedAt: new Date(intelligence.generatedAt),
        expiresAt,
      },
      update: {
        payload: intelligence as any,
        sourceSummary: intelligence.sources.map(({ url, platform, capturedAt }) => ({ url, platform, capturedAt })),
        confidence: intelligence.confidence,
        status: 'SUCCESS',
        generatedAt: new Date(intelligence.generatedAt),
        expiresAt,
      },
    });
  }
}

function positiveNumber(raw: string | undefined, fallback: number): number {
  const value = Number(raw ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
