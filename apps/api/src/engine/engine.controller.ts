import { Controller, Get, Post, Patch, Body, Param, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { Observable, fromEvent, map, filter, merge, of, timer, takeUntil } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EngineService } from './engine.service';
import { EngineJobsService } from './engine-jobs.service';
import { EngineState, ApprovalMode } from '@prisma/client';

@UseGuards(JwtAuthGuard, BrandAccessGuard)
@Controller('brands/:brandId/engine')
export class EngineController {
  constructor(
    private readonly engineService: EngineService,
    private readonly engineJobsService: EngineJobsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get('state')
  async getState(@Param('brandId') brandId: string) {
    return this.engineService.getOrCreateConfig(brandId);
  }

  @Patch('state')
  async setState(@Param('brandId') brandId: string, @Body('state') state: EngineState) {
    return this.engineService.setState(brandId, state);
  }

  @Patch('approval-mode')
  async setApprovalMode(@Param('brandId') brandId: string, @Body('approvalMode') approvalMode: ApprovalMode) {
    return this.engineService.setApprovalMode(brandId, approvalMode);
  }

  @Patch('config')
  async updateConfig(@Param('brandId') brandId: string, @Body() dto: { defaultTone?: string }) {
    return this.engineService.updateConfig(brandId, dto);
  }

  @Get('activity')
  async getActivity(@Param('brandId') brandId: string) {
    return this.engineService.getRecentEvents(brandId);
  }

  /**
   * Manual "Sync Now" trigger for the Media Library page's Google Drive
   * source — runs the same ingestion logic the daily cron uses, scoped to
   * just this brand, instead of waiting for the next scheduled pass.
   */
  @Post('sync-drive')
  async syncDriveNow(@Param('brandId') brandId: string) {
    return this.engineJobsService.syncBrandDrive(brandId);
  }

  /**
   * Server-Sent Events stream of everything the AMAI Engine does for this
   * brand, so the dashboard, Media Library, Approval Queue, Scheduled Posts
   * and Published Posts pages can all update live without a page refresh.
   *
   * Vercel serverless functions have a hard execution cap (maxDuration =
   * 60s on this plan), but SSE is meant to stay open indefinitely -- left
   * alone, Vercel force-kills the function every ~60s, which shows up as a
   * "Runtime Timeout Error" in production logs for every open dashboard
   * tab. The browser's EventSource already auto-reconnects on any dropped
   * connection, so instead of waiting to be killed, the stream completes
   * itself just under the cap: NestJS ends the HTTP response cleanly, the
   * browser sees a normal close (not an error) and immediately opens a
   * fresh connection. Same effective behaviour, no more logged errors, and
   * the handoff is faster since the client doesn't have to wait out a
   * connection timeout to notice something's wrong.
   */
  @Sse('events')
  streamEvents(@Param('brandId') brandId: string): Observable<MessageEvent> {
    // Sent immediately on connect so the browser adopts a fast retry
    // interval for the *next* reconnect too, instead of its default
    // (~3s) -- keeps the gap between planned reconnects to ~1s of no
    // live updates rather than several.
    const connected$ = of({ data: { type: 'CONNECTED' }, retry: 1000 } as MessageEvent);

    const activity$ = fromEvent(this.eventEmitter, 'engine.activity').pipe(
      filter((event: any) => event.brandId === brandId),
      map((event: any) => ({ data: event }) as MessageEvent),
    );

    return merge(connected$, activity$).pipe(takeUntil(timer(50_000)));
  }
}
