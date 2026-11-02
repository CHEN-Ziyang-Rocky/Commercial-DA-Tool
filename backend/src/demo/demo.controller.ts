import { Header, Body, Controller, Get, Headers, HttpException, Param, Post, Put, Query, Req, UseGuards, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Public } from '../auth/public.decorator';
import { DemoStore } from './demo-store';
import { RegistryService, RegistryWorkspace, relativeLevels, selectRecords } from '../modules/registry/registry.service';
import { RegistrySnapshot } from '../modules/registry/registry.types';
import { RegistryQueryDto } from '../modules/registry/registry-query.dto';
import { UpdateReviewDto } from '../modules/registry/review.dto';
import { recordFingerprint } from '../modules/registry/governance';
@Injectable()
export class DemoBoundary implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (process.env.DEMO_ENABLED === 'false') throw new HttpException('Demo temporarily unavailable', 503);
    const origin = req.headers.origin;
    if (origin && origin !== (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000')) throw new HttpException('Origin rejected', 403);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !req.is('application/json')) throw new HttpException('Use application/json', 415);
    ctx.switchToHttp().getResponse().setHeader('Cache-Control', 'no-store');
    return true;
  }
}
@Controller('demo-api')
@UseGuards(DemoBoundary)
export class DemoController {
  private snapshot: RegistrySnapshot;
  constructor(private readonly store: DemoStore<RegistryWorkspace>, private readonly reader: RegistryService) {
    const full=join(process.cwd(), 'registry-data/gleif-snapshot.json');
    const bundled=join(process.cwd(), 'demo-data/gleif-snapshot.json');
    this.snapshot = JSON.parse(readFileSync(existsSync(full)?full:bundled, 'utf8'));
    if (!this.snapshot.entities?.length || this.snapshot.entities.length > 3000) throw new Error('Invalid demo snapshot');
  }
  private seed(): RegistryWorkspace {
    const { entities, ...metadata } = this.snapshot;
    const record = entities[0]; const at = new Date().toISOString();
    return { metadata, records: entities, reviews: [{ lei: record.lei, state: { version: 1, status: 'open', owner: 'Demo review team', dueDate: '2026-11-16', note: 'Synthetic review task: compare the published parent evidence and document the next action.', recordHash: recordFingerprint(record), updatedAt: at, history: [] } }] };
  }
  @Public() @Post('session') create(@Headers('idempotency-key') key: string, @Req() req: Request) {
    const s = this.store.create(key, req.socket.remoteAddress ?? 'local', () => this.seed());
    return { token: s.token, idleSeconds: this.store.idle / 1000, maxSeconds: this.store.maximum / 1000 };
  }
  @Public() @Get('auth/me') me(@Headers('authorization') token: string) {
    this.store.get(token); return { sub: 'demo', fullName: 'Demo visitor', email: '', role: 'demo' };
  }
  @Public() @Post('reset') reset(@Headers('authorization') token: string) { this.store.get(token).state = this.seed(); return { reset: true }; }
  @Public() @Post('exit') exit(@Headers('authorization') token: string) { this.store.exit(this.store.get(token)); return { exited: true }; }
  @Public() @Get('registry') list(@Headers('authorization') token: string, @Query() q: RegistryQueryDto) { return this.reader.list(q, this.store.get(token).state); }
  @Public() @Get('registry/company-options') options(@Headers('authorization') token: string) { return this.reader.companyOptions(this.store.get(token).state); }
  @Public() @Get('registry/changes') changes(@Headers('authorization') token: string) { this.store.get(token); return { changes: null, orphanedReviews: [] }; }
  @Public() @Get('registry/aggregate') aggregate(@Headers('authorization') token: string, @Query() q: RegistryQueryDto) {
    const w = this.store.get(token).state;
    const levels = relativeLevels(w.records, q.root); const grouped = new Map<string, { country: string; registrationStatus: string; level: string | null; count: number }>();
    for (const r of selectRecords(w.records, q)) {
      const row = { country: r.country, registrationStatus: r.registrationStatus, level: levels.get(r.lei) ?? null, count: 0 }; const key = JSON.stringify(row);
      if (!grouped.has(key)) grouped.set(key, row); grouped.get(key)!.count++;
    }
    const rows = [...grouped.values()]; return { rows, total: rows.reduce((n, r) => n + r.count, 0), fetchedAt: w.metadata.fetchedAt };
  }
  @Public() @Get('registry/export') @Header('Content-Type', 'text/csv; charset=utf-8') @Header('Content-Disposition', 'attachment; filename=demo-entity-review.csv') export(@Headers('authorization') token: string, @Query() q: RegistryQueryDto) { return this.reader.export(q, this.store.get(token).state); }
  @Public() @Get('registry/:lei') detail(@Headers('authorization') token: string, @Param('lei') lei: string) { return this.reader.detail(lei, this.store.get(token).state); }
  @Public() @Put('registry/:lei/review') review(@Headers('authorization') token: string, @Param('lei') lei: string, @Body() dto: UpdateReviewDto) {
    const w = this.store.get(token).state; const record = w.records.find(r => r.lei === lei);
    if (!record) throw new HttpException('Entity not found', 404);
    if (!Number.isFinite(Date.parse(dto.dueDate)) || new Date(dto.dueDate).toISOString().slice(0, 10) !== dto.dueDate) throw new HttpException('Invalid calendar date', 400);
    const old = w.reviews.find(r => r.lei === lei);
    if ((old?.state.version ?? 0) !== dto.version || recordFingerprint(record) !== dto.evidenceVersion) throw new HttpException('Reload the latest evidence and review', 409);
    if ((!old && w.reviews.length >= 50) || (old?.state.history.length ?? 0) >= 30) throw new HttpException('Demo review limit reached. Reset to continue.', 429);
    const at = new Date().toISOString(); const recordHash = recordFingerprint(record);
    const state = { ...dto, version: dto.version + 1, recordHash, updatedAt: at, history: [...(old?.state.history ?? []), { ...dto, version: dto.version + 1, recordHash, actor: 'Demo visitor', at }] };
    if (old) old.state = state; else w.reviews.push({ lei, state }); return state;
  }
}
