// src/auth/local.strategy.ts
import { Strategy } from 'passport-local';              // 引入 passport-local 策略
import { PassportStrategy } from '@nestjs/passport';    // Nest 对 Passport 的封装
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    // super();
    // passport-local 的默认是从 req.body.username 和 req.body.password 里取凭证。
    // 而我们在前端用的是 email 字段来登录，就必须告诉它：
    super({ usernameField: 'email', passwordField: 'password' });
  }
  // 这个方法是 Passport-local 策略的核心：
  // 当用户调用登录接口（被 AuthGuard('local') 保护）时，Passport 会自动调用这个方法，并传入用户名和密码
  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    return user; // 返回值会被挂到 request.user 上，供 Controller / 后续 Guard 使用
  }
}