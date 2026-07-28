import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('[FATAL] JWT_SECRET environment variable is not set. Application cannot start securely.');
    }
    super({
      // Falls back to a `?token=` query param so the SSE activity stream
      // (browser EventSource can't set an Authorization header) can still
      // authenticate — the Bearer header is used everywhere else.
      jwtFromRequest: ExtractJwt.fromExtractors([
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
