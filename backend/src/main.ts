// src/main.ts
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // —— 可选：给所有路由加前缀，如 /api/company/search
  // app.setGlobalPrefix('api');

  // —— 1) CORS：允许 Next 前端在 localhost:3000 发请求
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });

  // —— 2) 全局 DTO 校验 & 转换
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,            // 自动把 JSON 转成 DTO 实例
      whitelist: true,            // 丢弃非 DTO 定义的字段
      forbidNonWhitelisted: true, // 有多余字段就报 400 错误
    }),
  );

  // —— 3) 全局 序列化拦截器：支持 @Exclude()、@Expose()
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  await app.listen(3001);
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
}
bootstrap();
