import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorSeverity, IncidentStatus, IncidentSource } from '@prisma/client';
import { AuditLogService } from './audit-log.service';

/**
 * Backs the Admin dashboard's Errors/Incidents page (grouped, per spec) and
 * Logs page (flat/ungrouped events of the same underlying capture -- see
 * ErrorCaptureService for how these tables get populated, and the doc
 * comment on ErrorGroup in schema.prisma for why this exists alongside
 * Sentry rather than replacing it).
 *
 * "Incidents" is not a second table layered on top of this -- it's the
 * same ErrorGroup rows the Errors page always showed, now also carrying
 * status/subsystem/source (see schema.prisma) so both reactive exceptions
 * and the Health Engine's proactive HEALTH_CHECK-sourced incidents show up
 * side by side, filterable the same way.
 */
@Injectable()
export class ErrorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async listGroups(params: {
    page: number;
    limit: number;
    resolved?: boolean;
    severity?: ErrorSeverity;
    status?: IncidentStatus;
    subsystem?: string;
    source?: IncidentSource;
  }) {
    const { page, limit, resolved, severity, status, subsystem, source } = params;
    const where = {
      ...(resolved !== undefined ? { resolved } : {}),
      ...(severity ? { severity } : {}),
      ...(status ? { status } : {}),
      ...(subsystem ? { subsystem } : {}),
      ...(source ? { source } : {}),
    };

    const [total, groups] = await Promise.all([
      this.prisma.errorGroup.count({ where }),
      this.prisma.errorGroup.findMany({
        where,
        orderBy: { lastSeenAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, page, limit, groups };
  }

  async getGroup(id: string) {
    const group = await this.prisma.errorGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Error group not found.');

    const recentEvents = await this.prisma.errorEvent.findMany({
      where: { groupId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { group, recentEvents };
  }

  async resolve(id: string, adminUserId: string) {
    const existing = await this.prisma.errorGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Error group not found.');

    const updated = await this.prisma.errorGroup.update({
      where: { id },
      // status kept in sync with the boolean this dashboard has always
      // used, rather than replacing it -- see the ErrorGroup.status doc
      // comment in schema.prisma.
      data: { resolved: true, status: IncidentStatus.RESOLVED, resolvedAt: new Date() },
    });

    await this.auditLog.record({
      adminUserId,
      action: 'error_group.resolve',
      resourceType: 'ErrorGroup',
      resourceId: id,
      previousState: { resolved: existing.resolved, status: existing.status },
      newState: { resolved: true, status: IncidentStatus.RESOLVED },
    });

    return updated;
  }

  async unresolve(id: string, adminUserId: string) {
    const existing = await this.prisma.errorGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Error group not found.');

    const updated = await this.prisma.errorGroup.update({
      where: { id },
      data: { resolved: false, status: IncidentStatus.OPEN, resolvedAt: null },
    });

    await this.auditLog.record({
      adminUserId,
      action: 'error_group.unresolve',
      resourceType: 'ErrorGroup',
      resourceId: id,
      previousState: { resolved: existing.resolved, status: existing.status },
      newState: { resolved: false, status: IncidentStatus.OPEN },
    });

    return updated;
  }

  /** Phase 18 admin control: mark an incident IGNORED (won't re-alert, won't count as open). */
  async ignore(id: string, adminUserId: string) {
    const existing = await this.prisma.errorGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Error group not found.');

    const updated = await this.prisma.errorGroup.update({
      where: { id },
      data: { status: IncidentStatus.IGNORED },
    });

    await this.auditLog.record({
      adminUserId,
      action: 'error_group.ignore',
      resourceType: 'ErrorGroup',
      resourceId: id,
      previousState: { status: existing.status },
      newState: { status: IncidentStatus.IGNORED },
    });

    return updated;
  }

  /** Phase 18 admin control: acknowledge -- "a human has seen this," without resolving it. */
  async acknowledge(id: string, adminUserId: string) {
    const existing = await this.prisma.errorGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Error group not found.');

    const updated = await this.prisma.errorGroup.update({
      where: { id },
      data: { acknowledgedBy: adminUserId, acknowledgedAt: new Date() },
    });

    await this.auditLog.record({
      adminUserId,
      action: 'error_group.acknowledge',
      resourceType: 'ErrorGroup',
      resourceId: id,
      previousState: { acknowledgedBy: existing.acknowledgedBy },
      newState: { acknowledgedBy: adminUserId },
    });

    return updated;
  }

  /** Flat, ungrouped event list -- the Logs page's real data source. */
  async listEvents(params: {
    page: number;
    limit: number;
    service?: string;
    httpStatus?: number;
    groupId?: string;
  }) {
    const { page, limit, service, httpStatus, groupId } = params;
    const where = {
      ...(service ? { service } : {}),
      ...(httpStatus !== undefined ? { httpStatus } : {}),
      ...(groupId ? { groupId } : {}),
    };

    const [total, events] = await Promise.all([
      this.prisma.errorEvent.count({ where }),
      this.prisma.errorEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, page, limit, events };
  }
}
