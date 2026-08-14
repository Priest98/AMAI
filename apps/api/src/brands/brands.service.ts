import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';

/**
 * Minimal multi-brand support for Agency. The Organization->Brand
 * relationship already existed for every plan (every signup creates one
 * Organization + one Brand) -- this just exposes a way to add more Brands
 * to an Organization, gated by the 'create_brand' entitlement so Free/Pro
 * orgs stay capped at one. A full client-workspace switcher UI is a
 * follow-up; see the Step 2 report for what's scaffolded vs. what remains.
 */
@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    private prisma: PrismaService,
    private entitlementsService: EntitlementsService,
  ) {}

  async listForOrganization(organizationId: string) {
    return this.prisma.brand.findMany({ where: { organizationId }, orderBy: { createdAt: 'asc' } });
  }

  async createForOrganization(organizationId: string, name: string) {
    const result = await this.entitlementsService.canCreateBrand(organizationId);
    if (!result.allowed) throw new BadRequestException(result.reason);

    return this.prisma.brand.create({ data: { organizationId, name } });
  }
}
