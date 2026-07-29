import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { PublishingService } from '../queue/publishing.service';
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
} from '@prisma/client';

export interface MediaUploadedEvent {
  mediaAssetId: string;
}

@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private events: EventEmitter2,
    private publishingService: PublishingService,
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
      await this.processMediaAsset(payload.mediaAssetId);
    } catch (err: any) {
      this.logger.error(`AMAI Engine failed to process media asset ${payload.mediaAssetId}: ${err?.message || err}`);
      await this.prisma.mediaAsset.update({
        where: { id: payload.mediaAssetId },
        data: { status: MediaStatus.FAILED, lastErrorMessage: err?.message || 'AMAI Engine processing failed.' },
      }).catch(() => {});
    }
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
    await this.logEvent(brandId, EngineEventType.ANALYSIS_STARTED, {
      mediaAssetId: asset.id,
      message: `Analysing "${asset.filename}"...`,
    });

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

    const connectedAccounts = await this.prisma.socialAccount.findMany({
      where: { brandId, status: ConnectionStatus.CONNECTED },
    });
    const platformLabel = connectedAccounts.length > 0
      ? connectedAccounts.map((a) => a.platform).join(', ')
      : 'Instagram & TikTok';

    // 2. Generate caption
    const { caption } = await this.aiService.generateCaption(
      brandId,
      'amai_engine',
      topic,
      platformLabel,
      config.defaultTone || 'friendly',
    );
    await this.logEvent(brandId, EngineEventType.CAPTION_GENERATED, { mediaAssetId: asset.id, message: 'Caption generated.' });

    // 3. Generate hashtags
    const hashtagResult = await this.aiService.generateHashtags(topic, platformLabel, config.defaultTone || 'Content Creator');
    const hashtags = Array.from(new Set(hashtagResult.allHashtags)).slice(0, 8);
    await this.logEvent(brandId, EngineEventType.HASHTAGS_GENERATED, { mediaAssetId: asset.id, message: `${hashtags.length} hashtags generated.` });

    // 4. Determine best posting time
    const bestTime = await this.aiService.predictBestPostingTime(
      connectedAccounts[0]?.platform || 'Instagram',
      brandId,
    );
    await this.logEvent(brandId, EngineEventType.BEST_TIME_DETERMINED, {
      mediaAssetId: asset.id,
      message: `Best time: ${bestTime.formattedTime}.`,
    });

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
        scheduledAt: new Date(bestTime.recommendedTime),
        optimalScore: bestTime.confidence,
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
      await this.logEvent(brandId, EngineEventType.AUTO_SCHEDULED, {
        postId: post.id,
        mediaAssetId: asset.id,
        message: `Post auto-scheduled for ${bestTime.formattedTime}.`,
      });
      // No queue to push to — the post is now SCHEDULED in the DB, and the
      // /api/cron/publish-due endpoint (Vercel Cron) picks up anything due
      // on its next run. See PublishingService.publishDuePosts().
    } else {
      await this.logEvent(brandId, EngineEventType.APPROVAL_QUEUED, {
        postId: post.id,
        mediaAssetId: asset.id,
        message: 'Post is ready for your review in the Approval Queue.',
      });
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
      message: overrides?.publishNow ? 'Post approved and publishing now.' : 'Post approved and scheduled.',
    });

    if (overrides?.publishNow) {
      // Fire-and-forget, same pattern as retryPost — don't block the HTTP
      // response on external platform API latency. Failures are recorded
      // per-target by publishOne itself.
      const targets = await this.prisma.postTarget.findMany({ where: { postId, status: TargetStatus.PENDING } });
      for (const target of targets) {
        this.publishingService.publishOne(target.id).catch(() => {});
      }
    }
    // Otherwise: picked up by the next /api/cron/publish-due run once scheduledAt is due.

    return updated;
  }

  async rejectPost(brandId: string, postId: string) {
    const post = await this.getBrandPostOrThrow(brandId, postId);
    if (post.status !== PostStatus.NEEDS_APPROVAL) {
      throw new BadRequestException('Only posts awaiting approval can be rejected.');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.REJECTED, rejectedAt: new Date() },
    });

    await this.prisma.mediaAsset.updateMany({
      where: { linkedPostId: postId },
      data: { status: MediaStatus.FAILED, lastErrorMessage: 'Rejected in Approval Queue.' },
    });

    await this.logEvent(brandId, EngineEventType.POST_REJECTED, { postId, message: 'Post rejected.' });
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

    const targets = await this.prisma.postTarget.findMany({ where: { postId, status: TargetStatus.PENDING } });
    for (const target of targets) {
      this.publishingService.publishOne(target.id).catch(() => {});
    }

    return updated;
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
