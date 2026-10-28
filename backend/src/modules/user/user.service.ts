import { maskEmail, maskPhone } from './masking';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}
  private async save(user: User) {
    try {
      return await this.repo.save(user);
    } catch (error) {
      if (
        (error as { driverError?: { code?: string } }).driverError?.code ===
        'ER_DUP_ENTRY'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }
  async create(dto: CreateUserDto) {
    const { password, ...profile } = dto;
    return this.save(
      this.repo.create({
        ...profile,
        email: profile.email.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(password, 10),
      }),
    );
  }
  async findAll(page = 1, limit = 20) {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC', id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: items.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        role: u.role,
        createdAt: u.createdAt,
        email: maskEmail(u.email),
        phone: maskPhone(u.phone),
      })),
      total,
      page,
      limit,
    };
  }
  findIdentity(id: string) {
    return this.repo.findOne({ where: { id } });
  }
  async findOne(id: string) {
    const user = await this.findIdentity(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    const { password, ...profile } = dto;
    Object.assign(user, profile);
    if (password !== undefined)
      user.passwordHash = await bcrypt.hash(password, 10);
    return this.save(user);
  }
  async remove(id: string) {
    await this.repo.remove(await this.findOne(id));
    return { deleted: true };
  }
  findByEmail(email: string, withPassword = false) {
    return this.repo.findOne({
      where: { email: email.trim().toLowerCase() },
      select: withPassword
        ? ['id', 'email', 'fullName', 'role', 'passwordHash']
        : undefined,
    });
  }
}
