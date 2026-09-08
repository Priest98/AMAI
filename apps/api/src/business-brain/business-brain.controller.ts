import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { EntitlementGuard, RequireEntitlement } from '../billing/entitlement.guard';
import { EntitlementsService } from '../billing/entitlements.service';
import { BusinessBrainService } from './business-brain.service';
import type { UpdateBusinessBrainDto } from './business-brain.service';
import { AiService } from '../ai/ai.service';
import { ContextPackService } from './context/context-pack.service';
import { SkillSelectorService } from './skills/skill-selector.service';
import { BrainDecisionTraceService } from '../capabilities/observability/brain-decision-trace.service';
import { randomUUID } from 'node:crypto';
import { OyincaBrainService } from './oyinca-brain.service';

@UseGuards(JwtAuthGuard, BrandAccessGuard)
@Controller('brands/:brandId/business-brain')
export class BusinessBrainController {
  constructor(
    private readonly businessBrainService: BusinessBrainService,
    private readonly aiService: AiService,
    private readonly entitlementsService: EntitlementsService,
    private readonly contextPackService: ContextPackService,
    private readonly skillSelector: SkillSelectorService,
    private readonly decisionTrace: BrainDecisionTraceService,
    private readonly brain: OyincaBrainService,
  ) {}

  @Post('v1/analyze')
  analyze(@Param('brandId') brandId: string, @Body() body: { mediaAssetId: string }) {
    return this.brain.analyze(brandId, body.mediaAssetId);
  }

  @Post('v1/decide')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @UseGuards(EntitlementGuard)
  @RequireEntitlement('generate_ai_content')
  decide(@Param('brandId') brandId: string, @Body() body: { objective: string; contentAnalysisId?: string; platform?: string }) {
    return this.brain.decide(brandId, body);
  }

  @Post('v1/evaluate')
  evaluate(@Param('brandId') brandId: string, @Body() body: any) {
    return this.brain.evaluate(brandId, body);
  }

  @Post('v1/feedback')
  feedback(@Param('brandId') brandId: string, @Body() body: any) {
    return this.brain.recordFeedback(brandId, body);
  }

  @Get('v1/insights')
  insights(@Param('brandId') brandId: string) {
    return this.brain.listInsights(brandId);
  }

  @Post('v1/learn')
  learn(@Param('brandId') brandId: string) {
    return this.brain.learn(brandId, 'manual');
  }

  @Get()
  async get(@Param('brandId') brandId: string) {
    return this.businessBrainService.getOrCreate(brandId);
  }

  @Patch()
  async update(@Param('brandId') brandId: string, @Body() dto: UpdateBusinessBrainDto) {
    return this.businessBrainService.update(brandId, dto);
  }

  @Get('memory')
  async listMemory(@Param('brandId') brandId: string) {
    return this.businessBrainService.listMemoryEntries(brandId);
  }

  @Post('memory/:id/dismiss')
  async dismissMemory(@Param('brandId') brandId: string, @Param('id') id: string) {
    return this.businessBrainService.dismissMemoryEntry(brandId, id);
  }

  // Exposed mainly for manual QA locally — lets us confirm the prompt
  // context Oyinca would actually inject without digging through logs.
  @Get('prompt-context')
  async promptContext(@Param('brandId') brandId: string) {
    const context = await this.businessBrainService.buildPromptContext(brandId);
    return { context };
  }

  /**
   * P1 AI content intelligence: concrete content ideas grounded in this
   * brand's real Business Brain context. Gated by the same
   * 'generate_ai_content' entitlement every other AI-consuming action uses
   * (media.controller.ts's processAsset) so this can't become a free,
   * unmetered way around the plan's monthly AI generation limit.
   */
  // Security audit fix (6.2): see media.controller.ts's processAsset for
  // why this needs its own per-minute ceiling on top of the monthly
  // entitlement check.
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @UseGuards(EntitlementGuard)
  @RequireEntitlement('generate_ai_content')
  @Post('content-ideas')
  async contentIdeas(@Param('brandId') brandId: string) {
    const startedAt = Date.now();
    const correlationId = randomUUID();
    const skillEnabled = process.env.MARKETING_SKILLS_ENABLED === 'true';
    const selectedSkill = skillEnabled ? this.skillSelector.select('generate content ideas and strategy') : null;
    const [brain, legacyContext, contextPack] = await Promise.all([
      this.businessBrainService.getOrCreate(brandId),
      this.businessBrainService.buildPromptContext(brandId),
      selectedSkill ? this.contextPackService.build(brandId, 'Generate five specific content ideas', selectedSkill.requiredContext) : Promise.resolve(null),
    ]);
    const context = selectedSkill && contextPack?.sections.length ? this.contextPackService.renderForSkill(contextPack, selectedSkill) : legacyContext;
    if (!context) {
      return { ideas: [], reason: 'Fill in your Business Brain first so ideas are grounded in your actual business.' };
    }
    // Race-condition fix: @RequireEntitlement above is a read-only
    // pre-check (fast, clear 403 for the obviously-over-limit case) but was
    // the only thing standing between this and the same two-step
    // check-then-record race reservePostSlot()/reserveAiGeneration() closed
    // elsewhere -- two concurrent requests could both pass that guard
    // before either write landed. reserveAiGeneration() is the atomic,
    // race-safe enforcement point; the guard above is now purely a UX
    // fast-fail, not the real gate.
    const organizationId = await this.entitlementsService.reserveAiGeneration(brandId);
    let ideas: Awaited<ReturnType<AiService['generateContentIdeas']>>;
    try {
      ideas = await this.aiService.generateContentIdeas(brandId, 'amai_engine', context, brain.contentPillars);
    } catch (err) {
      this.decisionTrace.record({ organizationId, brandId, correlationId, objective: 'Generate five specific content ideas', decision: 'generate_content_ideas', reasonCodes: ['user_requested_content_ideas'], skillsUsed: selectedSkill ? [`${selectedSkill.id}.${selectedSkill.version}`] : [], contextSections: contextPack?.sections.map((section) => section.kind) ?? ['brand'], latencyMs: Date.now() - startedAt, outcome: 'failed' }).catch(() => {});
      await this.entitlementsService.releaseAiGeneration(organizationId).catch(() => {});
      throw err;
    }
    // Only counted once generation actually succeeded, same as the Oyinca
    // Engine's own caption/hashtag generation -- a failed/empty attempt
    // never burns quota, so an empty result releases the reservation too.
    if (ideas.length === 0) {
      await this.entitlementsService.releaseAiGeneration(organizationId).catch(() => {});
    }
    this.decisionTrace.record({ organizationId, brandId, correlationId, objective: 'Generate five specific content ideas', decision: 'generate_content_ideas', reasonCodes: ['user_requested_content_ideas', ideas.length ? 'grounded_context_available' : 'provider_returned_no_output'], skillsUsed: selectedSkill ? [`${selectedSkill.id}.${selectedSkill.version}`] : [], contextSections: contextPack?.sections.map((section) => section.kind) ?? ['brand'], latencyMs: Date.now() - startedAt, outcome: ideas.length ? 'succeeded' : 'no_output' }).catch(() => {});
    return { ideas };
  }
}
