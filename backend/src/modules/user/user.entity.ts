// src/modules/user/user.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { Exclude } from 'class-transformer';   // ← add this line
  
  @Entity({ name: 'users' })
  export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ length: 120 })
    fullName: string;
  
    @Column({ unique: true, length: 120 })
    email: string;
  
    @Column({ length: 20, nullable: true })
    phone?: string;
  
    @Column({ length: 30, default: 'user' })
    role: string;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    /** 序列化时自动隐藏密码哈希 */
    @Exclude()
    @Column({ name: 'password_hash', select: false })
    passwordHash: string;
  }
  