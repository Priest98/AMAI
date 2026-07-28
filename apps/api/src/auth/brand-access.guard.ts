import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Must run after JwtAuthGuard. Verifies the authenticated user's token was
 * actually issued for the :brandId in the route — without this, any logged
 * -in user could read/write any other brand's posts, media, and engine
 * settings just by changing the URL, since brandId was previously trusted
 * straight from the route param with no ownership check at all.
 */
@Injectable()
export class BrandAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const routeBrandId = request.params?.brandId;
    const userBrandId = request.user?.brandId;

    if (!routeBrandId || !userBrandId || routeBrandId !== userBrandId) {
      throw new ForbiddenException('You do not have access to this brand.');
    }

    return true;
  }
}
