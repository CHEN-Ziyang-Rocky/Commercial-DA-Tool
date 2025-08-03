import { Module }                from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule }             from '@nestjs/jwt';
import { PassportModule }        from '@nestjs/passport';

import { UserModule }            from '../modules/user/user.module';
import { AuthService }           from './auth.service';
import { AuthController }        from './auth.controller';
import { LocalStrategy }         from './local.strategy';
import { JwtStrategy }           from './jwt.strategy';

@Module({
  imports: [
    ConfigModule,  // 提供 ConfigService
    PassportModule,    // 提供 Passport 初始化
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get('JWT_EXPIRES') },
      }),
      inject: [ConfigService],
    }),
    UserModule,        // 导入 UserService
  ],
  providers: [
    AuthService,
    LocalStrategy,     // 本地策略
    JwtStrategy,       // JWT 策略
  ],
  controllers: [AuthController],
  exports: [PassportModule],
})
export class AuthModule {}