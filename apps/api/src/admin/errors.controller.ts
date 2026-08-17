import { Controller, Get, Post, Param, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { ErrorsService } from './errors.service';
import { ErrorSeverity } from '@prisma/client';
import { parsePage, parseLimit } from './pagination.util';

/**
 * Admin dashboard's Errors page -- grouped, deduplicated exceptions
 * captured by ErrorCaptureService. See schema.prisma's ErrorGroup/
 * ErrorEvent doc comments for why this exists alongside Sentry.
 */
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin/errors')
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('resolved') resolved?: string,
    @Query('severity') severity?: string,
  ) {
    if (severity && !Object.values(ErrorSeverity).includes(severity as ErrorSeverity)) {
      throw new BadRequestException(`Invalid severity. Expected one of: ${Object.values(ErrorSeverity).join(', ')}`);
    }

    return this.errorsService.listGroups({
      page: parsePage(page),
      limit: parseLimit(limit),
      resolved: resolved === undefined ? undefined : resolved === 'true',
      severity: severity as ErrorSeverity | undefined,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.errorsService.getGroup(id);
  }

  @Post(':id/resolve')
  async resolve(@Param('id') id: string, @Req() req: any) {
    return this.errorsService.resolve(id, req.user.id);
  }

  @Post(':id/unresolve')
  async unresolve(@Param('id') id: string, @Req() req: any) {
    return this.errorsService.unresolve(id, req.user.id);
  }
}
