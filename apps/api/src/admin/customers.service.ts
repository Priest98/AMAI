import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanTier, SubscriptionStatus, PostStatus, ConnectionStatus } from '@prisma/client';

/**
 * Backs the Admin dashboard's Customers list + detail pages -- every
 * organization on the platform (the billing unit, per Subscription's doc
 * comment), cross-org, same guard as the rest of AdminModule.
 */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { page: number; limit: number; plan?: PlanTier; status?: SubscriptionStatus; search?: string }) {
    const { page, limit, plan, status, search } = params;

    const where = {
      ...(search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { slug: { contains: search, mode: 'insensitive' as const } }] }
        : {}),
      ...(plan || status
        ? {
            subscription: {
              ...(plan ? { plan } : {}),
              ...(status ? { status } : {}),
            },
          }
        : {}),
    };

    const [total, organizations] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
          createdAt: true,
          subscription: { select: { plan: true, status: true, currency: true, currentPeriodEnd: true } },
          _count: { select: { brands: true, members: true } },
        },
      }),
    ]);

    // Organization.ownerId is a plain column, not a Prisma relation (see
    // schema.prisma) -- batch-resolve owner emails in one query rather than
    // N+1ing a findUnique per row.
    const ownerIds = [...new Set(organizations.map((o) => o.ownerId))];
    const owners = ownerIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, email: true, fullName: true } })
      : [];
    const ownerById = new Map(owners.map((o) => [o.id, o]));

    return {
      total,
      page,
      limit,
      customers: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt,
        owner: ownerById.get(org.ownerId) ?? null,
        brandCount: org._count.brands,
        memberCount: org._count.members,
        plan: org.subscription?.plan ?? PlanTier.FREE,
        subscriptionStatus: org.subscription?.status ?? null,
        currency: org.subscription?.currency ?? null,
        currentPeriodEnd: org.subscription?.currentPeriodEnd ?? null,
      })),
    };
  }

  async getOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        subscription: true,
        brands: { select: { id: true, name: true, industry: true, timezone: true, createdAt: true } },
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            createdAt: true,
            user: { select: { id: true, email: true, fullName: true, lastLogin: true } },
          },
        },
      },
    });
    if (!org) throw new NotFoundException('Customer not found.');

    const owner = await this.prisma.user.findUnique({
      where: { id: org.ownerId },
      select: { id: true, email: true, fullName: true, lastLogin: true, createdAt: true },
    });

    const brandIds = org.brands.map((b) => b.id);

    const [failedPosts, publishedLast7d, expiredConnections, lastPost] = brandIds.length
      ? await Promise.all([
          this.prisma.post.count({ where: { brandId: { in: brandIds }, status: PostStatus.FAILED } }),
          this.prisma.post.count({
            where: {
              brandId: { in: brandIds },
              status: PostStatus.PUBLISHED,
              publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          }),
          this.prisma.socialAccount.count({ where: { brandId: { in: brandIds }, status: ConnectionStatus.EXPIRED } }),
          this.prisma.post.findFirst({
            where: { brandId: { in: brandIds } },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true },
          }),
        ])
      : [0, 0, 0, null];

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      owner,
      subscription: org.subscription,
      brands: org.brands,
      members: org.members,
      activity: {
        failedPostsAllTime: failedPosts,
        publishedLast7d,
        expiredConnections,
        lastActivityAt: lastPost?.updatedAt ?? null,
      },
    };
  }
}
