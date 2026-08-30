import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { EarlyAccessSignupDto } from './dto/early-access-signup.dto';
import { CreatorApplicationDto } from './dto/creator-application.dto';
import { AttributionEventDto } from './dto/attribution-event.dto';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Post('early-access')
  async registerEarlyAccess(@Body() dto: EarlyAccessSignupDto) {
    return this.marketingService.registerEarlyAccess(dto);
  }

  @Get('early-access/:code')
  async getEarlyAccessStatus(@Param('code') code: string) {
    return this.marketingService.getEarlyAccessStatus(code);
  }

  @Post('creators/apply')
  async applyFoundingCreator(@Body() dto: CreatorApplicationDto) {
    return this.marketingService.applyFoundingCreator(dto);
  }

  @Post('attribution')
  async recordAttributionEvent(@Body() dto: AttributionEventDto) {
    return this.marketingService.recordAttributionEvent(dto);
  }

  @Get('admin/stats')
  async getAdminStats() {
    return this.marketingService.getAdminStats();
  }

  @Get('admin/early-access')
  async getAdminEarlyAccessList(@Query('search') search?: string, @Query('limit') limit = '50', @Query('page') page = '1') {
    return this.marketingService.getAdminEarlyAccessList(search, parseInt(limit, 10), parseInt(page, 10));
  }

  @Get('admin/creators')
  async getAdminCreatorsList(@Query('status') status?: string, @Query('limit') limit = '50', @Query('page') page = '1') {
    return this.marketingService.getAdminCreatorsList(status, parseInt(limit, 10), parseInt(page, 10));
  }

  @Patch('admin/creators/:id')
  async updateCreatorStatus(
    @Param('id') id: string,
    @Body() body: { status: string; cohortRole?: string; adminNotes?: string },
  ) {
    return this.marketingService.updateCreatorStatus(id, body.status, body.cohortRole, body.adminNotes);
  }
}
