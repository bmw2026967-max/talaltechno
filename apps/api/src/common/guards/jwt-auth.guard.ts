import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PUBLIC_KEY } from '../decorators/roles.decorator';
import type { AuthUser } from '../types/auth-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const header = String(request.headers.authorization || '');
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('مطلوب تسجيل الدخول — رمز الوصول غير موجود.');
    }

    try {
      const payload = await this.jwt.verifyAsync<AuthUser>(token, {
        secret: this.config.get<string>('JWT_SECRET')
      });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('انتهت صلاحية الجلسة أو الرمز غير صالح.');
    }
  }
}
