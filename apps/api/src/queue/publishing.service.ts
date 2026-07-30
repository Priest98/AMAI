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
    // Also sweeps up posts stuck in PUBLISHING for more than 5 minutes —
    // the normal path always reverts PUBLISHING back to SCHEDULED on a
    // non-terminal failure (see publishOne), but a hard function kill
    // mid-attempt (rare, but Vercel functions have no completion guarantee)
    // could theoretically strand a row there with pending targets. This is
    // the safety net so that scenario self-heals instead of a post sitting
    // forever in a state neither the queue nor the user can see progress on.
    const staleCutoff = new Date(Date.now() - 5 * 60 * 1000);
    const due = await this.prisma.post.findMany({
      where: {
        OR: [
          { status: PostStatus.SCHEDULED, scheduledAt: { lte: new Date() } },
          { status: PostStatus.PUBLISHING, updatedAt: { lte: staleCutoff } },
        ],
      },
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

    // Flip the parent Post into a real PUBLISHING state and broadcast the
    // start of the attempt over SSE before touching any platform API — this
    // is what the Approval Queue's live progress panel watches for, and
    // it's also what makes "stuck in SCHEDULED forever" visibly wrong if a
    // publish attempt ever gets interrupted, instead of silently looking
    // like nothing happened.
    await this.prisma.post.updateMany({
      where: { id: target.postId, status: { in: [PostStatus.SCHEDULED, PostStatus.PUBLISHING] } },
      data: { status: PostStatus.PUBLISHING },
    });
    {
      const startedEvent = await this.prisma.engineEvent.create({
        data: { brandId: target.post.brandId, type: EngineEventType.PUBLISH_STARTED, postId: target.postId, message: `Publishing to ${target.platform}…` },
      });
      this.events.emit('engine.activity', startedEvent);
    }

    try {
      if (!mediaAsset?.blobUrl) {
        throw new Error('No media file is attached to this post.');
      }

      const accessToken = this.encryption.decrypt(target.socialAccount.accessToken);

      {
        const uploadingEvent = await this.prisma.engineEvent.create({
          data: { brandId: target.post.brandId, type: EngineEventType.PUBLISH_UPLOADING, postId: target.postId, message: `Sending media to ${target.platform}…` },
        });
        this.events.emit('engine.activity', uploadingEvent);
      }

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
        // This target will be retried later (by the next cron pass or a
        // manual Retry), so the post must not stay stuck in PUBLISHING —
        // publishDuePosts only looks for status: SCHEDULED. Revert it so
        // the retry path can actually find this post again.
        await this.prisma.post.updateMany({
          where: { id: target.postId, status: PostStatus.PUBLISHING },
          data: { status: PostStatus.SCHEDULED },
        });
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
        return this.publishToTikTok(accessToken, caption, mediaUrl, mimeType);
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

    // Video/Reels containers process asynchronously on Instagram's side —
    // calling media_publish before the container reaches FINISHED returns
    // a "media not ready" error. Poll status_code with a short backoff
    // before attempting to publish. Images are already synchronous and
    // report FINISHED immediately, so this is a fast no-op for photo posts.
    if (isVideo) {
      await this.waitForInstagramContainerReady(containerData.id, accessToken);
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

  /**
   * Polls an Instagram media container until it reports FINISHED (ready to
   * publish) or ERROR. Reels/videos are fetched and transcoded by
   * Instagram asynchronously after container creation, so media_publish
   * has to wait for that to actually finish first.
   */
  private async waitForInstagramContainerReady(containerId: string, accessToken: string): Promise<void> {
    // Kept short and bounded on purpose: this runs synchronously inside the
    // publish request/response cycle, which — same as the rest of this app —
    // is a Vercel serverless function capped at 60s total. 6 polls at a 6s
    // interval is ~30s worst case, leaving headroom for container creation,
    // media_publish, and DB writes in the same request.
    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await fetch(
        `https://graph.instagram.com/v19.0/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`,
      );
      const data = await res.json();
      const statusCode = data?.status_code;

      if (statusCode === 'FINISHED') return;
      if (statusCode === 'ERROR') {
        throw new Error('Instagram failed to process the uploaded video.');
      }
      // IN_PROGRESS or EXPIRED (rare) — keep waiting up to maxAttempts.
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 6000));
      }
    }
    throw new Error('Instagram is still processing this video — it will be retried automatically on the next publish pass.');
  }

  /**
   * TikTok Content Posting API. Routes to the correct endpoint for the
   * media type — TikTok has entirely separate init endpoints for video vs.
   * photo, so always hitting the video endpoint (the old behavior) would
   * reject any image with a content-type mismatch even with a verified
   * domain.
   */
  private async publishToTikTok(accessToken: string, caption: string, mediaUrl: string, mimeType: string): Promise<string> {
    const isVideo = mimeType?.startsWith('video/');
    return isVideo
      ? this.publishTikTokVideo(accessToken, caption, mediaUrl)
      : this.publishTikTokPhoto(accessToken, caption, mediaUrl);
  }

  /**
   * Video path: uses FILE_UPLOAD instead of PULL_FROM_URL. PULL_FROM_URL
   * requires verifying ownership of the media URL's domain in the TikTok
   * Developer Portal before TikTok's servers will fetch from it — a manual,
   * external setup step. FILE_UPLOAD sidesteps that entirely: we fetch the
   * video bytes ourselves (already public in Blob storage) and PUSH them
   * straight to the upload_url TikTok hands back at init, so there's never
   * a URL for TikTok to "trust" in the first place. Sent as a single chunk
   * (TikTok's media transfer guide allows this for files that fit in one
   * PUT); very large files would need real multi-chunk splitting, which
   * isn't implemented here.
   */
  private async publishTikTokVideo(accessToken: string, caption: string, videoUrl: string): Promise<string> {
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      throw new Error('Could not read the video file to send to TikTok.');
    }
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const contentType = videoRes.headers.get('content-type') || 'video/mp4';

    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: 'SELF_ONLY',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          // Required by TikTok's Direct Post API (undisclosed-ad compliance) —
          // omitting these causes a generic "request post info is empty or
          // incorrect" validation failure. AMAI-generated posts are never
          // paid/branded content, so both are always false.
          brand_content_toggle: false,
          brand_organic_toggle: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoBuffer.byteLength,
          chunk_size: videoBuffer.byteLength,
          total_chunk_count: 1,
        },
      }),
    });
    const initData = await initRes.json();
    if (!initRes.ok || initData.error?.code !== 'ok' || !initData.data?.publish_id || !initData.data?.upload_url) {
      throw new Error(initData?.error?.message || 'TikTok video publish initiation failed.');
    }

    const uploadRes = await fetch(initData.data.upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(videoBuffer.byteLength),
        'Content-Range': `bytes 0-${videoBuffer.byteLength - 1}/${videoBuffer.byteLength}`,
      },
      body: videoBuffer,
    });
    if (!uploadRes.ok) {
      throw new Error('TikTok rejected the uploaded video file.');
    }

    return initData.data.publish_id;
  }

  /**
   * Photo path: TikTok's photo-post endpoint only supports PULL_FROM_URL —
   * there is no FILE_UPLOAD equivalent for photos as of TikTok's current
   * Content Posting API. Verifying the media URL's domain in the TikTok
   * Developer Portal is therefore unavoidable for photo posts; if that
   * hasn't been done yet, this will fail with a clear
   * "url_ownership_unverified" error surfaced to the caller.
   */
  private async publishTikTokPhoto(accessToken: string, caption: string, imageUrl: string): Promise<string> {
    // TikTok caps photo-post titles at 90 UTF-16 runes (vs. 2200 for video
    // captions) -- sending the full AI-generated caption as `title` was
    // guaranteed to fail validation. The full caption goes in `description`
    // instead, which has the same 4000-rune ceiling video captions get.
    const title = caption.length > 90 ? `${caption.slice(0, 87)}...` : caption;

    const res = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        media_type: 'PHOTO',
        post_mode: 'DIRECT_POST',
        post_info: {
          title,
          description: caption,
          privacy_level: 'SELF_ONLY',
          disable_comment: false,
          brand_content_toggle: false,
          brand_organic_toggle: false,
        },
        source_info: { source: 'PULL_FROM_URL', photo_images: [imageUrl], photo_cover_index: 0 },
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error?.code !== 'ok' || !data.data?.publish_id) {
      throw new Error(data?.error?.message || 'TikTok photo publish initiation failed.');
    }

    return data.data.publish_id;
  }
}
