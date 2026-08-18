import { Controller, Get, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { CustomersService } from './customers.service';
import { PlanTier, SubscriptionStatus } from '@prisma/client';
import { parsePage, parseLimit } from './pagination.util';

@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('plan') plan?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    if (plan && !Object.values(PlanTier).includes(plan as PlanTier)) {
      throw new BadRequestException(`Invalid plan. Expected one of: ${Object.values(PlanTier).join(', ')}`);
    }
    if (status && !Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)) {
      throw new BadRequestException(`Invalid status. Expected one of: ${Object.values(SubscriptionStatus).join(', ')}`);
    }

    return this.customersService.list({
      page: parsePage(page),
      limit: parseLimit(limit),
      plan: plan as PlanTier | undefined,
      status: status as SubscriptionStatus | undefined,
      search,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.customersService.getOne(id);
  }
}
