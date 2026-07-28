import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import {
  EngineState,
  ApprovalMode,
  MediaStatus,
  PostStatus,
  ContentSource,
  EngineEventType,
  ConnectionStatus,
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
    @InjectQueue('publish-queue') private publishQueue: Queue,
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

    // 1. Analyse — lightweight heuristic topic extraction from the filename
    // and batch name (a full vision-model pass can be dropped in here later
    // without changing anything downstream).
    const topic = this.deriveTopicFromFilename(asset.filename, asset.batchName);
    const isVideo = asset.mimeType?.startsWith('video/');

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
      await this.enqueuePublish(post.id, post.scheduledAt!);
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

  async approvePost(brandId: string, postId: string, overrides?: { caption?: string; hashtags?: string[]; scheduledAt?: string }) {
    const post = await this.getBrandPostOrThrow(brandId, postId);
    if (post.status !== PostStatus.NEEDS_APPROVAL) {
      throw new BadRequestException('Only posts awaiting approval can be approved.');
    }

    const scheduledAt = overrides?.scheduledAt ? new Date(overrides.scheduledAt) : (post.scheduledAt || new Date());

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        caption: overrides?.caption ?? post.caption,
        hashtags: overrides?.hashtags ?? post.hashtags,
        scheduledAt,
        status: PostStatus.SCHEDULED,
        approvedAt: new Date(),
      },
    });

    await this.prisma.mediaAsset.updateMany({
      where: { linkedPostId: postId },
      data: { status: MediaStatus.SCHEDULED },
    });

    await this.logEvent(brandId, EngineEventType.POST_APPROVED, { postId, message: 'Post approved and scheduled.' });
    await this.enqueuePublish(postId, scheduledAt);

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

  async editPost(brandId: string, postId: string, dto: { caption?: string; hashtags?: string[]; scheduledAt?: string }) {
    const post = await this.getBrandPostOrThrow(brandId, postId);
    if (post.status !== PostStatus.NEEDS_APPROVAL && post.status !== PostStatus.SCHEDULED) {
      throw new BadRequestException('Only queued or scheduled posts can be edited.');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        caption: dto.caption ?? post.caption,
        hashtags: dto.hashtags ?? post.hashtags,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : post.scheduledAt,
      },
    });

    await this.logEvent(brandId, EngineEventType.POST_EDITED, { postId, message: 'Post edited.' });

    // If it was already scheduled and the time changed, re-enqueue with the
    // new delay (BullMQ dedups on jobId per PostTarget, see enqueuePublish).
    if (post.status === PostStatus.SCHEDULED && dto.scheduledAt) {
      await this.enqueuePublish(postId, new Date(dto.scheduledAt));
    }

    return updated;
  }

  private async getBrandPostOrThrow(brandId: string, postId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, brandId } });
    if (!post) throw new NotFoundException('Post not found.');
    return post;
  }

  // ─────────────────────────────────────────────────────────────
  // QUEUEING
  // ─────────────────────────────────────────────────────────────

  async enqueuePublish(postId: string, scheduledAt: Date) {
    const targets = await this.prisma.postTarget.findMany({ where: { postId, status: 'PENDING' } });
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());

    for (const target of targets) {
      await this.publishQueue.add(
        'publish',
        { postTargetId: target.id },
        { jobId: target.id, delay, removeOnComplete: true, attempts: 3, backoff: { type: 'exponential', delay: 30_000 } },
      );
    }
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
