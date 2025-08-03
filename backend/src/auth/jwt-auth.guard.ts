// src/auth/jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /** 跳过 @Public() 标记的路由 */
  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>('isPublic', ctx.getHandler());
    return isPublic ? true : super.canActivate(ctx);
  }
}