import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { ProductsService } from './products.service';
import type { UpsertProductDto } from './products.service';

@UseGuards(JwtAuthGuard, BrandAccessGuard)
@Controller('brands/:brandId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async list(@Param('brandId') brandId: string) {
    return this.productsService.list(brandId);
  }

  @Get(':id')
  async getOne(@Param('brandId') brandId: string, @Param('id') id: string) {
    return this.productsService.getOne(brandId, id);
  }

  @Post()
  async create(@Param('brandId') brandId: string, @Body() dto: UpsertProductDto) {
    return this.productsService.create(brandId, dto);
  }

  @Patch(':id')
  async update(@Param('brandId') brandId: string, @Param('id') id: string, @Body() dto: Partial<UpsertProductDto>) {
    return this.productsService.update(brandId, id, dto);
  }

  @Delete(':id')
  async remove(@Param('brandId') brandId: string, @Param('id') id: string) {
    return this.productsService.remove(brandId, id);
  }
}
