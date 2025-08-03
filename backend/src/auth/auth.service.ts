// src/auth/auth.service.ts
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../modules/user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService, // UserService：用于对用户表做增删改查，注册时保存新用户、登录时查找用户。
    private readonly jwt: JwtService, // JwtService：Nest 封装的 JWT 工具，用来生成（sign）和验证 Token。
  ) {}

  // LocalStrategy 调用此方法做凭证校验
  // ① 根据用户名（或邮箱）查找用户，withPassword = true 表示连密码哈希也取出来
  // ② 如果找到了用户，再用 bcrypt.compare() 将用户输入的纯文本密码与数据库里的哈希比对
  // ③ 验证通过：把 user 对象里的 passwordHash 字段剔除（安全考虑），返回剩下的属性
  async validateUser(username: string, password: string) {
    const user = await this.users.findByEmail(username, true);
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash, ...result } = user as any; // 成功：剔除 passwordHash 再返回
      return result;
    }
    return null;
  }

  /** 哈希 + 存库 + 生成 JWT */
  async register(name: string, email: string, rawPwd: string) {
    if (await this.users.findByEmail(email)) {
      throw new BadRequestException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(rawPwd, 10);
    const user = await this.users.create({
      fullName: name,
      email,
      passwordHash,
      role: 'user',
    } as any);
    return this.login(user);  // 注册后直接登录，二次重用 login()
  }

  /** JWT 签发：Local 登录或注册后调用 */
  async login(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwt.sign(payload),
    };
  }
}