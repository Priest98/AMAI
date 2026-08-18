import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AUTH_COOKIE_NAME, parseCookieHeader } from '../common/cookies.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('[FATAL] JWT_SECRET environment variable is not set. Application cannot start securely.');
    }
    super({
      // Security audit fix (3.5): the httpOnly cookie set by
      // AuthController.login is now the primary credential source (the
      // Bearer header can never see this token from page JS again, since
      // that's the entire point of httpOnly). The Bearer-header and
      // `?token=` query-param extractors are kept as fallbacks -- neither
      // is reachable from ordinary page JS in the current frontend
      // (which no longer persists a raw token anywhere client-side), but
      // keeping them costs nothing and avoids a hard cutover if anything
      // else (an internal script, a future integration) still needs
      // header-based auth.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => parseCookieHeader(req?.headers?.cookie)[AUTH_COOKIE_NAME] || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => req?.query?.token || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    // Merge the brandId claim (resolved from real org/brand membership at
    // login time — see AuthService.generateAuthResponse) onto the request
    // user so downstream guards can verify brand-scoped access.
    return { ...user, brandId: payload.brandId };
  }
}
