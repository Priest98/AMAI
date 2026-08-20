import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { PublishingService } from '../queue/publishing.service';
import { SchedulingService } from './scheduling.service';
import { BusinessBrainService } from '../business-brain/business-brain.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { MediaOptimizationService } from '../media-optimization/media-optimization.service';
import { toPublicConnection, deriveConnectionHealth } from '../oauth/connection-health';
import {
  EngineState,
  ApprovalMode,
  MediaStatus,
  PostStatus,
  TargetStatus,
  ContentSource,
  EngineEventType,
  ConnectionStatus,
  Platform,
  SchedulingPlatform,
  ScheduleStartOption,
} from '@prisma/client';

export interface MediaUploadedEvent {
  mediaAssetId: string;
}

// Hard ceiling on the whole media-processing pipeline (vision/caption/
// hashtag generation + scheduling + DB writes). Vercel kills the entire
// serverless invocation at its own 60s platform cap with no chance for
// any catch block to run -- an asset caught mid-pipeline at that point is
// abandoned in PROCESSING forever. Individual external calls are already
// time-bounded (see AiService.withTimeout), but a request can still add
// up to more than 60s from many small, individually-fast DB round trips
// under adverse conditions (e.g. a cold Lambda's first connection to the
// pooler). Bounding the pipeline as a whole guarantees this always
// resolves -- success or a clean, retryable MediaStatus.FAILED -- well
// inside Vercel's own cap, observed live via a GET /media/assets 504.
// 40s left some legitimate runs racing the clock under cold-Lambda/pooler
// conditions (observed live: a handful of retries failing with "Processing
// took too long" at almost exactly 40s). The AI portion is now reliably
// fast either way -- it succeeds within AiService's own per-call bounds or
// fails over via a quick 429/error -- so the remaining budget is mostly
// DB round-trip overhead. 50s keeps a real 10s margin below Vercel's 60s
// platform cap while giving genuinely-slow-but-not-stuck runs more room
// to finish instead of being cut off right at the edge.
const PIPELINE_TIMEOUT_MS = 50_000;

// Shared with MediaService.sweepStaleProcessing (imported from there rather
// than duplicated) -- both the sweep's decision to re-trigger a stuck asset
// and processMediaAsset's own atomic claim below need to agree on exactly
// the same "how old is too old" threshold, or the claim could reject a
// legitimate sweep-triggered retry (threshold here shorter) or the sweep
// could re-trigger a run that's still genuinely in flight (threshold here
// longer). Defined here (not in media.service.ts) because media.service.ts
// already depends on EngineService for DI; this avoids a circular import.
export const STALE_PROCESSING_MINUTES = 2;

