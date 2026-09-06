import {
  CapabilityExecutionContext,
  CapabilityKind,
} from './capability-execution.types';

/**
 * The only contract external capability adapters expose to Oyinca.
 * Providers receive an explicitly scoped context rather than application
 * services or raw credentials, which keeps them replaceable and bounded.
 */
export interface CapabilityProvider<TRequest = unknown, TResult = unknown> {
  readonly id: string;
  readonly capability: CapabilityKind;
  readonly priority?: number;

  isAvailable(): boolean | Promise<boolean>;
  execute(
    request: TRequest,
    context: CapabilityExecutionContext,
  ): Promise<TResult>;
}

export const CAPABILITY_PROVIDERS = Symbol('CAPABILITY_PROVIDERS');

