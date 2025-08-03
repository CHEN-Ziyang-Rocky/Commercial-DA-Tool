// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import appConfig from './config/app.config';
import { AppDataSource } from './config/typeorm.config';   // ← 改成命名导入
import { CompanyModule } from './modules/company/company.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

import { CacheModule } from '@nestjs/cache-manager';
import cacheConfig from './config/cache.config'; // 缓存配置
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }), // 环境
    TypeOrmModule.forRoot(AppDataSource.options), // 数据库配置，AppDataSource.options 就是：{ host: '127.0.0.1', port: 3306, }
    CacheModule.register(cacheConfig()),   // ← 新增，全局缓存
    CompanyModule, // 公司模块
    UserModule, // 用户模块
    AuthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard }, // 全局 JWT 鉴权守卫
  ],
})
export class AppModule {}
