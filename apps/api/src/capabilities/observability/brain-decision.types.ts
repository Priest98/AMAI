export interface BrainDecisionRecord {
  organizationId: string;
  brandId: string;
  correlationId: string;
  objective: string;
  decision: string;
  reasonCodes: string[];
  skillsUsed?: string[];
  providersUsed?: string[];
  model?: string;
  contextSections?: string[];
  latencyMs: number;
  tokensUsed?: number;
  estimatedCostUsd?: number;
  outcome: 'succeeded' | 'failed' | 'no_output' | 'skipped';
}

