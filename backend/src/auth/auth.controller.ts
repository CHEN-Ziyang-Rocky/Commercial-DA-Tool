import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import { AuthService }           from './auth.service';
import { Public }                from './public.decorator';
import { RegisterDto }           from './dto/register.dto';
import { LoginDto }              from './dto/login.dto';
import { AuthGuard }             from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 注册：公开路由
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.name, dto.email, dto.password);
  }

  // 登录：使用 LocalStrategy 校验用户名/密码，登录成功后，validate() 返回的 user 会被注入到 req.user
  // 如果没有 @Public()，当你访问 POST /auth/login 时，会先被 JwtAuthGuard 要求检查 Bearer Token，显然此时你还没拿到 Token——就会直接 401。
  @Public() // ① 跳过全局 JwtAuthGuard（即不用 Bearer Token）
  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Request() req) {
    return this.auth.login(req.user); // 登录通过后，req.user = validate() 返回的 user 对象
  }
}