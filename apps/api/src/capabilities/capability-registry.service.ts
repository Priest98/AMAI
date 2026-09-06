import { Inject, Injectable, Logger } from '@nestjs/common';
import { CapabilityFlagsService } from './capability-flags.service';
import {
  CapabilityExecutionContext,
  CapabilityExecutionResult,
  CapabilityKind,
} from './interfaces/capability-execution.types';
import {
  CAPABILITY_PROVIDERS,
  CapabilityProvider,
} from './interfaces/capability-provider.interface';

const DEFAULT_DEADLINE_MS = 20_000;

@Injectable()
export class CapabilityRegistryService {
  private readonly logger = new Logger(CapabilityRegistryService.name);
  private readonly providersByCapability: Map<CapabilityKind, CapabilityProvider[]>;

  constructor(
    private readonly flags: CapabilityFlagsService,
    @Inject(CAPABILITY_PROVIDERS)
    providers: CapabilityProvider[] = [],
  ) {
    this.providersByCapability = new Map();
    for (const provider of providers) {
      const existing = this.providersByCapability.get(provider.capability) ?? [];
      if (existing.some((candidate) => candidate.id === provider.id)) {
        throw new Error(`Duplicate capability provider: ${provider.capability}/${provider.id}`);
      }
      existing.push(provider);
      existing.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
      this.providersByCapability.set(provider.capability, existing);
    }
  }

  list(capability: CapabilityKind): ReadonlyArray<Pick<CapabilityProvider, 'id' | 'capability' | 'priority'>> {
    return (this.providersByCapability.get(capability) ?? []).map(({ id, priority }) => ({
      id,
      capability,
      priority,
    }));
  }

  async execute<TRequest, TResult>(
    capability: CapabilityKind,
    request: TRequest,
    context: CapabilityExecutionContext,
  ): Promise<CapabilityExecutionResult<TResult>> {
    const startedAt = Date.now();
    if (!this.flags.isEnabled(capability)) {
      return { state: 'disabled', attempts: [], elapsedMs: Date.now() - startedAt };
    }

    const providers = this.providersByCapability.get(capability) ?? [];
    const attempts: string[] = [];
    const deadlineMs = this.resolveDeadline(context.deadlineMs);

    for (const provider of providers) {
      let available = false;
      try {
        available = await provider.isAvailable();
      } catch (error) {
        this.logger.warn(`${capability}/${provider.id} availability check failed`);
      }
      if (!available) continue;

      attempts.push(provider.id);
      try {
        const value = await this.withDeadline(
          provider.execute(request, context) as Promise<TResult>,
          deadlineMs,
          provider.id,
        );
        return {
          state: 'completed',
          providerId: provider.id,
          value,
          attempts,
          elapsedMs: Date.now() - startedAt,
        };
      } catch (error) {
        this.logger.warn(`${capability}/${provider.id} execution failed`);
      }
    }

    return {
      state: providers.length === 0 ? 'unavailable' : 'failed',
      attempts,
      elapsedMs: Date.now() - startedAt,
    };
  }

  private resolveDeadline(requested?: number): number {
    const configured = Number(process.env.CAPABILITY_TIMEOUT_MS ?? DEFAULT_DEADLINE_MS);
    const safeConfigured = Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_DEADLINE_MS;
    return requested && requested > 0
      ? Math.min(requested, safeConfigured)
      : safeConfigured;
  }

  private async withDeadline<TResult>(
    operation: Promise<TResult>,
    deadlineMs: number,
    providerId: string,
  ): Promise<TResult> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Capability provider ${providerId} exceeded ${deadlineMs}ms`)),
        deadlineMs,
      );
    });
    try {
      return await Promise.race([operation, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }
}

