import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { EntitlementsService } from '../billing/entitlements.service';

/**
 * Gates the Agency-tier cross-client endpoints (portfolio, cross-client
 * approval queue, cross-client calendar, cross-client analytics) behind the
 * `clientManagement` entitlement (see plans.config.ts -- true only for
 * PlanTier.AGENCY). Without this guard any authenticated member of ANY
 * organization -- Free or Pro included -- could reach these endpoints, since
 * OrganizationAccessGuard only proves org membership, not plan tier.
 *
 * Must run after OrganizationAccessGuard (order in @UseGuards matters: guards
 * run left to right), which resolves/validates :organizationId against the
 * caller's membership first -- this guard only adds the plan check on top of
 * that, and trusts :organizationId is already a real, member-accessible org.
 */
@Injectable()
export class AgencyEntitlementGuard implements CanActivate {
  constructor(private entitlementsService: EntitlementsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId: string | undefined = request.params?.organizationId;
    if (!organizationId) {
      // A route using this guard must be organization-scoped -- wiring
      // mistake, not a user-facing case, so fail loudly rather than silently
      // allowing through.
      throw new Error('AgencyEntitlementGuard: route has no :organizationId param to check entitlements against.');
    }

    const entitlements = await this.entitlementsService.getEntitlementsForOrganization(organizationId);
    if (!entitlements.clientManagement) {
      throw new ForbiddenException({
        message: 'Client management is part of the Agency plan. Upgrade to manage multiple clients from one workspace.',
        code: 'ENTITLEMENT_LIMIT_REACHED',
      });
    }

    return true;
  }
}
