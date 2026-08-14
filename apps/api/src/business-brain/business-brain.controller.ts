import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { BusinessBrainService } from './business-brain.service';
import type { UpdateBusinessBrainDto } from './business-brain.service';

@UseGuards(JwtAuthGuard, BrandAccessGuard)
@Controller('brands/:brandId/business-brain')
export class BusinessBrainController {
  constructor(private readonly businessBrainService: BusinessBrainService) {}

  @Get()
  async get(@Param('brandId') brandId: string) {
    return this.businessBrainService.getOrCreate(brandId);
  }

  @Patch()
  async update(@Param('brandId') brandId: string, @Body() dto: UpdateBusinessBrainDto) {
    return this.businessBrainService.update(brandId, dto);
  }

  @Get('memory')
  async listMemory(@Param('brandId') brandId: string) {
    return this.businessBrainService.listMemoryEntries(brandId);
  }

  @Post('memory/:id/dismiss')
  async dismissMemory(@Param('brandId') brandId: string, @Param('id') id: string) {
    return this.businessBrainService.dismissMemoryEntry(brandId, id);
  }

  // Exposed mainly for manual QA locally — lets us confirm the prompt
  // context AMAI would actually inject without digging through logs.
  @Get('prompt-context')
  async promptContext(@Param('brandId') brandId: string) {
    const context = await this.businessBrainService.buildPromptContext(brandId);
    return { context };
  }
}
