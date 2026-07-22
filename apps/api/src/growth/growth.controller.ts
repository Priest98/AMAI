import { Controller, Get, Post, Param, Logger, UseGuards } from '@nestjs/common';
import { GrowthService } from './growth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('growth')
export class GrowthController {
  private readonly logger = new Logger(GrowthController.name);

  constructor(private readonly growthService: GrowthService) {}

  @Get(':brandId/pending-replies')
  async getPendingReplies(@Param('brandId') brandId: string) {
    this.logger.log(`Fetching pending replies for brand ${brandId}`);
    return this.growthService.getPendingReplies(brandId);
  }

  @Post('replies/:id/approve')
  async approveReply(@Param('id') id: string) {
    this.logger.log(`Approving reply ${id}`);
    return this.growthService.approveReply(id);
  }

  @Post('replies/:id/reject')
  async rejectReply(@Param('id') id: string) {
    this.logger.log(`Rejecting reply ${id}`);
    return this.growthService.rejectReply(id);
  }
}
