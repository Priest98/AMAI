import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { HealthEngineService } from '../health/health-engine.service';
import { AuditLogService } from './audit-log.service';
import { HealthStatus } from '@prisma/client';

/**
 * Admin dashboard's "SYSTEM HEALTH" section (Phase 11). Reads
 * HealthCheckResult -- the same table the proactive Health Engine writes
 * to on every scheduled run (see cron/cron.controller.ts's health-check
 * route) -- rather than computing anything fresh on request, so this page
 * always reflects what the engine actually last observed.
 */
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin/health')
export class HealthController {
  constructor(
    private readonly healthEngine: HealthEngineService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  async getSnapshot() {
    const snapshot = await this.healthEngine.getLatestSnapshot();
    const subsystems = snapshot.filter((s) => s.subsystem !== 'health_engine');
    const heartbeat = snapshot.find((s) => s.subsystem === 'health_engine');

    const anyDown = subsystems.some((s) => s.status === HealthStatus.DOWN);
    const anyDegraded = subsystems.some((s) => s.status === HealthStatus.DEGRADED);
    const overallStatus = anyDown ? 'CRITICAL' : anyDegraded ? 'DEGRADED' : 'HEALTHY';

    return {
      overallStatus,
      subsystems: subsystems.map((s) => ({
        subsystem: s.subsystem,
        status: s.status,
        message: s.message,
        error: s.error,
        responseTimeMs: s.responseTimeMs,
        checkedAt: s.checkedAt,
      })),
      engineHeartbeatAt: heartbeat?.checkedAt ?? null,
    };
  }

  /** Phase 18 admin control: "Run full audit now" -- synchronous, on demand. */
  @Post('run-now')
  async runNow(@Req() req: any) {
    const results = await this.healthEngine.runAll();

    await this.auditLog.record({
      adminUserId: req.user.id,
      action: 'health_engine.run_now',
      resourceType: 'HealthCheckResult',
      newState: { subsystems: results.map((r) => ({ subsystem: r.subsystem, status: r.status })) },
    });

    return { success: true, results };
  }
}
