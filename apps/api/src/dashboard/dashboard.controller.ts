import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard, BrandAccessGuard)
@Controller('brands/:brandId/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('bootstrap')
  getBootstrap(@Param('brandId') brandId: string, @Req() request: any) {
    return this.dashboardService.getBootstrap(brandId, request.organizationId);
  }
}
