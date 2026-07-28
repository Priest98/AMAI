import { Controller, Get, Patch, Body, Param, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { Observable, fromEvent, map, filter } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EngineService } from './engine.service';
import { EngineState, ApprovalMode } from '@prisma/client';

@UseGuards(JwtAuthGuard, BrandAccessGuard)
@Controller('brands/:brandId/engine')
export class EngineController {
  constructor(
    private readonly engineService: EngineService,
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
   * Server-Sent Events stream of everything the AMAI Engine does for this
   * brand, so the dashboard, Media Library, Approval Queue, Scheduled Posts
   * and Published Posts pages can all update live without a page refresh.
   */
  @Sse('events')
  streamEvents(@Param('brandId') brandId: string): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, 'engine.activity').pipe(
      filter((event: any) => event.brandId === brandId),
      map((event: any) => ({ data: event }) as MessageEvent),
    );
  }
}
