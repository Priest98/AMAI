import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PlanTier } from '@prisma/client';
import { EntitlementsService } from '../billing/entitlements.service';

/**
 * Gates the Creator Command Center endpoint behind PlanTier.CREATOR
 * specifically -- not the `clientManagement` flag AgencyEntitlementGuard
 * checks (that stays false for Creator on purpose, see plans.config.ts's
 * doc comment on CREATOR's entry: Creator's multi-account overview is a
 * deliberately lighter surface than Agency's client-workspace tooling, not
 * a re-skin of it, so it has its own guard rather than reusing or
 * broadening AgencyEntitlementGuard's check).
 *
 * Agency orgs do NOT fall through to this guard -- an Agency owner has the
 * richer Portfolio view instead, and showing them the Creator Command
 * Center too would just be a second, worse version of the same idea.
 *
 * Must run after OrganizationAccessGuard, same ordering contract as
 * AgencyEntitlementGuard.
 */
@Injectable()
export class CreatorEntitlementGuard implements CanActivate {
  constructor(private entitlementsService: EntitlementsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId: string | undefined = request.params?.organizationId;
    if (!organizationId) {
      throw new Error('CreatorEntitlementGuard: route has no :organizationId param to check entitlements against.');
    }

    const plan = await this.entitlementsService.getPlanForOrganization(organizationId);
    if (plan !== PlanTier.CREATOR) {
      throw new ForbiddenException({
        message: 'The Creator Command Center is part of the Creator plan. Upgrade to manage a second account with cross-account intelligence.',
        code: 'ENTITLEMENT_LIMIT_REACHED',
      });
    }

    return true;
  }
}
