import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrainDecisionRecord } from './brain-decision.types';

const SAFE_CODE = /^[a-z0-9][a-z0-9._-]{0,99}$/;

@Injectable()
export class BrainDecisionTraceService {
  private readonly logger = new Logger(BrainDecisionTraceService.name);
  constructor(private readonly prisma: PrismaService) {}

  /** Observability is best-effort and can never fail the product action. */
  async record(input: BrainDecisionRecord): Promise<boolean> {
    try {
      const codes = input.reasonCodes.filter((code) => SAFE_CODE.test(code)).slice(0, 20);
      if (!input.organizationId || !input.brandId || !input.correlationId || !input.decision || !codes.length) return false;
      await this.prisma.brainDecision.create({ data: {
        organizationId: input.organizationId,
        brandId: input.brandId,
        correlationId: input.correlationId,
        objective: input.objective.slice(0, 200),
        decision: input.decision.slice(0, 100),
        reasonCodes: codes,
        skillsUsed: (input.skillsUsed ?? []).filter((value) => SAFE_CODE.test(value)).slice(0, 20),
        providersUsed: (input.providersUsed ?? []).filter((value) => SAFE_CODE.test(value)).slice(0, 20),
        model: input.model?.slice(0, 100),
        contextSections: (input.contextSections ?? []).filter((value) => SAFE_CODE.test(value)).slice(0, 20),
        latencyMs: Math.max(0, Math.round(input.latencyMs)),
        tokensUsed: input.tokensUsed == null ? undefined : Math.max(0, Math.round(input.tokensUsed)),
        estimatedCostUsd: input.estimatedCostUsd == null ? undefined : Math.max(0, input.estimatedCostUsd),
        outcome: input.outcome,
      } });
      return true;
    } catch (error) {
      this.logger.warn(`Brain decision trace could not be persisted: ${error instanceof Error ? error.message : 'unknown error'}`);
      return false;
    }
  }
}

