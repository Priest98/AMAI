import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublishingService } from '../queue/publishing.service';
import { MediaStatus, PostStatus, TargetStatus, PostType } from '@prisma/client';
import { CreatePostDto } from './dto';

const CONTENT_CATEGORY_LABEL: Record<string, string> = {
  promotional: 'Promotional',
  educational: 'Educational',
  behind_the_scenes: 'Behind the Scenes',
  product: 'Product Showcase',
  general: 'General',
};

const POSTING_WINDOW_LABEL: Record<string, string> = {
  night: 'Late night (9pm-5am)',
  morning: 'Mornings (5am-12pm)',
  afternoon: 'Afternoons (12pm-5pm)',
  evening: 'Evenings (5pm-9pm)',
};

/** Bucket an hour-of-day (0-23, already in the brand's own configured time zone) into one of four broad posting windows. */
function postingWindowBucket(hour: number): keyof typeof POSTING_WINDOW_LABEL {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

interface EngagementBucket {
  key: string;
  label: string;
  totalEngagement: number;
  postCount: number;
}

/** Sum(engagement)/count for every bucket, sorted best-first. Only buckets with at least 2 posts are eligible to be reported as a "best"/"weakest" pattern -- a single post is an anecdote, not a pattern. */
function rankBuckets(buckets: Map<string, EngagementBucket>): (EngagementBucket & { avgEngagement: number })[] {
  return Array.from(buckets.values())
    .filter((b) => b.postCount >= 2)
    .map((b) => ({ ...b, avgEngagement: b.totalEngagement / b.postCount }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

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
   * Oyinca Intelligence (Pro/Agency): real content-pattern analysis over
   * this brand's own published, measured posts. No LLM call, no invented
   * numbers -- purely deterministic aggregation (same spirit as
   * getCalendarInsights), reusing performance data MetricsService's sync
   * cron already captured. Deliberately conservative: a bucket only ever
   * gets reported as a "best"/"weakest" pattern once it has >= 2 posts
   * (rankBuckets), and the whole thing declines to draw any conclusion at
   * all below MIN_MEASURED_POSTS -- a "best format" computed from 2
   * lifetime posts would be a coin flip dressed up as insight.
   */
  async getContentIntelligence(brandId: string) {
    const MIN_MEASURED_POSTS = 5;

    // Scalability fix (#176): unbounded before -- a brand with a long
    // publishing history would eventually pull every PUBLISHED post ever,
    // each with nested media/targets/performanceSnapshots, on every load of
    // this Pro-gated endpoint. Recent posts are what a "what's working
    // lately" panel should reflect anyway (an 18-month-old pattern isn't
    // actionable today), and the MIN_MEASURED_POSTS-based sample-size gates
    // above only ever need a few dozen measured posts at most to say
    // anything statistically real -- 200 is a generous ceiling relative to
    // that, same reasoning as MediaAsset.getAssets' and Post.getPosts' own
    // caps elsewhere in this file.
    const CONTENT_INTELLIGENCE_POST_CAP = 200;

    const [posts, engineConfig] = await Promise.all([
      this.prisma.post.findMany({
        where: { brandId, status: PostStatus.PUBLISHED, publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        take: CONTENT_INTELLIGENCE_POST_CAP,
        select: {
          id: true,
          caption: true,
          hashtags: true,
          postType: true,
          contentCategory: true,
          publishedAt: true,
          media: { take: 1, orderBy: { order: 'asc' }, select: { asset: { select: { mimeType: true } } } },
          targets: {
            where: { status: TargetStatus.PUBLISHED, providerPostId: { not: null } },
            select: {
              platform: true,
              performanceSnapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
            },
          },
        },
      }),
      this.prisma.amaiEngineConfig.findUnique({ where: { brandId }, select: { timeZone: true } }),
    ]);

    const timeZone = engineConfig?.timeZone || 'UTC';

    type Measured = {
      id: string; caption: string; platform: string; engagement: number; views: number;
      formatKey: string; formatLabel: string;
      categoryKey: string; categoryLabel: string;
      windowKey: string; windowLabel: string;
      // Per-post scoring inputs (#174): caption/hook-level signals, computed
      // straight from data already stored on the post -- no AI call, no
      // guessing. hookKey is a coarse, deterministic classification of how
      // the caption opens; a real hook-quality model is a much bigger,
      // separate project, but "does it open with a question" is a real,
      // checkable fact worth surfacing once there's enough sample to trust it.
      captionLength: number;
      hashtagCount: number;
      hookKey: 'question' | 'statement';
      hookLabel: string;
    };
    const measured: Measured[] = [];

    for (const post of posts) {
      let views = 0, likes = 0, comments = 0, shares = 0, hasSnapshot = false, platform = 'TIKTOK';
      for (const target of post.targets) {
        const snap = target.performanceSnapshots[0];
        if (!snap) continue;
        hasSnapshot = true;
        views += snap.views; likes += snap.likes; comments += snap.comments; shares += snap.shares;
        platform = target.platform;
      }
      if (!hasSnapshot) continue;

      const engagement = views + likes + comments + shares;
      const isVideo = post.media[0]?.asset?.mimeType?.startsWith('video/') ?? true;
      const formatKey = post.postType === PostType.CAROUSEL ? 'carousel' : isVideo ? 'video' : 'image';
      const formatLabel = post.postType === PostType.CAROUSEL ? 'Carousels' : isVideo ? 'Videos' : 'Single images';

      const categoryKey = post.contentCategory || 'general';
      const categoryLabel = CONTENT_CATEGORY_LABEL[categoryKey] || CONTENT_CATEGORY_LABEL.general;

      // Hour-of-day in the brand's own configured time zone, not server UTC.
      const hour = Number(
        new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone }).format(post.publishedAt!),
      ) % 24;
      const windowKey = postingWindowBucket(hour);
      const windowLabel = POSTING_WINDOW_LABEL[windowKey];

      const caption = post.caption || '';
      // "Opens with a question" -- checks the first sentence-ish chunk only
      // (up to the first ~80 chars or the first line break), so a caption
      // that merely mentions a question mark deep in the hashtags/body
      // doesn't get misclassified as a question hook.
      const openingChunk = caption.split('\n')[0].slice(0, 80);
      const hookKey: 'question' | 'statement' = openingChunk.includes('?') ? 'question' : 'statement';
      const hookLabel = hookKey === 'question' ? 'Question-opening captions' : 'Statement-opening captions';

      measured.push({
        id: post.id, caption, platform, engagement, views, formatKey, formatLabel, categoryKey, categoryLabel, windowKey, windowLabel,
        captionLength: caption.length,
        hashtagCount: Array.isArray(post.hashtags) ? post.hashtags.length : 0,
        hookKey, hookLabel,
      });
    }

    if (measured.length < MIN_MEASURED_POSTS) {
      return { hasEnoughData: false as const, measuredCount: measured.length, minRequired: MIN_MEASURED_POSTS };
    }

    const formatBuckets = new Map<string, EngagementBucket>();
    const categoryBuckets = new Map<string, EngagementBucket>();
    const windowBuckets = new Map<string, EngagementBucket>();
    const hookBuckets = new Map<string, EngagementBucket>();
    const addTo = (map: Map<string, EngagementBucket>, key: string, label: string, engagement: number) => {
      const existing = map.get(key) || { key, label, totalEngagement: 0, postCount: 0 };
      existing.totalEngagement += engagement;
      existing.postCount += 1;
      map.set(key, existing);
    };
    let overallEngagement = 0;
    for (const m of measured) {
      addTo(formatBuckets, m.formatKey, m.formatLabel, m.engagement);
      addTo(categoryBuckets, m.categoryKey, m.categoryLabel, m.engagement);
      addTo(windowBuckets, m.windowKey, m.windowLabel, m.engagement);
      addTo(hookBuckets, m.hookKey, m.hookLabel, m.engagement);
      overallEngagement += m.engagement;
    }
    const overallAvg = overallEngagement / measured.length;

    const formatRanked = rankBuckets(formatBuckets);
    const categoryRanked = rankBuckets(categoryBuckets);
    const windowRanked = rankBuckets(windowBuckets);
    const hookRanked = rankBuckets(hookBuckets);

    const bestFormat = formatRanked[0] ?? null;
    const weakestFormat = formatRanked.length >= 2 ? formatRanked[formatRanked.length - 1] : null;
    const bestCategory = categoryRanked[0] ?? null;
    const bestWindow = windowRanked[0] ?? null;
    // Only meaningful as a comparison between the two hook styles -- both
    // 'question' and 'statement' need >=2 posts each (rankBuckets' own
    // floor) for this to be a pattern instead of one caption's luck.
    const bestHook = hookRanked.length === 2 ? hookRanked[0] : null;

    const byEngagementDesc = [...measured].sort((a, b) => b.engagement - a.engagement);
    const topPost = byEngagementDesc[0];

    // Per-post scoring (#174): each measured post's engagement rank among
    // this brand's OWN measured posts, expressed as a 0-100 score --
    // deliberately relative, never an absolute/universal "virality score"
    // (Oyinca has no cross-brand benchmark data to compare against, and
    // fabricating one would violate the no-fake-data principle). Top post
    // scores 100, the weakest measured post scores 0; ties share a score.
    const n = byEngagementDesc.length;
    const scoredPosts = byEngagementDesc.slice(0, 10).map((m, i) => ({
      id: m.id,
      caption: m.caption,
      platform: m.platform,
      engagement: m.engagement,
      views: m.views,
      score: n > 1 ? Math.round(100 - (i / (n - 1)) * 100) : 100,
      formatLabel: m.formatLabel,
      categoryLabel: m.categoryLabel,
      windowLabel: m.windowLabel,
      hookLabel: m.hookLabel,
      captionLength: m.captionLength,
      hashtagCount: m.hashtagCount,
    }));

    const recommendationParts: string[] = [];
    if (bestFormat && bestFormat.avgEngagement > overallAvg) {
      recommendationParts.push(`${bestFormat.label} average ${Math.round(bestFormat.avgEngagement).toLocaleString()} engagement per post (your overall average is ${Math.round(overallAvg).toLocaleString()})`);
    }
    if (bestCategory) {
      recommendationParts.push(`${bestCategory.label} is your strongest-performing topic`);
    }
    if (bestWindow) {
      recommendationParts.push(`posts published during ${bestWindow.label.toLowerCase()} tend to perform best`);
    }
    if (bestHook) {
      recommendationParts.push(`${bestHook.label.toLowerCase()} average ${Math.round(bestHook.avgEngagement).toLocaleString()} engagement per post`);
    }
    const recommendation = recommendationParts.length
      ? `Based on your last ${measured.length} published posts: ${recommendationParts.join('; ')}.`
      : null;

    return {
      hasEnoughData: true as const,
      measuredCount: measured.length,
      overallAvgEngagement: Math.round(overallAvg),
      bestFormat: bestFormat && { label: bestFormat.label, avgEngagement: Math.round(bestFormat.avgEngagement), postCount: bestFormat.postCount },
      weakestFormat: weakestFormat && { label: weakestFormat.label, avgEngagement: Math.round(weakestFormat.avgEngagement), postCount: weakestFormat.postCount },
      bestCategory: bestCategory && { label: bestCategory.label, avgEngagement: Math.round(bestCategory.avgEngagement), postCount: bestCategory.postCount },
      bestWindow: bestWindow && { label: bestWindow.label, avgEngagement: Math.round(bestWindow.avgEngagement), postCount: bestWindow.postCount },
      bestHook: bestHook && { label: bestHook.label, avgEngagement: Math.round(bestHook.avgEngagement), postCount: bestHook.postCount },
      topPost: { id: topPost.id, caption: topPost.caption, platform: topPost.platform, engagement: topPost.engagement, views: topPost.views },
      /** Individual post scores (top 10 by engagement), relative to this brand's own measured posts only -- see comment above. */
      scoredPosts,
      recommendation,
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
