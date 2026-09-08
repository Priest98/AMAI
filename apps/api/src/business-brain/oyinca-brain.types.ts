export type BrainAutonomyAction = 'accept' | 'regenerate' | 'request_approval' | 'escalate';

export interface StructuredContentAnalysis {
  mediaType: 'image' | 'video' | 'unknown';
  topic: string;
  subject: string;
  probableContentPillar: string | null;
  intent: 'educational' | 'promotional' | 'entertainment' | 'community' | 'informational' | 'unknown';
  tone: string[];
  visualContext: string;
  productsDetected: string[];
  potentialHook: string;
  audienceRelevance: string;
  potentialCtaCategory: 'direct' | 'soft' | 'engagement' | 'none';
  keywords: string[];
  safetyConsiderations: string[];
  confidence: number;
}

export interface BrainEvaluation {
  brandFit: number;
  audienceFit: number;
  repetitionRisk: number;
  ctaFit: number;
  policy: 'pass' | 'review' | 'block';
  overallConfidence: number;
  action: BrainAutonomyAction;
  reasonCodes: string[];
}

export interface BrainDecisionOutput {
  caption: string;
  hashtags: string[];
  cta: string;
  recommendedPostingTime: string | null;
  contentPillar: string | null;
  reasoningSummary: string;
  confidence: number;
  evidence: Array<{ source: string; strength: 'LOW' | 'MEDIUM' | 'HIGH'; summary: string }>;
  provider?: string;
  tokensUsed?: number;
  latencyMs?: number;
}
