import { NestFactory } from '@nestjs/core';
import { DemoModule } from './demo.module';
import { configureApp } from '../common/configure-app';
async function main() { const app=await NestFactory.create(DemoModule);configureApp(app);app.enableShutdownHooks();await app.listen(Number(process.env.PORT??5111),'127.0.0.1'); }
void main();
