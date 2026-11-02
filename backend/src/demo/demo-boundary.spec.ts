import { Controller, Get, INestApplication, Req, UseGuards } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { DemoModule } from './demo.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { AdminGuard } from '../auth/admin.guard';
import { UserService } from '../modules/user/user.service';
@Controller('account-check')
class NormalAccountProbe {
  @Get() me(@Req() req: { user: unknown }) { return req.user; }
  @Get('admin') @UseGuards(AdminGuard) admin() { return { admin: true }; }
}
describe('demo credentials across the real normal JWT guards', () => {
  let app: INestApplication;
  afterEach(async()=>{await app?.close();});
  it('rejects demo tokens on normal/admin routes and preserves normal user access',async()=>{
    const secret='isolated-test-signing-value-only-'.repeat(2);
    const module=await Test.createTestingModule({imports:[DemoModule,JwtModule.register({secret})],controllers:[NormalAccountProbe],providers:[JwtStrategy,AdminGuard,{provide:APP_GUARD,useClass:JwtAuthGuard},{provide:ConfigService,useValue:{get:()=>secret}},{provide:UserService,useValue:{findIdentity:async(id:string)=>id==='regular'?{id,email:'fixture@example.invalid',fullName:'Fixture user',role:'user'}:null}}]}).compile();
    app=module.createNestApplication();await app.init();
    const create=await request(app.getHttpServer()).post('/demo-api/session').set('Idempotency-Key','a'.repeat(64)).send({}).expect(201);
    const demo=`Bearer ${create.body.token}`;
    await request(app.getHttpServer()).get('/account-check').set('Authorization',demo).expect(401);
    await request(app.getHttpServer()).get('/account-check/admin').set('Authorization',demo).expect(401);
    const normal=`Bearer ${module.get(JwtService).sign({sub:'regular'})}`;
    await request(app.getHttpServer()).get('/account-check').set('Authorization',normal).expect(200).expect(r=>expect(r.body.role).toBe('user'));
    await request(app.getHttpServer()).get('/account-check/admin').set('Authorization',normal).expect(403);
    await request(app.getHttpServer()).get('/demo-api/auth/me').set('Authorization',normal).expect(401);
  });
});
