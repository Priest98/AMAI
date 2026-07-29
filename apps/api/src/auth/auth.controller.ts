import { Controller, Post, Patch, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, ResendVerificationDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

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
    @Body() dto: { completed?: boolean; skipped?: boolean; restart?: boolean },
  ) {
    return this.authService.updateOnboarding(req.user.id, dto);
  }
}
