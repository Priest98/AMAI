import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AiGatewayService } from '../ai-layer/ai-gateway.service';
import { ContextPackService } from './context/context-pack.service';
import type { BrainDecisionOutput, BrainEvaluation, StructuredContentAnalysis } from './oyinca-brain.types';
import { autonomyAction, clampConfidence, decayConfidence, describeContentDifferences, evidenceConfidence } from './brain-policy';

const MIN_EVIDENCE = 3;
const INSIGHT_TTL_DAYS = 120;

@Injectable()
export class OyincaBrainService {
  private readonly logger = new Logger(OyincaBrainService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AiGatewayService,
    private readonly contextPacks: ContextPackService,
  ) {}

  async analyze(brandId: string, mediaAssetId: string): Promise<StructuredContentAnalysis & { analysisId: string; cached: boolean }> {
    const { organizationId } = await this.tenant(brandId);
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id: mediaAssetId, brandId } });
    if (!asset) throw new NotFoundException('Media asset was not found for this brand.');
    const fingerprint = createHash('sha256').update(`${asset.id}:${asset.blobUrl ?? ''}:${asset.sizeBytes}:${asset.updatedAt.toISOString()}:v1`).digest('hex');
    const cached = await this.prisma.contentAnalysis.findUnique({
      where: { brandId_mediaAssetId_fingerprint: { brandId, mediaAssetId, fingerprint } },
    });
    if (cached) return { ...(cached.analysis as unknown as StructuredContentAnalysis), analysisId: cached.id, cached: true };

    const topic = (asset.visionTopic || this.topicFromFilename(asset.filename)).slice(0, 200);
    const brain = await this.prisma.businessBrain.findUnique({ where: { brandId } });
    const pillar = this.bestPillar(brain?.contentPillars ?? [], topic);
    const intent = this.classifyIntent(topic);
    const products = await this.prisma.product.findMany({ where: { brandId, active: true }, select: { name: true }, take: 30 });
    const detectedProducts = products.filter((p) => topic.toLowerCase().includes(p.name.toLowerCase())).map((p) => p.name);
    const analysis: StructuredContentAnalysis = {
      mediaType: asset.mimeType.startsWith('image/') ? 'image' : asset.mimeType.startsWith('video/') ? 'video' : 'unknown',
      topic,
      subject: topic,
      probableContentPillar: pillar,
      intent,
      tone: intent === 'promotional' ? ['commercial'] : intent === 'educational' ? ['informative'] : ['neutral'],
      visualContext: asset.visionTopic ? `Detected subject: ${asset.visionTopic}` : 'Visual semantics unavailable; filename-derived topic used.',
      productsDetected: detectedProducts,
      potentialHook: topic ? `A clear opening focused on ${topic}` : 'Lead with the visible subject.',
      audienceRelevance: brain?.targetAudience ? `Relevant to ${brain.targetAudience}` : 'Audience relevance requires more identity memory.',
      potentialCtaCategory: intent === 'promotional' ? 'soft' : 'engagement',
      keywords: this.keywords(topic),
      safetyConsiderations: [],
      confidence: asset.visionTopic ? 0.78 : 0.48,
    };
    const row = await this.prisma.contentAnalysis.create({ data: {
      organizationId, brandId, mediaAssetId, fingerprint, analysis: analysis as any, confidence: analysis.confidence,
    } });
    await this.recordEvent(brandId, {
      type: 'CONTENT_ANALYZED', source: 'BRAIN', idempotencyKey: `content-analysis:${row.id}`,
      payload: { analysisId: row.id, mediaAssetId, confidence: analysis.confidence, intent, pillar },
    });
    return { ...analysis, analysisId: row.id, cached: false };
  }

  async getRelevantContext(brandId: string, objective: string, contentAnalysisId?: string) {
    const { organizationId } = await this.tenant(brandId);
    const now = new Date();
    const [pack, insights, recentEvents, analysis] = await Promise.all([
      this.contextPacks.build(brandId, objective, ['brand', 'audience', 'content', 'strategy', 'performance', 'platform']),
      this.prisma.learnedInsight.findMany({
        where: { organizationId, brandId, status: 'ACTIVE', confidence: { gte: 0.5 }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        orderBy: [{ authority: 'asc' }, { confidence: 'desc' }, { lastObservedAt: 'desc' }], take: 8,
      }),
      this.prisma.brainEvent.findMany({ where: { organizationId, brandId, type: { in: ['CAPTION_EDITED', 'HASHTAGS_EDITED', 'CTA_EDITED', 'POST_REJECTED', 'SCHEDULE_CHANGED'] } }, orderBy: { occurredAt: 'desc' }, take: 8 }),
      contentAnalysisId ? this.prisma.contentAnalysis.findFirst({ where: { id: contentAnalysisId, organizationId, brandId } }) : null,
    ]);
    return {
      identity: pack.sections,
      learnedInsights: insights.map((i) => ({ id: i.id, type: i.insightType, insight: i.insight, confidence: this.decayedConfidence(i.confidence, i.lastObservedAt, now), evidenceCount: i.evidenceCount, authority: i.authority })),
      recentCorrections: recentEvents.map((e) => ({ id: e.id, type: e.type, occurredAt: e.occurredAt, payload: e.payload })),
      contentAnalysis: analysis?.analysis ?? null,
      assembledAt: now.toISOString(),
    };
  }

  async decide(brandId: string, input: { objective: string; contentAnalysisId?: string; platform?: string }): Promise<BrainDecisionOutput & { decisionId: string; evaluation: BrainEvaluation }> {
    const tenant = await this.tenant(brandId);
    const started = Date.now();
    const context = await this.getRelevantContext(brandId, input.objective, input.contentAnalysisId);
    const prompt = `Create one social post decision from this bounded account context. Return only JSON with caption, hashtags, cta, recommendedPostingTime, contentPillar, reasoningSummary, confidence, evidence. Never reveal chain-of-thought. Platform: ${input.platform ?? 'connected platforms'}. Objective: ${input.objective}. Context: ${JSON.stringify(context)}`;
    const generated = await this.gateway.generate({ label: 'oyinca brain decision', maxTokens: 650, messages: [{ role: 'user', content: prompt }] });
    const parsed = this.parseDecision(generated?.text);
    const decision = parsed ?? this.safeDecisionFallback(context, input.objective);
    const evaluation = await this.evaluate(brandId, decision, { semanticRequired: false });
    const correlationId = randomUUID();
    const row = await this.prisma.brainDecision.create({ data: {
      organizationId: tenant.organizationId, brandId, correlationId, objective: input.objective.slice(0, 200),
      decision: 'generate_platform_content', reasonCodes: evaluation.reasonCodes, providersUsed: generated ? [generated.provider] : [],
      contextSections: context.identity.map((s) => s.kind), latencyMs: Date.now() - started, tokensUsed: generated?.tokensUsed,
      outcome: parsed ? 'succeeded' : 'no_output', confidence: decision.confidence, evaluation: evaluation as any,
      evidence: decision.evidence as any, contentAnalysisId: input.contentAnalysisId, model: generated?.model, estimatedCostUsd: generated?.estimatedCostUsd,
    } });
    await this.recordEvent(brandId, { type: 'DECISION_CREATED', source: 'BRAIN', idempotencyKey: `decision:${correlationId}`, decisionId: row.id, payload: { confidence: decision.confidence, action: evaluation.action, reasonCodes: evaluation.reasonCodes } });
    return { ...decision, provider: generated?.provider, tokensUsed: generated?.tokensUsed, latencyMs: Date.now() - started, decisionId: row.id, evaluation };
  }

  async evaluate(brandId: string, decision: Pick<BrainDecisionOutput, 'caption' | 'hashtags' | 'cta' | 'confidence'>, options: { semanticRequired?: boolean } = {}): Promise<BrainEvaluation> {
    const brain = await this.prisma.businessBrain.findUnique({ where: { brandId } });
    if (!brain) await this.tenant(brandId);
    const banned = (brain?.bannedPhrases ?? []).filter((p) => decision.caption.toLowerCase().includes(p.toLowerCase()));
    const duplicate = await this.prisma.post.findFirst({ where: { brandId, caption: decision.caption }, select: { id: true } });
    const hashtagFit = Math.max(0, 100 - Math.abs((brain?.hashtagCount ?? 5) - decision.hashtags.length) * 12);
    const brandFit = banned.length ? 0 : 88;
    const audienceFit = brain?.targetAudience ? 86 : 62;
    const repetitionRisk = duplicate ? 100 : 10;
    const policy: BrainEvaluation['policy'] = banned.length ? 'block' : 'pass';
    const confidence = Math.min(decision.confidence, (brandFit + audienceFit + hashtagFit + (100 - repetitionRisk)) / 400);
    const reasonCodes = [banned.length ? 'banned_phrase_conflict' : 'brand_constraints_passed', duplicate ? 'duplicate_caption' : 'no_exact_repetition', brain?.targetAudience ? 'audience_context_available' : 'audience_context_limited'];
    const action: BrainEvaluation['action'] = autonomyAction({ confidence, policy, repetitionRisk, semanticRequired: options.semanticRequired });
    return { brandFit, audienceFit, repetitionRisk, ctaFit: decision.cta ? 88 : 65, policy, overallConfidence: Number(confidence.toFixed(3)), action, reasonCodes };
  }

  async recordFeedback(brandId: string, input: { type: string; idempotencyKey: string; postId?: string; decisionId?: string; before?: unknown; after?: unknown; metadata?: Record<string, unknown> }) {
    const allowed = new Set(['APPROVED', 'POST_REJECTED', 'REGENERATED', 'CAPTION_EDITED', 'HASHTAGS_EDITED', 'CTA_EDITED', 'SCHEDULE_CHANGED', 'RECOMMENDATION_DISABLED']);
    if (!allowed.has(input.type)) throw new BadRequestException('Unsupported Brain feedback type.');
    const differences = describeContentDifferences(input.type, input.before, input.after);
    return this.recordEvent(brandId, { ...input, source: 'USER', payload: { before: input.before, after: input.after, differences, ...(input.metadata ?? {}) } });
  }

  async recordOutcome(brandId: string, input: { postId: string; idempotencyKey: string; metrics: Record<string, number>; objective?: string }) {
    return this.recordEvent(brandId, { type: 'PERFORMANCE_RECORDED', source: 'PLATFORM', idempotencyKey: input.idempotencyKey, postId: input.postId, payload: { metrics: input.metrics, objective: input.objective ?? null } });
  }

  async learn(brandId: string, trigger = 'scheduled') {
    const tenant = await this.tenant(brandId);
    const run = await this.prisma.learningRun.create({ data: { organizationId: tenant.organizationId, brandId, status: 'RUNNING', trigger } });
    try {
      const events = await this.prisma.brainEvent.findMany({ where: { organizationId: tenant.organizationId, brandId, source: 'USER' }, orderBy: { occurredAt: 'desc' }, take: 250 });
      const candidates = this.patternCandidates(events);
      let created = 0; let updated = 0;
      for (const candidate of candidates.filter((c) => c.supporting.length >= MIN_EVIDENCE)) {
        const expiresAt = new Date(Date.now() + INSIGHT_TTL_DAYS * 86400000);
        const confidence = evidenceConfidence(candidate.supporting.length, candidate.contradicting.length);
        const existing = await this.prisma.learnedInsight.findUnique({ where: { brandId_key: { brandId, key: candidate.key } } });
        const insight = await this.prisma.learnedInsight.upsert({
          where: { brandId_key: { brandId, key: candidate.key } },
          create: { organizationId: tenant.organizationId, brandId, key: candidate.key, insightType: candidate.type, insight: candidate.insight, confidence, evidenceCount: candidate.supporting.length, contradictionCount: candidate.contradicting.length, lastValidatedAt: new Date(), expiresAt },
          update: { insight: candidate.insight, confidence, evidenceCount: candidate.supporting.length, contradictionCount: candidate.contradicting.length, status: confidence >= 0.5 ? 'ACTIVE' : 'CONTRADICTED', lastObservedAt: new Date(), lastValidatedAt: new Date(), expiresAt },
        });
        if (existing) updated++; else created++;
        await Promise.all(candidate.supporting.map((eventId) => this.prisma.insightEvidence.upsert({ where: { insightId_eventId: { insightId: insight.id, eventId } }, create: { insightId: insight.id, eventId, direction: 'SUPPORTS' }, update: { direction: 'SUPPORTS' } })));
        await Promise.all(candidate.contradicting.map((eventId) => this.prisma.insightEvidence.upsert({ where: { insightId_eventId: { insightId: insight.id, eventId } }, create: { insightId: insight.id, eventId, direction: 'CONTRADICTS' }, update: { direction: 'CONTRADICTS' } })));
      }
      await this.prisma.learningRun.update({ where: { id: run.id }, data: { status: 'SUCCEEDED', eventsConsidered: events.length, insightsCreated: created, insightsUpdated: updated, completedAt: new Date() } });
      return { runId: run.id, eventsConsidered: events.length, insightsCreated: created, insightsUpdated: updated };
    } catch (error) {
      await this.prisma.learningRun.update({ where: { id: run.id }, data: { status: 'FAILED', errorCode: 'learning_failed', completedAt: new Date() } }).catch(() => {});
      throw error;
    }
  }

  async learnAllBrands(trigger = 'qstash') {
    const brands = await this.prisma.brand.findMany({ select: { id: true } });
    let brandsProcessed = 0; let eventsRecorded = 0; let insightsCreated = 0; let insightsUpdated = 0; let failures = 0;
    for (const brand of brands) {
      try {
        const snapshots = await this.prisma.postPerformance.findMany({
          where: { postTarget: { post: { brandId: brand.id } } },
          orderBy: { capturedAt: 'desc' }, take: 100,
          select: { id: true, views: true, likes: true, comments: true, shares: true, postTarget: { select: { postId: true } } },
        });
        for (const snapshot of snapshots) {
          await this.recordOutcome(brand.id, { postId: snapshot.postTarget.postId, idempotencyKey: `performance:${snapshot.id}`, metrics: { views: snapshot.views, likes: snapshot.likes, comments: snapshot.comments, shares: snapshot.shares } });
          eventsRecorded++;
        }
        const result = await this.learn(brand.id, trigger);
        insightsCreated += result.insightsCreated;
        insightsUpdated += result.insightsUpdated;
        brandsProcessed++;
      } catch (error) {
        failures++;
        this.logger.warn(`Brain learning failed safely for brand ${brand.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }
    return { brandsProcessed, eventsRecorded, insightsCreated, insightsUpdated, failures };
  }

  async listInsights(brandId: string) {
    const { organizationId } = await this.tenant(brandId);
    return this.prisma.learnedInsight.findMany({ where: { organizationId, brandId }, orderBy: [{ status: 'asc' }, { confidence: 'desc' }] });
  }

  private async recordEvent(brandId: string, input: { type: string; source: string; idempotencyKey: string; postId?: string; decisionId?: string; payload: unknown }) {
    const { organizationId } = await this.tenant(brandId);
    return this.prisma.brainEvent.upsert({ where: { brandId_idempotencyKey: { brandId, idempotencyKey: input.idempotencyKey } }, create: { organizationId, brandId, type: input.type, source: input.source, idempotencyKey: input.idempotencyKey, postId: input.postId, decisionId: input.decisionId, payload: input.payload as any }, update: {} });
  }

  private async tenant(brandId: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id: brandId }, select: { id: true, organizationId: true } });
    if (!brand) throw new NotFoundException('Brand not found.');
    return brand;
  }

  private parseDecision(raw?: string): BrainDecisionOutput | null {
    if (!raw) return null;
    try {
      const value = JSON.parse(raw.replace(/^```json\s*|```$/g, '').trim());
      if (!value || typeof value.caption !== 'string' || !Array.isArray(value.hashtags)) return null;
      const evidence = Array.isArray(value.evidence) ? value.evidence.slice(0, 8).flatMap((item: any) => {
        if (!item || typeof item.source !== 'string' || typeof item.summary !== 'string') return [];
        const strength = ['LOW', 'MEDIUM', 'HIGH'].includes(item.strength) ? item.strength : 'MEDIUM';
        return [{ source: item.source.slice(0, 100), strength, summary: item.summary.slice(0, 300) }];
      }) : [];
      return { caption: value.caption.trim(), hashtags: value.hashtags.filter((h: unknown) => typeof h === 'string').slice(0, 12), cta: typeof value.cta === 'string' ? value.cta.trim() : '', recommendedPostingTime: typeof value.recommendedPostingTime === 'string' ? value.recommendedPostingTime : null, contentPillar: typeof value.contentPillar === 'string' ? value.contentPillar : null, reasoningSummary: typeof value.reasoningSummary === 'string' ? value.reasoningSummary.slice(0, 500) : 'Grounded in available account context.', confidence: clampConfidence(Number(value.confidence) || 0.5), evidence };
    } catch { return null; }
  }

  private safeDecisionFallback(context: any, objective: string): BrainDecisionOutput {
    return { caption: '', hashtags: [], cta: '', recommendedPostingTime: null, contentPillar: null, reasoningSummary: 'A provider could not return a valid structured decision. Human approval is required.', confidence: 0.2, evidence: [{ source: 'system', strength: 'HIGH', summary: `Safe fallback for ${objective}; ${context.learnedInsights.length} learned insights were available.` }] };
  }

  private patternCandidates(events: any[]) {
    const edited = events.filter((e) => e.type === 'CAPTION_EDITED');
    const by = (code: string) => edited.filter((e) => Array.isArray((e.payload as any)?.differences) && (e.payload as any).differences.includes(code)).map((e) => e.id);
    return [
      { key: 'caption_length_concise', type: 'caption_style', insight: 'The user consistently prefers shorter, more concise captions.', supporting: by('shortened'), contradicting: by('lengthened') },
      { key: 'emoji_preference_none', type: 'caption_style', insight: 'The user consistently prefers captions without emojis.', supporting: by('removed_emojis'), contradicting: by('added_emojis') },
      { key: 'promotion_style_soft', type: 'cta_style', insight: 'The user consistently prefers understated language over direct promotional wording.', supporting: by('softened_promotion'), contradicting: by('intensified_promotion') },
    ];
  }

  private decayedConfidence(confidence: number, observed: Date, now: Date) { return decayConfidence(confidence, observed, now); }
  private topicFromFilename(name: string) { return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'uploaded content'; }
  private keywords(topic: string) { return Array.from(new Set(topic.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])).slice(0, 12); }
  private classifyIntent(topic: string): StructuredContentAnalysis['intent'] { if (/sale|offer|product|shop|launch|buy/i.test(topic)) return 'promotional'; if (/how|guide|tips|learn|tutorial/i.test(topic)) return 'educational'; if (/fun|challenge|meme|dance/i.test(topic)) return 'entertainment'; return 'informational'; }
  private bestPillar(pillars: string[], topic: string) { const lower = topic.toLowerCase(); return pillars.find((p) => lower.includes(p.toLowerCase()) || p.toLowerCase().split(/\s+/).some((w) => w.length > 3 && lower.includes(w))) ?? null; }
}
