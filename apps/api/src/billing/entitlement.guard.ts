import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementsService } from './entitlements.service';
import type { BillableAction } from './entitlements.service';

export const REQUIRE_ENTITLEMENT_KEY = 'requireEntitlementAction';

/**
 * Marks a route as gated by a plan entitlement. Must be combined with
 * JwtAuthGuard + BrandAccessGuard (route needs a :brandId param) and
 * EntitlementGuard, in that order -- EntitlementGuard trusts req.params.brandId
 * to already be verified as belonging to the authenticated user.
 *
 * Usage: @RequireEntitlement('generate_ai_content')
 */
export const RequireEntitlement = (action: BillableAction) => SetMetadata(REQUIRE_ENTITLEMENT_KEY, action);

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private entitlementsService: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.get<BillableAction | undefined>(REQUIRE_ENTITLEMENT_KEY, context.getHandler());
    if (!action) return true; // route isn't gated -- nothing to check

    const request = context.switchToHttp().getRequest();
    const brandId = request.params?.brandId;
    if (!brandId) {
      // A route using @RequireEntitlement must be brand-scoped -- this is a
      // wiring mistake, not a user-facing case, so fail loudly.
      throw new Error('EntitlementGuard: route has no :brandId param to check entitlements against.');
    }

    const result = await this.entitlementsService.canPerformAction(brandId, action);
    if (!result.allowed) {
      throw new ForbiddenException({
        message: result.reason || 'This action is not available on your current plan.',
        code: 'ENTITLEMENT_LIMIT_REACHED',
        usage: result.usage,
      });
    }

    return true;
  }
}
