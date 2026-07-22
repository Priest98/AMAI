import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from '@marketing-os/shared-types';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existingOrg) {
      throw new ConflictException('Organization slug already exists');
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: 'OWNER',
          },
        },
      },
    });

    return organization;
  }

  async getUserOrganizations(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    });
  }
}
