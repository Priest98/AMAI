import { Controller, Get, Post, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { PublishingService } from '../queue/publishing.service';
import { EngineJobsService } from '../engine/engine-jobs.service';

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
}
