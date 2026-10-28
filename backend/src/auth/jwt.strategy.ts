import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../modules/user/user.service';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    cfg: ConfigService,
    private readonly users: UserService,
  ) {
    const secret = cfg.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32)
      throw new Error('JWT_SECRET must have at least 32 characters');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }
  async validate(payload: { sub: string }) {
    if (typeof payload.sub !== 'string') throw new UnauthorizedException();
    const user = await this.users.findIdentity(payload.sub);
    if (!user) throw new UnauthorizedException();
    // Read current role from DB: deleting/demoting a user affects existing tokens.
    return {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
