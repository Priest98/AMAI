import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { ErrorsService } from './errors.service';
import { parsePage, parseLimit } from './pagination.util';

/**
 * Admin dashboard's Logs page. Flat, ungrouped view of the same
 * ErrorEvent data the Errors page groups -- there is no separate
 * structured application-log store today (no unified logger beyond
 * NestJS's console Logger), so this is real captured-exception data, not
 * general request logging. Honest about that scope rather than inventing
 * a generic log line for every request.
 */
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin/logs')
export class LogsController {
  constructor(private readonly errorsService: ErrorsService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('service') service?: string,
    @Query('httpStatus') httpStatus?: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.errorsService.listEvents({
      page: parsePage(page),
      limit: parseLimit(limit),
      service,
      httpStatus: httpStatus ? parseInt(httpStatus, 10) : undefined,
      groupId,
    });
  }
}
