import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorSeverity } from '@prisma/client';
import { AuditLogService } from './audit-log.service';

/**
 * Backs the Admin dashboard's Errors page (grouped, per spec) and Logs
 * page (flat/ungrouped events of the same underlying capture -- see
 * ErrorCaptureService for how these tables get populated, and the doc
 * comment on ErrorGroup in schema.prisma for why this exists alongside
 * Sentry rather than replacing it).
 */
@Injectable()
export class ErrorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async listGroups(params: { page: number; limit: number; resolved?: boolean; severity?: ErrorSeverity }) {
    const { page, limit, resolved, severity } = params;
    const where = {
      ...(resolved !== undefined ? { resolved } : {}),
      ...(severity ? { severity } : {}),
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
      data: { resolved: true },
    });

    await this.auditLog.record({
      adminUserId,
      action: 'error_group.resolve',
      resourceType: 'ErrorGroup',
      resourceId: id,
      previousState: { resolved: existing.resolved },
      newState: { resolved: true },
    });

    return updated;
  }

  async unresolve(id: string, adminUserId: string) {
    const existing = await this.prisma.errorGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Error group not found.');

    const updated = await this.prisma.errorGroup.update({
      where: { id },
      data: { resolved: false },
    });

    await this.auditLog.record({
      adminUserId,
      action: 'error_group.unresolve',
      resourceType: 'ErrorGroup',
      resourceId: id,
      previousState: { resolved: existing.resolved },
      newState: { resolved: false },
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
