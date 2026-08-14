import { Controller, Get, Post, Param, Logger, UseGuards } from '@nestjs/common';
import { GrowthService } from './growth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';

// Fixed during the V2 full-system audit: this controller used to live at
// bare 'growth/...' with only JwtAuthGuard (any logged-in user, not
// necessarily this brand's) and, worse, 'replies/:id/approve|reject' had
// no brand param at all -- any authenticated user could approve/reject
// ANY organization's pending auto-reply by id alone. Now brand-scoped like
// every other resource controller (posts, media, engine, business-brain):
// BrandAccessGuard verifies the JWT's brandId matches the route, and
// GrowthService additionally filters approve/reject by (id AND brandId)
// so a valid brandId can't be combined with someone else's reply id either.
@UseGuards(JwtAuthGuard, BrandAccessGuard)
@Controller('brands/:brandId/growth')
export class GrowthController {
  private readonly logger = new Logger(GrowthController.name);

  constructor(private readonly growthService: GrowthService) {}

  @Get('pending-replies')
  async getPendingReplies(@Param('brandId') brandId: string) {
    this.logger.log(`Fetching pending replies for brand ${brandId}`);
    return this.growthService.getPendingReplies(brandId);
  }

  @Post('replies/:id/approve')
  async approveReply(@Param('brandId') brandId: string, @Param('id') id: string) {
    this.logger.log(`Approving reply ${id} for brand ${brandId}`);
    return this.growthService.approveReply(brandId, id);
  }

  @Post('replies/:id/reject')
  async rejectReply(@Param('brandId') brandId: string, @Param('id') id: string) {
    this.logger.log(`Rejecting reply ${id} for brand ${brandId}`);
    return this.growthService.rejectReply(brandId, id);
  }
}
