import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { deriveConnectionHealth } from '../oauth/connection-health';
import { EncryptionService } from '../encryption/encryption.service';
import { StorageService } from '../storage/storage.service';
import { MediaOptimizationService } from '../media-optimization/media-optimization.service';
import { Platform, TargetStatus, PostStatus, MediaStatus, EngineEventType, ConnectionStatus } from '@prisma/client';
import { EntitlementsService } from '../billing/entitlements.service';
import { getAppUrl } from '../common/app-url.util';

const MAX_PUBLISH_ATTEMPTS = 3;

/**
 * TikTok forces every unaudited app's Content Posting API output to
 * SELF_ONLY (private) server-side, confirmed directly against TikTok's own
 * docs -- this isn't something Oyinca's request can override until the app
 * passes TikTok's content-posting audit (a manual, TikTok-side approval
 * process, not a config flag Oyinca controls). TIKTOK_CONTENT_AUDITED exists
 * so flipping this after that approval lands is a one-line env change
 * instead of a code change and redeploy. Defaults to SELF_ONLY (unset/any
 * value other than the literal string 'true') because that's the app's
 * actual, real audit status today -- never assume approval.
 *
 * PUBLIC_TO_EVERYONE once audited is a placeholder default for "make it
 * actually public" -- TikTok's Query Creator Info endpoint
 * (https://developers.tiktok.com/doc/content-posting-api-get-started
 * #query_creator_info) returns each creator's real privacy_level_options
 * (some creators have some options disabled) and should be queried and
 * surfaced as a real choice in the composer once the audited flag is ever
 * turned on -- not built here since it depends on that audit actually
 * happening first, but flagged so it isn't forgotten.
 */
function resolveTikTokPrivacyLevel(): 'SELF_ONLY' | 'PUBLIC_TO_EVERYONE' {
  return process.env.TIKTOK_CONTENT_AUDITED === 'true' ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY';
}

/**
 * How long one publishDuePosts() pass is allowed to keep starting new
 * publish attempts before it stops and returns cleanly. Left well under
 * the Next.js route's maxDuration=60s cap (see apps/web/src/app/api/
 * [...path]/route.ts) so this always finishes with a normal response
 * instead of being hard-killed mid-request -- a graceful "ran out of
 * time, the rest will be picked up next pass" beats a SIGKILL that only
 * self-heals 10 minutes later via the stale-claim sweep.
 */
const PUBLISH_PASS_DEADLINE_MS = 45_000;

/**
 * How many publishOne() calls run at once within a pass. Safe to raise
 * above 1 specifically because publishOne()'s atomic claim (see below)
 * means concurrent attempts on different targets can never race each
 * other into a duplicate publish -- this is pure throughput, not a
 * correctness trade-off. Kept modest (not unbounded) so one pass doesn't
 * fan out into dozens of simultaneous Instagram/TikTok API calls, which
 * would risk tripping THEIR rate limits instead of ours.
 */
const PUBLISH_CONCURRENCY = 5;

/**
 * How long a PUBLISHING claim is respected before another runner may take
 * it over. Long enough that a genuinely slow upload (large video to TikTok)
 * is never stolen mid-flight, short enough that a hard function kill
 * self-heals on the next cron pass rather than stranding the post.
 */
const STALE_CLAIM_MS = 10 * 60 * 1000;

