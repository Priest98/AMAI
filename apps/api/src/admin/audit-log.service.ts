import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditResult, AuditSource } from '@prisma/client';

interface RecordAuditParams {
  adminUserId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  previousState?: unknown;
  newState?: unknown;
  result?: AuditResult;
  source?: AuditSource;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Write-through audit log for every privileged action taken from the
 * Admin dashboard (and, later, Telegram / the Engineering Agent -- see
 * `source`). Every mutating admin endpoint should call `record()` after
 * the action completes (or on failure, with result: FAILURE) -- this is
 * the system of record for "who did what, when, to what, with what
 * result" per spec.
 *
 * `record()` deliberately never throws: a failure to *log* an action must
 * never block or roll back the action itself. If the write fails, it's
 * logged locally (console) as a fallback so it isn't silently lost from
 * every trace.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAuditParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminUserId: params.adminUserId,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          previousState: params.previousState as any,
          newState: params.newState as any,
          result: params.result ?? AuditResult.SUCCESS,
          source: params.source ?? AuditSource.DASHBOARD,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to write audit log entry (action=${params.action}, adminUserId=${params.adminUserId}): ${err?.message || err}`,
      );
    }
  }

  async list(params: { page: number; limit: number; adminUserId?: string; action?: string; resourceType?: string }) {
    const { page, limit, adminUserId, action, resourceType } = params;
    const where = {
      ...(adminUserId ? { adminUserId } : {}),
      ...(action ? { action } : {}),
      ...(resourceType ? { resourceType } : {}),
    };

    const [total, entries] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          adminUser: { select: { id: true, email: true, fullName: true } },
        },
      }),
    ]);

    return { total, page, limit, entries };
  }
}
