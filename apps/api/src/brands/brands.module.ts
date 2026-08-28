import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { OrganizationAccessGuard } from './organization-access.guard';
import { AgencyEntitlementGuard } from './agency-entitlement.guard';
import { CreatorEntitlementGuard } from './creator-entitlement.guard';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [BrandsController],
  providers: [BrandsService, OrganizationAccessGuard, AgencyEntitlementGuard, CreatorEntitlementGuard],
  exports: [BrandsService],
})
export class BrandsModule {}
