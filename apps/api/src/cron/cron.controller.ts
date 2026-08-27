import { Controller, Get, Post, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { PublishingService } from '../queue/publishing.service';
import { EngineJobsService } from '../engine/engine-jobs.service';
import { HealthEngineService } from '../health/health-engine.service';
import { MetricsService } from '../metrics/metrics.service';
import { LearningService } from '../metrics/learning.service';

/**
 * Endpoints that trigger publishing/Drive-sync on a schedule. These replace
 * the BullMQ worker and @nestjs/schedule @Cron timers that used to drive
 * this — neither can run reliably on Vercel's serverless functions, which
 * don't stay alive between requests. Every call must carry an
 * `Authorization: Bearer <CRON_SECRET>` header; anything else is rejected.
 *
 * Both GET and POST are accepted on each route. Vercel Cron only ever
 * sends GET. Upstash QStash (added as a free way to trigger publish-due
 * far more often than Vercel Hobby's once-a-day cron allows, without
 * paying for Vercel Pro) defaults its scheduled requests to POST and
 * doesn't expose a method override in its dashboard schedule-creation UI.
 * Since neither handler reads a request body or otherwise behaves
 * differently based on verb, accepting both is a no-op safety-wise — it's
 * purely so the same endpoint can be triggered by either scheduler.
 *
 * IMPORTANT: this requires two separate handler *methods* per route, each
 * with exactly one HTTP-method decorator, delegating to a shared private
 * implementation. Nest's route decorators (@Get/@Post/etc.) write path and
 * method onto the same reflected-metadata slot on the target function;
 * stacking two of them on one method doesn't register two routes, it just
 * lets whichever decorator TypeScript applies last (decorators run
 * bottom-to-top, so the topmost one in source) silently overwrite the
 * other's metadata. Confirmed the hard way in production on the `main`
 * branch: an earlier version of this file (and this file's own state
 * before this fix was ported over from `main`) had @Get and @Post stacked
 * on a single method, and Nest's own boot log (RouterExplorer) only ever
 * showed the route mapped as GET -- every POST call (from QStash) got a
 * genuine 404, silently, with no error at boot. Had nothing to do with
 * deployment or build caching, despite that being chased first.
 */
@Controller('cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(
    private readonly publishingService: PublishingService,
    private readonly engineJobsService: EngineJobsService,
    private readonly healthEngineService: HealthEngineService,
    private readonly metricsService: MetricsService,
    private readonly learningService: LearningService,
  ) {}

  private assertAuthorized(authHeader?: string) {
    const secret = process.env.CRON_SECRET;
    if (!secret || authHeader !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid or missing cron secret.');
    }
  }

  private async runPublishDue(authHeader?: string) {
    this.assertAuthorized(authHeader);
    const result = await this.publishingService.publishDuePosts();
    this.logger.log(`publish-due: ${JSON.stringify(result)}`);
    return { success: true, ...result };
  }

  @Get('publish-due')
  async publishDueGet(@Headers('authorization') authHeader?: string) {
    return this.runPublishDue(authHeader);
  }

  @Post('publish-due')
  async publishDuePost(@Headers('authorization') authHeader?: string) {
    return this.runPublishDue(authHeader);
  }

  private async runSyncDrive(authHeader?: string) {
    this.assertAuthorized(authHeader);
    const result = await this.engineJobsService.syncAllGoogleDrive();
    this.logger.log(`sync-drive: ${JSON.stringify(result)}`);
    return { success: true, ...result };
  }

  @Get('sync-drive')
  async syncDriveGet(@Headers('authorization') authHeader?: string) {
    return this.runSyncDrive(authHeader);
  }

  @Post('sync-drive')
  async syncDrivePost(@Headers('authorization') authHeader?: string) {
    return this.runSyncDrive(authHeader);
  }

  // Phase 15/17 note: heartbeat staleness is checked FIRST, against the
  // *previous* run's heartbeat, before this run writes its own fresh one --
  // otherwise a heartbeat would always look fresh (this same call is about
  // to write one) and the watchdog could never fire. See
  // HealthEngineService.checkEngineHeartbeat's doc comment for the honest
  // limitation this implies: if whatever triggers this endpoint (Vercel
  // Cron / QStash) stops calling it entirely, nothing here can notice --
  // an external uptime pinger hitting this same route is the only way to
  // detect that case, exactly as documented in this file's top comment for
  // publish-due/sync-drive.
  private async runHealthCheck(authHeader?: string) {
    this.assertAuthorized(authHeader);
    await this.healthEngineService.checkEngineHeartbeat();
    const results = await this.healthEngineService.runAll();
    this.logger.log(`health-check: ${JSON.stringify(results.map((r) => ({ subsystem: r.subsystem, status: r.status })))}`);
    return { success: true, results };
  }

  @Get('health-check')
  async healthCheckGet(@Headers('authorization') authHeader?: string) {
    return this.runHealthCheck(authHeader);
  }

  @Post('health-check')
  async healthCheckPost(@Headers('authorization') authHeader?: string) {
    return this.runHealthCheck(authHeader);
  }

  private async runDailyReport(authHeader?: string) {
    this.assertAuthorized(authHeader);
    const result = await this.healthEngineService.sendDailyReport();
    this.logger.log(result.sent ? 'daily-report: sent' : `daily-report: not sent (${result.reason})`);
    return { success: true };
  }

  @Get('daily-report')
  async dailyReportGet(@Headers('authorization') authHeader?: string) {
    return this.runDailyReport(authHeader);
  }

  @Post('daily-report')
  async dailyReportPost(@Headers('authorization') authHeader?: string) {
    return this.runDailyReport(authHeader);
  }

  // Pulls fresh view/like/comment/share counts for recently-published
  // TikTok posts and stores them as PostPerformance snapshots -- see
  // MetricsService for why this exists and why it can't just reuse
  // OAuthService.getTikTokVideos directly (circular module dependency).
  // Metrics sync, then learning: the learning pass reads PostPerformance
  // rows this same run's sync just wrote, so it always analyzes same-day
  // data rather than trailing a full day behind on a separate schedule.
  private async runSyncPostMetrics(authHeader?: string) {
    this.assertAuthorized(authHeader);
    const metrics = await this.metricsService.syncTikTokMetrics();
    const learning = await this.learningService.runForAllBrands();
    this.logger.log(`sync-post-metrics: ${JSON.stringify(metrics)}; learning: ${JSON.stringify(learning)}`);
    return { success: true, metrics, learning };
  }

  @Get('sync-post-metrics')
  async syncPostMetricsGet(@Headers('authorization') authHeader?: string) {
    return this.runSyncPostMetrics(authHeader);
  }

  @Post('sync-post-metrics')
  async syncPostMetricsPost(@Headers('authorization') authHeader?: string) {
    return this.runSyncPostMetrics(authHeader);
  }
}
