import { randomBytes } from 'crypto';
import { HttpException, Injectable, OnModuleDestroy } from '@nestjs/common';
export function setting(name: string, fallback: number) {
  const n = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error(`Invalid ${name}`);
  return n;
}
export interface DemoSession<T> { token: string; key: string; created: number; touched: number; state: T; hits: number[]; }
@Injectable()
export class DemoStore<T = unknown> implements OnModuleDestroy {
  readonly idle = setting('DEMO_IDLE_SECONDS', 3600) * 1000;
  readonly maximum = setting('DEMO_MAX_SECONDS', 86400) * 1000;
  readonly capacity = setting('DEMO_MAX_SESSIONS', 200);
  readonly createLimit = setting('DEMO_CREATE_PER_HOUR', 20);
  readonly requestLimit = setting('DEMO_REQUESTS_PER_MINUTE', 180);
  private sessions = new Map<string, DemoSession<T>>();
  private attempts = new Map<string, number[]>();
  private timer = setInterval(() => this.cleanup(), setting('DEMO_CLEANUP_SECONDS', 60) * 1000).unref();
  onModuleDestroy() { clearInterval(this.timer); }
  private alive(s: DemoSession<T>, now: number) { return now - s.touched < this.idle && now - s.created < this.maximum; }
  cleanup(now = Date.now()) {
    for (const [token, s] of this.sessions) if (!this.alive(s, now)) this.sessions.delete(token);
    for (const [ip, hits] of this.attempts) {
      const recent = hits.filter(t => now - t < 3600000);
      if (!recent.length) this.attempts.delete(ip); else this.attempts.set(ip, recent);
    }
  }
  create(key: string, ip: string, seed: () => T, now = Date.now()) {
    if (!/^[a-f0-9]{64}$/.test(key ?? '')) throw new HttpException('A random Idempotency-Key is required', 400);
    this.cleanup(now);
    const existing = [...this.sessions.values()].find(s => s.key === key);
    if (existing) return existing;
    const hits = this.attempts.get(ip) ?? [];
    if (hits.length >= this.createLimit || this.attempts.size >= 10000 && !this.attempts.has(ip)) throw new HttpException('Demo creation limit reached. Retry later.', 429);
    hits.push(now); this.attempts.set(ip, hits);
    if (this.sessions.size >= this.capacity) throw new HttpException('Demo is busy. Retry later.', 503);
    const s = { token: randomBytes(32).toString('hex'), key, created: now, touched: now, state: seed(), hits: [] };
    this.sessions.set(s.token, s); return s;
  }
  get(header: string | undefined, now = Date.now()) {
    const token = header?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    const s = token ? this.sessions.get(token) : undefined;
    if (!s || !this.alive(s, now)) { if (token) this.sessions.delete(token); throw new HttpException('Demo expired. Return to Try Demo.', 401); }
    s.hits = s.hits.filter(t => now - t < 60000);
    if (s.hits.length >= this.requestLimit) throw new HttpException('Demo request limit reached. Retry in a minute.', 429);
    s.hits.push(now); s.touched = now; return s;
  }
  exit(s: DemoSession<T>) { this.sessions.delete(s.token); }
}