// TikTok access tokens are short-lived (~24h) but come with a refresh_token
// that's valid far longer (per TikTok's docs, ~365 days, refreshed forward
// on use). Previously `refreshTikTokToken()` existed but was only wired to
// a manual `POST /oauth/tiktok/refresh` endpoint the user had to hit
// themselves -- meaning every ~24h TikTok publishing would silently start
// failing until someone noticed and reconnected. Refresh proactively here,
// inside the publish path itself, so it's fully automatic and the user
// never has to reconnect TikTok just because time passed.
const TIKTOK_TOKEN_REFRESH_BUFFER_MS = 10 * 60 * 1000; // refresh if expiring within 10min

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
    private mediaOptimization: MediaOptimizationService,
    private entitlementsService: EntitlementsService,
  ) {}

  /**
   * Finds every post that's due and publishes each of its pending targets.
   *
   * `brandId` is optional and scopes the sweep to one brand -- passed by
   * the opportunistic-publish path (posts.service.ts's getPosts/getStats,
   * triggered on every dashboard load) so one user's page load only ever
   * does publishing work for *their own* brand, not a global scan across
   * every organization's due posts. Left undefined for the actual cron
   * path (CronController), which is the one place a genuinely global sweep
   * is correct -- it's the backstop that guarantees a post publishes even
   * if nobody's dashboard happens to load.
   */
  async publishDuePosts(brandId?: string) {
    const passStart = Date.now();

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
        ...(brandId ? { brandId } : {}),
        OR: [
          { status: PostStatus.SCHEDULED, scheduledAt: { lte: new Date() } },
          { status: PostStatus.PUBLISHING, updatedAt: { lte: staleCutoff } },
        ],
      },
      // Unfiltered here (not `where: { status: PENDING }`) because a post
      // with literally zero PostTarget rows needs different handling below
      // than one whose targets are just all already resolved -- filtering
      // at the query level would make those two cases indistinguishable.
      include: { targets: true },
      take: 50,
    });

    // Gather phase: cheap (DB reads/writes only, no platform API calls), so
    // stays sequential -- the concurrency budget below is reserved for the
    // actually-expensive part (real Instagram/TikTok calls in publishOne).
    const targetIds: string[] = [];
    for (const post of due) {
      // A SCHEDULED post with zero targets ever created means it was
      // auto-scheduled by Oyinca at a moment when no platform was
      // connected (engine.service.ts still creates the Post in that case,
      // just with an empty `targets.create` array) -- confirmed live via a
      // batch of posts that were "checked" on every publishDuePosts pass
      // but never published or failed, because there was nothing in their
      // `targets` array to iterate at all. Self-heal: if a platform is
      // connected *now*, attach it and try; if still nothing is connected,
      // fail it with a real reason instead of leaving it silently
      // "Scheduled" forever with no way for the user to tell why.
      const pendingTargets = post.targets.length === 0
        ? await this.attachTargetsForConnectedAccounts(post.id, post.brandId)
        : post.targets.filter(
            (t) =>
              t.status === TargetStatus.PENDING ||
              // Reclaim in-flight targets whose claim has gone stale (the
              // function was killed mid-publish). publishOne re-checks the
              // claim atomically, so listing one here can't double-publish.
              (t.status === TargetStatus.PUBLISHING &&
                (!t.claimedAt || t.claimedAt.getTime() < Date.now() - STALE_CLAIM_MS)),
          );
      for (const t of pendingTargets) targetIds.push(t.id);
    }

    // Execute phase: PUBLISH_CONCURRENCY workers pulling from a shared
    // cursor, each stopping before starting a new attempt once the pass
    // deadline is reached. Safe to run concurrently because publishOne()'s
    // atomic claim (compare-and-swap on PENDING/stale-PUBLISHING ->
    // PUBLISHING) means two workers can never both win the same target --
    // this only adds throughput, it changes nothing about correctness.
    let published = 0;
    let failed = 0;
    let cursor = 0;
    let deadlineHit = false;

    const worker = async () => {
      while (cursor < targetIds.length) {
        if (Date.now() - passStart > PUBLISH_PASS_DEADLINE_MS) {
          deadlineHit = true;
          return;
        }
        const targetId = targetIds[cursor++];
        try {
          await this.publishOne(targetId);
          published++;
        } catch {
          failed++; // publishOne already logs + records this; keep going.
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(PUBLISH_CONCURRENCY, targetIds.length) }, () => worker()),
    );

    if (due.length > 0) {
      const skipped = targetIds.length - published - failed;
      this.logger.log(
        `publishDuePosts${brandId ? ` (brand ${brandId})` : ''}: checked ${due.length} due post(s), ` +
        `${published} published, ${failed} failed, ${skipped} not yet attempted this pass` +
        `${deadlineHit ? ' (pass deadline reached -- remaining targets will be picked up next pass)' : ''}.`,
      );
    }
    return { checked: due.length, published, failed };
  }

  /**
   * Attaches a PostTarget for every currently-connected account on this
   * brand to a post that was scheduled with none at all, so it can
   * actually be published on this pass instead of just being "checked"
   * and skipped forever. If nothing is connected even now, marks the post
   * FAILED with a clear, actionable reason -- surfacing the real problem
   * (no connected platform) instead of a post that looks scheduled but
   * can never resolve either way.
   */
  private async attachTargetsForConnectedAccounts(postId: string, brandId: string) {
    const connected = await this.prisma.socialAccount.findMany({
      where: { brandId, status: ConnectionStatus.CONNECTED },
    });

    if (connected.length === 0) {
      await this.prisma.post.update({ where: { id: postId }, data: { status: PostStatus.FAILED } });
      const event = await this.prisma.engineEvent.create({
        data: {
          brandId,
          type: EngineEventType.PUBLISH_FAILED,
          postId,
          message: 'No connected Instagram or TikTok account to publish to. Connect an account, then retry this post.',
        },
      });
      this.events.emit('engine.activity', event);
      this.logger.warn(`Post ${postId} has no targets and no connected accounts -- marked FAILED with a clear reason instead of staying silently Scheduled.`);
      return [];
    }

    const created = await Promise.all(
      connected.map((acc) =>
        this.prisma.postTarget.create({
          data: { postId, socialAccountId: acc.id, platform: acc.platform, status: TargetStatus.PENDING },
        }),
      ),
    );
    this.logger.log(`Post ${postId} had no targets -- attached ${created.length} target(s) for now-connected account(s): ${created.map((c) => c.platform).join(', ')}.`);
    return created;
  }

  /**
   * Returns a usable access token for this account, transparently
   * refreshing TikTok's token first if it's at/near expiry (or `force` is
   * set, used by the reactive retry in `publishOne`). Instagram's
   * long-lived token doesn't need this treatment here -- it lasts ~60 days
   * and its refresh (`refreshInstagramToken` in OAuthService) re-exchanges
   * the existing token rather than needing a stored refresh_token, so it's
   * lower urgency and left on the existing manual path for now. Any
   * failure here (missing config, network error, revoked refresh_token)
   * falls back to the existing access token as-is so a refresh hiccup can
   * never block a publish attempt that might otherwise still succeed --
   * the real platform API call is always the final source of truth.
   */
  private async ensureFreshAccessToken(
    account: { id: string; platform: Platform; accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null },
    force: boolean = false,
  ): Promise<string> {
    const nearingExpiry =
      account.tokenExpiresAt != null &&
      account.tokenExpiresAt.getTime() - Date.now() < TIKTOK_TOKEN_REFRESH_BUFFER_MS;

    const shouldRefresh = account.platform === Platform.TIKTOK && !!account.refreshToken && (force || nearingExpiry);
    if (!shouldRefresh) {
      return this.encryption.decrypt(account.accessToken);
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientKey || !clientSecret) {
      return this.encryption.decrypt(account.accessToken);
    }

    try {
      const decryptedRefresh = this.encryption.decrypt(account.refreshToken!);
      const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: decryptedRefresh,
        }),
      });

      if (!tokenRes.ok) {
        this.logger.warn(`TikTok auto-refresh failed for account ${account.id} (HTTP ${tokenRes.status}) -- using existing token; publish may fail and self-heal on a later pass once the account is manually reconnected.`);
        return this.encryption.decrypt(account.accessToken);
      }

      const data = await tokenRes.json();
      const accessToken: string | undefined = data.access_token;
      if (!accessToken) {
        this.logger.warn(`TikTok auto-refresh response for account ${account.id} had no access_token -- using existing token.`);
        return this.encryption.decrypt(account.accessToken);
      }

      await this.prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: this.encryption.encrypt(accessToken),
          refreshToken: data.refresh_token ? this.encryption.encrypt(data.refresh_token) : account.refreshToken,
          tokenExpiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
          status: ConnectionStatus.CONNECTED,
        },
      });

      this.logger.log(`TikTok access token auto-refreshed for account ${account.id} -- publishing continues with no manual reconnect needed.`);
      return accessToken;
    } catch (error: any) {
      this.logger.warn(`TikTok auto-refresh threw for account ${account.id}: ${error?.message || error} -- using existing token.`);
      return this.encryption.decrypt(account.accessToken);
    }
  }

  /**
   * Heuristic check on TikTok's error payload/message for an auth-shaped
   * failure (expired/invalid token) vs. any other publish failure (bad
   * media, rate limit, content policy, etc.) -- only auth-shaped failures
   * are worth an immediate refresh-and-retry.
   */
  private isTikTokAuthError(error: any): boolean {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('access_token_invalid') ||
      message.includes('token_expired') ||
      message.includes('invalid_access_token') ||
      message.includes('access token') ||
      message.includes('unauthorized') ||
      message.includes('401')
    );
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

    // ---- Idempotency: atomically CLAIM this target before publishing ----
    //
    // The previous guard was `if (target.status !== 'PENDING') return;` --
    // a read-then-act race. Two overlapping cron invocations (Vercel Cron
    // retries a timed-out run, and publishDuePosts also re-sweeps posts
    // stuck in PUBLISHING) could both read PENDING, both pass the check,
    // and both publish the SAME post to the customer's real Instagram or
    // TikTok account. A duplicate public post is not recoverable by us.
    //
    // This is a compare-and-swap: the WHERE clause makes the transition
    // conditional inside a single UPDATE, so the database -- not the
    // application -- decides the winner. `count === 0` means another runner
    // already owns this attempt, so we return without touching the platform.
    //
    // A claim older than STALE_CLAIM_MS is also eligible, so a function
    // killed mid-publish can't strand a target in PUBLISHING forever.
    const staleClaimCutoff = new Date(Date.now() - STALE_CLAIM_MS);
    const claim = await this.prisma.postTarget.updateMany({
      where: {
        id: target.id,
        OR: [
          { status: TargetStatus.PENDING },
          { status: TargetStatus.PUBLISHING, claimedAt: { lt: staleClaimCutoff } },
        ],
      },
      data: {
        status: TargetStatus.PUBLISHING,
        claimedAt: new Date(),
        lastAttemptAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    if (claim.count === 0) {
      // Already claimed by a concurrent run, or already resolved.
      this.logger.log(`PostTarget ${target.id} is already claimed or resolved — skipping to avoid a duplicate publish.`);
      return;
    }

    // Carousel-aware: target.post.media can hold 1 (SINGLE) or 2-5
    // (CAROUSEL) assets. Sort by the composer-assigned order so images
    // publish in the sequence the user arranged, not whatever order the
    // join rows happen to come back in. mediaAsset (singular) stays the
    // "primary"/cover asset for everything below that only makes sense for
    // one asset (preflight checks, the FAILED-status side effect, event
    // logging) -- the actual platform publish call gets the full ordered
    // list via orderedMediaAssets.
    const orderedMediaAssets = [...target.post.media]
      .sort((a, b) => a.order - b.order)
      .map((m) => m.asset);
    const mediaAsset = orderedMediaAssets[0];

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
      if (orderedMediaAssets.some((a) => !a.blobUrl)) {
        throw new Error('One or more items in this carousel post are missing their media file.');
      }

      // Platform-aware mixed-media gate: the DB and composer are fully
      // generic (a Carousel is just ordered PostMedia rows, any mix of
      // image/video), but not every platform's actual API can publish
      // every mix -- Instagram's carousel children natively support both
      // IMAGE and VIDEO, but TikTok's Content Posting API has no mixed or
      // multi-video carousel concept at all (photo_images is photo-only;
      // video posts are always exactly one video via a completely separate
      // endpoint). Checked here, before any platform API call is made, so
      // an unsupported combination fails fast with a clear, actionable
      // message instead of TikTok's API rejecting a video URL it received
      // inside what it thinks is a photo array (or vice versa).
      this.assertCarouselPlatformSupport(target.platform, orderedMediaAssets);

      // Pre-flight connection check.
      //
      // ensureFreshAccessToken below will attempt a refresh where a refresh
      // token exists, so this deliberately only hard-fails the cases that
      // refresh genuinely cannot rescue: a connection already marked EXPIRED,
      // or a lapsed token with no refresh token to trade in. Anything else
      // (including EXPIRING_SOON) is allowed through, because the real token
      // state -- not an approximate expiry -- decides whether publishing can
      // proceed.
      //
      // The point is to fail with a message that names the fix, and to emit
      // it as an engine event the dashboard can surface, rather than letting
      // the platform reject the call with an opaque auth error.
      {
        const health = deriveConnectionHealth(target.socialAccount);
        const cannotRecover =
          health.health === 'REAUTH_REQUIRED' && !target.socialAccount.refreshToken;

        if (cannotRecover) {
          const warnEvent = await this.prisma.engineEvent.create({
            data: {
              brandId: target.post.brandId,
              type: EngineEventType.PUBLISH_FAILED,
              postId: target.postId,
              message: `${target.platform} needs to be reconnected before this post can publish.`,
            },
          });
          this.events.emit('engine.activity', warnEvent);
          throw new Error(
            `Your ${target.platform} connection has expired. Reconnect it in Integrations, then retry this post.`,
          );
        }
      }

      const accessToken = await this.ensureFreshAccessToken(target.socialAccount);

      {
        const uploadingEvent = await this.prisma.engineEvent.create({
          data: { brandId: target.post.brandId, type: EngineEventType.PUBLISH_UPLOADING, postId: target.postId, message: `Sending media to ${target.platform}…` },
        });
        this.events.emit('engine.activity', uploadingEvent);
      }

      // Prefer the Media Optimization Engine's platform-specific version
      // (correct aspect ratio, size, and format for `target.platform`,
      // built at upload time -- see MediaOptimizationService) over the raw
      // original, for EVERY image in the post -- a carousel resolves one
      // optimized URL per image, not just the first. Falls back to each
      // asset's original if no optimized version exists yet (e.g. the
      // platform was connected after this asset was already uploaded, or
      // optimization failed for this asset) -- publishing must never be
      // blocked by an optimized-media miss.
      const resolvedMediaUrls = await Promise.all(
        orderedMediaAssets.map(async (asset) => {
          const optimized = await this.mediaOptimization.getOptimizedUrl(asset.id, target.platform).catch(() => null);
          return { url: optimized || asset.blobUrl!, wasOptimized: !!optimized };
        }),
      );
      const mediaUrls = resolvedMediaUrls.map((m) => m.url);
      const anyOptimized = resolvedMediaUrls.some((m) => m.wasOptimized);
      const caption = target.post.caption + (target.post.hashtags?.length ? `\n\n${target.post.hashtags.join(' ')}` : '');

      let providerPostId: string;
      try {
        providerPostId = await this.publishToPlatform(
          target.platform,
          target.socialAccount.platformAccountId,
          accessToken,
          caption,
          mediaUrls,
          mediaAsset.mimeType,
          target.post.brandId,
          anyOptimized,
          orderedMediaAssets.map((a) => a.mimeType),
        );
      } catch (publishError: any) {
        // Reactive fallback for the case a proactive refresh didn't catch:
        // TikTok's own clock may consider the token dead a little earlier
        // than our stored `tokenExpiresAt` implies, or the token could have
        // been invalidated out-of-band. If this looks like an auth failure
        // and we have a refresh_token, force a refresh and retry exactly
        // once before giving up -- still counts as one attempt for
        // MAX_PUBLISH_ATTEMPTS purposes either way.
        if (target.platform === Platform.TIKTOK && target.socialAccount.refreshToken && this.isTikTokAuthError(publishError)) {
          this.logger.warn(`TikTok publish failed with an auth-looking error for account ${target.socialAccount.id}; forcing token refresh and retrying once.`);
          const refreshedToken = await this.ensureFreshAccessToken(target.socialAccount, true);
          providerPostId = await this.publishToPlatform(
            target.platform,
            target.socialAccount.platformAccountId,
            refreshedToken,
            caption,
            mediaUrls,
            mediaAsset.mimeType,
            target.post.brandId,
            anyOptimized,
            orderedMediaAssets.map((a) => a.mimeType),
          );
        } else {
          throw publishError;
        }
      }

      await this.prisma.$transaction([
        this.prisma.postTarget.update({ where: { id: target.id }, data: { status: TargetStatus.PUBLISHED, claimedAt: null, providerPostId } }),
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

      // attemptCount was incremented by the atomic claim above, so it is the
      // authoritative attempt number for this run. Re-read it rather than
      // counting PublishingLog rows: the log can contain non-attempt entries
      // and a COUNT is an extra query on every failure.
      const claimed = await this.prisma.postTarget.findUnique({
        where: { id: target.id },
        select: { attemptCount: true },
      });
      const attemptsSoFar = claimed?.attemptCount ?? 1;
      const isTerminal = attemptsSoFar >= MAX_PUBLISH_ATTEMPTS;

      await this.prisma.$transaction([
        // Releasing the claim: PENDING makes it eligible for the next cron
        // pass, FAILED stops it permanently. Either way the target leaves
        // PUBLISHING, so it is never left holding a claim it isn't using.
        this.prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: isTerminal ? TargetStatus.FAILED : TargetStatus.PENDING,
            claimedAt: null,
          },
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
        this.logger.warn(`Target ${target.id} released back to PENDING for retry (attempt ${attemptsSoFar}/${MAX_PUBLISH_ATTEMPTS}).`);
        // Only bounce the post back to SCHEDULED if nothing has actually
        // published for it yet. If a sibling target already succeeded
        // (e.g. Instagram went out fine but TikTok is retrying because its
        // connection expired), reverting to SCHEDULED would hide that real
        // success and make the whole post look stuck/undone even though
        // it's genuinely live on one platform. publishDuePosts already
        // re-picks up any post left at PUBLISHING for more than 5 minutes
        // (the stale-PUBLISHING sweep at the top of this file), so leaving
        // it at PUBLISHING here still guarantees the retry happens on the
        // next cron pass without erasing the visible success.
        const anyPublished = await this.prisma.postTarget.count({
          where: { postId: target.postId, status: TargetStatus.PUBLISHED },
        });
        if (anyPublished === 0) {
          await this.prisma.post.updateMany({
            where: { id: target.postId, status: PostStatus.PUBLISHING },
            data: { status: PostStatus.SCHEDULED },
          });
        }
      }

      throw error;
    }
  }

  /**
   * Rejects a post/target combination the destination platform's actual API
   * cannot represent, before any network call is made. Only TikTok has real
   * restrictions today:
   *   - No mixed image+video carousel (photo_images is photo-only; video
   *     publishing is a completely separate FILE_UPLOAD endpoint that takes
   *     exactly one video).
   *   - No multi-video carousel/slideshow of any kind -- TikTok's API has no
   *     concept of publishing more than one video as a single post.
   * A pure image carousel of any length (still capped at 5 by the composer)
   * and a single video are both unaffected and behave exactly as before.
   * Instagram's Graph API carousel children natively support both IMAGE and
   * VIDEO media_type, so no restriction is applied there -- see
   * publishInstagramCarousel.
   */
  private assertCarouselPlatformSupport(platform: Platform, assets: { mimeType: string }[]): void {
    if (platform !== Platform.TIKTOK) return;

    const videoCount = assets.filter((a) => a.mimeType?.startsWith('video/')).length;
    const imageCount = assets.length - videoCount;

    if (videoCount > 0 && imageCount > 0) {
      throw new Error(
        'TikTok does not support carousels that mix photos and videos. Use an all-photo carousel or a single video post instead.',
      );
    }
    if (videoCount > 1) {
      throw new Error(
        'TikTok does not support posting multiple videos as one post. Publish each video as its own post.',
      );
    }
  }

  /** Marks the parent Post PUBLISHED/FAILED once every target has resolved. */
  private async finalizeIfComplete(postId: string, platform: Platform, providerPostId: string | null, _mediaAssetId?: string) {
    const remaining = await this.prisma.postTarget.count({ where: { postId, status: 'PENDING' } });
    if (remaining > 0) return;

    // A post that published successfully to at least one platform is a
    // real, live post — mark it PUBLISHED even if a sibling target (e.g. a
    // TikTok leg whose connection expired) exhausted its retries and
    // terminally failed. The previous "any failed target -> whole post
    // FAILED" logic was actively wrong in exactly the scenario a user hit
    // in production: Instagram published fine, TikTok's stale token kept
    // failing, and the post showed as "Failed" in the UI despite being
    // genuinely live on Instagram. Only mark FAILED when nothing published
    // anywhere.
    const publishedCount = await this.prisma.postTarget.count({ where: { postId, status: TargetStatus.PUBLISHED } });
    const status = publishedCount > 0 ? PostStatus.PUBLISHED : PostStatus.FAILED;

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { status, publishedAt: status === PostStatus.PUBLISHED ? new Date() : undefined },
    });

    // NOTE: monthly post-usage is intentionally NOT recorded here anymore.
    // It used to be counted at this actual-publish transition, but that let
    // a brand *schedule* an unlimited backlog of posts with no rejection
    // (nothing was checked/counted until each one eventually published),
    // defeating the point of a monthly cap and leaving "retry a failed
    // publish" as an accidental double-charge risk. The credit is now
    // reserved once, up front, at the moment a post first commits to
    // SCHEDULED -- see EntitlementsService.reservePostSlot(), called from
    // EngineService.approvePost() and the AutoPilot auto-schedule branch of
    // processMediaAsset(). A post that later fails to actually publish does
    // not get its credit refunded (consistent with "you used a scheduling
    // slot"), and retryPost() deliberately never calls reservePostSlot()
    // again, so nothing here needs to re-count on success.

    if (status === PostStatus.PUBLISHED) {
      // Carousel-aware: mark and clean up every image in this post, not
      // just one -- a 5-image carousel post frees all 5 blobs, not 1 with 4
      // orphaned forever. Looked up fresh here (rather than trusting the
      // single asset id publishOne happened to pass in) so this is correct
      // regardless of how many media rows the post has.
      const postMedia = await this.prisma.postMedia.findMany({ where: { postId }, select: { assetId: true } });
      const assetIds = postMedia.map((m) => m.assetId);
      if (assetIds.length > 0) {
        const assets = await this.prisma.mediaAsset.findMany({ where: { id: { in: assetIds } }, select: { id: true, blobUrl: true } });
        await this.prisma.mediaAsset.updateMany({
          where: { id: { in: assetIds } },
          data: {
            status: MediaStatus.PUBLISHED,
            platform,
            providerPostId: providerPostId || undefined,
            publishedAt: new Date(),
            blobUrl: null,
          },
        });
        // Free up storage now that the platform has its own copy of each image.
        await Promise.all(assets.filter((a) => a.blobUrl).map((a) => this.storage.deleteFile(a.blobUrl!)));
      }
    }
  }

  private async publishToPlatform(
    platform: Platform,
    platformAccountId: string,
    accessToken: string,
    caption: string,
    mediaUrls: string[],
    mimeType: string,
    brandId: string,
    alreadyOptimized: boolean = false,
    mediaMimeTypes?: string[],
  ): Promise<string> {
    switch (platform) {
      case 'INSTAGRAM':
        // mediaMimeTypes is the per-item parallel array carousels need to
        // tell Instagram which children are photos vs videos -- falls back
        // to a same-length array of the single mimeType for any caller that
        // doesn't pass one (defensive; every real call site does).
        return this.publishToInstagram(platformAccountId, accessToken, caption, mediaUrls, mimeType, brandId, alreadyOptimized, mediaMimeTypes || mediaUrls.map(() => mimeType));
      case 'TIKTOK':
        // Unlike Instagram, TikTok never needs a per-item mimeType here:
        // assertCarouselPlatformSupport already guarantees that by the time
        // a TikTok post reaches this point, its media is either all-image
        // (any count, via photo_images) or a single video -- so the one
        // primary mimeType this call already receives is sufficient to
        // route correctly.
        return this.publishToTikTok(accessToken, caption, mediaUrls, mimeType);
      default:
        throw new Error(`Publishing to ${platform} isn't supported yet.`);
    }
  }

  /**
   * Instagram Graph API: create a media container, then publish it.
   * mediaUrls.length === 1 -> a normal single-image/video post (unchanged
   * behavior). mediaUrls.length > 1 -> a real carousel: each URL becomes a
   * CHILD item container first (is_carousel_item=true, no caption on the
   * children), then a parent CAROUSEL container references all child ids,
   * and that parent is what actually gets published -- this is Meta's
   * documented carousel flow, not a loop of independent single posts.
   */
  private async publishToInstagram(igUserId: string, accessToken: string, caption: string, mediaUrls: string[], mimeType: string, brandId: string, alreadyOptimized: boolean = false, mediaMimeTypes: string[] = []): Promise<string> {
    const isVideo = mimeType?.startsWith('video/');

    if (mediaUrls.length > 1) {
      return this.publishInstagramCarousel(igUserId, accessToken, caption, mediaUrls, mediaMimeTypes, brandId, alreadyOptimized);
    }

    const mediaUrl = mediaUrls[0];
    // Feed photos must land within Meta's accepted aspect-ratio range (4:5 to
    // 1.91:1) or the container/publish call fails with a generic "aspect
    // ratio is not supported" error (code 36003 / subcode 2207009) -- three
    // consecutive real test images all hit this because normal phone-camera
    // portrait shots (9:16, ratio 0.56) fall well outside the feed-photo
    // range even though nothing is wrong with them. When `mediaUrl` already
    // came from the Media Optimization Engine (alreadyOptimized), it was
    // already built to Instagram's exact rules at upload time and this
    // on-the-fly check is redundant -- it only runs as a safety net for
    // assets that don't have an optimized version yet. Videos (Reels)
    // aren't subject to this constraint either way.
    const finalMediaUrl = isVideo || alreadyOptimized ? mediaUrl : await this.ensureInstagramAspectRatio(mediaUrl, brandId);
    const containerParams = new URLSearchParams({
      caption,
      access_token: accessToken,
      ...(isVideo ? { media_type: 'REELS', video_url: mediaUrl } : { image_url: finalMediaUrl }),
    });

    const containerRes = await fetch(`https://graph.instagram.com/v19.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: containerParams,
    });
    const containerData = await containerRes.json();
    if (!containerRes.ok || !containerData.id) {
      throw new Error(this.formatMetaError(containerData, 'Instagram rejected the media container.'));
    }

    // Video/Reels containers process asynchronously on Instagram's side —
    // calling media_publish before the container reaches FINISHED returns
    // a "media not ready" error. Poll status_code with a short backoff
    // before attempting to publish. A real production test also hit this
    // once on a *photo* post ("Media ID is not available" / code 9007 /
    // subcode 2207027) even though photo containers are usually ready
    // instantly -- so always poll rather than skipping for images. Since
    // the loop's first check returns immediately once FINISHED, this adds
    // no meaningful latency for the common case and only waits when
    // Instagram genuinely isn't ready yet.
    await this.waitForInstagramContainerReady(containerData.id, accessToken);

    const publishRes = await fetch(`https://graph.instagram.com/v19.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ creation_id: containerData.id, access_token: accessToken }),
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) {
      throw new Error(this.formatMetaError(publishData, 'Instagram publish step failed.'));
    }

    return publishData.id;
  }

  /**
   * Meta's documented carousel flow: 1) create one child item container per
   * media item with is_carousel_item=true (no caption -- captions only go
   * on the parent), 2) wait for each to be ready, 3) create the parent
   * container with media_type=CAROUSEL and children=<comma-separated child
   * ids>, 4) publish the parent. Mixed-media aware: each child is created
   * as image_url or media_type=VIDEO+video_url depending on that item's own
   * mimeType (mediaMimeTypes is the parallel array to mediaUrls, in the
   * same PostMedia.order sequence) -- Instagram's Graph API natively
   * supports both in the same carousel, unlike TikTok (see
   * assertCarouselPlatformSupport). Images already went through
   * ensureInstagramAspectRatio at the platform-optimization stage (or, for
   * anything without an optimized derivative yet, get the same on-the-fly
   * check applied here, same as the single-image path) so a carousel image
   * can't fail for the same aspect-ratio reason a lone image would --
   * videos never go through this check, matching the single-video/Reels
   * path, since it's an image-only Instagram constraint.
   */
  private async publishInstagramCarousel(igUserId: string, accessToken: string, caption: string, mediaUrls: string[], mediaMimeTypes: string[], brandId: string, alreadyOptimized: boolean): Promise<string> {
    const childIds: string[] = [];
    for (let i = 0; i < mediaUrls.length; i++) {
      const url = mediaUrls[i];
      const isVideoItem = mediaMimeTypes[i]?.startsWith('video/');
      const finalUrl = isVideoItem || alreadyOptimized ? url : await this.ensureInstagramAspectRatio(url, brandId);
      const childParams = new URLSearchParams({
        is_carousel_item: 'true',
        access_token: accessToken,
        ...(isVideoItem ? { media_type: 'VIDEO', video_url: finalUrl } : { image_url: finalUrl }),
      });
      const childRes = await fetch(`https://graph.instagram.com/v19.0/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: childParams,
      });
      const childData = await childRes.json();
      if (!childRes.ok || !childData.id) {
        throw new Error(this.formatMetaError(childData, 'Instagram rejected one of the carousel items.'));
      }
      await this.waitForInstagramContainerReady(childData.id, accessToken);
      childIds.push(childData.id);
    }

    const parentParams = new URLSearchParams({
      caption,
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      access_token: accessToken,
    });
    const parentRes = await fetch(`https://graph.instagram.com/v19.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: parentParams,
    });
    const parentData = await parentRes.json();
    if (!parentRes.ok || !parentData.id) {
      throw new Error(this.formatMetaError(parentData, 'Instagram rejected the carousel container.'));
    }
    await this.waitForInstagramContainerReady(parentData.id, accessToken);

    const publishRes = await fetch(`https://graph.instagram.com/v19.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ creation_id: parentData.id, access_token: accessToken }),
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) {
      throw new Error(this.formatMetaError(publishData, 'Instagram carousel publish step failed.'));
    }

    return publishData.id;
  }

  /**
   * Meta's Graph API error payloads carry far more than `.message` — code,
   * error_subcode, and type together pin down the actual failure far more
   * precisely than the human-readable message alone (which is sometimes
   * generic or slightly misleading). Surfacing all of it in the thrown
   * error means it lands in PublishingLog.errorMessage, visible without
   * needing raw request logs.
   */
  private formatMetaError(data: any, fallback: string): string {
    const err = data?.error;
    if (!err) return fallback;
    const parts = [err.message || fallback];
    if (err.error_user_msg) parts.push(`user_msg: ${err.error_user_msg}`);
    if (err.code !== undefined) parts.push(`code: ${err.code}`);
    if (err.error_subcode !== undefined) parts.push(`subcode: ${err.error_subcode}`);
    if (err.type) parts.push(`type: ${err.type}`);
    return parts.join(' | ');
  }

  /**
   * Instagram feed photos must have an aspect ratio between 4:5 (0.8,
   * portrait) and 1.91:1 (landscape) -- Meta rejects anything outside that
   * range at publish time with a generic error and no upfront validation
   * endpoint to check first. Confirmed via three real production test
   * failures (identical code 36003 / subcode 2207009 across three different
   * images) that this is a genuine content constraint, not a code bug --
   * ordinary phone-camera portrait photos (9:16, ratio 0.56) are common and
   * land well outside the feed-photo range.
   *
   * Rather than reject those images, center-crop to the nearest edge of the
   * accepted range (keeping as much of the original frame as possible) and
   * re-upload the cropped copy to Blob storage so Instagram gets a URL it
   * will actually accept. Images already in range pass through untouched.
   * Any failure in this path (can't fetch, can't read as an image, etc.)
   * falls back to the original URL so Meta's own error can still surface.
   */
  private async ensureInstagramAspectRatio(imageUrl: string, brandId: string): Promise<string> {
    const MIN_RATIO = 4 / 5; // 0.8 -- tallest allowed portrait
    const MAX_RATIO = 1.91; // widest allowed landscape

    try {
      const res = await fetch(imageUrl);
      if (!res.ok) return imageUrl;
      const buffer = Buffer.from(await res.arrayBuffer());

      const sharp = (await import('sharp')).default;
      const image = sharp(buffer);
      const meta = await image.metadata();
      if (!meta.width || !meta.height) return imageUrl;

      const ratio = meta.width / meta.height;
      if (ratio >= MIN_RATIO && ratio <= MAX_RATIO) return imageUrl; // already valid

      let targetWidth = meta.width;
      let targetHeight = meta.height;
      if (ratio < MIN_RATIO) {
        targetHeight = Math.round(meta.width / MIN_RATIO); // crop excess height
      } else {
        targetWidth = Math.round(meta.height * MAX_RATIO); // crop excess width
      }

      const cropped = await image
        .resize({ width: targetWidth, height: targetHeight, fit: 'cover', position: 'centre' })
        .jpeg({ quality: 90 })
        .toBuffer();

      const uploaded = await this.storage.uploadBuffer(cropped, 'ig-cropped.jpg', 'image/jpeg', brandId);
      this.logger.log(
        `Cropped image for Instagram's aspect-ratio range: ${meta.width}x${meta.height} (ratio ${ratio.toFixed(2)}) -> ${targetWidth}x${targetHeight}.`,
      );
      return uploaded.url;
    } catch (error: any) {
      this.logger.warn(`Could not verify/crop image for Instagram's aspect ratio, sending original: ${error?.message || error}`);
      return imageUrl;
    }
  }

  /**
   * Polls an Instagram media container until it reports FINISHED (ready to
   * publish) or ERROR. Reels/videos are fetched and transcoded by Instagram
   * asynchronously after container creation, so media_publish has to wait
   * for that to actually finish first. Photo containers are normally
   * FINISHED instantly (this resolves on the first check with no added
   * latency), but a real production test hit a transient "not ready yet"
   * error on a photo container too, so this is called unconditionally for
   * both media types rather than skipped for images.
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
        throw new Error('Instagram failed to process the uploaded media.');
      }
      // IN_PROGRESS or EXPIRED (rare) — keep waiting up to maxAttempts.
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 6000));
      }
    }
    throw new Error('Instagram is still processing this media — it will be retried automatically on the next publish pass.');
  }

  /**
   * TikTok Content Posting API. Routes to the correct endpoint for the
   * media type — TikTok has entirely separate init endpoints for video vs.
   * photo, so always hitting the video endpoint (the old behavior) would
   * reject any image with a content-type mismatch even with a verified
   * domain.
   */
  private async publishToTikTok(accessToken: string, caption: string, mediaUrls: string[], mimeType: string): Promise<string> {
    const isVideo = mimeType?.startsWith('video/');
    return isVideo
      ? this.publishTikTokVideo(accessToken, caption, mediaUrls[0])
      : this.publishTikTokPhoto(accessToken, caption, mediaUrls);
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
          // Confirmed against TikTok's own Content Posting API docs (was an
          // open question in the production-readiness audit -- flagged as
          // "may be a deliberate placeholder... needs a product decision,"
          // now resolved with the actual spec, not a guess):
          // "All content posted by unaudited clients will be restricted to
          // private viewing mode... your API client must undergo an audit
          // to verify compliance" --
          // https://developers.tiktok.com/doc/content-posting-api-get-started
          // This is TikTok enforcing SELF_ONLY server-side regardless of what
          // this app requests, for every app that hasn't passed their content
          // posting audit -- hardcoding anything else here would not make
          // posts public, it would just misrepresent what's actually
          // happening. TIKTOK_CONTENT_AUDITED (unset/false today, matching
          // the app's real current audit status) is the single flag to flip
          // once that audit is approved -- see resolveTikTokPrivacyLevel().
          privacy_level: resolveTikTokPrivacyLevel(),
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          // Required by TikTok's Direct Post API (undisclosed-ad compliance) —
          // omitting these causes a generic "request post info is empty or
          // incorrect" validation failure. Oyinca-generated posts are never
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
      throw new Error(this.formatTikTokError(initData, 'TikTok video publish initiation failed.'));
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
   * Content Posting API. That requires verifying, in the TikTok Developer
   * Portal, whatever domain the image URLs are actually on -- which turned
   * out to be unverifiable for Oyinca's raw Blob storage domain in practice
   * (Blob storage has no root "index" document to serve a verification
   * file from, and DNS for vercel-storage.com belongs to Vercel, not
   * Oyinca). Fixed by routing photo URLs through media-proxy.controller.ts
   * instead, which proxies Blob content through the app's own primary
   * domain (getAppUrl(), i.e. whatever APP_URL is set to -- oyinca.com in
   * production) -- a domain that IS verified, and whose verification
   * covers every path beneath it per TikTok's own docs. See that
   * controller's comment for the full story. If this still fails with
   * "url_ownership_unverified", it means that domain's own verification
   * has lapsed, was never completed, or (after a domain change) hasn't
   * been redone yet for the new domain -- not that Blob storage needs
   * re-verifying.
   *
   * Carousel-aware: TikTok's `photo_images` field natively accepts multiple
   * URLs in one call (this is TikTok's actual "photo carousel" mechanism —
   * a single publish request that fans out to a multi-image TikTok post),
   * so a single image and a 2-5 image Oyinca carousel both go through this
   * exact same call, just with a longer/shorter array. photo_cover_index
   * is always 0 (the first image, matching PostMedia.order) so the cover
   * shown in TikTok's feed matches the first image the user arranged.
   */
  private async publishTikTokPhoto(accessToken: string, caption: string, imageUrls: string[]): Promise<string> {
    // TikTok caps photo-post titles at 90 UTF-16 runes (vs. 2200 for video
    // captions) -- sending the full AI-generated caption as `title` was
    // guaranteed to fail validation. The full caption goes in `description`
    // instead, which has the same 4000-rune ceiling video captions get.
    const title = caption.length > 90 ? `${caption.slice(0, 87)}...` : caption;

    // Rewrite Blob storage URLs to route through the app's own domain's
    // proxy (media-proxy.controller.ts) instead of TikTok fetching Blob
    // storage directly. TikTok's PULL_FROM_URL requires verifying whatever
    // domain the URL is actually on, and Vercel Blob storage's domain
    // turned out to be unverifiable there in practice (no root document to
    // serve a verification file from, and DNS is Vercel's, not ours) --
    // see media-proxy.controller.ts's comment for the full story. The
    // app's own domain (getAppUrl()) is already verified, and verification
    // covers every path under a domain, so proxying through it sidesteps
    // the problem entirely without needing TikTok's portal to ever see the
    // Blob domain at all.
    const proxiedImageUrls = imageUrls.map((url) => {
      const blobHost = 'nngbo9dlq90oakni.public.blob.vercel-storage.com';
      if (!url.includes(blobHost)) return url; // not our Blob store -- leave as-is
      const pathname = url.split(blobHost)[1]?.replace(/^\//, '') ?? '';
      return `${getAppUrl()}/api/media/proxy/${pathname}`;
    });

    const res = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        media_type: 'PHOTO',
        post_mode: 'DIRECT_POST',
        post_info: {
          title,
          description: caption,
          // See the video publish path above for the full explanation --
          // same TikTok-enforced restriction, same flag.
          privacy_level: resolveTikTokPrivacyLevel(),
          disable_comment: false,
          brand_content_toggle: false,
          brand_organic_toggle: false,
        },
        source_info: { source: 'PULL_FROM_URL', photo_images: proxiedImageUrls, photo_cover_index: 0 },
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error?.code !== 'ok' || !data.data?.publish_id) {
      // url_ownership_unverified is the specific, actionable case: TikTok's
      // photo endpoint only accepts PULL_FROM_URL, which requires the
      // domain photo_images points at (the app's own domain, via the proxy
      // above) to be verified in the TikTok Developer Portal (a one-time,
      // external setup step -- not a bug in this code, and not something a
      // retry fixes). The domain name is read from getAppUrl() rather than
      // hardcoded so this error stays accurate across any future domain
      // change instead of silently naming a stale domain. Surfaced
      // distinctly so it isn't confused with a genuine processing/format
      // failure.
      if (data?.error?.code === 'url_ownership_unverified') {
        const appHost = new URL(getAppUrl()).hostname;
        throw new Error(
          `TikTok couldn't retrieve the image because ${appHost} isn't verified in the TikTok Developer Portal yet (code: url_ownership_unverified, log_id: ${data?.error?.log_id || 'n/a'}). This needs to be verified once in TikTok's developer settings before photo posts can publish -- reconnecting or retrying won't fix it on its own.`,
        );
      }
      throw new Error(this.formatTikTokError(data, 'TikTok photo publish initiation failed.'));
    }

    return data.data.publish_id;
  }

  /**
   * TikTok's error payload's `.message` is sometimes just a generic link to
   * a guidelines page rather than the specific reason -- `.code` (a named
   * enum like `url_ownership_unverified` or `spam_risk_too_many_posts`) and
   * `.log_id` (TikTok's own reference for support/debugging) are far more
   * actionable. Surfacing all three in the thrown error means they land in
   * PublishingLog.errorMessage.
   */
  private formatTikTokError(data: any, fallback: string): string {
    const err = data?.error;
    if (!err) return fallback;
    const parts = [err.message || fallback];
    if (err.code) parts.push(`code: ${err.code}`);
    if (err.log_id) parts.push(`log_id: ${err.log_id}`);
    return parts.join(' | ');
  }
}
