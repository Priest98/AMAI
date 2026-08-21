import { Controller, Get, Post, Param, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { ErrorsService } from './errors.service';
import { ErrorSeverity, IncidentStatus, IncidentSource } from '@prisma/client';
import { parsePage, parseLimit } from './pagination.util';

/**
 * Admin dashboard's Errors/Incidents page -- grouped, deduplicated
 * exceptions and proactive Health Engine findings, both stored as
 * ErrorGroup rows (see schema.prisma's ErrorGroup doc comment). Same
 * table Sentry-adjacent capture always used; status/subsystem/source are
 * additive filters, not a new endpoint family.
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
    @Query('status') status?: string,
    @Query('subsystem') subsystem?: string,
    @Query('source') source?: string,
  ) {
    if (severity && !Object.values(ErrorSeverity).includes(severity as ErrorSeverity)) {
      throw new BadRequestException(`Invalid severity. Expected one of: ${Object.values(ErrorSeverity).join(', ')}`);
    }
    if (status && !Object.values(IncidentStatus).includes(status as IncidentStatus)) {
      throw new BadRequestException(`Invalid status. Expected one of: ${Object.values(IncidentStatus).join(', ')}`);
    }
    if (source && !Object.values(IncidentSource).includes(source as IncidentSource)) {
      throw new BadRequestException(`Invalid source. Expected one of: ${Object.values(IncidentSource).join(', ')}`);
    }

    return this.errorsService.listGroups({
      page: parsePage(page),
      limit: parseLimit(limit),
      resolved: resolved === undefined ? undefined : resolved === 'true',
      severity: severity as ErrorSeverity | undefined,
      status: status as IncidentStatus | undefined,
      subsystem: subsystem || undefined,
      source: source as IncidentSource | undefined,
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

  @Post(':id/ignore')
  async ignore(@Param('id') id: string, @Req() req: any) {
    return this.errorsService.ignore(id, req.user.id);
  }

  @Post(':id/acknowledge')
  async acknowledge(@Param('id') id: string, @Req() req: any) {
    return this.errorsService.acknowledge(id, req.user.id);
  }
}
