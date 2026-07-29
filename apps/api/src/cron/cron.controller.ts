import { Controller, Get, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { PublishingService } from '../queue/publishing.service';
import { EngineJobsService } from '../engine/engine-jobs.service';

/**
 * Endpoints Vercel Cron calls on a schedule (see vercel.json's `crons`
 * array). These replace the BullMQ worker and @nestjs/schedule @Cron
 * timers that used to drive publishing and Drive sync — neither can run
 * reliably on Vercel's serverless functions, which don't stay alive
 * between requests. Vercel invokes these with an
 * `Authorization: Bearer <CRON_SECRET>` header; anything else is rejected.
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
  async publishDue(@Headers('authorization') authHeader?: string) {
    this.assertAuthorized(authHeader);
    const result = await this.publishingService.publishDuePosts();
    this.logger.log(`publish-due: ${JSON.stringify(result)}`);
    return { success: true, ...result };
  }

  @Get('sync-drive')
  async syncDrive(@Headers('authorization') authHeader?: string) {
    this.assertAuthorized(authHeader);
    const result = await this.engineJobsService.syncAllGoogleDrive();
    this.logger.log(`sync-drive: ${JSON.stringify(result)}`);
    return { success: true, ...result };
  }
}
