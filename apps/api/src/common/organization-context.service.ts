import { Injectable } from '@nestjs/common';
import type { Brand, Subscription, PlanTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { getPlanEntitlements, type PlanEntitlements } from '../billing/plans.config';

export interface OrganizationContext {
  brand: Pick<Brand, 'id' | 'organizationId'>;
  organizationId: string;
  subscription: Subscription;
  effectivePlan: PlanTier;
  entitlements: PlanEntitlements;
}

@Injectable()
export class OrganizationContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async resolve(brandId: string, knownOrganizationId?: string): Promise<OrganizationContext> {
    const brand = knownOrganizationId
      ? { id: brandId, organizationId: knownOrganizationId }
      : await this.prisma.brand.findUniqueOrThrow({
          where: { id: brandId },
          select: { id: true, organizationId: true },
        });
    const subscription = await this.entitlementsService.getSubscription(brand.organizationId);
    const effectivePlan = this.entitlementsService.effectivePlan(subscription);
    return {
      brand,
      organizationId: brand.organizationId,
      subscription,
      effectivePlan,
      entitlements: getPlanEntitlements(effectivePlan),
    };
  }
}
