import { Controller, Post, Get, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { BrandsService } from './brands.service';

@Controller('organizations/:orgId/brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  async createBrand(
    @Headers('x-user-id') userId: string,
    @Param('orgId') orgId: string,
    @Body() dto: { name: string; industry?: string; timezone?: string }
  ) {
    if (!userId) throw new UnauthorizedException('Missing x-user-id header');
    return this.brandsService.createBrand(userId, orgId, dto);
  }

  @Get()
  async getBrands(
    @Headers('x-user-id') userId: string,
    @Param('orgId') orgId: string
  ) {
    if (!userId) throw new UnauthorizedException('Missing x-user-id header');
    return this.brandsService.getBrands(userId, orgId);
  }
}
