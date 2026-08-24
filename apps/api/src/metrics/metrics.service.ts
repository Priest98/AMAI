import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { Platform, TargetStatus } from '@prisma/client';

// How far back a post is still considered worth checking. TikTok engagement
// mostly plateaus well before this, and bounding the window keeps each sync
// run's API cost proportional to recent activity, not the account's entire
// lifetime history.
const TRACKING_WINDOW_DAYS = 30;

// Pages of /v2/video/list/ to fetch per account per run (20 videos/page,
// matching the max_count already used elsewhere for this endpoint -- see
// OAuthService.getTikTokVideos). A brand posting a few times a day will
// have every tracked video well within this many pages; this is a hard
// ceiling so one very active account can't blow out the whole run's cost.
const MAX_PAGES_PER_ACCOUNT = 5;

/**
 * Turns "Oyinca published this" into "here's how it actually performed" --
 * the missing link the personalization work (Business Brain, content
 * pillars, feedback loop, future winning-hook/posting-time intelligence)
 * all depend on. Nothing before this wrote engagement numbers anywhere;
 * TikTok stats were only ever fetched live and discarded (see the
 * integrations detail modal / getTikTokVideos).
 *
 * Deliberately does NOT depend on OAuthModule/OAuthService: OAuthModule
 * already imports EngineModule, and EngineModule is where this needs to be
 * wired in (via CronController) -- importing OAuthModule back into that
 * chain would be a circular module dependency. So this does its own
 * minimal, read-only TikTok fetch instead of reusing
 * OAuthService.getTikTokVideos, which is functionally identical but a
 * separate copy for that reason.
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async syncTikTokMetrics(): Promise<{ accountsChecked: number; snapshotsCreated: number; accountErrors: number }> {
    const cutoff = new Date(Date.now() - TRACKING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const trackableTargets = await this.prisma.postTarget.findMany({
      where: {
        platform: Platform.TIKTOK,
        status: TargetStatus.PUBLISHED,
        providerPostId: { not: null },
        post: { publishedAt: { gte: cutoff } },
      },
      select: { id: true, providerPostId: true, socialAccountId: true },
    });

    if (trackableTargets.length === 0) {
      return { accountsChecked: 0, snapshotsCreated: 0, accountErrors: 0 };
    }

    // Group by account so each account's video.list is paginated at most
    // once per run, regardless of how many tracked posts it has.
    const targetsByAccount = new Map<string, Map<string, string>>(); // accountId -> (providerPostId -> postTargetId)
    for (const t of trackableTargets) {
      if (!t.providerPostId) continue;
      if (!targetsByAccount.has(t.socialAccountId)) targetsByAccount.set(t.socialAccountId, new Map());
      targetsByAccount.get(t.socialAccountId)!.set(t.providerPostId, t.id);
    }

    let snapshotsCreated = 0;
    let accountErrors = 0;

    for (const [socialAccountId, providerIdToTargetId] of targetsByAccount) {
      try {
        const created = await this.syncOneAccount(socialAccountId, providerIdToTargetId);
        snapshotsCreated += created;
      } catch (e: any) {
        accountErrors++;
        this.logger.error(`TikTok metrics sync failed for account ${socialAccountId}: ${e?.message || e}`);
      }
    }

    return { accountsChecked: targetsByAccount.size, snapshotsCreated, accountErrors };
  }

  private async syncOneAccount(socialAccountId: string, providerIdToTargetId: Map<string, string>): Promise<number> {
    const account = await this.prisma.socialAccount.findUnique({ where: { id: socialAccountId } });
    if (!account || account.platform !== Platform.TIKTOK) return 0;

    // Best-effort only: skip a known-expired connection rather than
    // attempting a refresh here. PublishingService already proactively
    // refreshes TikTok tokens around actual publish time, so accounts with
    // recent activity (the only ones this job ever looks at) are usually
    // fresh; an account that's been disconnected long enough for this to
    // matter needs the user to reconnect it regardless.
    if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() < Date.now()) {
      this.logger.warn(`Skipping metrics sync for account ${socialAccountId}: token expired.`);
      return 0;
    }

    const accessToken = this.encryption.decrypt(account.accessToken);
    const remainingIds = new Set(providerIdToTargetId.keys());
    const statsByVideoId = new Map<string, { views: number; likes: number; comments: number; shares: number; raw: any }>();

    let cursor: number | undefined;
    for (let page = 0; page < MAX_PAGES_PER_ACCOUNT && remainingIds.size > 0; page++) {
      const { videos, cursor: nextCursor, hasMore } = await this.fetchTikTokVideoPage(accessToken, cursor);
      for (const v of videos) {
        if (remainingIds.has(v.id)) {
          statsByVideoId.set(v.id, {
            views: v.view_count ?? 0,
            likes: v.like_count ?? 0,
            comments: v.comment_count ?? 0,
            shares: v.share_count ?? 0,
            raw: v,
          });
          remainingIds.delete(v.id);
        }
      }
      if (!hasMore || remainingIds.size === 0) break;
      cursor = nextCursor ?? undefined;
    }

    if (statsByVideoId.size === 0) return 0;

    const rows = Array.from(statsByVideoId.entries()).map(([videoId, stats]) => ({
      postTargetId: providerIdToTargetId.get(videoId)!,
      views: stats.views,
      likes: stats.likes,
      comments: stats.comments,
      shares: stats.shares,
      raw: stats.raw,
    }));

    await this.prisma.postPerformance.createMany({ data: rows });
    return rows.length;
  }

  private async fetchTikTokVideoPage(
    accessToken: string,
    cursor?: number,
  ): Promise<{ videos: Array<{ id: string; view_count?: number; like_count?: number; comment_count?: number; share_count?: number }>; cursor: number | null; hasMore: boolean }> {
    const res = await fetch(
      'https://open.tiktokapis.com/v2/video/list/?fields=id,view_count,like_count,comment_count,share_count',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }),
      },
    );

    if (!res.ok) {
      throw new Error(`TikTok video list fetch failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return {
      videos: data?.data?.videos || [],
      cursor: data?.data?.cursor ?? null,
      hasMore: !!data?.data?.has_more,
    };
  }
}
