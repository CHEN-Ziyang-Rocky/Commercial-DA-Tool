import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../modules/user/user.service';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService,
    private readonly jwt: JwtService,
  ) {}
  async register(name: string, email: string, password: string) {
    const user = await this.users.create({
      fullName: name,
      email,
      password,
      role: 'user',
    });
    return this.sign(user);
  }
  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email, true);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.sign(user);
  }
  private sign(user: { id: string; email: string; role: string }) {
    return {
      access_token: this.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
    };
  }
}
