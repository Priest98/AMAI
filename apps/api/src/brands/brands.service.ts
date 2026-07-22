import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async createBrand(userId: string, organizationId: string, data: { name: string; industry?: string; timezone?: string }) {
    // Validate user belongs to org
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId }
      }
    });

    if (!membership) {
      throw new UnauthorizedException('You do not have access to this organization');
    }

    return this.prisma.brand.create({
      data: {
        ...data,
        organizationId,
      }
    });
  }

  async getBrands(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId }
      }
    });

    if (!membership) {
      throw new UnauthorizedException('You do not have access to this organization');
    }

    return this.prisma.brand.findMany({
      where: { organizationId }
    });
  }
}
