import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { OrganizationAccessGuard } from './organization-access.guard';
import { AgencyEntitlementGuard } from './agency-entitlement.guard';
import { CreatorEntitlementGuard } from './creator-entitlement.guard';
import { BrandsService } from './brands.service';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class BrandsController {
  constructor(
    private readonly brandsService: BrandsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Lets the frontend discover which Organization the current session's brand belongs to, since the JWT only carries brandId. */
  @UseGuards(BrandAccessGuard)
  @Get('brands/:brandId/organization')
  async getOrganizationForBrand(@Param('brandId') brandId: string) {
    const brand = await this.prisma.brand.findUniqueOrThrow({ where: { id: brandId }, select: { organizationId: true } });
    return { organizationId: brand.organizationId };
  }

  @UseGuards(OrganizationAccessGuard)
  @Get('organizations/:organizationId/brands')
  async listBrands(@Param('organizationId') organizationId: string) {
    return this.brandsService.listForOrganization(organizationId);
  }

  @UseGuards(OrganizationAccessGuard)
  @Post('organizations/:organizationId/brands')
  async createBrand(@Param('organizationId') organizationId: string, @Body('name') name: string) {
    return this.brandsService.createForOrganization(organizationId, name);
  }

  /**
   * Agency portfolio: every client in the organization with the counts an
   * agency owner needs to triage ("who needs attention, what publishes
   * today, which connections are broken").
   *
   * OrganizationAccessGuard already proves membership, so this can never
   * read another organization's clients regardless of what id is supplied.
   * Aggregation happens server-side rather than by fetching everything and
   * filtering in the browser.
   *
   * AgencyEntitlementGuard additionally requires the organization's plan to
   * have the `clientManagement` entitlement (AGENCY only) -- this is the
   * feature the Agency plan is sold on, so Free/Pro orgs must not be able to
   * reach it just because OrganizationAccessGuard proves they're a member of
   * their own org.
   */
  @UseGuards(OrganizationAccessGuard, AgencyEntitlementGuard)
  @Get('organizations/:organizationId/portfolio')
  async getPortfolio(@Param('organizationId') organizationId: string) {
    return this.brandsService.getPortfolio(organizationId);
  }

  /**
   * Cross-client aggregations. All three derive their brand scope from the
   * organization inside the service, so a client id can never be smuggled
   * in from the request to widen the query beyond this organization. Agency
   * plan only -- see AgencyEntitlementGuard.
   */
  @UseGuards(OrganizationAccessGuard, AgencyEntitlementGuard)
  @Get('organizations/:organizationId/approval-queue')
  async getAgencyApprovalQueue(@Param('organizationId') organizationId: string) {
    return this.brandsService.getAgencyApprovalQueue(organizationId);
  }

  @UseGuards(OrganizationAccessGuard, AgencyEntitlementGuard)
  @Get('organizations/:organizationId/calendar')
  async getAgencyCalendar(
    @Param('organizationId') organizationId: string,
    @Query('days') days?: string,
  ) {
    return this.brandsService.getAgencyCalendar(organizationId, days ? Number(days) : undefined);
  }

  @UseGuards(OrganizationAccessGuard, AgencyEntitlementGuard)
  @Get('organizations/:organizationId/analytics')
  async getAgencyAnalytics(
    @Param('organizationId') organizationId: string,
    @Query('days') days?: string,
  ) {
    return this.brandsService.getAgencyAnalytics(organizationId, days ? Number(days) : undefined);
  }

  /**
   * Creator Command Center overview: the two-managed-account view for
   * PlanTier.CREATOR only -- see CreatorEntitlementGuard for why this is a
   * separate guard from AgencyEntitlementGuard rather than a broadened
   * version of it.
   */
  @UseGuards(OrganizationAccessGuard, CreatorEntitlementGuard)
  @Get('organizations/:organizationId/creator-overview')
  async getCreatorOverview(
    @Param('organizationId') organizationId: string,
    @Query('days') days?: string,
  ) {
    return this.brandsService.getCreatorOverview(organizationId, days ? Number(days) : undefined);
  }

  /**
   * Internal cost-visibility endpoint -- "what does this customer cost
   * Oyinca". Not linked from anywhere in the customer-facing UI; guarded the
   * same as every other organization-scoped resource (OrganizationAccessGuard
   * proves membership), which is enough to keep it invisible to anyone
   * outside this organization. There is no cross-organization admin view
   * yet -- see the Admin Dashboard work for that.
   */
  @UseGuards(OrganizationAccessGuard)
  @Get('organizations/:organizationId/cost-summary')
  async getCostSummary(
    @Param('organizationId') organizationId: string,
    @Query('days') days?: string,
  ) {
    return this.brandsService.getCostSummary(organizationId, days ? Number(days) : undefined);
  }

  /**
   * P1 agency team/roles foundation -- read-only for now, see
   * BrandsService.listMembers's doc comment for why invite/edit isn't
   * included yet.
   */
  @UseGuards(OrganizationAccessGuard)
  @Get('organizations/:organizationId/members')
  async listMembers(@Param('organizationId') organizationId: string) {
    return this.brandsService.listMembers(organizationId);
  }
}
