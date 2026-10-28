import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    if (process.env.ALLOW_REGISTRATION !== 'true') {
      throw new ForbiddenException('Public registration is disabled');
    }
    return this.auth.register(dto.name, dto.email, dto.password);
  }
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
  @Get('me')
  me(@Request() req: { user: unknown }) {
    return req.user;
  }
}
