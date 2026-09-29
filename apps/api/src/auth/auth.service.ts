import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, ResendVerificationDto } from './dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { Role, PlanTier, SubscriptionStatus } from '@prisma/client';
import { getAppUrl } from '../common/app-url.util';
import { EmailDeliveryError, EmailService } from '../email/email.service';
import { StorageService } from '../storage/storage.service';
import { passwordResetEmail, verificationEmail, welcomeEmail } from '../email/email.templates';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private storageService: StorageService,
  ) {}

  private hashOneTimeToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async activatePendingRegistration(tokenHash: string): Promise<any | null> {
    const candidate = await this.prisma.pendingRegistration.findUnique({ where: { tokenHash } });
    if (!candidate) return null;
    if (candidate.expiresAt < new Date()) {
      throw new BadRequestException('This verification link has expired. Please request a new one.');
    }

    return this.prisma.$transaction(async (tx) => {
      const pending = await tx.pendingRegistration.findUnique({ where: { tokenHash } });
      if (!pending) {
        throw new BadRequestException('This verification link is invalid or has already been used.');
      }
      if (pending.expiresAt < new Date()) {
        throw new BadRequestException('This verification link has expired. Please request a new one.');
      }

      const existingUser = await tx.user.findUnique({ where: { email: pending.email } });
      if (existingUser) {
        throw new BadRequestException('This verification link is invalid or has already been used.');
      }

      const user = await tx.user.create({
        data: {
          email: pending.email,
          passwordHash: pending.passwordHash,
          fullName: pending.fullName,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          role: Role.OWNER,
        },
      });
      const workspaceName = `${pending.fullName || 'My'} Workspace`;
      const organization = await tx.organization.create({
        data: {
          name: workspaceName,
          slug: `${workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomBytes(5).toString('hex')}`,
          ownerId: user.id,
          members: { create: { userId: user.id, role: Role.OWNER } },
          subscription: { create: { plan: PlanTier.FREE, status: SubscriptionStatus.ACTIVE } },
        },
      });
      await tx.brand.create({
        data: { name: 'My Primary Brand', organizationId: organization.id },
      });
      await tx.pendingRegistration.delete({ where: { id: pending.id } });
      return user;
    });
  }

  private escapeEmailText(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private emailShell(bodyHtml: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Oyinca</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D12; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0D12; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560px" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #12151D; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #F43F5E 0%, #8B5CF6 100%); width: 36px; height: 36px; border-radius: 10px; text-align: center; vertical-align: middle; color: #ffffff; font-weight: 900; font-size: 20px; line-height: 36px;">
                    O
                  </td>
                  <td style="padding-left: 12px; font-size: 24px; font-weight: 800; letter-spacing: -0.03em; color: #ffffff;">
                    Oyinca
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${bodyHtml}
          <tr>
            <td align="center" style="padding-top: 32px; font-size: 11px; color: #475569;">
              © ${new Date().getFullYear()} Turaab Technology. All rights reserved.<br>
              Powered by Turaab Technology<br>
              <a href="${getAppUrl()}/privacy" style="color: #8B5CF6; text-decoration: none;">Privacy Policy</a> &bull;
              <a href="${getAppUrl()}/terms" style="color: #8B5CF6; text-decoration: none;">Terms of Service</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private generateWelcomeEmailHtml(fullName: string, verificationUrl: string): string {
    const safeFullName = this.escapeEmailText(fullName);
    return this.emailShell(`
          <tr>
            <td align="left" style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                Verify your email for Oyinca
              </h1>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom: 24px; font-size: 14px; line-height: 1.6; color: #94A3B8;">
              Welcome, ${safeFullName}. Verify your email address to secure your account and enter your Oyinca workspace.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F43F5E 0%, #8B5CF6 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 14px; box-shadow: 0 10px 25px rgba(244, 63, 94, 0.3);">
                Verify email
              </a>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 12px; line-height: 1.5; color: #64748B;">
              If the button does not work, copy and paste this secure link into your browser:<br>
              <a href="${verificationUrl}" style="color: #C9A96E; overflow-wrap: anywhere;">${verificationUrl}</a><br><br>
              If you did not create an Oyinca account, you can safely ignore this email. This link expires in 24 hours.
            </td>
          </tr>
    `);
  }

  private generatePasswordResetEmailHtml(resetUrl: string): string {
    return this.emailShell(`
          <tr>
            <td align="left" style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                Reset your Oyinca password
              </h1>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom: 24px; font-size: 14px; line-height: 1.6; color: #94A3B8;">
              We received a request to reset your Oyinca account password. Click below to choose a new one. This link expires in 1 hour.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F43F5E 0%, #8B5CF6 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 14px; box-shadow: 0 10px 25px rgba(244, 63, 94, 0.3);">
                Reset Password
              </a>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 12px; line-height: 1.5; color: #64748B;">
              If you didn't request this, you can safely ignore this email. Your password will not be changed.
            </td>
          </tr>
    `);
  }

  async register(dto: RegisterDto) {
    const cleanEmail = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      await this.prisma.pendingRegistration.upsert({
        where: { email: cleanEmail },
        create: {
          email: cleanEmail,
          passwordHash,
          fullName: dto.fullName,
          tokenHash: this.hashOneTimeToken(verificationToken),
          expiresAt: verificationTokenExpiresAt,
        },
        update: {
          passwordHash,
          fullName: dto.fullName,
          tokenHash: this.hashOneTimeToken(verificationToken),
          expiresAt: verificationTokenExpiresAt,
        },
      });
    } catch (dbErr: any) {
      this.logger.error(`Pending registration persistence error: ${dbErr.message}`);
      throw new BadRequestException(
        'We could not start registration right now. Please try again in a moment.',
      );
    }

    const appUrl = getAppUrl();
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    const email = verificationEmail(dto.fullName || 'Creator', verificationUrl);
    try {
      await this.emailService.sendEmail(
        cleanEmail,
        email.subject,
        email.html,
        email.text,
      );
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        this.logger.error(`Verification email was not accepted for pending registration (code=${error.code}).`);
        throw new ServiceUnavailableException({
          code: 'VERIFICATION_EMAIL_NOT_ACCEPTED',
          accountCreated: false,
          signupPending: true,
          message: 'We saved your signup request, but could not send the verification email. Please try resending it shortly.',
        });
      }
      throw error;
    }

    return {
      success: true,
      message: 'Your verification email was accepted for delivery.',
      deliveryStatus: 'accepted',
      accountCreated: false,
      signupPending: true,
      email: cleanEmail,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    try {
      const pendingUser = await this.activatePendingRegistration(this.hashOneTimeToken(dto.token));
      if (pendingUser) {
        const welcome = welcomeEmail();
        try {
          await this.emailService.sendEmail(pendingUser.email, welcome.subject, welcome.html, welcome.text);
        } catch (error: any) {
          this.logger.warn(`Welcome email was not accepted after activation (code=${error?.code || 'unknown'}).`);
        }
        return this.generateAuthResponse(pendingUser, true);
      }

      // Legacy fallback for verification links issued before pending-signup
      // activation was introduced. New registrations never create a User here.
      const user = await this.prisma.user.findFirst({
        where: {
          verificationToken: this.hashOneTimeToken(dto.token),
        },
      });

      if (!user) {
        throw new BadRequestException('This verification link is invalid or has already been used.');
      }

      if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
        throw new BadRequestException('This verification link has expired. Please request a new one.');
      }

      const verifiedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          verificationToken: null,
          verificationTokenExpiresAt: null,
        },
      });
      // The token is unique and cleared above. Only the request that consumes
      // it can reach this send, keeping welcome delivery one-time.
      const welcome = welcomeEmail();
      try {
        await this.emailService.sendEmail(verifiedUser.email, welcome.subject, welcome.html, welcome.text);
      } catch (error: any) {
        this.logger.warn(`Welcome email was not accepted after verification (code=${error?.code || 'unknown'}).`);
      }
      return this.generateAuthResponse(verifiedUser, true);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      this.logger.warn(`Verify email error: ${e}`);
      throw new BadRequestException('We could not verify your email right now. Please try again.');
    }

  }

  async resendVerification(dto: ResendVerificationDto) {
    const cleanEmail = dto.email.toLowerCase().trim();

    try {
      const pending = await this.prisma.pendingRegistration.findUnique({ where: { email: cleanEmail } });
      if (pending) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.prisma.pendingRegistration.update({
          where: { id: pending.id },
          data: { tokenHash: this.hashOneTimeToken(verificationToken), expiresAt: verificationTokenExpiresAt },
        });
        const verificationUrl = `${getAppUrl()}/verify-email?token=${verificationToken}`;
        const email = verificationEmail(pending.fullName || 'Creator', verificationUrl);
        await this.emailService.sendEmail(pending.email, email.subject, email.html, email.text);
        return {
          success: true,
          deliveryStatus: 'accepted',
          message: 'A new verification email was accepted for delivery. Check your inbox and spam folder.',
        };
      }

      // Compatibility for accounts created before pending registration was
      // introduced. No new unverified User rows are created by register().
      const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });

      // Always return the same generic response whether or not the account
      // exists, and whether or not it's already verified — avoids leaking
      // account existence to an unauthenticated caller.
      if (user && !user.emailVerified) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await this.prisma.user.update({
          where: { id: user.id },
          data: { verificationToken: this.hashOneTimeToken(verificationToken), verificationTokenExpiresAt },
        });

        const appUrl = getAppUrl();
        const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;
        const email = verificationEmail(user.fullName || 'Creator', verificationUrl);
        await this.emailService.sendEmail(
          user.email,
          email.subject,
          email.html,
          email.text,
        );
        return {
          success: true,
          deliveryStatus: 'accepted',
          message: 'A new verification email was accepted for delivery. Check your inbox and spam folder.',
        };
      }
    } catch (e: any) {
      if (e instanceof EmailDeliveryError) {
        this.logger.error(`Verification resend was not accepted (code=${e.code}).`);
        throw new ServiceUnavailableException({
          code: 'VERIFICATION_EMAIL_NOT_ACCEPTED',
          message: 'We could not send the verification email right now. Please try again shortly.',
        });
      }
      this.logger.warn(`resendVerification lookup error: ${e.message}`);
    }

    return {
      success: true,
      message: 'If an eligible account exists, a new verification link has been requested. Check your inbox and spam folder.',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const cleanEmail = dto.email.toLowerCase().trim();
    const passwordResetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    try {
      const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { passwordResetToken: this.hashOneTimeToken(passwordResetToken), passwordResetExpiresAt },
        });

        const appUrl = getAppUrl();
        const resetUrl = `${appUrl}/reset-password?token=${passwordResetToken}`;
        const email = passwordResetEmail(resetUrl);
        await this.emailService.sendEmail(
          cleanEmail,
          email.subject,
          email.html,
          email.text,
        );
      }
    } catch (e: any) {
      this.logger.warn(`forgotPassword lookup error: ${e.message}`);
    }

    // Always return the same generic response whether or not the account
    // exists — this avoids leaking which emails are registered.
    return {
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: this.hashOneTimeToken(dto.token) },
    });

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('This password reset link is invalid or has expired. Please request a new one.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    return {
      success: true,
      message: 'Password reset successfully! Please log in with your new password.',
    };
  }

  async login(dto: LoginDto) {
    const cleanEmail = dto.email.toLowerCase().trim();

    let user: any;
    try {
      user = await this.prisma.user.findUnique({
        where: { email: cleanEmail },
      });
    } catch (err: any) {
      this.logger.error(`Prisma login lookup error: ${err.message}`);
      throw new BadRequestException('Login is temporarily unavailable. Please try again in a moment.');
    }

    if (!user) {
      throw new UnauthorizedException('Invalid email address or password.');
    }

    const isPasswordValid = user.passwordHash ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email address or password.');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('UNVERIFIED_EMAIL: Please verify your email address before logging in.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    }).catch(() => {});

    return this.generateAuthResponse(user, dto.rememberMe !== false);
  }

  async generateAuthResponse(user: any, rememberMe: boolean = true) {
    let brandId = 'primary_brand';
    try {
      const membership = await this.prisma.organizationMember.findFirst({
        where: { userId: user.id },
        include: {
          organization: {
            include: { brands: { take: 1, orderBy: { createdAt: 'asc' } } }
          }
        }
      });
      if (membership?.organization?.brands?.[0]?.id) {
        brandId = membership.organization.brands[0].id;
      }
    } catch (e) {}

    const payload = { sub: user.id, email: user.email, brandId };
    const expiresInDays = rememberMe ? 30 : 1;
    const expiresIn = `${expiresInDays}d`;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName || user.email.split('@')[0],
        fullName: user.fullName,
        brandId,
        emailVerified: user.emailVerified ?? true,
      },
      // Security audit fix (3.5): still returned from the service (the
      // controller needs the raw value to set the httpOnly cookie), but
      // AuthController.login no longer echoes this back in the HTTP
      // response body -- see that method's comment for why.
      accessToken: this.jwtService.sign(payload, { expiresIn }),
      expiresAt,
      maxAgeMs: expiresInDays * 24 * 60 * 60 * 1000,
    };
  }

  async resolveTikTokUser(profile: { openId: string; unionId?: string; displayName?: string; avatarUrl?: string }) {
    const existing = await this.prisma.authIdentity.findUnique({
      where: { provider_providerAccountId: { provider: 'TIKTOK', providerAccountId: profile.openId } },
      include: { user: true },
    });
    if (existing) {
      await this.prisma.user.update({ where: { id: existing.userId }, data: { lastLogin: new Date() } });
      return { user: existing.user, created: false };
    }

    try {
      const user = await this.prisma.$transaction(async (tx) => {
      const suffix = crypto.createHash('sha256').update(profile.openId).digest('hex').slice(0, 24);
      const user = await tx.user.create({
        data: {
          email: `tiktok+${suffix}@identity.oyinca.invalid`,
          passwordHash: null,
          fullName: profile.displayName || 'TikTok creator',
          avatar: profile.avatarUrl,
          emailVerified: false,
          role: Role.OWNER,
          lastLogin: new Date(),
        },
      });
      const org = await tx.organization.create({
        data: {
          name: `${profile.displayName || 'TikTok'} Workspace`,
          slug: `tiktok-${suffix}`,
          ownerId: user.id,
          members: { create: { userId: user.id, role: Role.OWNER } },
          subscription: { create: { plan: PlanTier.FREE, status: SubscriptionStatus.ACTIVE } },
        },
      });
      await tx.brand.create({ data: { name: profile.displayName || 'My TikTok Brand', organizationId: org.id } });
      await tx.authIdentity.create({
        data: { userId: user.id, provider: 'TIKTOK', providerAccountId: profile.openId, providerUnionId: profile.unionId, profile },
      });
      return user;
      });
      return { user, created: true };
    } catch (error) {
      const winner = await this.prisma.authIdentity.findUnique({
        where: { provider_providerAccountId: { provider: 'TIKTOK', providerAccountId: profile.openId } },
        include: { user: true },
      });
      if (winner) return { user: winner.user, created: false };
      throw error;
    }
  }

  async getMe(userId: string, sessionUser?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { authIdentities: { where: { provider: 'TIKTOK' }, take: 1 } },
    });
    if (!user) throw new UnauthorizedException();
    const identity = user.authIdentities[0];
    const safe = this.toSafeUser({ ...user, authIdentities: undefined, brandId: sessionUser?.brandId });
    return {
      ...safe,
      tiktokIdentity: identity ? {
        displayName: (identity.profile as any)?.displayName || user.fullName,
        avatarUrl: (identity.profile as any)?.avatarUrl || user.avatar,
        username: (identity.profile as any)?.username || null,
        connected: true,
      } : null,
    };
  }

  /**
   * Strips sensitive/internal fields before a user record is ever sent to
   * the frontend (used by GET /auth/me).
   */
  toSafeUser(user: any) {
    const {
      passwordHash,
      verificationToken,
      verificationTokenExpiresAt,
      passwordResetToken,
      passwordResetExpiresAt,
      ...safe
    } = user;
    return safe;
  }

  /**
   * Drives the onboarding welcome modal + product tour state. Persisted on
   * the User row (not the JWT, which is signed at login time and can be
   * cached client-side for up to 30 days) so completion/skip is durable and
   * survives across devices and sessions.
   */
  async updateOnboarding(userId: string, dto: { completed?: boolean; skipped?: boolean; restart?: boolean }) {
    const data: any = {};

    if (dto.restart) {
      data.onboardingCompleted = false;
      data.onboardingSkipped = false;
      data.onboardingCompletedAt = null;
    } else {
      if (dto.completed) {
        data.onboardingCompleted = true;
        data.onboardingCompletedAt = new Date();
      }
      if (dto.skipped) {
        data.onboardingSkipped = true;
      }
    }

    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return {
      hasCompletedOnboarding: user.onboardingCompleted,
      hasSkippedOnboarding: user.onboardingSkipped,
      onboardingCompletedAt: user.onboardingCompletedAt,
    };
  }

  /** Portable, secret-free copy of the customer's Oyinca workspace. */
  async exportAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            brands: {
              include: {
                businessBrain: true,
                memoryEntries: true,
                products: true,
                mediaAssets: true,
                posts: { include: { targets: true, media: true } },
                socialAccounts: { select: { id: true, platform: true, platformAccountId: true, metadata: true, status: true, createdAt: true, updatedAt: true } },
              },
            },
          },
        },
      },
    });
    return {
      exportedAt: new Date().toISOString(),
      account: this.toSafeUser(user),
      workspaces: memberships.map((membership) => ({ role: membership.role, ...membership.organization })),
    };
  }

  /** Deletes a solo-owned account and its stored media. Paid subscriptions
   * and shared workspaces must be resolved first so deletion cannot keep
   * billing a now-inaccessible account or erase another member's work. */
  async deleteAccount(userId: string) {
    const owned = await this.prisma.organization.findMany({
      where: { ownerId: userId },
      include: {
        members: true,
        subscription: true,
        brands: { include: { mediaAssets: { include: { optimizedVersions: true } } } },
      },
    });
    if (owned.some((org) => org.members.some((member) => member.userId !== userId))) {
      throw new BadRequestException('Transfer or remove the other workspace members before deleting your account.');
    }
    if (owned.some((org) => org.subscription && org.subscription.plan !== PlanTier.FREE && ['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(org.subscription.status))) {
      throw new BadRequestException('Cancel your paid subscription from Billing before deleting your account.');
    }

    const urls = owned.flatMap((org) => org.brands.flatMap((brand) => brand.mediaAssets.flatMap((asset) => [
      asset.blobUrl,
      ...asset.optimizedVersions.flatMap((version) => [version.blobUrl, version.thumbnailUrl]),
    ]))).filter((url): url is string => !!url);
    await Promise.allSettled(urls.map((url) => this.storageService.deleteFile(url)));

    await this.prisma.$transaction(async (tx) => {
      await tx.organization.deleteMany({ where: { ownerId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });
    return { success: true };
  }
}
