export type CapabilityKind =
  | 'research'
  | 'marketing'
  | 'notifications'
  | 'analytics';

export interface CapabilityExecutionContext {
  organizationId: string;
  brandId?: string;
  correlationId: string;
  deadlineMs?: number;
  costBudgetUsd?: number;
}

export type CapabilityExecutionState =
  | 'completed'
  | 'disabled'
  | 'unavailable'
  | 'failed';

export interface CapabilityExecutionResult<TResult> {
  state: CapabilityExecutionState;
  providerId?: string;
  value?: TResult;
  attempts: string[];
  elapsedMs: number;
}

