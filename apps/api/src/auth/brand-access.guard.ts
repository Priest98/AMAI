import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Must run after JwtAuthGuard. Authorizes the authenticated user against the
 * :brandId in the route.
 *
 * Previously this compared the route's brandId against a single `brandId`
 * claim baked into the JWT at login (auth.service.ts picks
 * `organization.brands[0].id`). That was correct for a one-brand Pro user
 * but made multi-client impossible by construction: an Agency organization
 * can hold up to 25 brands, yet every request for brands[1..n] was rejected
 * as forbidden, because the token only ever names the first one. Client
 * switching cannot work while identity is pinned to one brand in a token
 * that is only reissued at login.
 *
 * The check is now "does this brand belong to an organization the user is a
 * member of", resolved against the database on each request. That is
 * strictly stronger than the old comparison rather than a relaxation:
 *   - a Pro user with one brand still passes exactly as before
 *   - a stale JWT (brand deleted, membership revoked) now fails, where the
 *     old token-only comparison would have kept succeeding until expiry
 *   - brandId supplied by the frontend is never trusted; membership is
 *     always re-verified server-side, so changing an id in the URL cannot
 *     reach another organization's data
 *
 * The resolved organizationId is attached to the request so downstream
 * handlers can scope queries without repeating the lookup.
 */
@Injectable()
export class BrandAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const routeBrandId = request.params?.brandId;
    // JwtStrategy.validate returns the full User row spread with the brandId
    // claim merged on, so the id lives at `.id` (not `.sub`). Same field
    // OrganizationAccessGuard reads, kept consistent on purpose.
    const userId = request.user?.id;

    if (!routeBrandId || !userId) {
      throw new ForbiddenException('You do not have access to this client.');
    }

    // One query: the brand exists AND the requesting user is a member of the
    // organization that owns it. A non-member (or a bad id) yields null and
    // is rejected identically, so the response can't be used to probe which
    // brand ids exist.
    const brand = await this.prisma.brand.findFirst({
      where: {
        id: routeBrandId,
        organization: {
          members: { some: { userId } },
        },
      },
      select: { id: true, organizationId: true },
    });

    if (!brand) {
      throw new ForbiddenException('You do not have access to this client.');
    }

    request.brandId = brand.id;
    request.organizationId = brand.organizationId;

    return true;
  }
}
