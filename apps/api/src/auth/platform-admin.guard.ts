import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';

/**
 * Gates AMAI's own internal admin views (cross-organization data no
 * customer, including an Agency owner, should ever see -- other orgs'
 * user counts, MRR, platform-wide failure rates, error logs, audit trail).
 * Must run after JwtAuthGuard so request.user is populated.
 *
 * Deliberately not User.role / OrganizationMember.role -- both of those
 * are scoped to "this user's role within their own organization", which is
 * a different concept entirely (an Agency OWNER is still not an AMAI
 * platform admin). Uses the dedicated `platformRole` column instead.
 *
 * This supersedes the original env-var (ADMIN_EMAILS) allowlist approach
 * from this dashboard's first commit. That approach was chosen at the time
 * specifically to avoid a schema migration; since this phase's build
 * already adds AuditLog/ErrorGroup/ErrorEvent tables (a real migration
 * either way), a real column is worth the switch -- it gives per-admin
 * audit-log attribution (an email allowlist can't tell you *which* admin
 * account acted), and supports the spec's tiered permission model
 * (Owner/Admin/Support/Developer/Read-only) without a second migration
 * later, which a flat allowlist never could.
 *
 * `platformRole` defaults to NONE for every user, including the founder's
 * own account -- there is no bootstrap path that grants access
 * automatically. The first OWNER/ADMIN row must be set directly in the
 * database (`UPDATE "User" SET "platformRole" = 'OWNER' WHERE email = ...`)
 * before anyone, including the founder, can reach /admin. Fails closed.
 *
 * v1 scope: only OWNER/ADMIN get through. SUPPORT/DEVELOPER/READONLY exist
 * in the schema (per spec's request for a tiered permission system) but
 * aren't wired to differentiated access yet -- when that's built, this
 * becomes a per-route decorator (`@RequirePlatformRole(...)`) rather than
 * a single all-or-nothing guard.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const platformRole: PlatformRole | undefined = request.user?.platformRole;

    if (platformRole !== PlatformRole.OWNER && platformRole !== PlatformRole.ADMIN) {
      throw new ForbiddenException('This area is restricted to AMAI administrators.');
    }

    return true;
  }
}
