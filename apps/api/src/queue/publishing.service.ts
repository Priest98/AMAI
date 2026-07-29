import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { StorageService } from '../storage/storage.service';
import { Platform, TargetStatus, PostStatus, MediaStatus, EngineEventType } from '@prisma/client';

const MAX_PUBLISH_ATTEMPTS = 3;

/**
 * Publishes posts to the real platform APIs (Instagram Graph API, TikTok
 * Content Posting API) using the brand's connected SocialAccount token.
 *
 * This used to run as a BullMQ worker (a persistent process pulling
 * delayed jobs off a Redis queue), but Vercel serverless functions can't
 * host a persistent worker — there's no process guaranteed to be alive
 * when a delayed job becomes ready. Instead, `publishDuePosts()` is called
 * directly by the /api/cron/publish-due endpoint, which Vercel Cron hits
 * on a schedule (see vercel.json). Every request just synchronously
 * publishes whatever is due right now — no queue, no worker, no Redis.
 */
@Injectable()
export class PublishingService {
  private readonly logger = new Logger(PublishingService.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private storage: StorageService,
    private events: EventEmitter2,
  ) {}

  /** Finds every post that's due and publishes each of its pending targets. */
  async publishDuePosts() {
    const due = await this.prisma.post.findMany({
      where: { status: PostStatus.SCHEDULED, scheduledAt: { lte: new Date() } },
      include: { targets: { where: { status: TargetStatus.PENDING } } },
      take: 50,
    });

    let published = 0;
    let failed = 0;
    for (const post of due) {
      for (const target of post.targets) {
        try {
          await this.publishOne(target.id);
          published++;
        } catch {
          failed++; // publishOne already logs + records this; keep going.
        }
      }
    }

    if (due.length > 0) {
      this.logger.log(`publishDuePosts: checked ${due.length} due post(s), ${published} published, ${failed} failed this pass.`);
    }
    return { checked: due.length, published, failed };
  }

  /**
   * Publishes one PostTarget (one post -> one connected platform account).
   * On failure, retries up to MAX_PUBLISH_ATTEMPTS times across future cron
   * runs (left PENDING so the next pass picks it up again) before being
   * marked permanently FAILED.
   */
  async publishOne(postTargetId: string) {
    const target = await this.prisma.postTarget.findUnique({
      where: { id: postTargetId },
      include: {
        socialAccount: true,
        post: { include: { media: { include: { asset: true } } } },
      },
    });

    if (!target) {
      this.logger.warn(`PostTarget ${postTargetId} no longer exists — skipping.`);
      return;
    }
    if (target.status !== 'PENDING') {
      return; // already resolved
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

      const event = await this.prisma.engineEvent.create({
        data: { brandId: target.post.brandId, type: EngineEventType.PUBLISH_SUCCEEDED, postId: target.postId, message: `Published to ${target.platform}.` },
      });
      this.events.emit('engine.activity', event);

      await this.finalizeIfComplete(target.postId, target.platform, providerPostId, mediaAsset.id);
    } catch (error: any) {
      const message = error?.message || 'Publish failed for an unknown reason.';
      this.logger.error(`Publish failed for target ${target.id} (${target.platform}): ${message}`);

      const priorFailures = await this.prisma.publishingLog.count({
        where: { postTargetId: target.id, status: TargetStatus.FAILED },
      });
      const isTerminal = priorFailures + 1 >= MAX_PUBLISH_ATTEMPTS;

      await this.prisma.$transaction([
        this.prisma.postTarget.update({
          where: { id: target.id },
          data: { status: isTerminal ? TargetStatus.FAILED : TargetStatus.PENDING },
        }),
        this.prisma.publishingLog.create({
          data: { postTargetId: target.id, status: TargetStatus.FAILED, errorMessage: message },
        }),
      ]);

      if (isTerminal) {
        const event = await this.prisma.engineEvent.create({
          data: { brandId: target.post.brandId, type: EngineEventType.PUBLISH_FAILED, postId: target.postId, message },
        });
        this.events.emit('engine.activity', event);

        if (mediaAsset) {
          await this.prisma.mediaAsset.update({
            where: { id: mediaAsset.id },
            data: { status: MediaStatus.FAILED, lastErrorMessage: message },
          }).catch(() => {});
        }

        await this.finalizeIfComplete(target.postId, target.platform, null, mediaAsset?.id);
      } else {
        this.logger.warn(`Target ${target.id} left PENDING for retry (attempt ${priorFailures + 1}/${MAX_PUBLISH_ATTEMPTS}).`);
      }

      throw error;
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
