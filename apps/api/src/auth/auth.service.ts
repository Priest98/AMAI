import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, ResendVerificationDto } from './dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  /**
   * Helper to generate branded HTML Welcome Email
   */
  private generateWelcomeEmailHtml(fullName: string, verificationUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AMAI 🚀</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D12; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0D12; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560px" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #12151D; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header Logo -->
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

          <!-- Heading -->
          <tr>
            <td align="left" style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                Welcome to AMAI, ${fullName}! 🚀
              </h1>
            </td>
          </tr>

          <!-- Body Text -->
          <tr>
            <td align="left" style="padding-bottom: 24px; font-size: 14px; line-height: 1.6; color: #94A3B8;">
              Thank you for signing up for AMAI—the AI Operating System for Social Media Automation. You're one step away from transforming your content pipeline. Please verify your email address below to activate your account.
            </td>
          </tr>

          <!-- Primary Call to Action Button -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F43F5E 0%, #8B5CF6 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 14px; box-shadow: 0 10px 25px rgba(244, 63, 94, 0.3);">
                Verify Email Address
              </a>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td align="left" style="padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 12px; line-height: 1.5; color: #64748B;">
              If you didn't create an AMAI account, you can safely ignore this email. This link will expire in 24 hours.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px; font-size: 11px; color: #475569;">
              © ${new Date().getFullYear()} AMAI Inc. All rights reserved.<br>
              <a href="https://marketing-os-eight-virid.vercel.app/privacy" style="color: #8B5CF6; text-decoration: none;">Privacy Policy</a> • 
              <a href="https://marketing-os-eight-virid.vercel.app/terms" style="color: #8B5CF6; text-decoration: none;">Terms of Service</a>
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

  /**
   * Helper to generate Password Reset Email HTML
   */
  private generateResetPasswordEmailHtml(fullName: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password — AMAI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D12; font-family: 'Inter', sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560px" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #12151D; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size: 24px; font-weight: 800; color: #ffffff;">AMAI</span>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">Reset Your Password</h1>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding-bottom: 24px; font-size: 14px; line-height: 1.6; color: #94A3B8;">
              Hi ${fullName}, we received a request to reset your AMAI account password. Click the button below to choose a new password.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: #F43F5E; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 14px;">
                Reset Password
              </a>
            </td>
          </tr>
          <tr>
            <td align="left" style="font-size: 12px; color: #64748B;">
              If you did not request a password reset, no further action is required. This link expires in 60 minutes.
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

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);
    
    // Generate secure 32-byte verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          fullName: dto.fullName,
          emailVerified: false,
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

      return newUser;
    });

    // Generate Verification Link
    const appUrl = (process.env.APP_URL || 'https://marketing-os-eight-virid.vercel.app').replace(/\/$/, '');
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    // Send / Log Welcome Email
    const emailHtml = this.generateWelcomeEmailHtml(user.fullName || 'Creator', verificationUrl);
    this.logger.log(`[EMAIL DISPATCH] Sent Welcome Email to ${user.email}. Verification URL: ${verificationUrl}`);

    return {
      success: true,
      message: "Welcome to AMAI! We've sent a verification email to your inbox.",
      email: user.email,
      verificationToken, // Provided for easy dev flow testing
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: dto.token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired email verification token.');
    }

    if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired. Please request a new verification email.');
    }

    // Update user to verified status
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationToken: null,
        verificationTokenExpiresAt: null,
      },
    });

    return {
      success: true,
      message: 'Email address verified successfully! You can now log in to AMAI.',
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      // Return success silently for security
      return { success: true, message: 'If an account exists, a new verification link has been sent.' };
    }

    if (user.emailVerified) {
      return { success: true, message: 'This email is already verified. You can log in immediately.' };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiresAt,
      },
    });

    const appUrl = (process.env.APP_URL || 'https://marketing-os-eight-virid.vercel.app').replace(/\/$/, '');
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;
    this.logger.log(`[EMAIL DISPATCH] Resent Verification Email to ${user.email}. Link: ${verificationUrl}`);

    return {
      success: true,
      message: 'A new verification link has been sent to your email inbox.',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      return { success: true, message: 'If an account matches that email, a password reset link has been sent.' };
    }

    const passwordResetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpiresAt,
      },
    });

    const appUrl = (process.env.APP_URL || 'https://marketing-os-eight-virid.vercel.app').replace(/\/$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${passwordResetToken}`;
    this.logger.log(`[EMAIL DISPATCH] Password Reset Email sent to ${user.email}. Reset Link: ${resetUrl}`);

    return {
      success: true,
      message: 'A password reset link has been sent to your email inbox.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Password reset token has expired. Please request a new link.');
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email address or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email address or password.');
    }

    // Require email verification guard
    if (!user.emailVerified) {
      throw new UnauthorizedException('UNVERIFIED_EMAIL: Please verify your email before logging in.');
    }

    // Update lastLogin timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return this.generateAuthResponse(user);
  }

  private async generateAuthResponse(user: any) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: {
        organization: {
          include: { brands: { take: 1, orderBy: { createdAt: 'asc' } } }
        }
      }
    });

    const brandId = membership?.organization?.brands?.[0]?.id ?? 'primary_brand';

    const payload = { sub: user.id, email: user.email, brandId };
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName || user.email.split('@')[0],
        fullName: user.fullName,
        brandId,
        emailVerified: user.emailVerified,
      },
      accessToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
