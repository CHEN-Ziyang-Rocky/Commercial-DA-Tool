// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy }               from '@nestjs/passport';
import { ExtractJwt, Strategy }           from 'passport-jwt';
import { ConfigService }                  from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  // 通过 ConfigService 读取环境变量
  constructor(cfg: ConfigService) {
    const secret = cfg.get<string>('JWT_SECRET'); // cfg.get('JWT_SECRET') 拿到 .env 里的密钥。
    if (!secret) throw new UnauthorizedException('Missing JWT_SECRET'); // 如果没有密钥报错
    super({
      // jwtFromRequest 指定从请求头的 Authorization: Bearer <token> 抽取 Token
      // ignoreExpiration: false 不允许过期 Token 通过
      // secretOrKey 用来验签的密钥，必须和 JwtModule 注册时用的密钥一致
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  //Token 验签通过后回调：payload === decode(token). 你可以再去数据库查全量用户信息
  validate(payload: { sub: string; email: string; role: string }) {
    return payload;  // 若要查库：return this.usersService.findById(payload.sub);
  }
}