import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { OrganizationAccessGuard } from './organization-access.guard';
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
   */
  @UseGuards(OrganizationAccessGuard)
  @Get('organizations/:organizationId/portfolio')
  async getPortfolio(@Param('organizationId') organizationId: string) {
    return this.brandsService.getPortfolio(organizationId);
  }

  /**
   * Cross-client aggregations. All three derive their brand scope from the
   * organization inside the service, so a client id can never be smuggled
   * in from the request to widen the query beyond this organization.
   */
  @UseGuards(OrganizationAccessGuard)
  @Get('organizations/:organizationId/approval-queue')
  async getAgencyApprovalQueue(@Param('organizationId') organizationId: string) {
    return this.brandsService.getAgencyApprovalQueue(organizationId);
  }

  @UseGuards(OrganizationAccessGuard)
  @Get('organizations/:organizationId/calendar')
  async getAgencyCalendar(
    @Param('organizationId') organizationId: string,
    @Query('days') days?: string,
  ) {
    return this.brandsService.getAgencyCalendar(organizationId, days ? Number(days) : undefined);
  }

  @UseGuards(OrganizationAccessGuard)
  @Get('organizations/:organizationId/analytics')
  async getAgencyAnalytics(
    @Param('organizationId') organizationId: string,
    @Query('days') days?: string,
  ) {
    return this.brandsService.getAgencyAnalytics(organizationId, days ? Number(days) : undefined);
  }
}
