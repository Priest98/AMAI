import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Gates AMAI's own internal admin views (cross-organization data no
 * customer, including an Agency owner, should ever see -- other orgs'
 * user counts, MRR, platform-wide failure rates). Must run after
 * JwtAuthGuard so request.user is populated.
 *
 * Deliberately not a database column (User.role / OrganizationMember.role
 * are both scoped to "this user's role within their own organization",
 * which is a different concept entirely -- an Agency OWNER is still not an
 * AMAI platform admin). Adding a real isPlatformAdmin column would mean a
 * schema migration, and this sandbox cannot reliably run `prisma generate`
 * (see prior session notes) -- an env-var allowlist gets the same
 * guarantee (only specific, explicitly-configured accounts can ever pass)
 * with zero schema risk, and is trivially revocable by editing the env var.
 *
 * ADMIN_EMAILS is a comma-separated list of exact email addresses. Unset
 * or empty means the admin surface is unreachable for everyone -- fails
 * closed, not open.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const email: string | undefined = request.user?.email;

    const allowlist = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!email || allowlist.length === 0 || !allowlist.includes(email.toLowerCase())) {
      throw new ForbiddenException('This area is restricted to AMAI administrators.');
    }

    return true;
  }
}
