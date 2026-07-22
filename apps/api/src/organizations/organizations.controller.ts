import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from '@marketing-os/shared-types';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async createOrganization(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    if (!userId) throw new UnauthorizedException('Missing x-user-id header');
    return this.organizationsService.createOrganization(userId, dto);
  }

  @Get()
  async getUserOrganizations(@Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException('Missing x-user-id header');
    return this.organizationsService.getUserOrganizations(userId);
  }
}
