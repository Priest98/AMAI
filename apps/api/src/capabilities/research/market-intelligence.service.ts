import { BadRequestException, Injectable } from '@nestjs/common';
import { CapabilityRegistryService } from '../capability-registry.service';
import { CapabilityExecutionContext } from '../interfaces/capability-execution.types';
import { ResearchCacheService } from './research-cache.service';
import {
  MarketIntelligence,
  MarketIntelligenceResult,
  ResearchRequest,
} from './research.types';

@Injectable()
export class MarketIntelligenceService {
  constructor(
    private readonly registry: CapabilityRegistryService,
    private readonly cache: ResearchCacheService,
  ) {}

  async research(
    request: ResearchRequest,
    context: CapabilityExecutionContext,
  ): Promise<MarketIntelligenceResult> {
    this.validateRequest(request, context);
    const brandId = context.brandId!;
    const queryHash = this.cache.queryHash(request);
    const fresh = await this.cache.read(context.organizationId, brandId, queryHash, false);
    if (fresh) return { state: 'cached', intelligence: fresh.intelligence };

    const execution = await this.registry.execute<ResearchRequest, MarketIntelligence>(
      'research',
      { ...request, topic: request.topic.trim(), timeWindow: request.timeWindow ?? '30d' },
      context,
    );
    if (execution.state === 'completed' && execution.value && execution.providerId) {
      await this.cache.write(
        context.organizationId,
        brandId,
        execution.providerId,
        queryHash,
        execution.value,
      );
      return { state: 'fresh', intelligence: execution.value, providerId: execution.providerId };
    }

    const stale = await this.cache.read(context.organizationId, brandId, queryHash, true);
    if (stale) return { state: 'stale', intelligence: stale.intelligence };
    return { state: execution.state === 'disabled' ? 'disabled' : 'unavailable' };
  }

  private validateRequest(request: ResearchRequest, context: CapabilityExecutionContext): void {
    const topicLength = request.topic?.trim().length ?? 0;
    if (topicLength < 3 || topicLength > 300) throw new BadRequestException('Research topic must be 3-300 characters');
    if (!context.organizationId || !context.brandId || !context.correlationId) {
      throw new BadRequestException('Research requires organization, brand, and correlation context');
    }
    if ((request.platforms?.length ?? 0) > 10 || (request.competitorHandles?.length ?? 0) > 20) {
      throw new BadRequestException('Research request exceeds source limits');
    }
  }
}

