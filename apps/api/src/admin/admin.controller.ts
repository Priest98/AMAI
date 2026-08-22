import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminService } from './admin.service';

/**
 * Oyinca's own internal operating view -- cross-organization data (users by
 * plan, MRR estimate, platform-wide failures, AI provider health). Gated
 * by PlatformAdminGuard's platformRole check (OWNER/ADMIN only), not by
 * anything a customer (including an Agency owner) can ever satisfy.
 */
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  async getOverview() {
    return this.adminService.getOverview();
  }
}
