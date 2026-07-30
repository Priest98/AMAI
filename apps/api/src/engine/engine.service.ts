import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { PublishingService } from '../queue/publishing.service';
import { SchedulingService } from './scheduling.service';
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
const PIPELINE_TIMEOUT_MS = 40_000;

@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private events: EventEmitter2,
    private publishingService: PublishingService,
    private schedulingService: SchedulingService,
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
    const config = await this.getOrCreateConfig(brandId);

    await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { status: MediaStatus.PROCESSING },
    });
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
      const visionTopic = await this.aiService.analyzeImage(asset.blobUrl);
      topic = visionTopic || this.deriveTopicFromFilename(asset.filename, asset.batchName);
    } else {
      topic = this.deriveTopicFromFilename(asset.filename, asset.batchName);
    }

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

    // 2-3. Generate caption and hashtags — independent of each other, run
    // concurrently rather than one after another to cut real wall-clock
    // time roughly in half.
    const [{ caption }, hashtagResult] = await Promise.all([
      this.aiService.generateCaption(brandId, 'amai_engine', topic, platformLabel, config.defaultTone || 'friendly'),
      this.aiService.generateHashtags(topic, platformLabel, config.defaultTone || 'Content Creator'),
    ]);
    const hashtags = Array.from(new Set(hashtagResult.allHashtags)).slice(0, 8);
    this.logEvent(brandId, EngineEventType.CAPTION_GENERATED, { mediaAssetId: asset.id, message: 'Caption generated.' }).catch(() => {});
    this.logEvent(brandId, EngineEventType.HASHTAGS_GENERATED, { mediaAssetId: asset.id, message: `${hashtags.length} hashtags generated.` }).catch(() => {});

    // 4. AI publishing calendar: find this asset's place on the brand's
    // 7-day-and-beyond schedule (posts-per-day cap, start date, time zone,
    // and platform-specific best-time tables — see SchedulingService),
    // rather than the old single ad-hoc "next best time" heuristic.
    const mediaKind: 'video' | 'image' = isVideo ? 'video' : 'image';
    const contentCategory = this.schedulingService.classifyContentCategory(topic, caption);
    const { scheduledAt, priorityUsed } = await this.schedulingService.assignNextSlot(
      brandId,
      {
        postsPerDay: config.postsPerDay,
        scheduleStartFrom: config.scheduleStartFrom,
        customStartDate: config.customStartDate,
        timeZone: config.timeZone,
        schedulingPlatform: config.schedulingPlatform,
      },
      { mediaKind, contentCategory },
    );
    // 1=primary table slot -> 95, 2/3=secondary/tertiary -> a bit lower,
    // 99=generated fallback time (table exhausted for the day) -> lower still.
    const optimalScore = priorityUsed === 1 ? 95 : priorityUsed === 99 ? 70 : Math.max(80, 95 - priorityUsed * 5);
    this.logEvent(brandId, EngineEventType.BEST_TIME_DETERMINED, {
      mediaAssetId: asset.id,
      message: `Scheduled for ${scheduledAt.toLocaleString('en-US', { timeZone: config.timeZone || 'UTC', dateStyle: 'medium', timeStyle: 'short' })} (${config.timeZone || 'UTC'}).`,
    }).catch(() => {});

    // 5. Check Approval Mode (Paused always forces the approval queue, even
    // if Auto Approval is selected — publishing is what Pause blocks).
    const willAutoPublish = config.state === EngineState.ACTIVE && config.approvalMode === ApprovalMode.AUTO;
    const postStatus = willAutoPublish ? PostStatus.SCHEDULED : PostStatus.NEEDS_APPROVAL;

    const post = await this.prisma.post.create({
      data: {
        brandId,
        caption,
        hashtags,
        source: asset.source,
        status: postStatus,
        scheduledAt,
        optimalScore,
        contentCategory,
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
