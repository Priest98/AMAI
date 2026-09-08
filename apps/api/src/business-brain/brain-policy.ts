export const BRAIN_HIGH_CONFIDENCE = 0.82;
export const BRAIN_MEDIUM_CONFIDENCE = 0.62;
export const BRAIN_MIN_EVIDENCE = 3;

export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function evidenceConfidence(support: number, contradiction: number): number {
  return clampConfidence(0.45 + Math.min(0.45, Math.max(0, support) * 0.08) - Math.min(0.35, Math.max(0, contradiction) * 0.08));
}

export function decayConfidence(confidence: number, observed: Date, now = new Date()): number {
  const ageMs = Math.max(0, now.getTime() - observed.getTime());
  return Number((clampConfidence(confidence) * Math.pow(0.5, ageMs / (180 * 86400000))).toFixed(3));
}

export function autonomyAction(input: { confidence: number; policy: 'pass' | 'review' | 'block'; repetitionRisk: number; semanticRequired?: boolean }) {
  if (input.policy === 'block' || input.repetitionRisk >= 90) return 'escalate' as const;
  if (input.confidence < BRAIN_MEDIUM_CONFIDENCE) return 'regenerate' as const;
  if (input.confidence < BRAIN_HIGH_CONFIDENCE || input.semanticRequired) return 'request_approval' as const;
  return 'accept' as const;
}

export function describeContentDifferences(type: string, before: unknown, after: unknown): string[] {
  if (typeof before !== 'string' || typeof after !== 'string') return [];
  const changes: string[] = [];
  if (after.length < before.length * 0.75) changes.push('shortened');
  if (after.length > before.length * 1.33) changes.push('lengthened');
  if (/\p{Extended_Pictographic}/u.test(before) && !/\p{Extended_Pictographic}/u.test(after)) changes.push('removed_emojis');
  if (!/\p{Extended_Pictographic}/u.test(before) && /\p{Extended_Pictographic}/u.test(after)) changes.push('added_emojis');
  if (/\b(shop|buy|order|click|sign up)\b/i.test(before) && !/\b(shop|buy|order|click|sign up)\b/i.test(after)) changes.push('softened_promotion');
  if (!/\b(shop|buy|order|click|sign up)\b/i.test(before) && /\b(shop|buy|order|click|sign up)\b/i.test(after)) changes.push('intensified_promotion');
  if (type === 'CAPTION_EDITED' && before.trim() !== after.trim()) changes.push('rewritten');
  return changes;
}
