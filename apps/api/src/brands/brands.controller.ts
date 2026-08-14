import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
}
