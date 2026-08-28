import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanTier, SubscriptionStatus, UsageMetric } from '@prisma/client';
import { UsageService } from './usage.service';
import { getPlanEntitlements, PLAN_CONFIG } from './plans.config';
import type { PlanEntitlements } from './plans.config';

export type BillableAction =
  | 'create_post'
  | 'generate_ai_content'
  | 'connect_social_account'
  | 'create_brand'
  | 'add_team_member';

export interface ActionCheckResult {
  allowed: boolean;
  reason?: string;
  /** Present when the check failed specifically because a numeric limit was hit -- lets the frontend render "X / Y used". */
  usage?: { used: number; limit: number };
}

/**
 * The single place every other part of the app asks "can this org do X" or
 * "what does this org have access to" -- nothing outside this file (and
 * plans.config.ts) should compare a plan string directly. A PAST_DUE or
 * EXPIRED subscription is treated as FREE for entitlement purposes (grace
 * handling: a genuinely still-ACTIVE-until-period-end cancellation keeps
 * its paid plan, but a lapsed/failed one does not silently keep paid
 * access -- see #7 in the spec).
 */
@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(
    private prisma: PrismaService,
    private usageService: UsageService,
  ) {}

  async getOrganizationIdForBrand(brandId: string): Promise<string> {
    const brand = await this.prisma.brand.findUniqueOrThrow({ where: { id: brandId }, select: { organizationId: true } });
    return brand.organizationId;
  }

  /** Lazily backfills a FREE subscription for organizations created before billing existed -- mirrors BusinessBrainService's getOrCreate pattern. */
  async getSubscription(organizationId: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { organizationId } });
    if (existing) return existing;

    this.logger.log(`Backfilling FREE subscription for organization ${organizationId} (created before billing existed)`);
    return this.prisma.subscription.create({ data: { organizationId, plan: PlanTier.FREE, status: SubscriptionStatus.ACTIVE } });
  }

  /** The plan actually in effect right now -- a lapsed paid subscription (PAST_DUE past its grace window, CANCELLED, EXPIRED) falls back to FREE rather than silently keeping paid access. */
  effectivePlan(subscription: { plan: PlanTier; status: SubscriptionStatus }): PlanTier {
    if (subscription.status === SubscriptionStatus.EXPIRED || subscription.status === SubscriptionStatus.CANCELLED) {
      return PlanTier.FREE;
    }
    // PAST_DUE and TRIALING keep their plan's entitlements -- PAST_DUE gets
    // a grace period (billing UI surfaces the payment-failure banner
    // instead of yanking access instantly), TRIALING is meant to behave
    // like the paid plan by definition.
    return subscription.plan;
  }

  async getPlanForOrganization(organizationId: string): Promise<PlanTier> {
    const sub = await this.getSubscription(organizationId);
    return this.effectivePlan(sub);
  }

  async getEntitlementsForOrganization(organizationId: string): Promise<PlanEntitlements> {
    const plan = await this.getPlanForOrganization(organizationId);
    return getPlanEntitlements(plan);
  }

  async getEntitlementsForBrand(brandId: string): Promise<PlanEntitlements> {
    const organizationId = await this.getOrganizationIdForBrand(brandId);
    return this.getEntitlementsForOrganization(organizationId);
  }

  hasEntitlement<K extends keyof PlanEntitlements>(entitlements: PlanEntitlements, key: K, expected?: PlanEntitlements[K]): boolean {
    const value = entitlements[key];
    if (typeof value === 'boolean') return value;
    if (expected !== undefined) return value === expected;
    return Boolean(value);
  }

  async checkUsage(organizationId: string, metric: UsageMetric): Promise<{ used: number; limit: number; remaining: number; percentUsed: number }> {
    const entitlements = await this.getEntitlementsForOrganization(organizationId);
    const limit = metric === UsageMetric.AI_GENERATION ? entitlements.maxMonthlyAiGenerations : entitlements.maxMonthlyPosts;
    const used = await this.usageService.getUsage(organizationId, metric);
    const remaining = limit === -1 ? Infinity : Math.max(0, limit - used);
    const percentUsed = limit === -1 ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
    return { used, limit, remaining, percentUsed };
  }

  async checkStorageUsage(organizationId: string): Promise<{ used: number; limit: number; percentUsed: number }> {
    const entitlements = await this.getEntitlementsForOrganization(organizationId);
    const brands = await this.prisma.brand.findMany({ where: { organizationId }, select: { id: true } });
    const brandIds = brands.map((b) => b.id);
    const agg = await this.prisma.mediaAsset.aggregate({
      where: { brandId: { in: brandIds } },
      _sum: { sizeBytes: true },
    });
    const used = agg._sum.sizeBytes ?? 0;
    const limit = entitlements.maxStorageBytes;
    const percentUsed = limit === -1 ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
    return { used, limit, percentUsed };
  }

  /** Same as the 'create_brand' case of canPerformAction, but callable directly with an organizationId -- brand creation has no existing :brandId to derive one from. */
  async canCreateBrand(organizationId: string): Promise<ActionCheckResult> {
    const entitlements = await this.getEntitlementsForOrganization(organizationId);
    const count = await this.prisma.brand.count({ where: { organizationId } });
    const limit = entitlements.maxBrands;
    if (limit !== -1 && count >= limit) {
      return { allowed: false, reason: `Your ${entitlements.displayName} plan allows up to ${limit} brand${limit === 1 ? '' : 's'}/client workspace${limit === 1 ? '' : 's'}.`, usage: { used: count, limit } };
    }
    return { allowed: true };
  }

  /**
   * The one function guards and controllers should call before letting an
   * action through. Resolves plan + live counts + this-period usage in one
   * place so the same rule can never drift between two call sites.
   */
  async canPerformAction(brandId: string, action: BillableAction): Promise<ActionCheckResult> {
    const organizationId = await this.getOrganizationIdForBrand(brandId);
    const entitlements = await this.getEntitlementsForOrganization(organizationId);

    switch (action) {
      case 'generate_ai_content': {
        const usage = await this.checkUsage(organizationId, UsageMetric.AI_GENERATION);
        if (usage.remaining <= 0) {
          return { allowed: false, reason: `You've reached your ${entitlements.displayName} plan's monthly AI generation limit.`, usage: { used: usage.used, limit: usage.limit } };
        }
        return { allowed: true };
      }

      case 'create_post': {
        const usage = await this.checkUsage(organizationId, UsageMetric.POST_PUBLISHED);
        if (usage.remaining <= 0) {
          return { allowed: false, reason: `You've reached your ${entitlements.displayName} plan's monthly post limit.`, usage: { used: usage.used, limit: usage.limit } };
        }
        return { allowed: true };
      }

      case 'connect_social_account': {
        const count = await this.prisma.socialAccount.count({ where: { brandId } });
        const limit = entitlements.maxSocialAccountsPerBrand;
        if (limit !== -1 && count >= limit) {
          return { allowed: false, reason: `Your ${entitlements.displayName} plan allows up to ${limit} connected account${limit === 1 ? '' : 's'} per brand.`, usage: { used: count, limit } };
        }
        return { allowed: true };
      }

      case 'create_brand':
        return this.canCreateBrand(organizationId);

      case 'add_team_member': {
        const count = await this.prisma.organizationMember.count({ where: { organizationId } });
        const limit = entitlements.maxTeamMembers;
        if (limit !== -1 && count >= limit) {
          return { allowed: false, reason: `Your ${entitlements.displayName} plan allows up to ${limit} team member${limit === 1 ? '' : 's'}.`, usage: { used: count, limit } };
        }
        return { allowed: true };
      }

      default:
        return { allowed: true };
    }
  }

  /**
   * Legacy convenience wrapper -- still used nowhere as of this fix, kept
   * only in case a future call site genuinely wants "record after success"
   * semantics without needing the release path below. Prefer
   * reserveAiGeneration()/releaseAiGeneration() for anything gating real AI
   * spend; this plain increment has no under-limit check and is not
   * concurrency-safe against reserveAiGeneration() on its own (each is
   * atomic individually, but this one never checks the limit at all).
   */
  async recordAiGeneration(organizationId: string): Promise<void> {
    const sub = await this.getSubscription(organizationId);
    await this.usageService.increment(organizationId, UsageMetric.AI_GENERATION, sub.id);
  }

  /**
   * Atomic replacement for the old "canPerformAction('generate_ai_content')
   * (read) now, recordAiGeneration() (write) later, after the AI call
   * succeeds" two-step -- the exact same race class reservePostSlot()
   * already closed for posts: two concurrent AI-triggering requests for the
   * same org could both read "under limit" before either write landed,
   * letting the org exceed its monthly AI quota by however many requests
   * raced. Call this BEFORE the AI provider call it's guarding (reserves
   * the credit immediately, atomically, via
   * UsageService.incrementIfUnderLimit -- same Postgres
   * INSERT...ON CONFLICT...WHERE idiom used there), and call
   * releaseAiGeneration() with the returned organizationId if that AI call
   * then fails, so a failed attempt still doesn't permanently burn quota.
   *
   * Throws ForbiddenException with plan-specific copy when already at the
   * monthly limit -- callers should let it propagate, same convention as
   * reservePostSlot().
   */
  async reserveAiGeneration(brandId: string): Promise<string> {
    const organizationId = await this.getOrganizationIdForBrand(brandId);
    const [entitlements, sub] = await Promise.all([
      this.getEntitlementsForOrganization(organizationId),
      this.getSubscription(organizationId),
    ]);
    const result = await this.usageService.incrementIfUnderLimit(
      organizationId,
      UsageMetric.AI_GENERATION,
      entitlements.maxMonthlyAiGenerations,
      sub.id,
    );
    if (!result.allowed) {
      throw new ForbiddenException(`You've reached your ${entitlements.displayName} plan's monthly AI generation limit.`);
    }
    return organizationId;
  }

  /** Refunds a reservation made by reserveAiGeneration() -- call when the AI call it was guarding fails, so the org's quota reflects only generations that actually happened. */
  async releaseAiGeneration(organizationId: string): Promise<void> {
    await this.usageService.decrement(organizationId, UsageMetric.AI_GENERATION);
  }

  /**
   * The single chokepoint for "this brand is about to commit to publishing
   * one more post this month" -- reserves the monthly credit immediately
   * (not when the platform API call eventually succeeds), so a post counts
   * against the plan's limit the moment it's scheduled, however it got
   * there: AutoPilot auto-scheduling, Approval Queue approve/Publish Now,
   * or a scheduled-for-later approval. A single-image post and an N-image
   * carousel post both call this exactly once, because both are one Post
   * row -- this is what makes "19 singles + 1 five-image carousel = 20
   * posts" true: the carousel's extra media rows never touch this counter.
   *
   * Deliberately NOT called from retryPost() (already-counted post, retrying
   * doesn't burn a second credit) or editPost() (no status transition).
   *
   * Throws ForbiddenException with plan-specific, user-facing copy when the
   * org is already at its monthly limit -- callers should let this
   * exception propagate rather than swallow it, so the block is visible to
   * the client exactly the way every other entitlement failure already is.
   *
   * Race-condition fix: this used to check usage (read) and then increment
   * (write) as two separate steps -- two concurrent publish requests could
   * both read "under limit" before either one's write landed, letting an
   * org exceed its plan by however many requests raced. The check and the
   * increment now happen as a single atomic DB statement (see
   * UsageService.incrementIfUnderLimit), so this can no longer be beaten by
   * concurrency no matter how many requests arrive at once.
   */
  async reservePostSlot(brandId: string): Promise<void> {
    const organizationId = await this.getOrganizationIdForBrand(brandId);
    const [entitlements, sub] = await Promise.all([
      this.getEntitlementsForOrganization(organizationId),
      this.getSubscription(organizationId),
    ]);
    const result = await this.usageService.incrementIfUnderLimit(
      organizationId,
      UsageMetric.POST_PUBLISHED,
      entitlements.maxMonthlyPosts,
      sub.id,
    );
    if (!result.allowed) {
      const plan = await this.getPlanForOrganization(organizationId);
      const limit = entitlements.maxMonthlyPosts;
      const message =
        plan === PlanTier.FREE
          ? `You've reached your ${limit}-post monthly limit. Upgrade to Pro for up to ${PLAN_CONFIG[PlanTier.PRO].maxMonthlyPosts} posts per month.`
          : `You've reached your ${limit}-post monthly limit. Your allowance resets at the start of your next billing period.`;
      throw new ForbiddenException(message);
    }
  }
}
