import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Verifies the authenticated user is actually a member of the :organizationId
 * in the route. Unlike BrandAccessGuard (which trusts a brandId claim
 * embedded in the JWT at login), the JWT doesn't carry organizationId today,
 * so this checks OrganizationMember directly -- a live DB check rather than
 * a token claim, appropriate for the low-frequency brand-management routes
 * this guards (not on the hot path of every brand-scoped request).
 */
@Injectable()
export class OrganizationAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.params?.organizationId;
    const userId = request.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenException('You do not have access to this organization.');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization.');
    }

    return true;
  }
}
