import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AuditLogService } from './audit-log.service';
import { parsePage, parseLimit } from './pagination.util';

/** Admin dashboard's Audit Log page -- read-only view of AuditLogService's records. */
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin/audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('adminUserId') adminUserId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
  ) {
    return this.auditLogService.list({
      page: parsePage(page),
      limit: parseLimit(limit),
      adminUserId,
      action,
      resourceType,
    });
  }
}
