import { Controller, Post, Patch, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, ResendVerificationDto, UpdateOnboardingDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AUTH_COOKIE_NAME } from '../common/cookies.util';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Security audit fix (6.2): these routes used to share the app-wide
  // ThrottlerModule default (10 req/min) with every other endpoint,
  // read-only ones included. That's too loose for credential-guessing /
  // account-creation / email-bombing on this specific set of routes, so
  // each gets its own tighter override here. Still per-IP (see 6.3 for the
  // durable-storage gap that limits how much this alone can do against a
  // distributed attacker).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Security audit fix (3.5): the JWT used to be returned in this response
  // body and stored in localStorage by the frontend, where it was readable
  // by any XSS anywhere in the app for up to 30 days. It's now set as an
  // httpOnly cookie -- page JS never touches the raw value at all, not
  // even for the instant it used to sit in this fetch response. The body
  // now only carries `user` (safe to cache client-side, not a credential)
  // and `expiresAt` (a plain timestamp, so the frontend can still show
  // "session expired" proactively without ever seeing the token itself).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user, expiresAt, maxAgeMs } = await this.authService.login(loginDto);
    res.cookie(AUTH_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeMs,
    });
    return { user, expiresAt };
  }

  /**
   * Clears the httpOnly session cookie. Page JS can never clear an httpOnly
   * cookie itself (that's the point of httpOnly) -- this is the only way
   * for the frontend to actually end a session client-initiated.
   */
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    return { success: true };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * Returns the authenticated user's own record (minus secrets). Used by
   * the dashboard to read live, DB-persisted state — like onboarding
   * progress — that can't live in the JWT since that's signed once at
   * login and cached client-side for up to 30 days.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.authService.toSafeUser(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('onboarding')
  async updateOnboarding(
    @Req() req: any,
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.authService.updateOnboarding(req.user.id, dto);
  }
}
