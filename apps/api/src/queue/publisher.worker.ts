import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { StorageService } from '../storage/storage.service';
import { Platform, TargetStatus, PostStatus, MediaStatus, EngineEventType } from '@prisma/client';

interface PublishJobData {
  postTargetId: string;
}

/**
 * Publishes one PostTarget (one post -> one connected platform account) to
 * the real platform API using the brand's connected SocialAccount token.
 *
 * This calls real Instagram Graph API / TikTok Content Posting API
 * endpoints — actually publishing requires a live, connected, approved
 * business account for that platform, so this path can only be exercised
 * end-to-end once real OAuth credentials are configured and an account is
 * connected. Every failure path is caught and logged to PublishingLog so
 * the UI can always show a meaningful reason instead of a generic error.
 */
@Processor('publish-queue')
export class PublisherWorker extends WorkerHost {
  private readonly logger = new Logger(PublisherWorker.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private storage: StorageService,
    private events: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<PublishJobData>) {
    const { postTargetId } = job.data;

    const target = await this.prisma.postTarget.findUnique({
      where: { id: postTargetId },
      include: {
        socialAccount: true,
        post: { include: { media: { include: { asset: true } } } },
      },
    });

    if (!target) {
      this.logger.warn(`PostTarget ${postTargetId} no longer exists — skipping job.`);
      return;
    }
    if (target.status !== 'PENDING') {
      return; // already resolved (e.g. re-enqueued by the safety-net cron)
    }

    const mediaAsset = target.post.media[0]?.asset;

    try {
      if (!mediaAsset?.blobUrl) {
        throw new Error('No media file is attached to this post.');
      }

      const accessToken = this.encryption.decrypt(target.socialAccount.accessToken);
      const providerPostId = await this.publishToPlatform(
        target.platform,
        target.socialAccount.platformAccountId,
        accessToken,
        target.post.caption + (target.post.hashtags?.length ? `\n\n${target.post.hashtags.join(' ')}` : ''),
        mediaAsset.blobUrl,
        mediaAsset.mimeType,
      );

      await this.prisma.$transaction([
        this.prisma.postTarget.update({ where: { id: target.id }, data: { status: TargetStatus.PUBLISHED } }),
        this.prisma.publishingLog.create({
          data: { postTargetId: target.id, status: TargetStatus.PUBLISHED, apiResponse: JSON.stringify({ providerPostId }) },
        }),
      ]);

      await this.events.emitAsync('engine.activity', await this.prisma.engineEvent.create({
        data: {
          brandId: target.post.brandId,
          type: EngineEventType.PUBLISH_SUCCEEDED,
          postId: target.postId,
          message: `Published to ${target.platform}.`,
        },
      }));

      await this.finalizeIfComplete(target.postId, target.platform, providerPostId, mediaAsset.id);
    } catch (error: any) {
      const message = error?.message || 'Publish failed for an unknown reason.';
      this.logger.error(`Publish failed for target ${target.id} (${target.platform}): ${message}`);

      await this.prisma.$transaction([
        this.prisma.postTarget.update({ where: { id: target.id }, data: { status: TargetStatus.FAILED } }),
        this.prisma.publishingLog.create({
          data: { postTargetId: target.id, status: TargetStatus.FAILED, errorMessage: message },
        }),
      ]);

      await this.prisma.engineEvent.create({
        data: { brandId: target.post.brandId, type: EngineEventType.PUBLISH_FAILED, postId: target.postId, message },
      }).then((e) => this.events.emit('engine.activity', e));

      if (mediaAsset) {
        await this.prisma.mediaAsset.update({
          where: { id: mediaAsset.id },
          data: { status: MediaStatus.FAILED, lastErrorMessage: message },
        }).catch(() => {});
      }

      await this.finalizeIfComplete(target.postId, target.platform, null, mediaAsset?.id);
      throw error; // let BullMQ apply its retry/backoff policy
    }
  }

  /** Marks the parent Post PUBLISHED/FAILED once every target has resolved. */
  private async finalizeIfComplete(postId: string, platform: Platform, providerPostId: string | null, mediaAssetId?: string) {
    const remaining = await this.prisma.postTarget.count({ where: { postId, status: 'PENDING' } });
    if (remaining > 0) return;

    const failed = await this.prisma.postTarget.count({ where: { postId, status: TargetStatus.FAILED } });
    const status = failed > 0 ? PostStatus.FAILED : PostStatus.PUBLISHED;

    await this.prisma.post.update({
      where: { id: postId },
      data: { status, publishedAt: status === PostStatus.PUBLISHED ? new Date() : undefined },
    });

    if (status === PostStatus.PUBLISHED && mediaAssetId) {
      const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
      await this.prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: {
          status: MediaStatus.PUBLISHED,
          platform,
          providerPostId: providerPostId || undefined,
          publishedAt: new Date(),
          blobUrl: null,
        },
      });
      // Free up storage now that the platform has its own copy of the media.
      if (asset?.blobUrl) await this.storage.deleteFile(asset.blobUrl);
    }
  }

  private async publishToPlatform(
    platform: Platform,
    platformAccountId: string,
    accessToken: string,
    caption: string,
    mediaUrl: string,
    mimeType: string,
  ): Promise<string> {
    switch (platform) {
      case 'INSTAGRAM':
        return this.publishToInstagram(platformAccountId, accessToken, caption, mediaUrl, mimeType);
      case 'TIKTOK':
        return this.publishToTikTok(accessToken, caption, mediaUrl);
      default:
        throw new Error(`Publishing to ${platform} isn't supported yet.`);
    }
  }

  /** Instagram Graph API: create a media container, then publish it. */
  private async publishToInstagram(igUserId: string, accessToken: string, caption: string, mediaUrl: string, mimeType: string): Promise<string> {
    const isVideo = mimeType?.startsWith('video/');
    const containerParams = new URLSearchParams({
      caption,
      access_token: accessToken,
      ...(isVideo ? { media_type: 'REELS', video_url: mediaUrl } : { image_url: mediaUrl }),
    });

    const containerRes = await fetch(`https://graph.instagram.com/v19.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: containerParams,
    });
    const containerData = await containerRes.json();
    if (!containerRes.ok || !containerData.id) {
      throw new Error(containerData?.error?.message || 'Instagram rejected the media container.');
    }

    const publishRes = await fetch(`https://graph.instagram.com/v19.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ creation_id: containerData.id, access_token: accessToken }),
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) {
      throw new Error(publishData?.error?.message || 'Instagram publish step failed.');
    }

    return publishData.id;
  }

  /** TikTok Content Posting API (PULL_FROM_URL init flow). */
  private async publishToTikTok(accessToken: string, caption: string, videoUrl: string): Promise<string> {
    const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        post_info: { title: caption, privacy_level: 'SELF_ONLY', disable_duet: false, disable_comment: false, disable_stitch: false },
        source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error?.code !== 'ok' || !data.data?.publish_id) {
      throw new Error(data?.error?.message || 'TikTok publish initiation failed.');
    }

    return data.data.publish_id;
  }
}
