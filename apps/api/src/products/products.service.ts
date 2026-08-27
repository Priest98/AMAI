import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertProductDto {
  name: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  features?: string[];
  benefits?: string[];
  usp?: string | null;
  targetCustomer?: string | null;
  offers?: string[];
  availability?: string | null;
  purchaseUrl?: string | null;
  faqs?: { question: string; answer: string }[];
  objections?: string[];
}

/**
 * Standard brand-scoped CRUD for Products/Services -- the "one structural
 * gap" the $1M ARR blueprint's audit flagged. See the Product model's
 * schema comment for why this exists and how it feeds generation
 * (BusinessBrainService.buildPromptContext reads active products directly).
 */
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(brandId: string, includeInactive = false) {
    return this.prisma.product.findMany({
      where: { brandId, ...(includeInactive ? {} : { active: true }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(brandId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, brandId } });
    if (!product) throw new NotFoundException('Product not found for this brand.');
    return product;
  }

  async create(brandId: string, dto: UpsertProductDto) {
    return this.prisma.product.create({
      data: {
        brandId,
        name: dto.name,
        description: dto.description ?? null,
        price: dto.price ?? null,
        currency: dto.currency ?? null,
        features: dto.features ?? [],
        benefits: dto.benefits ?? [],
        usp: dto.usp ?? null,
        targetCustomer: dto.targetCustomer ?? null,
        offers: dto.offers ?? [],
        availability: dto.availability ?? null,
        purchaseUrl: dto.purchaseUrl ?? null,
        faqs: dto.faqs ?? undefined,
        objections: dto.objections ?? [],
      },
    });
  }

  /** Scoped by (id AND brandId) -- same defense-in-depth as MemoryEntry.dismiss: a valid brandId from BrandAccessGuard must not be pairable with another brand's product id. */
  async update(brandId: string, id: string, dto: Partial<UpsertProductDto>) {
    const result = await this.prisma.product.updateMany({
      where: { id, brandId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.features !== undefined ? { features: dto.features } : {}),
        ...(dto.benefits !== undefined ? { benefits: dto.benefits } : {}),
        ...(dto.usp !== undefined ? { usp: dto.usp } : {}),
        ...(dto.targetCustomer !== undefined ? { targetCustomer: dto.targetCustomer } : {}),
        ...(dto.offers !== undefined ? { offers: dto.offers } : {}),
        ...(dto.availability !== undefined ? { availability: dto.availability } : {}),
        ...(dto.purchaseUrl !== undefined ? { purchaseUrl: dto.purchaseUrl } : {}),
        ...(dto.faqs !== undefined ? { faqs: dto.faqs as any } : {}),
        ...(dto.objections !== undefined ? { objections: dto.objections } : {}),
      },
    });
    if (result.count === 0) throw new NotFoundException('Product not found for this brand.');
    return this.getOne(brandId, id);
  }

  /** Soft delete (active: false) -- retired products stop being offered to new generations without erasing the record (see Product model's schema comment). */
  async remove(brandId: string, id: string) {
    const result = await this.prisma.product.updateMany({ where: { id, brandId }, data: { active: false } });
    if (result.count === 0) throw new NotFoundException('Product not found for this brand.');
    return { success: true };
  }
}
