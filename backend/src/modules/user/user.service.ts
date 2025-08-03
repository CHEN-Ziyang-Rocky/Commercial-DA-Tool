// src/modules/user/user.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto) {
    const user = this.repo.create(dto);
    return this.repo.save(user);
  }

  async findAll() {
    return this.repo.find();
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    return this.repo.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.repo.remove(user);
    return { deleted: true };
  }

  async findByEmail(email: string, withPassword = false) {
    return this.repo.findOne({
      where: { email },
      select: withPassword ? ['id', 'email', 'fullName', 'role', 'passwordHash'] : undefined,
    });
  }
}
