export type ResearchTimeWindow = '7d' | '14d' | '30d' | '90d';

export interface ResearchRequest {
  topic: string;
  timeWindow?: ResearchTimeWindow;
  locale?: string;
  platforms?: string[];
  competitorHandles?: string[];
}

export interface ResearchSource {
  url: string;
  title: string;
  platform: string;
  publishedAt?: string;
  capturedAt: string;
}

export interface IntelligenceSignal {
  label: string;
  evidence: string[];
  sourceUrls: string[];
  confidence: number;
}

export interface MarketIntelligence {
  topic: string;
  timeWindow: ResearchTimeWindow;
  trends: IntelligenceSignal[];
  audienceQuestions: IntelligenceSignal[];
  contentPatterns: IntelligenceSignal[];
  competitorSignals: IntelligenceSignal[];
  opportunities: IntelligenceSignal[];
  sources: ResearchSource[];
  confidence: number;
  generatedAt: string;
  expiresAt: string;
}

export type MarketIntelligenceState =
  | 'fresh'
  | 'cached'
  | 'stale'
  | 'disabled'
  | 'unavailable';

export interface MarketIntelligenceResult {
  state: MarketIntelligenceState;
  intelligence?: MarketIntelligence;
  providerId?: string;
}

export function assertMarketIntelligence(value: unknown): asserts value is MarketIntelligence {
  if (!value || typeof value !== 'object') throw new Error('Research response must be an object');
  const candidate = value as Record<string, unknown>;
  const arrays = ['trends', 'audienceQuestions', 'contentPatterns', 'competitorSignals', 'opportunities', 'sources'];
  if (typeof candidate.topic !== 'string' || !candidate.topic.trim()) throw new Error('Research response has no topic');
  if (!['7d', '14d', '30d', '90d'].includes(String(candidate.timeWindow))) throw new Error('Research response has an invalid time window');
  if (!arrays.every((key) => Array.isArray(candidate[key]))) throw new Error('Research response is missing structured collections');
  if (typeof candidate.confidence !== 'number' || candidate.confidence < 0 || candidate.confidence > 1) {
    throw new Error('Research confidence must be between 0 and 1');
  }
  if (!isDate(candidate.generatedAt) || !isDate(candidate.expiresAt)) throw new Error('Research response has invalid timestamps');
  for (const key of arrays.slice(0, -1)) {
    for (const signal of candidate[key] as unknown[]) assertSignal(signal);
  }
  for (const source of candidate.sources as unknown[]) assertSource(source);
}

function assertSignal(value: unknown): void {
  const signal = value as Record<string, unknown>;
  if (!signal || typeof signal !== 'object' || typeof signal.label !== 'string') throw new Error('Invalid intelligence signal');
  if (!Array.isArray(signal.evidence) || !Array.isArray(signal.sourceUrls)) throw new Error('Signal lacks evidence or sources');
  if (!(signal.sourceUrls as unknown[]).every((url) => typeof url === 'string' && url.startsWith('https://'))) {
    throw new Error('Signal source URLs must use HTTPS');
  }
  if (typeof signal.confidence !== 'number' || signal.confidence < 0 || signal.confidence > 1) throw new Error('Invalid signal confidence');
}

function assertSource(value: unknown): void {
  const source = value as Record<string, unknown>;
  if (!source || typeof source !== 'object' || typeof source.url !== 'string' || !source.url.startsWith('https://')) {
    throw new Error('Research source must use HTTPS');
  }
  if (typeof source.title !== 'string' || typeof source.platform !== 'string' || !isDate(source.capturedAt)) {
    throw new Error('Invalid research source metadata');
  }
}

function isDate(value: unknown): boolean {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
