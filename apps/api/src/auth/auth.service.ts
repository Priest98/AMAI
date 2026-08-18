import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, ResendVerificationDto } from './dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { Role, PlanTier, SubscriptionStatus } from '@prisma/client';
import { getAppUrl } from '../common/app-url.util';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  private emailShell(bodyHtml: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AMAI</title>
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
                    A
                  </td>
                  <td style="padding-left: 12px; font-size: 24px; font-weight: 800; letter-spacing: -0.03em; color: #ffffff;">
                    AMAI
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${bodyHtml}
          <tr>
            <td align="center" style="padding-top: 32px; font-size: 11px; color: #475569;">
              © ${new Date().getFullYear()} AMAI Inc. All rights reserved.<br>
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
    return this.emailShell(`
          <tr>
            <td align="left" style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                Welcome to AMAI, ${fullName}! 🚀
              </h1>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom: 24px; font-size: 14px; line-height: 1.6; color: #94A3B8;">
              Thank you for signing up for AMAI—the AI Operating System for Social Media Automation. You're one step away from transforming your content pipeline. Please verify your email address below to activate your account.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F43F5E 0%, #8B5CF6 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 14px; box-shadow: 0 10px 25px rgba(244, 63, 94, 0.3);">
                Verify Email Address
              </a>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 12px; line-height: 1.5; color: #64748B;">
              If you didn't create an AMAI account, you can safely ignore this email. This link will expire in 24 hours.
            </td>
          </tr>
    `);
  }

  private generatePasswordResetEmailHtml(resetUrl: string): string {
    return this.emailShell(`
          <tr>
            <td align="left" style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                Reset your AMAI password
              </h1>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom: 24px; font-size: 14px; line-height: 1.6; color: #94A3B8;">
              We received a request to reset your AMAI account password. Click below to choose a new one. This link expires in 1 hour.
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
              If you didn't request this, you can safely ignore this email — your password will not be changed.
            </td>
          </tr>
    `);
  }

  async register(dto: RegisterDto) {
    const cleanEmail = dto.email.toLowerCase().trim();

    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existingUser) {
        throw new ConflictException('An account with this email address already exists.');
      }
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      this.logger.warn(`Prisma findUnique check warning: ${err.message}`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let user: any;

    try {
      user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: cleanEmail,
            passwordHash,
            fullName: dto.fullName,
            // Auto-verified only in local development (NODE_ENV=development,
            // set in apps/web/.env.local) -- SMTP isn't configured locally,
            // so the verification email below is silently skipped and there
            // would otherwise be no way to click the link. Production
            // (Vercel sets NODE_ENV=production) always requires real
            // verification -- this can never weaken that.
            emailVerified: process.env.NODE_ENV === 'development',
            verificationToken,
            verificationTokenExpiresAt,
            role: Role.OWNER,
          },
        });

        const orgName = `${dto.fullName || 'My'} Workspace`;
        const org = await tx.organization.create({
          data: {
            name: orgName,
            slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000),
            ownerId: newUser.id,
            members: {
              create: {
                userId: newUser.id,
                role: Role.OWNER
              }
            }
          }
        });

        await tx.brand.create({
          data: {
            name: 'My Primary Brand',
            organizationId: org.id
          }
        });

        // Every organization gets a Subscription row at signup -- Free
        // included -- so "does this org have a subscription" is never a
        // special case downstream (EntitlementsService always finds one).
        await tx.subscription.create({
          data: {
            organizationId: org.id,
            plan: PlanTier.FREE,
            status: SubscriptionStatus.ACTIVE,
          },
        });

        return newUser;
      });
    } catch (dbErr: any) {
      this.logger.error(`Database user creation error: ${dbErr.message}`);
      throw new BadRequestException(
        'We could not create your account right now. Please try again in a moment.',
      );
    }

    const appUrl = getAppUrl();
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    const emailHtml = this.generateWelcomeEmailHtml(user.fullName || 'Creator', verificationUrl);
    await this.emailService.sendEmail(user.email, 'Welcome to AMAI 🚀 — verify your email', emailHtml);

    return {
      success: true,
      message: "Welcome to AMAI! We've sent a verification email to your inbox.",
      email: user.email,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          verificationToken: dto.token,
        },
      });

      if (!user) {
        throw new BadRequestException('This verification link is invalid or has already been used.');
      }

      if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
        throw new BadRequestException('This verification link has expired. Please request a new one.');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          verificationToken: null,
          verificationTokenExpiresAt: null,
        },
      });
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      this.logger.warn(`Verify email error: ${e}`);
      throw new BadRequestException('We could not verify your email right now. Please try again.');
    }

    return {
      success: true,
      message: 'Email address verified successfully! You can now log in to AMAI.',
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const cleanEmail = dto.email.toLowerCase().trim();

    try {
      const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });

      // Always return the same generic response whether or not the account
      // exists, and whether or not it's already verified — avoids leaking
      // account existence to an unauthenticated caller.
      if (user && !user.emailVerified) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await this.prisma.user.update({
          where: { id: user.id },
          data: { verificationToken, verificationTokenExpiresAt },
        });

        const appUrl = getAppUrl();
        const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;
        const emailHtml = this.generateWelcomeEmailHtml(user.fullName || 'Creator', verificationUrl);
        await this.emailService.sendEmail(user.email, 'Verify your AMAI email address', emailHtml);
      }
    } catch (e: any) {
      this.logger.warn(`resendVerification error: ${e.message}`);
    }

    return {
      success: true,
      message: 'If an account exists for that email and is not yet verified, a new verification link has been sent.',
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
          data: { passwordResetToken, passwordResetExpiresAt },
        });

        const appUrl = getAppUrl();
        const resetUrl = `${appUrl}/reset-password?token=${passwordResetToken}`;
        const emailHtml = this.generatePasswordResetEmailHtml(resetUrl);
        await this.emailService.sendEmail(cleanEmail, 'Reset your AMAI password', emailHtml);
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
      where: { passwordResetToken: dto.token },
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

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
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

  private async generateAuthResponse(user: any, rememberMe: boolean = true) {
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
}
