import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../common/telegram.service';
import { EarlyAccessSignupDto } from './dto/early-access-signup.dto';
import { CreatorApplicationDto } from './dto/creator-application.dto';
import { AttributionEventDto } from './dto/attribution-event.dto';
import * as crypto from 'crypto';

@Injectable()
export class MarketingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  /**
   * Helper to generate a clean, readable unique referral code (e.g., OYC-7X9K2A)
   */
  private generateReferralCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'OYC-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Evaluates milestone rewards based on verified referral count
   */
  private evaluateRewardTier(referralCount: number): string {
    if (referralCount >= 25) return 'PRO_3_MONTHS';
    if (referralCount >= 10) return 'FOUNDING_BADGE';
    if (referralCount >= 3) return 'PRIORITY_ACCESS';
    return 'NONE';
  }

  /**
   * Calculates the internal qualification score out of 100 for Founding TikTok Creator applicants
   */
  private calculateCreatorScore(dto: CreatorApplicationDto): { score: number; breakdown: Record<string, number> } {
    let audienceScore = 10;
    const range = (dto.followerRange || '').toUpperCase();
    if (range.includes('500K') || range.includes('100K')) audienceScore = 20;
    else if (range.includes('50K') || range.includes('10K')) audienceScore = 18;
    else if (range.includes('5K')) audienceScore = 15;
    else if (range.includes('1K')) audienceScore = 12;

    let engagementScore = 12;
    if (dto.averageViews && (dto.averageViews.includes('10K') || dto.averageViews.includes('50K') || dto.averageViews.includes('100K'))) {
      engagementScore = 20;
    } else if (dto.averageViews && dto.averageViews.includes('1K')) {
      engagementScore = 16;
    }

    let consistencyScore = 10;
    const freq = (dto.postingFrequency || '').toLowerCase();
    if (freq.includes('daily') || freq.includes('multiple') || freq.includes('day')) consistencyScore = 15;
    else if (freq.includes('week') || freq.includes('3-4')) consistencyScore = 12;

    let nicheScore = 10;
    const niche = (dto.niche || '').toLowerCase();
    const highPriorityNiches = ['business', 'entrepreneurship', 'marketing', 'tech', 'fashion', 'beauty', 'education', 'creator', 'fitness'];
    if (highPriorityNiches.some((n) => niche.includes(n))) nicheScore = 15;

    let willingnessScore = 5;
    if (dto.willingToTest7Days === 'YES' && dto.willingAutopilotChallenge === 'YES') willingnessScore = 15;
    else if (dto.willingToTest7Days === 'YES' || dto.willingAutopilotChallenge === 'YES') willingnessScore = 10;

    let communicationScore = 5;
    if (dto.whyJoin?.length > 30 && (dto.biggestProblem?.length || 0) > 20) communicationScore = 10;

    let growthScore = 3;
    if (dto.accountsManagedCount > 1 || dto.videosPerWeek >= 5) growthScore = 5;

    const totalScore = audienceScore + engagementScore + consistencyScore + nicheScore + willingnessScore + communicationScore + growthScore;

    return {
      score: Math.min(100, Math.max(0, totalScore)),
      breakdown: {
        audienceQuality: audienceScore,
        engagement: engagementScore,
        contentConsistency: consistencyScore,
        nicheRelevance: nicheScore,
        willingnessToTest: willingnessScore,
        communication: communicationScore,
        growthPotential: growthScore,
      },
    };
  }

  // ==========================================
  // EARLY ACCESS WAITLIST METHODS
  // ==========================================

  async registerEarlyAccess(dto: EarlyAccessSignupDto) {
    const existing = await this.prisma.earlyAccessSignup.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      const totalCount = await this.prisma.earlyAccessSignup.count();
      return {
        isExisting: true,
        signup: existing,
        totalCount,
        message: "You're already registered on the Oyinca Early Access waitlist!",
      };
    }

    let referrerSignup = null;
    if (dto.referralCode) {
      referrerSignup = await this.prisma.earlyAccessSignup.findUnique({
        where: { referralCode: dto.referralCode.trim().toUpperCase() },
      });
    }

    let referralCode = this.generateReferralCode();
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const found = await this.prisma.earlyAccessSignup.findUnique({ where: { referralCode } });
      if (!found) isUnique = true;
      else {
        referralCode = this.generateReferralCode();
        attempts++;
      }
    }

    const currentCount = await this.prisma.earlyAccessSignup.count();
    const position = currentCount + 1;

    const signup = await this.prisma.earlyAccessSignup.create({
      data: {
        fullName: dto.fullName.trim(),
        email: dto.email.toLowerCase().trim(),
        tiktokUsername: dto.tiktokUsername.trim(),
        tiktokProfileUrl: dto.tiktokProfileUrl?.trim() || null,
        followerRange: dto.followerRange,
        niche: dto.niche,
        postingFrequency: dto.postingFrequency,
        country: dto.country,
        biggestProblem: dto.biggestProblem,
        automationWish: dto.automationWish,
        heardFrom: dto.heardFrom,
        preferredNextPlatform: dto.preferredNextPlatform || null,
        referralCode,
        referredById: referrerSignup ? referrerSignup.id : null,
        position,
        utmSource: dto.utmSource || null,
        utmMedium: dto.utmMedium || null,
        utmCampaign: dto.utmCampaign || null,
      },
    });

    if (referrerSignup) {
      const newRef = referrerSignup.referralCount + 1;
      const newTier = this.evaluateRewardTier(newRef);
      await this.prisma.earlyAccessSignup.update({
        where: { id: referrerSignup.id },
        data: {
          referralCount: newRef,
          rewardTier: newTier,
        },
      });
    }

    const updatedTotalCount = currentCount + 1;

    // Send Real-time Notification to Telegram
    const telegramMessage = [
      `🚀 <b>NEW OYINCA EARLY ACCESS SIGNUP</b>`,
      ``,
      `<b>Position:</b> #${position}`,
      `<b>Name:</b> ${dto.fullName.trim()}`,
      `<b>Email:</b> ${dto.email.toLowerCase().trim()}`,
      `<b>TikTok:</b> @${dto.tiktokUsername.trim()}`,
      `<b>Followers:</b> ${dto.followerRange}`,
      `<b>Niche:</b> ${dto.niche}`,
      `<b>Country:</b> ${dto.country}`,
      `<b>Source:</b> ${dto.heardFrom || 'Direct'}`,
      `<b>Referral Code:</b> ${referralCode}`,
    ].join('\n');
    this.telegram.send(telegramMessage).catch(() => {});

    return {
      isExisting: false,
      signup,
      totalCount: updatedTotalCount,
      message: "You're in! 🚀 Welcome to Oyinca Early Access.",
    };
  }

  async getEarlyAccessStatus(referralCode: string) {
    const signup = await this.prisma.earlyAccessSignup.findUnique({
      where: { referralCode: referralCode.trim().toUpperCase() },
      include: {
        referrals: {
          select: {
            id: true,
            fullName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!signup) {
      throw new NotFoundException('Referral code not found');
    }

    const totalCount = await this.prisma.earlyAccessSignup.count();

    return {
      position: signup.position,
      totalSignups: totalCount,
      referralCode: signup.referralCode,
      referralCount: signup.referralCount,
      rewardTier: signup.rewardTier,
      fullName: signup.fullName,
      createdAt: signup.createdAt,
    };
  }

  // ==========================================
  // FOUNDING TIKTOK CREATOR PROGRAM METHODS
  // ==========================================

  async applyFoundingCreator(dto: CreatorApplicationDto) {
    const existing = await this.prisma.foundingCreatorApplication.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      return {
        isExisting: true,
        application: existing,
        message: 'Your Founding TikTok Creator application has already been received!',
      };
    }

    const { score, breakdown } = this.calculateCreatorScore(dto);

    let initialStatus = 'CREATOR_REVIEW';
    if (score >= 75 && dto.willingToTest7Days === 'YES') {
      const acceptedCount = await this.prisma.foundingCreatorApplication.count({
        where: { status: 'ACCEPTED' },
      });
      if (acceptedCount < 25) {
        initialStatus = 'ACCEPTED';
      }
    } else if (score < 45) {
      initialStatus = 'EARLY_ACCESS';
    }

    const application = await this.prisma.foundingCreatorApplication.create({
      data: {
        fullName: dto.fullName.trim(),
        email: dto.email.toLowerCase().trim(),
        country: dto.country,
        preferredContact: dto.preferredContact,
        tiktokUsername: dto.tiktokUsername.trim(),
        tiktokProfileUrl: dto.tiktokProfileUrl.trim(),
        followerRange: dto.followerRange,
        averageViews: dto.averageViews || null,
        postingFrequency: dto.postingFrequency,
        niche: dto.niche,
        accountsManagedCount: dto.accountsManagedCount || 1,
        sampleVideoUrls: dto.sampleVideoUrls || [],
        currentWorkflow: dto.currentWorkflow || 'N/A',
        timeConsumingPart: dto.timeConsumingPart || 'N/A',
        videosPerWeek: dto.videosPerWeek || 5,
        usesExistingTools: dto.usesExistingTools || null,
        whyJoin: dto.whyJoin || 'N/A',
        biggestProblem: dto.biggestProblem || 'N/A',
        workflowToRemove: dto.workflowToRemove || 'N/A',
        willingToTest7Days: dto.willingToTest7Days,
        willingAutopilotChallenge: dto.willingAutopilotChallenge,
        internalScore: score,
        scoreBreakdown: breakdown,
        status: initialStatus,
      },
    });

    // Send Real-time Notification to Telegram
    const telegramMessage = [
      `🌟 <b>NEW FOUNDING TIKTOK CREATOR APPLICATION</b>`,
      ``,
      `<b>Name:</b> ${dto.fullName.trim()}`,
      `<b>Email:</b> ${dto.email.toLowerCase().trim()}`,
      `<b>TikTok:</b> @${dto.tiktokUsername.trim()} (${dto.followerRange})`,
      `<b>Score:</b> ${score}/100`,
      `<b>Status Outcome:</b> ${initialStatus}`,
      `<b>Country:</b> ${dto.country}`,
      `<b>Contact:</b> ${dto.preferredContact}`,
    ].join('\n');
    this.telegram.send(telegramMessage).catch(() => {});

    return {
      isExisting: false,
      application,
      message: 'Application submitted successfully! Our team will review your channel details.',
    };
  }

  // ==========================================
  // MARKETING ATTRIBUTION TRACKING
  // ==========================================

  async recordAttributionEvent(dto: AttributionEventDto) {
    return this.prisma.marketingAttributionEvent.create({
      data: {
        sessionId: dto.sessionId,
        eventType: dto.eventType,
        landingPage: dto.landingPage,
        referrerUrl: dto.referrerUrl || null,
        utmSource: dto.utmSource || null,
        utmMedium: dto.utmMedium || null,
        utmCampaign: dto.utmCampaign || null,
        signupId: dto.signupId || null,
        creatorAppId: dto.creatorAppId || null,
      },
    });
  }

  // ==========================================
  // ADMIN MARKETING METRICS
  // ==========================================

  async getAdminStats() {
    const totalEarlyAccess = await this.prisma.earlyAccessSignup.count();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const todayEarlyAccess = await this.prisma.earlyAccessSignup.count({
      where: { createdAt: { gte: startOfToday } },
    });

    const thisWeekEarlyAccess = await this.prisma.earlyAccessSignup.count({
      where: { createdAt: { gte: startOfWeek } },
    });

    const totalApplications = await this.prisma.foundingCreatorApplication.count();
    const acceptedCount = await this.prisma.foundingCreatorApplication.count({
      where: { status: 'ACCEPTED' },
    });
    const reviewCount = await this.prisma.foundingCreatorApplication.count({
      where: { status: 'CREATOR_REVIEW' },
    });

    const recentEarlyAccess = await this.prisma.earlyAccessSignup.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        tiktokUsername: true,
        position: true,
        followerRange: true,
        niche: true,
        country: true,
        referralCount: true,
        createdAt: true,
      },
    });

    const recentCreators = await this.prisma.foundingCreatorApplication.findMany({
      take: 10,
      orderBy: { internalScore: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        tiktokUsername: true,
        tiktokProfileUrl: true,
        followerRange: true,
        niche: true,
        internalScore: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      earlyAccess: {
        total: totalEarlyAccess,
        today: todayEarlyAccess,
        thisWeek: thisWeekEarlyAccess,
        targetRange: '100–500',
        recent: recentEarlyAccess,
      },
      foundingCreators: {
        totalApplications,
        accepted: acceptedCount,
        underReview: reviewCount,
        cohortTarget: 25,
        recent: recentCreators,
      },
    };
  }

  async getAdminEarlyAccessList(search?: string, limit = 50, page = 1) {
    const where: any = {};
    if (search && search.trim().length > 0) {
      const query = search.trim();
      where.OR = [
        { fullName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { tiktokUsername: { contains: query, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.earlyAccessSignup.findMany({
      where,
      orderBy: { position: 'asc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const total = await this.prisma.earlyAccessSignup.count({ where });

    return { items, total, limit, page };
  }

  async getAdminCreatorsList(status?: string, limit = 50, page = 1) {
    const where: any = {};
    if (status && status.trim().length > 0) {
      where.status = status.trim();
    }

    const items = await this.prisma.foundingCreatorApplication.findMany({
      where,
      orderBy: { internalScore: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const total = await this.prisma.foundingCreatorApplication.count({ where });

    return { items, total, limit, page };
  }

  async updateCreatorStatus(id: string, status: string, cohortRole?: string, adminNotes?: string) {
    const existing = await this.prisma.foundingCreatorApplication.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Creator application not found');
    }

    return this.prisma.foundingCreatorApplication.update({
      where: { id },
      data: {
        status,
        cohortRole: cohortRole || existing.cohortRole,
        adminNotes: adminNotes || existing.adminNotes,
      },
    });
  }
}
