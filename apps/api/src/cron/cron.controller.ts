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

  @Get('publish-due')
  @Post('publish-due')
  async publishDue(@Headers('authorization') authHeader?: string) {
    this.assertAuthorized(authHeader);
    const result = await this.publishingService.publishDuePosts();
    this.logger.log(`publish-due: ${JSON.stringify(result)}`);
    return { success: true, ...result };
  }

  @Get('sync-drive')
  @Post('sync-drive')
  async syncDrive(@Headers('authorization') authHeader?: string) {
    this.assertAuthorized(authHeader);
    const result = await this.engineJobsService.syncAllGoogleDrive();
    this.logger.log(`sync-drive: ${JSON.stringify(result)}`);
    return { success: true, ...result };
  }
}
