import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublishingService } from '../queue/publishing.service';
import { MediaStatus, PostStatus, TargetStatus } from '@prisma/client';
import { CreatePostDto } from './dto';

// Vercel Cron on this plan only fires /api/cron/publish-due once a day
// (see vercel.json), which left genuinely-due posts sitting in SCHEDULED
// for up to ~24h with no other trigger to pick them up -- reported by the
// user as "posts not going when the time they schedule for reach." Rather
// than requiring a paid plan upgrade for a more frequent cron, getPosts()
// opportunistically runs the same publish pass the cron does, the same
// way MediaService.getAssets() self-heals stuck media on every load. This
// still isn't instant (only fires when someone loads a posts list), but
// closes the gap from "up to a day late" to "as soon as anyone next opens
// the app" without needing new infrastructure. Bounded so a slow/failing
// platform API call can never make the posts list itself hang.
const OPPORTUNISTIC_PUBLISH_TIMEOUT_MS = 20_000;

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private prisma: PrismaService,
    private publishingService: PublishingService,
  ) {}

  async createPost(brandId: string, dto: CreatePostDto) {
    // Defense-in-depth against the "call the API directly" bypass vector:
    // this raw endpoint must never be able to hand a caller a SCHEDULED or
    // PUBLISHED post directly -- that would skip both runPublishPreflight
    // and the monthly-post-limit reservation, which only ever run inside
    // EngineService.approvePost(). Every real path to SCHEDULED (AutoPilot,
    // Approval Queue, the manual Single/Carousel composer) goes through
    // EngineService; this endpoint may only create a DRAFT or hand a post
    // straight into the Approval Queue for review like everything else.
    if (dto.status && dto.status !== PostStatus.DRAFT && dto.status !== PostStatus.NEEDS_APPROVAL) {
      throw new BadRequestException('Posts can only be created as DRAFT or NEEDS_APPROVAL directly. Use the Approval Queue to schedule or publish.');
    }
    if (dto.mediaAssetIds && dto.mediaAssetIds.length > 5) {
      throw new BadRequestException('You can add up to 5 images per post.');
    }

    // IDOR fix (found in production-readiness audit): this previously
    // reassigned mediaAssetIds via updateMany({ where: { id: { in: ... } } })
    // with no ownership check at all -- a caller from any organization could
    // supply another organization's MediaAsset id and this endpoint would
    // silently detach it from whatever the victim brand was doing with it
    // and attach it into the caller's own post (whose response includes the
    // asset's blobUrl, so it also leaked a reference to another org's private
    // media). Same pattern already proven correct in
    // EngineService.composeManualPost: resolve the ids scoped to the calling
    // brand FIRST, and reject the whole request if any id doesn't resolve
    // within that scope, rather than silently reassigning only the ones that
    // do. Checked before creating the Post row so an invalid request never
    // leaves behind an orphaned empty draft.
    if (dto.mediaAssetIds && dto.mediaAssetIds.length > 0) {
      const owned = await this.prisma.mediaAsset.findMany({
        where: { id: { in: dto.mediaAssetIds }, brandId },
        select: { id: true },
      });
      if (owned.length !== dto.mediaAssetIds.length) {
        throw new BadRequestException('One or more selected images could not be found in this brand\'s media library.');
      }
    }

    const post = await this.prisma.post.create({
      data: {
        brandId,
        caption: dto.caption,
        status: dto.status || PostStatus.DRAFT,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      }
    });

    if (dto.mediaAssetIds && dto.mediaAssetIds.length > 0) {
      await this.prisma.mediaAsset.updateMany({
        // brandId re-asserted here too (belt-and-braces, not load-bearing on
        // its own): the findMany check above is what actually rejects a
        // cross-tenant request before any write happens.
        where: { id: { in: dto.mediaAssetIds }, brandId },
        data: { status: MediaStatus.SCHEDULED, linkedPostId: post.id }
      });
    }

    return post;
  }

  async getPosts(brandId: string, status?: PostStatus) {
    // Deliberately NOT awaited -- this used to block the whole list query
    // behind up to OPPORTUNISTIC_PUBLISH_TIMEOUT_MS (20s) of publish-attempt
    // work before the page's actual data even started fetching, on every
    // single Approval Queue / Scheduled / Published page load. It still
    // fires (any due post still gets its opportunistic chance to publish,
    // same as before) and errors are still swallowed the same way -- it
    // just no longer gates the response the caller is waiting on. Worst
    // case from not awaiting: this one response's counts/rows reflect the
    // pre-publish state for a post that finishes publishing a moment later,
    // self-corrects on the next load/poll (same staleness window the 20s
    // timeout fallback already accepted as fine).
    this.opportunisticPublish(brandId).catch(() => {});

    // Safety cap — same reasoning as MediaAsset.getAssets: this already has
    // the right indexes (idx_post_brand_status) and select-scoped relations,
    // but nothing stopped it from eventually returning thousands of rows
    // with full media/target payloads on every Approval Queue / Scheduled /
    // Published page load.
    return this.prisma.post.findMany({
      where: {
        brandId,
        ...(status ? { status } : {})
      },
      include: {
        // performanceSnapshots: most recent PostPerformance row only (see
        // MetricsService) -- a full history exists per target, but the
        // list view only ever needs "here's how it's doing right now".
        targets: {
          select: {
            platform: true,
            status: true,
            socialAccountId: true,
            performanceSnapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
          },
        },
        media: { include: { asset: { select: { blobUrl: true, mimeType: true, filename: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  /**
   * See OPPORTUNISTIC_PUBLISH_TIMEOUT_MS doc comment above.
   *
   * Scoped to the calling brand -- one user's dashboard load should only
   * ever do publishing work for their own brand, not scan every brand in
   * the system on every page view. The cron-triggered global sweep (see
   * PublishingService.publishDuePosts's own doc comment) is what still
   * guarantees every brand's due posts get published even if nobody with
   * access to that brand ever loads a page.
   */
  private opportunisticPublish(brandId: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.logger.warn(`Opportunistic publish pass exceeded ${OPPORTUNISTIC_PUBLISH_TIMEOUT_MS}ms; remaining due posts will be picked up by the next cron run or page load.`);
        resolve();
      }, OPPORTUNISTIC_PUBLISH_TIMEOUT_MS);
      this.publishingService.publishDuePosts(brandId).then(
        () => { clearTimeout(timer); resolve(); },
        (error: any) => {
          clearTimeout(timer);
          this.logger.warn(`Opportunistic publish pass failed: ${error?.message || error}`);
          resolve();
        },
      );
    });
  }

  /**
   * Lightweight dashboard summary — counts only (Prisma `count()`, not
   * `findMany()`), plus a 3-row preview of the approval queue. Replaces the
   * Dashboard page's old pattern of fetching three full `/posts?status=X`
   * lists (each with full caption/hashtag/target/media payloads) just to
   * read `.length` off them. One round trip, no wasted payload.
   */
  async getStats(brandId: string) {
    // See the identical comment on getPosts() above -- not awaited so the
    // dashboard's stats query (called on every single dashboard load) never
    // pays this call's up-to-20s worst case before it can even start.
    this.opportunisticPublish(brandId).catch(() => {});

    const [needsApprovalCount, scheduledCount, publishedCount, mediaCount, pendingPreview] = await Promise.all([
      this.prisma.post.count({ where: { brandId, status: PostStatus.NEEDS_APPROVAL } }),
      this.prisma.post.count({ where: { brandId, status: PostStatus.SCHEDULED } }),
      this.prisma.post.count({ where: { brandId, status: PostStatus.PUBLISHED } }),
      this.prisma.mediaAsset.count({ where: { brandId } }),
      this.prisma.post.findMany({
        where: { brandId, status: PostStatus.NEEDS_APPROVAL },
        select: { id: true, caption: true, targets: { select: { platform: true }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    return { needsApprovalCount, scheduledCount, publishedCount, mediaCount, pendingPreview };
  }

  /**
   * "Surfacing real performance deltas" -- the dashboard home page previously
   * only ever showed pipeline-stage counts (approval queue / scheduled /
   * published / media). Nothing summarized how content actually performs,
   * even though MetricsService has been writing real PostPerformance
   * snapshots since the metrics-sync cron was built. This turns those
   * snapshots into "here's what actually happened this week" instead of
   * per-post static totals (which Published Posts already shows).
   *
   * For each tracked target, "this window's growth" is (latest snapshot) -
   * (the most recent snapshot at or before `sinceDays` ago). A target with
   * no snapshot that old means it only started being tracked within this
   * window -- its whole current total is fairly attributed to this window
   * rather than guessed at against an unknown earlier baseline. Deltas are
   * floored at 0 so a metrics sync hiccup (a transient dip in a raw platform
   * count) can never show as negative growth.
   */
  async getPerformanceSummary(brandId: string) {
    const WINDOW_DAYS = 7;
    // Matches MetricsService.TRACKING_WINDOW_DAYS -- no point looking at
    // targets that job never syncs.
    const TRACKING_DAYS = 30;
    const now = Date.now();
    const cutoff = new Date(now - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const trackingCutoff = new Date(now - TRACKING_DAYS * 24 * 60 * 60 * 1000);

    const targets = await this.prisma.postTarget.findMany({
      where: {
        status: TargetStatus.PUBLISHED,
        providerPostId: { not: null },
        post: { brandId, publishedAt: { gte: trackingCutoff } },
      },
      select: {
        platform: true,
        post: { select: { id: true, caption: true } },
        // Capped, not unbounded -- a target tracked for the full 30-day
        // window at a couple of syncs a day comfortably fits well under
        // this; the cap just guards against a misbehaving cron ever
        // pulling a target's entire history into memory here.
        performanceSnapshots: { orderBy: { capturedAt: 'desc' }, take: 60 },
      },
    });

    const empty = { hasData: false as const, sinceDays: WINDOW_DAYS, views: 0, likes: 0, comments: 0, shares: 0, topPost: null as null | { id: string; caption: string; platform: string; viewsDelta: number } };
    if (targets.length === 0) return empty;

    let totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0;
    let hasAnySnapshot = false;
    let topPost: { id: string; caption: string; platform: string; viewsDelta: number } | null = null;

    for (const target of targets) {
      const snapshots = target.performanceSnapshots;
      if (snapshots.length === 0) continue;
      hasAnySnapshot = true;

      const latest = snapshots[0];
      const baseline = snapshots.find((s) => s.capturedAt <= cutoff) || null;

      const viewsDelta = Math.max(0, latest.views - (baseline?.views ?? 0));
      const likesDelta = Math.max(0, latest.likes - (baseline?.likes ?? 0));
      const commentsDelta = Math.max(0, latest.comments - (baseline?.comments ?? 0));
      const sharesDelta = Math.max(0, latest.shares - (baseline?.shares ?? 0));

      totalViews += viewsDelta;
      totalLikes += likesDelta;
      totalComments += commentsDelta;
      totalShares += sharesDelta;

      if (viewsDelta > 0 && (!topPost || viewsDelta > topPost.viewsDelta)) {
        topPost = { id: target.post.id, caption: target.post.caption, platform: target.platform, viewsDelta };
      }
    }

    if (!hasAnySnapshot) return empty;

    return {
      hasData: true as const,
      sinceDays: WINDOW_DAYS,
      views: totalViews,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      topPost,
    };
  }

  /**
   * Called after confirmed successful publish response from platform API.
   * Deletes actual media file from storage and keeps lightweight DB history record.
   */
  async markPublishedAndCleanup(
    assetId: string,
    details: { platform: string; providerPostId: string }
  ) {
    this.logger.log(`[MEDIA CLEANUP] Deleting blob for asset ${assetId} post-publish on ${details.platform}`);
    return this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: MediaStatus.PUBLISHED,
        blobUrl: null,
        platform: details.platform,
        providerPostId: details.providerPostId,
        publishedAt: new Date(),
      },
    });
  }

  /**
   * Called when a publish attempt fails. Keeps media asset so user can retry.
   */
  async markMediaFailed(assetId: string, errorMessage: string) {
    this.logger.warn(`[MEDIA FAILED] Asset ${assetId} publish failed: ${errorMessage}`);
    return this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: MediaStatus.FAILED,
        lastErrorMessage: errorMessage,
      },
    });
  }
}