@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private events: EventEmitter2,
    private publishingService: PublishingService,
    private schedulingService: SchedulingService,
    private businessBrainService: BusinessBrainService,
    private entitlementsService: EntitlementsService,
    private mediaOptimizationService: MediaOptimizationService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // CONFIG (Engine state + Approval mode)
  // ─────────────────────────────────────────────────────────────

  /** Every brand gets a config lazily, defaulting to Active + Manual Approval. */
  async getOrCreateConfig(brandId: string) {
    let config = await this.prisma.amaiEngineConfig.findUnique({ where: { brandId } });
    if (!config) {
      config = await this.prisma.amaiEngineConfig.create({ data: { brandId } });
    }
    return config;
  }

  /**
   * AutoPilot control centre.
   *
   * Answers "is AMAI actually working, and is anything blocking it" from
   * real rows only. Where AMAI genuinely cannot determine a subsystem's
   * health it reports 'unknown' -- a green tick that isn't backed by a
   * check is worse than an honest gap, because the whole point of this
   * panel is trust in the automation.
   */
  async getControlCenter(brandId: string) {
    const config = await this.getOrCreateConfig(brandId);
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      preparedCount,
      scheduledCount,
      awaitingApprovalCount,
      failedCount,
      publishedLast24h,
      accounts,
      disabledAiKeys,
      nextScheduled,
    ] = await Promise.all([
      this.prisma.post.count({ where: { brandId, status: PostStatus.DRAFT } }),
      this.prisma.post.count({ where: { brandId, status: PostStatus.SCHEDULED } }),
      this.prisma.post.count({ where: { brandId, status: PostStatus.NEEDS_APPROVAL } }),
      this.prisma.post.count({ where: { brandId, status: PostStatus.FAILED } }),
      this.prisma.post.count({ where: { brandId, status: PostStatus.PUBLISHED, publishedAt: { gte: dayAgo } } }),
      this.prisma.socialAccount.findMany({
        where: { brandId },
        select: { id: true, platform: true, metadata: true, status: true, tokenExpiresAt: true, refreshToken: true },
      }),
      // AI health comes from AiProviderKeyHealth, which the AI key manager
      // already maintains: a key with disabledUntil in the future has been
      // banned after repeated failures. This is a real recorded signal, not
      // a probe -- AMAI does not ping providers just to render this panel.
      this.prisma.aiProviderKeyHealth.count({
        where: { disabledUntil: { gt: now } },
      }),
      this.prisma.post.findFirst({
        where: { brandId, status: PostStatus.SCHEDULED, scheduledAt: { gte: now } },
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true },
      }),
    ]);

    const connections = accounts.map((a) => toPublicConnection(a, now));

    return {
      state: config.state,
      approvalMode: config.approvalMode,
      pipeline: {
        prepared: preparedCount,
        scheduled: scheduledCount,
        awaitingApproval: awaitingApprovalCount,
        failed: failedCount,
        publishedLast24h,
      },
      // "Next scan" is not a real scheduled tick AMAI can name -- publishing
      // is driven by Vercel Cron hitting /api/cron/publish-due, and this
      // service has no visibility into that schedule. The next scheduled
      // post is the honest equivalent.
      nextScheduledAt: nextScheduled?.scheduledAt ?? null,
      connections,
      health: {
        ai: disabledAiKeys > 0
          ? { status: 'degraded' as const, detail: `${disabledAiKeys} AI provider key${disabledAiKeys === 1 ? ' is' : 's are'} temporarily disabled after repeated failures.` }
          : { status: 'ok' as const, detail: null },
        connections: connections.some((c) => c.needsReauth)
          ? { status: 'action_required' as const, detail: 'A connected account needs to be reconnected.' }
          : connections.some((c) => c.health === 'EXPIRING_SOON')
            ? { status: 'degraded' as const, detail: 'A connection is expiring soon.' }
            : connections.length === 0
              ? { status: 'action_required' as const, detail: 'No social accounts connected.' }
              : { status: 'ok' as const, detail: null },
        publishing: failedCount > 0
          ? { status: 'degraded' as const, detail: `${failedCount} post${failedCount === 1 ? '' : 's'} failed and need attention.` }
          : { status: 'ok' as const, detail: null },
        // Deliberately not asserted: AMAI has no probe for the cron runner
        // or blob storage from inside this request, so claiming they are
        // healthy would be fabricating a check that never ran.
        scheduler: { status: 'unknown' as const, detail: 'Runs on an external schedule; not probed from here.' },
      },
    };
  }

  async setState(brandId: string, state: EngineState) {
    const config = await this.getOrCreateConfig(brandId);
    const updated = await this.prisma.amaiEngineConfig.update({
      where: { id: config.id },
      data: { state },
    });
    await this.logEvent(brandId, EngineEventType.ENGINE_STATE_CHANGED, {
      message: state === EngineState.ACTIVE
        ? 'AMAI Engine is now Active — preparing and publishing content automatically.'
        : 'AMAI Engine is now Paused — content will still be prepared, but nothing publishes until approved.',
    });
    return updated;
  }

  async updateConfig(brandId: string, dto: { defaultTone?: string }) {
    const config = await this.getOrCreateConfig(brandId);
    return this.prisma.amaiEngineConfig.update({
      where: { id: config.id },
      data: { defaultTone: dto.defaultTone },
    });
  }

  /**
   * Posting Schedule settings for the AI publishing calendar. A separate
   * method (and route) from updateConfig/defaultTone above so persona and
   * scheduling preferences can evolve independently.
   */
  async updatePostingSchedule(
    brandId: string,
    dto: {
      postsPerDay?: number;
      scheduleStartFrom?: ScheduleStartOption;
      customStartDate?: string | null;
      timeZone?: string;
      schedulingPlatform?: SchedulingPlatform;
    },
  ) {
    const config = await this.getOrCreateConfig(brandId);

    if (dto.postsPerDay !== undefined && (dto.postsPerDay < 1 || dto.postsPerDay > 5)) {
      throw new BadRequestException('Posts per day must be between 1 and 5.');
    }
    if (dto.timeZone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: dto.timeZone });
      } catch {
        throw new BadRequestException(`"${dto.timeZone}" isn't a recognized time zone.`);
      }
    }
    if (dto.scheduleStartFrom === ScheduleStartOption.CUSTOM && dto.customStartDate === undefined && !config.customStartDate) {
      throw new BadRequestException('A custom start date is required when "Custom Date" is selected.');
    }

    const updated = await this.prisma.amaiEngineConfig.update({
      where: { id: config.id },
      data: {
        postsPerDay: dto.postsPerDay ?? config.postsPerDay,
        scheduleStartFrom: dto.scheduleStartFrom ?? config.scheduleStartFrom,
        customStartDate: dto.customStartDate !== undefined
          ? (dto.customStartDate ? new Date(dto.customStartDate) : null)
          : config.customStartDate,
        timeZone: dto.timeZone ?? config.timeZone,
        schedulingPlatform: dto.schedulingPlatform ?? config.schedulingPlatform,
      },
    });

    await this.logEvent(brandId, EngineEventType.POSTING_SCHEDULE_UPDATED, {
      message: `Posting Schedule updated — ${updated.postsPerDay} post${updated.postsPerDay === 1 ? '' : 's'}/day, ${updated.schedulingPlatform.toLowerCase()}, starting ${updated.scheduleStartFrom.toLowerCase()}.`,
    });

    return updated;
  }

  async setApprovalMode(brandId: string, approvalMode: ApprovalMode) {
    const config = await this.getOrCreateConfig(brandId);
    const updated = await this.prisma.amaiEngineConfig.update({
      where: { id: config.id },
      data: { approvalMode },
    });
    await this.logEvent(brandId, EngineEventType.APPROVAL_MODE_CHANGED, {
      message: approvalMode === ApprovalMode.AUTO
        ? 'Auto Approval enabled — new posts will publish automatically at the AI-selected best time.'
        : 'Manual Approval enabled — new posts will wait in the Approval Queue.',
    });
    return updated;
  }

  // ─────────────────────────────────────────────────────────────
  // THE WORKFLOW: New Media Uploaded -> AMAI Engine Triggered
  // ─────────────────────────────────────────────────────────────

  /**
   * Listens for media uploads from any source (Direct Upload or Google
   * Drive sync) and always runs the full preparation pipeline, regardless
   * of Engine state — Active vs Paused only changes what happens *after*
   * the post is prepared (auto-publish vs. hold for approval).
   */
  @OnEvent('media.uploaded')
  async handleMediaUploaded(payload: MediaUploadedEvent) {
    try {
      await this.withPipelineTimeout(this.processMediaAsset(payload.mediaAssetId), payload.mediaAssetId);
    } catch (err: any) {
      this.logger.error(`AMAI Engine failed to process media asset ${payload.mediaAssetId}: ${err?.message || err}`);
      await this.prisma.mediaAsset.update({
        where: { id: payload.mediaAssetId },
        data: { status: MediaStatus.FAILED, lastErrorMessage: err?.message || 'AMAI Engine processing failed.' },
      }).catch(() => {});
    }
  }

  private withPipelineTimeout<T>(promise: Promise<T>, mediaAssetId: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.logger.error(`AMAI Engine pipeline exceeded ${PIPELINE_TIMEOUT_MS}ms for media asset ${mediaAssetId}; failing cleanly instead of leaving it stuck in PROCESSING.`);
        reject(new Error('Processing took too long. Please try again.'));
      }, PIPELINE_TIMEOUT_MS);
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); },
      );
    });
  }

  async processMediaAsset(mediaAssetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
    if (!asset || !asset.brandId) {
      throw new NotFoundException('Media asset not found or not linked to a brand.');
    }

    const brandId = asset.brandId;

    // Atomic claim (found missing in the production-readiness audit,
    // confirmed still missing here): handleMediaUploaded is triggered from
    // three independent, uncoordinated places -- the browser's own
    // POST .../process right after upload, MediaService.sweepStaleProcessing
    // (runs opportunistically on every Media Library page load), and Google
    // Drive sync (cron + "Sync Now"). A plain update() here let two of those
    // legitimately race: e.g. a slow-but-healthy pipeline run still inside
    // PIPELINE_TIMEOUT_MS gets mistaken for stuck by a *different* page load's
    // sweep (STALE_PROCESSING_MINUTES is measured off `updatedAt`, which is
    // set once at claim time and not touched again until the pipeline
    // finishes), so both would run the full pipeline concurrently. Since
    // PostMedia's primary key is (postId, assetId) -- not unique on assetId
    // alone -- nothing in the schema stops that from producing two live Post
    // rows for one asset, both of which can genuinely auto-publish under
    // AutoPilot. Same compare-and-swap pattern already proven correct on
    // PostTarget's publish claim: only succeed if the row is still PENDING,
    // or is PROCESSING but has sat there past the sweep's own staleness
    // window (i.e. actually abandoned, not just slow). `updatedAt` doubles
    // as the claim clock -- no new column needed, since it's already what
    // sweepStaleProcessing itself reads to decide whether to re-trigger.
    const staleClaimCutoff = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000);
    const claim = await this.prisma.mediaAsset.updateMany({
      where: {
        id: asset.id,
        OR: [
          { status: MediaStatus.PENDING },
          { status: MediaStatus.PROCESSING, updatedAt: { lt: staleClaimCutoff } },
        ],
      },
      data: { status: MediaStatus.PROCESSING },
    });

    if (claim.count === 0) {
      // Another run already holds this asset (or it's already past
      // PROCESSING) -- back off instead of running a second, duplicate
      // pipeline pass. Not an error: this is the expected, correct outcome
      // for the loser of the race, same as PostTarget claim misses.
      this.logger.log(`[${asset.id}] Already claimed by a concurrent run or already resolved — skipping to avoid duplicate processing.`);
      return;
    }

    // AI-entitlement bypass fix (found still open in the production-
    // readiness audit): @RequireEntitlement('generate_ai_content') was only
    // ever wired to two of the endpoints that can trigger this pipeline
    // (the direct "process asset" HTTP route and Business Brain) -- Google
    // Drive sync and MediaService.sweepStaleProcessing both call
    // handleMediaUploaded directly, bypassing the guard entirely, so a
    // brand already at or over its monthly AI quota could still trigger
    // real AI spend through those two side doors. Checking it here, right
    // after the atomic claim above, closes the gap at the one place every
    // current AND future trigger of this pipeline actually converges,
    // instead of re-adding the same check at each call site individually.
    // Marks the asset FAILED with a clear, actionable reason rather than
    // leaving it silently stuck in PROCESSING -- same failure-reporting
    // convention as every other rejection path in this method.
    const entitlementCheck = await this.entitlementsService.canPerformAction(brandId, 'generate_ai_content');
    if (!entitlementCheck.allowed) {
      this.logger.warn(`[${asset.id}] AI pipeline blocked by entitlement check: ${entitlementCheck.reason}`);
      await this.prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { status: MediaStatus.FAILED, lastErrorMessage: entitlementCheck.reason || 'Monthly AI generation limit reached.' },
      }).catch(() => {});
      return;
    }

    this.logger.log(`[${asset.id}] AMAI Engine pipeline started (brand=${brandId}, file="${asset.filename}")`);
    const config = await this.getOrCreateConfig(brandId);
    // Activity-feed log entries are informational, not load-bearing for the
    // pipeline's actual outcome -- awaiting each one serially added several
    // DB round trips to the critical path (a contributor to a live GET
    // /media/assets timing out at 60s). Not awaiting them means an
    // occasional lost log entry under a hard kill, which is a much better
    // trade than blocking the whole pipeline on activity-feed writes.
    this.logEvent(brandId, EngineEventType.ANALYSIS_STARTED, {
      mediaAssetId: asset.id,
      message: `Analysing "${asset.filename}"...`,
    }).catch(() => {});

    // 1. Analyse — real Gemini vision analysis of the actual image content
    // when possible. Falls back to a filename-based heuristic if Gemini
    // isn't configured, the vision call fails, or the asset is a video
    // (video content analysis isn't implemented yet — always uses the
    // filename fallback).
    const isVideo = asset.mimeType?.startsWith('video/');
    let topic: string;
    if (!isVideo && asset.blobUrl) {
      const visionTopic = await this.aiService.analyzeImage(asset.blobUrl, brandId, 'amai_engine');
      topic = visionTopic || this.deriveTopicFromFilename(asset.filename, asset.batchName);
    } else {
      topic = this.deriveTopicFromFilename(asset.filename, asset.batchName);
    }
    this.logger.log(`[${asset.id}] Media analyzed: topic="${topic}"`);

    const allConnectedAccounts = await this.prisma.socialAccount.findMany({
      where: { brandId, status: ConnectionStatus.CONNECTED },
    });
    // The Posting Schedule setting's "Platforms" choice restricts which
    // connected accounts this post targets (INSTAGRAM/TIKTOK only, or BOTH).
    // Falls back to every connected account if that filter would leave
    // zero targets (e.g. platform set to Instagram but only TikTok is
    // connected) — an empty-targets post would otherwise sit unpublished
    // forever with no way for the user to notice why, the same class of
    // silent-failure bug already fixed once this session.
    const platformFiltered = allConnectedAccounts.filter((a) => {
      if (config.schedulingPlatform === SchedulingPlatform.INSTAGRAM) return a.platform === Platform.INSTAGRAM;
      if (config.schedulingPlatform === SchedulingPlatform.TIKTOK) return a.platform === Platform.TIKTOK;
      return true;
    });
    const connectedAccounts = platformFiltered.length > 0 ? platformFiltered : allConnectedAccounts;
    const platformLabel = connectedAccounts.length > 0
      ? connectedAccounts.map((a) => a.platform).join(', ')
      : 'Instagram & TikTok';

    // Business Brain: the brand context (voice, audience, content pillars,
    // goals, things to avoid) every AI generation step below should reflect
    // instead of writing something generic. Returns '' if nothing's been
    // configured yet, so this is always safe to pass through unconditionally.
    const brainContext = await this.businessBrainService.buildPromptContext(brandId);

    // 2-3. Generate caption and hashtags — independent of each other, run
    // concurrently rather than one after another to cut real wall-clock
    // time roughly in half.
    const [{ caption }, hashtagResult] = await Promise.all([
      this.aiService.generateCaption(brandId, 'amai_engine', topic, platformLabel, config.defaultTone || 'friendly', brainContext),
      this.aiService.generateHashtags(topic, platformLabel, config.defaultTone || 'Content Creator', brandId, 'amai_engine'),
    ]);
    const hashtags = Array.from(new Set(hashtagResult.allHashtags)).slice(0, 8);
    this.logger.log(`[${asset.id}] Caption generated (${caption.length} chars), ${hashtags.length} hashtags generated`);
    // Only counted once generation actually succeeded -- a rejected or
    // failed attempt (caught further up the call stack) never burns quota.
    this.entitlementsService
      .getOrganizationIdForBrand(brandId)
      .then((organizationId) => this.entitlementsService.recordAiGeneration(organizationId))
      .catch((err) => this.logger.warn(`[${asset.id}] Failed to record AI generation usage: ${err.message}`));
    this.logEvent(brandId, EngineEventType.CAPTION_GENERATED, { mediaAssetId: asset.id, message: 'Caption generated.' }).catch(() => {});
    this.logEvent(brandId, EngineEventType.HASHTAGS_GENERATED, { mediaAssetId: asset.id, message: `${hashtags.length} hashtags generated.` }).catch(() => {});

    // 4. AI publishing calendar: find this asset's place on the brand's
    // 7-day-and-beyond schedule (posts-per-day cap, start date, time zone,
    // and platform-specific best-time tables — see SchedulingService),
    // rather than the old single ad-hoc "next best time" heuristic.
    const mediaKind: 'video' | 'image' = isVideo ? 'video' : 'image';
    const contentCategory = this.schedulingService.classifyContentCategory(topic, caption);
    const schedulingCfg = {
      postsPerDay: config.postsPerDay,
      scheduleStartFrom: config.scheduleStartFrom,
      customStartDate: config.customStartDate,
      timeZone: config.timeZone,
      schedulingPlatform: config.schedulingPlatform,
    };

    // 5. Check Approval Mode (Paused always forces the approval queue, even
    // if Auto Approval is selected — publishing is what Pause blocks).
    let willAutoPublish = config.state === EngineState.ACTIVE && config.approvalMode === ApprovalMode.AUTO;
    const postStatus = willAutoPublish ? PostStatus.SCHEDULED : PostStatus.NEEDS_APPROVAL;

    // AI Content Intelligence (foundation): tag this post with whichever
    // Business Brain content pillar it best matches, if any are configured.
    // Purely additive -- null when no pillars exist yet or none match.
    const brain = await this.businessBrainService.getOrCreate(brandId);
    const contentPillar = this.businessBrainService.pickBestPillar(brain.contentPillars, topic, caption);

    // assignNextSlot() checks for a free slot and this create() books it in
    // two separate steps (see uq_post_brand_scheduled_at_active's doc
    // comment on the Post model in schema.prisma for why they can't easily
    // be one atomic operation here -- the AI calls above make a single
    // wrapping transaction impractical).
    // Two concurrent uploads to the same brand can both be told the same
    // instant is free and both attempt to book it; the DB unique constraint
    // is what actually prevents the double-book, and this retry is what
    // turns that constraint violation into "transparently try the next
    // slot" instead of a failed upload. Re-picking a slot is cheap (DB
    // reads only, no AI calls) so retrying here doesn't repeat any of the
    // expensive work above.
    const MAX_SLOT_RETRIES = 3;
    let post: Awaited<ReturnType<typeof this.prisma.post.create>> | undefined;
    let scheduledAt!: Date;
    let priorityUsed!: number;
    let optimalScore!: number;
    for (let attempt = 1; attempt <= MAX_SLOT_RETRIES; attempt++) {
      ({ scheduledAt, priorityUsed } = await this.schedulingService.assignNextSlot(brandId, schedulingCfg, { mediaKind, contentCategory }));
      // 1=primary table slot -> 95, 2/3=secondary/tertiary -> a bit lower,
      // 99=generated fallback time (table exhausted for the day) -> lower still.
      optimalScore = priorityUsed === 1 ? 95 : priorityUsed === 99 ? 70 : Math.max(80, 95 - priorityUsed * 5);

      try {
        post = await this.prisma.post.create({
          data: {
            brandId,
            caption,
            hashtags,
            source: asset.source,
            status: postStatus,
            scheduledAt,
            optimalScore,
            contentCategory,
            contentPillar,
            peakTimeDetected: true,
            media: { create: [{ assetId: asset.id }] },
            targets: {
              create: connectedAccounts.map((acc) => ({
                socialAccountId: acc.id,
                platform: acc.platform,
              })),
            },
          },
        });
        break;
      } catch (error: any) {
        const isSlotCollision = error?.code === 'P2002' && Array.isArray(error?.meta?.target)
          ? error.meta.target.includes('brandId') && error.meta.target.includes('scheduledAt')
          : error?.code === 'P2002';
        if (isSlotCollision && attempt < MAX_SLOT_RETRIES) {
          this.logger.warn(`[${asset.id}] Slot collision at ${scheduledAt.toISOString()} (attempt ${attempt}/${MAX_SLOT_RETRIES}), retrying with a fresh slot.`);
          continue;
        }
        throw error;
      }
    }
    if (!post) {
      // Unreachable in practice (the loop above always either returns a
      // created post or throws), but keeps this typed as non-nullable below
      // instead of asserting it -- a genuine safety net costs nothing here.
      throw new Error(`[${asset.id}] Failed to create post: exhausted ${MAX_SLOT_RETRIES} slot retries without a definitive success or failure.`);
    }

    this.logger.log(`[${asset.id}] Content scheduled: scheduledAt=${scheduledAt.toISOString()} priority=${priorityUsed} score=${optimalScore}`);
    this.logEvent(brandId, EngineEventType.BEST_TIME_DETERMINED, {
      mediaAssetId: asset.id,
      message: `Scheduled for ${scheduledAt.toLocaleString('en-US', { timeZone: config.timeZone || 'UTC', dateStyle: 'medium', timeStyle: 'short' })} (${config.timeZone || 'UTC'}).`,
    }).catch(() => {});

    // Monthly post-limit enforcement, AutoPilot path: the post row above was
    // created as SCHEDULED speculatively (status has to be picked before the
    // row exists), but it only actually *counts* against the plan once the
    // monthly credit is reserved here. If the brand is already at its limit,
    // don't throw the whole pipeline away (the caption/hashtags/vision work
    // already happened, and a real slot in SchedulingService was already
    // booked) -- downgrade this specific post to NEEDS_APPROVAL instead, the
    // same place Manual Approval mode would have put it. The Approval
    // Queue's own approvePost() re-runs this exact check before letting the
    // user approve it, so the limit still can't be bypassed from there.
    if (willAutoPublish) {
      try {
        await this.entitlementsService.reservePostSlot(brandId);
      } catch {
        this.logger.warn(`[${asset.id}] Monthly post limit reached -- routing post ${post.id} to Approval Queue instead of auto-scheduling.`);
        post = await this.prisma.post.update({ where: { id: post.id }, data: { status: PostStatus.NEEDS_APPROVAL } });
        willAutoPublish = false;
      }
    }

    await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: willAutoPublish ? MediaStatus.SCHEDULED : MediaStatus.READY,
        linkedPostId: post.id,
      },
    });

    if (willAutoPublish) {
      const formatted = scheduledAt.toLocaleString('en-US', { timeZone: config.timeZone || 'UTC', dateStyle: 'medium', timeStyle: 'short' });
      this.logEvent(brandId, EngineEventType.AUTO_SCHEDULED, {
        postId: post.id,
        mediaAssetId: asset.id,
        message: `Post auto-scheduled for ${formatted}.`,
      }).catch(() => {});
      // No queue to push to — the post is now SCHEDULED in the DB, and the
      // /api/cron/publish-due endpoint (Vercel Cron) picks up anything due
      // on its next run. See PublishingService.publishDuePosts().
    } else {
      this.logEvent(brandId, EngineEventType.APPROVAL_QUEUED, {
        postId: post.id,
        mediaAssetId: asset.id,
        message: 'Post is ready for your review in the Approval Queue.',
      }).catch(() => {});
    }

    this.logger.log(`[${asset.id}] Workflow complete: post=${post.id} status=${post.status}`);
    return post;
  }

  // ─────────────────────────────────────────────────────────────
  // MANUAL COMPOSER: Single Image / Carousel
  // ─────────────────────────────────────────────────────────────

  /**
   * The manual composer's only entry point for creating a post: used for
   * both "Single Image" (exactly 1 asset) and "Carousel" (2-5 assets, one
   * caption/hashtag set for the whole batch, one Post row, media items kept
   * in the order the user arranged them). Carousel assets can be any mix of
   * images and videos, in any order -- there is no separate image-carousel
   * vs video-carousel system; PostMedia (postId, assetId, order) is the one
   * generic ordered-media-item join table for both, and MediaAsset.mimeType
   * is the one source of truth for what each item actually is. Distinct
   * from processMediaAsset() (the automatic per-upload AMAI pipeline, which
   * is inherently single-asset) -- this is the path a user takes when
   * they've already uploaded media and now want to deliberately group 1-5
   * of them into one post. Always lands in NEEDS_APPROVAL so it goes
   * through the exact same Approval Queue review, edit, and publish
   * machinery every other post uses (including the monthly-limit check in
   * approvePost()) -- no separate/duplicate scheduling or publishing path
   * is created here.
   */
  async composeManualPost(
    brandId: string,
    dto: { mediaAssetIds: string[]; postType: 'SINGLE' | 'CAROUSEL' },
  ) {
    const ids = Array.from(new Set(dto.mediaAssetIds || []));
    if (ids.length === 0) {
      throw new BadRequestException('Select at least one photo or video to create a post.');
    }
    if (ids.length > 5) {
      throw new BadRequestException('You can add up to 5 media items per post.');
    }
    if (dto.postType === 'SINGLE' && ids.length !== 1) {
      throw new BadRequestException('A Single Image post must have exactly one media item.');
    }
    if (dto.postType === 'CAROUSEL' && ids.length < 2) {
      throw new BadRequestException('A Carousel post needs at least 2 media items. Choose Single Image for just one.');
    }

    const assets = await this.prisma.mediaAsset.findMany({ where: { id: { in: ids }, brandId } });
    if (assets.length !== ids.length) {
      throw new BadRequestException('One or more selected media items could not be found in this brand\'s media library.');
    }
    const alreadyLinked = assets.find((a) => a.linkedPostId);
    if (alreadyLinked) {
      throw new BadRequestException(`"${alreadyLinked.filename}" is already part of another post.`);
    }
    // Media type is derived from each asset's own stored, already-validated
    // mimeType (checked against a MIME whitelist + magic-byte sniffing at
    // upload time in MediaService -- see assertAllowedMimeType /
    // claimedMimeTypeMatchesBytes) rather than trusted from anything the
    // caller sends here. A Carousel can now freely mix image and video
    // assets in any order -- there is no separate image/video carousel
    // system; PostMedia.order is the one ordering mechanism for both. Actual
    // per-platform support for a given image/video mix is enforced later, at
    // publish time (see PublishingService.assertCarouselPlatformSupport),
    // since that varies by platform (e.g. TikTok has no mixed-media or
    // multi-video carousel concept at all) and shouldn't constrain what can
    // be composed and sent for approval up front.

    // Preserve the order the caller submitted (the order the user arranged
    // them in the composer UI), not whatever order Prisma's findMany
    // happened to return.
    const orderedAssets = ids.map((id) => assets.find((a) => a.id === id)!);
    const primaryAsset = orderedAssets[0];
    const primaryIsVideo = primaryAsset.mimeType?.startsWith('video/');

    const config = await this.getOrCreateConfig(brandId);

    await this.prisma.mediaAsset.updateMany({
      where: { id: { in: ids } },
      data: { status: MediaStatus.PROCESSING },
    });

    // Analyse: one vision call against the first item stands in for "the
    // collection" -- carousels are near-universally one coherent subject
    // shot from multiple angles/moments (the exact case Part A's spec
    // describes: "understand the images as a single piece of content"), so
    // a single representative analysis is both accurate and avoids running
    // N separate (and N times as expensive) vision calls for what must
    // become one caption anyway. Matches processMediaAsset's own isVideo
    // gate (video content analysis isn't implemented yet): if the first
    // item happens to be a video, this always falls back to the
    // filename-based heuristic rather than feeding a video URL to an
    // image-analysis call.
    const visionTopic = !primaryIsVideo && primaryAsset.blobUrl
      ? await this.aiService.analyzeImage(primaryAsset.blobUrl, brandId, 'amai_engine')
      : null;
    const topic = visionTopic || this.deriveTopicFromFilename(primaryAsset.filename, primaryAsset.batchName);

    const allConnectedAccounts = await this.prisma.socialAccount.findMany({
      where: { brandId, status: ConnectionStatus.CONNECTED },
    });
    const platformFiltered = allConnectedAccounts.filter((a) => {
      if (config.schedulingPlatform === SchedulingPlatform.INSTAGRAM) return a.platform === Platform.INSTAGRAM;
      if (config.schedulingPlatform === SchedulingPlatform.TIKTOK) return a.platform === Platform.TIKTOK;
      return true;
    });
    const connectedAccounts = platformFiltered.length > 0 ? platformFiltered : allConnectedAccounts;
    const platformLabel = connectedAccounts.length > 0
      ? connectedAccounts.map((a) => a.platform).join(', ')
      : 'Instagram & TikTok';

    const brainContext = await this.businessBrainService.buildPromptContext(brandId);

    // One caption + one hashtag set for the entire batch -- never per-image.
    const [{ caption }, hashtagResult] = await Promise.all([
      this.aiService.generateCaption(brandId, 'amai_engine', topic, platformLabel, config.defaultTone || 'friendly', brainContext),
      this.aiService.generateHashtags(topic, platformLabel, config.defaultTone || 'Content Creator', brandId, 'amai_engine'),
    ]);
    const hashtags = Array.from(new Set(hashtagResult.allHashtags)).slice(0, 8);
    this.entitlementsService
      .getOrganizationIdForBrand(brandId)
      .then((organizationId) => this.entitlementsService.recordAiGeneration(organizationId))
      .catch((err) => this.logger.warn(`Failed to record AI generation usage for composed post: ${err.message}`));

    const contentCategory = this.schedulingService.classifyContentCategory(topic, caption);
    const brain = await this.businessBrainService.getOrCreate(brandId);
    const contentPillar = this.businessBrainService.pickBestPillar(brain.contentPillars, topic, caption);
    const schedulingCfg = {
      postsPerDay: config.postsPerDay,
      scheduleStartFrom: config.scheduleStartFrom,
      customStartDate: config.customStartDate,
      timeZone: config.timeZone,
      schedulingPlatform: config.schedulingPlatform,
    };

    const MAX_SLOT_RETRIES = 3;
    let post: Awaited<ReturnType<typeof this.prisma.post.create>> | undefined;
    let scheduledAt!: Date;
    for (let attempt = 1; attempt <= MAX_SLOT_RETRIES; attempt++) {
      ({ scheduledAt } = await this.schedulingService.assignNextSlot(brandId, schedulingCfg, { mediaKind: primaryIsVideo ? 'video' : 'image', contentCategory }));
      try {
        post = await this.prisma.post.create({
          data: {
            brandId,
            caption,
            hashtags,
            source: ContentSource.MANUAL,
            status: PostStatus.NEEDS_APPROVAL,
            postType: dto.postType === 'CAROUSEL' ? 'CAROUSEL' : 'SINGLE',
            scheduledAt,
            contentCategory,
            contentPillar,
            media: {
              create: orderedAssets.map((a, i) => ({ assetId: a.id, order: i })),
            },
            targets: {
              create: connectedAccounts.map((acc) => ({ socialAccountId: acc.id, platform: acc.platform })),
            },
          },
        });
        break;
      } catch (error: any) {
        const isSlotCollision = error?.code === 'P2002' && Array.isArray(error?.meta?.target)
          ? error.meta.target.includes('brandId') && error.meta.target.includes('scheduledAt')
          : error?.code === 'P2002';
        if (isSlotCollision && attempt < MAX_SLOT_RETRIES) {
          continue;
        }
        // Creation failed entirely -- release the assets back to READY so
        // they aren't stuck showing "AMAI is preparing this…" forever.
        await this.prisma.mediaAsset.updateMany({ where: { id: { in: ids } }, data: { status: MediaStatus.READY } });
        throw error;
      }
    }
    if (!post) {
      throw new Error(`Failed to create composed post: exhausted ${MAX_SLOT_RETRIES} slot retries.`);
    }

    await this.prisma.mediaAsset.updateMany({
      where: { id: { in: ids } },
      data: { status: MediaStatus.READY, linkedPostId: post.id },
    });

    // Platform-aware media processing: every item in this post (single or
    // carousel, image or video) gets a platform-specific optimized derivative for each
    // currently-connected platform, same as the automatic upload pipeline
    // does in MediaService.triggerProcessing -- the manual composer must
    // not bypass this and hand publishing a raw, un-optimized original.
    // Never throws (mirrors MediaOptimizationService's own contract):
    // publishing still falls back to the original if this fails, it just
    // won't be platform-optimized.
    if (connectedAccounts.length > 0) {
      const platformKeys = Array.from(new Set(connectedAccounts.map((acc) => acc.platform)));
      await Promise.allSettled(
        orderedAssets.map((a) => this.mediaOptimizationService.optimizeForPlatforms(a.id, brandId, platformKeys)),
      ).catch(() => {});
    }

    await this.logEvent(brandId, EngineEventType.APPROVAL_QUEUED, {
      postId: post.id,
      message: dto.postType === 'CAROUSEL'
        ? `Carousel post (${ids.length} items) is ready for your review in the Approval Queue.`
        : 'Post is ready for your review in the Approval Queue.',
    }).catch(() => {});

    return post;
  }

  // ─────────────────────────────────────────────────────────────
  // APPROVAL QUEUE ACTIONS
  // ─────────────────────────────────────────────────────────────

  async approvePost(
    brandId: string,
    postId: string,
    overrides?: {
      caption?: string;
      hashtags?: string[];
      ctaText?: string;
      scheduledAt?: string;
      targets?: { platform: Platform; socialAccountId: string }[];
      publishNow?: boolean;
    },
  ) {
    const post = await this.getBrandPostOrThrow(brandId, postId);
    if (post.status !== PostStatus.NEEDS_APPROVAL) {
      throw new BadRequestException('Only posts awaiting approval can be approved.');
    }

    if (overrides?.targets && overrides.targets.length > 0) {
      await this.replaceTargets(brandId, postId, overrides.targets);
    }

    // Preflight: catch the same problems publishOne() would eventually hit
    // (no media, no connected platform, an expired connection with no
    // refresh token) here, before the post leaves the Approval Queue --
    // with a specific, actionable message -- instead of letting it sit in
    // SCHEDULED for hours only to fail silently when the cron finally
    // reaches it.
    await this.runPublishPreflight(brandId, postId, overrides?.caption ?? post.caption);

    // Monthly post-limit enforcement, Manual Approval path: this is the one
    // chokepoint every non-AutoPilot post goes through on its way to
    // SCHEDULED -- Approval Queue "Approve", "Publish Now", and "Approve &
    // schedule for later" all call approvePost(), so this single check
    // covers all three plus carousel posts (composeManualPost() always
    // lands new posts in NEEDS_APPROVAL, so they always pass through here
    // too). Deliberately thrown before the DB update below, so a
    // limit-blocked approval leaves the post exactly where it was
    // (NEEDS_APPROVAL) rather than partially transitioning it.
    await this.entitlementsService.reservePostSlot(brandId);

    const scheduledAt = overrides?.publishNow
      ? new Date()
      : overrides?.scheduledAt
        ? new Date(overrides.scheduledAt)
        : (post.scheduledAt || new Date());

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        caption: overrides?.caption ?? post.caption,
        hashtags: overrides?.hashtags ?? post.hashtags,
        ctaText: overrides?.ctaText !== undefined ? overrides.ctaText : post.ctaText,
        scheduledAt,
        status: PostStatus.SCHEDULED,
        approvedAt: new Date(),
      },
    });

    await this.prisma.mediaAsset.updateMany({
      where: { linkedPostId: postId },
      data: { status: MediaStatus.SCHEDULED },
    });

    await this.logEvent(brandId, EngineEventType.POST_APPROVED, {
      postId,
      message: overrides?.publishNow ? 'Post approved — publishing now.' : 'Post approved and scheduled.',
    });

    if (overrides?.publishNow) {
      // Must be awaited, not fire-and-forget: a Vercel serverless function
      // can be frozen the instant its HTTP response is flushed, so any
      // background work still in flight (the actual Instagram/TikTok API
      // calls) has no guarantee of ever finishing. That was the root cause
      // of "Publish Now" silently doing nothing — the approve request
      // returned success immediately, the post left the Approval Queue,
      // and publishOne() may never have actually run to completion.
      // Awaiting here means the HTTP response only completes once every
      // target has genuinely resolved (published or failed) against the
      // real platform API, and the response reflects the true outcome.
      const targets = await this.prisma.postTarget.findMany({ where: { postId, status: TargetStatus.PENDING } });
      const results = await Promise.allSettled(targets.map((t) => this.publishingService.publishOne(t.id)));
      const publishErrors = results
        .map((r, i) => (r.status === 'rejected' ? { platform: targets[i].platform, error: (r as PromiseRejectedResult).reason?.message || 'Publish failed.' } : null))
        .filter((e): e is { platform: Platform; error: string } => e !== null);

      const finalPost = await this.prisma.post.findUnique({ where: { id: postId } });
      return { ...finalPost, publishErrors };
    }
    // Otherwise: picked up by the next /api/cron/publish-due run once scheduledAt is due.

    return updated;
  }

  /**
   * Rejects/cancels a post. Covers both the Approval Queue's "Reject"
   * action (NEEDS_APPROVAL) and the publishing calendar's "Delete" action
   * on a post that's already SCHEDULED but hasn't published yet — there
   * was previously no way to cancel a scheduled post at all short of
   * waiting for it to fail.
   */
  async rejectPost(brandId: string, postId: string) {
    const post = await this.getBrandPostOrThrow(brandId, postId);
    if (post.status !== PostStatus.NEEDS_APPROVAL && post.status !== PostStatus.SCHEDULED) {
      throw new BadRequestException('Only posts awaiting approval or scheduled posts can be rejected.');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.REJECTED, rejectedAt: new Date() },
    });

    await this.prisma.mediaAsset.updateMany({
      where: { linkedPostId: postId },
      data: { status: MediaStatus.FAILED, lastErrorMessage: 'Rejected/cancelled.' },
    });

    await this.logEvent(brandId, EngineEventType.POST_REJECTED, { postId, message: 'Post rejected/cancelled.' });
    return updated;
  }

  /**
   * Manually retries a permanently FAILED post: resets its failed targets
   * back to PENDING and republishes immediately, rather than waiting for
   * the next /api/cron/publish-due pass.
   */
  async retryPost(brandId: string, postId: string) {
    const post = await this.getBrandPostOrThrow(brandId, postId);
    if (post.status !== PostStatus.FAILED) {
      throw new BadRequestException('Only failed posts can be retried.');
    }

    await this.prisma.postTarget.updateMany({
      where: { postId, status: TargetStatus.FAILED },
      data: { status: TargetStatus.PENDING },
    });

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.SCHEDULED, scheduledAt: new Date() },
    });

    await this.logEvent(brandId, EngineEventType.POST_EDITED, { postId, message: 'Retrying failed post now.' });

    // Same fix as approvePost's publishNow path: awaited, not fire-and-forget,
    // so the response reflects what actually happened rather than assuming
    // background work completed after the function may have been frozen.
    const targets = await this.prisma.postTarget.findMany({ where: { postId, status: TargetStatus.PENDING } });
    const results = await Promise.allSettled(targets.map((t) => this.publishingService.publishOne(t.id)));
    const publishErrors = results
      .map((r, i) => (r.status === 'rejected' ? { platform: targets[i].platform, error: (r as PromiseRejectedResult).reason?.message || 'Publish failed.' } : null))
      .filter((e): e is { platform: Platform; error: string } => e !== null);

    const finalPost = await this.prisma.post.findUnique({ where: { id: postId } });
    return { ...finalPost, publishErrors };
  }

  async editPost(
    brandId: string,
    postId: string,
    dto: {
      caption?: string;
      hashtags?: string[];
      ctaText?: string;
      scheduledAt?: string;
      targets?: { platform: Platform; socialAccountId: string }[];
    },
  ) {
    const post = await this.getBrandPostOrThrow(brandId, postId);
    if (post.status !== PostStatus.NEEDS_APPROVAL && post.status !== PostStatus.SCHEDULED) {
      throw new BadRequestException('Only queued or scheduled posts can be edited.');
    }

    if (dto.targets && dto.targets.length > 0) {
      await this.replaceTargets(brandId, postId, dto.targets);
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        caption: dto.caption ?? post.caption,
        hashtags: dto.hashtags ?? post.hashtags,
        ctaText: dto.ctaText !== undefined ? dto.ctaText : post.ctaText,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : post.scheduledAt,
      },
    });

    await this.logEvent(brandId, EngineEventType.POST_EDITED, { postId, message: 'Post edited.' });

    // If it was already scheduled and the time changed, the next
    // /api/cron/publish-due run will naturally pick it up at the new time —
    // nothing to re-enqueue since there's no queue anymore.

    return updated;
  }

  /**
   * Replaces a post's target platforms/accounts to match exactly what was
   * selected in the Approval Queue's edit form. Validates every requested
   * socialAccountId actually belongs to this brand and matches the claimed
   * platform before touching anything, so a post can never be silently
   * pointed at another brand's connected account.
   */
  private async replaceTargets(
    brandId: string,
    postId: string,
    targets: { platform: Platform; socialAccountId: string }[],
  ) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { id: { in: targets.map((t) => t.socialAccountId) }, brandId },
    });
    const validTargets = targets.filter((t) =>
      accounts.some((a) => a.id === t.socialAccountId && a.platform === t.platform),
    );
    if (validTargets.length === 0) {
      throw new BadRequestException('None of the selected platforms have a connected, matching account for this brand.');
    }

    const keepIds = validTargets.map((t) => t.socialAccountId);
    await this.prisma.$transaction([
      this.prisma.postTarget.deleteMany({
        where: { postId, socialAccountId: { notIn: keepIds } },
      }),
      ...validTargets.map((t) =>
        this.prisma.postTarget.upsert({
          where: { postId_socialAccountId: { postId, socialAccountId: t.socialAccountId } },
          update: { platform: t.platform },
          create: { postId, socialAccountId: t.socialAccountId, platform: t.platform, status: TargetStatus.PENDING },
        }),
      ),
    ]);
  }

  /**
   * Publishing preflight: run at the Approval Queue's approve step, before
   * a post is allowed to become SCHEDULED. Distinct from the connection
   * preflight in PublishingService.publishOne() (which runs immediately
   * before the actual platform API call) -- this one runs at scheduling
   * time so a broken post is rejected with a specific, actionable message
   * right away, rather than silently sitting in the queue until the next
   * cron pass discovers the same problem hours later.
   */
  private async runPublishPreflight(brandId: string, postId: string, caption: string): Promise<void> {
    const [media, targets] = await Promise.all([
      this.prisma.postMedia.findFirst({ where: { postId }, include: { asset: true } }),
      this.prisma.postTarget.findMany({ where: { postId }, include: { socialAccount: true } }),
    ]);

    const issues: string[] = [];

    if (!caption || !caption.trim()) {
      issues.push('This post has no caption.');
    }

    if (!media?.asset?.blobUrl) {
      issues.push('This post has no media attached.');
    }

    if (targets.length === 0) {
      const anyConnected = await this.prisma.socialAccount.count({
        where: { brandId, status: ConnectionStatus.CONNECTED },
      });
      issues.push(
        anyConnected > 0
          ? 'No platform is selected for this post — choose at least one connected account.'
          : 'No social account is connected for this brand yet — connect one in Integrations first.',
      );
    } else {
      for (const target of targets) {
        const health = deriveConnectionHealth(target.socialAccount);
        if (health.health === 'REAUTH_REQUIRED' && !target.socialAccount.refreshToken) {
          issues.push(`${target.platform} needs to be reconnected before this post can publish — reconnect it in Integrations.`);
        }
      }
    }

    if (issues.length > 0) {
      throw new BadRequestException(issues.join(' '));
    }
  }

  /**
   * P1 content calendar intelligence: balance/repetition detection over
   * real scheduled data, surfaced to the user rather than left as an
   * invisible scheduler-only behavior. SchedulingService.assignNextSlot
   * already makes a best-effort attempt to avoid placing two same-category
   * posts back-to-back at creation time, but that's a single bounded skip,
   * not a guarantee -- this looks at what's actually on the calendar now
   * and reports it honestly, including any repeats that did slip through.
   *
   * Every count here is a real query against Post.contentCategory /
   * contentPillar (both already populated by the pipeline in
   * processMediaAsset) -- nothing is inferred or estimated.
   */
  async getCalendarInsights(brandId: string, days = 30) {
    const window = Math.min(Math.max(days, 1), 90);
    const from = new Date();
    const to = new Date(from.getTime() + window * 24 * 60 * 60 * 1000);

    const [posts, brain] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          brandId,
          scheduledAt: { gte: from, lte: to },
          status: { in: [PostStatus.SCHEDULED, PostStatus.PUBLISHED, PostStatus.PUBLISHING] },
        },
        orderBy: { scheduledAt: 'asc' },
        select: { id: true, scheduledAt: true, contentCategory: true, contentPillar: true },
      }),
      this.businessBrainService.getOrCreate(brandId),
    ]);

    const categoryCounts = new Map<string, number>();
    const pillarCounts = new Map<string, number>();
    const repeats: { firstPostId: string; secondPostId: string; category: string; scheduledAt: Date | null }[] = [];

    let prev: (typeof posts)[number] | null = null;
    for (const p of posts) {
      if (p.contentCategory) categoryCounts.set(p.contentCategory, (categoryCounts.get(p.contentCategory) || 0) + 1);
      if (p.contentPillar) pillarCounts.set(p.contentPillar, (pillarCounts.get(p.contentPillar) || 0) + 1);

      if (prev && prev.contentCategory && prev.contentCategory === p.contentCategory) {
        repeats.push({ firstPostId: prev.id, secondPostId: p.id, category: p.contentCategory, scheduledAt: p.scheduledAt });
      }
      prev = p;
    }

    const configuredPillars = brain.contentPillars || [];
    const uncoveredPillars = configuredPillars.filter((pillar) => !pillarCounts.has(pillar));

    return {
      windowDays: window,
      from,
      to,
      totalScheduled: posts.length,
      categoryCounts: Object.fromEntries(categoryCounts),
      pillarCounts: Object.fromEntries(pillarCounts),
      // Pillars the user configured but that have zero posts in this
      // window -- only meaningful if pillars are actually configured.
      uncoveredPillars,
      // Back-to-back same-category posts that made it onto the calendar
      // despite the scheduler's diversity nudge (e.g. it's the only
      // category available, or the bounded search gave up).
      backToBackRepeats: repeats,
    };
  }

  private async getBrandPostOrThrow(brandId: string, postId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, brandId } });
    if (!post) throw new NotFoundException('Post not found.');
    return post;
  }


  // ─────────────────────────────────────────────────────────────
  // EVENT LOG (audit trail + real-time SSE feed)
  // ─────────────────────────────────────────────────────────────

  async logEvent(brandId: string, type: EngineEventType, opts: { postId?: string; mediaAssetId?: string; message?: string }) {
    const event = await this.prisma.engineEvent.create({
      data: { brandId, type, postId: opts.postId, mediaAssetId: opts.mediaAssetId, message: opts.message },
    });
    this.events.emit('engine.activity', event);
    return event;
  }

  async getRecentEvents(brandId: string, limit = 30) {
    return this.prisma.engineEvent.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Heuristic topic extraction (placeholder for a future vision model)
  // ─────────────────────────────────────────────────────────────

  private deriveTopicFromFilename(filename: string, batchName?: string | null): string {
    const source = batchName || filename || 'new content';
    const cleaned = source
      .replace(/\.[a-zA-Z0-9]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\d{6,}/g, '')
      .trim();
    return cleaned.length > 2 ? cleaned : 'our latest update';
  }
}
