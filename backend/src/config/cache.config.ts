import * as dotenv from 'dotenv';
import { CacheModuleOptions } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

dotenv.config();

/** 全局 Redis 缓存配置 */
export default (): CacheModuleOptions => ({
  store: redisStore as any,                         // CommonJS 包需断言
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  ttl: parseInt(process.env.CACHE_TTL ?? '300', 10),// 默认 300 秒
  /** 让 CacheModule 成为全局单例，所有模块都能注入 CACHE_MANAGER */
  isGlobal: true,
});
