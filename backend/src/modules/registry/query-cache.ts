import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { createHash } from 'crypto';
export interface AggregateRow {
  level: string | null;
  country: string;
  registrationStatus: string;
  count: number;
}
export function canonicalQuery(query: object) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(query)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [
          k,
          Array.isArray(v) ? [...new Set(v as string[])].sort() : v,
        ]),
    ),
  );
}
@Injectable()
export class QueryCache implements OnModuleDestroy {
  private client?: Redis;
  private connecting?: Promise<void>;
  private until = 0;
  private inflight = new Map<string, Promise<AggregateRow[]>>();
  readonly metrics = {
    hit: 0,
    miss: 0,
    error: 0,
    fill: 0,
    joined: 0,
    sql: 0,
    bypass: 0,
    sqlMs: 0,
    redisMs: 0,
  };
  private get enabled() {
    return process.env.CACHE_ENABLED === 'true';
  }
  private connection() {
    if (!this.client) {
      this.client = new Redis(
        process.env.REDIS_URL ?? 'redis://127.0.0.1:6380',
        {
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 0,
          connectTimeout: 200,
          commandTimeout: 200,
          retryStrategy: () => null,
        },
      );
      this.client.on('error', () => {
        this.until = Date.now() + 2000;
      });
    }
    return this.client;
  }
  async read(
    version: string,
    query: object,
    loader: () => Promise<AggregateRow[]>,
    eligible = true,
  ): Promise<AggregateRow[]> {
    const load = async () => {
      this.metrics.sql++;
      const start = performance.now();
      try {
        return await loader();
      } finally {
        this.metrics.sqlMs += performance.now() - start;
      }
    };
    if (!this.enabled || !eligible) {
      this.metrics.bypass++;
      return load();
    }
    const key = `commercial-da:${process.env.CACHE_NAMESPACE ?? 'local:shared'}:aggregate-v1:${version}:${createHash('sha256').update(canonicalQuery(query)).digest('hex')}`;
    const pending = this.inflight.get(key);
    if (pending !== undefined) {
      this.metrics.joined++;
      return pending;
    }
    const task = (async () => {
      let redis: Redis | undefined;
      const readStarted = performance.now();
      try {
        if (Date.now() < this.until) throw Error('Circuit open');
        redis = this.connection();
        if (redis.status !== 'ready') {
          if (this.connecting === undefined) {
            // connectTimeout covers TCP, not every readiness handshake. Bound the whole wait.
            let timeout: NodeJS.Timeout;
            const client = redis;
            this.connecting = Promise.race([
              client.connect(),
              new Promise<void>((_, reject) => {
                timeout = setTimeout(() => {
                  reject(Error('Redis readiness timeout'));
                  client.disconnect();
                }, 250);
              }),
            ]).finally(() => {
              clearTimeout(timeout);
              this.connecting = undefined;
            });
          }
          await this.connecting;
        }
        const text = await redis.get(key);
        if (text) {
          const payload = JSON.parse(text) as {
            schema: number;
            rows: AggregateRow[];
          };
          if (
            payload.schema !== 1 ||
            !Array.isArray(payload.rows) ||
            !payload.rows.every(
              (r) =>
                typeof r.country === 'string' &&
                typeof r.registrationStatus === 'string' &&
                Number.isSafeInteger(r.count) &&
                r.count >= 0 &&
                (r.level === null || ['1', '2', '3'].includes(r.level)),
            )
          )
            throw Error('Invalid cache payload');
          this.metrics.hit++;
          return payload.rows.map(
            ({ level, country, registrationStatus, count }) => ({
              level,
              country,
              registrationStatus,
              count,
            }),
          );
        }
        this.metrics.miss++;
      } catch {
        this.metrics.error++;
        // Circuit bypasses must not slide the retry deadline forever under traffic.
        if (Date.now() >= this.until) this.until = Date.now() + 2000;
        redis = undefined;
      } finally {
        this.metrics.redisMs += performance.now() - readStarted;
      }
      const rows = await load();
      const text = JSON.stringify({ schema: 1, rows });
      if (redis && Buffer.byteLength(text) <= 256 * 1024) {
        const fillStarted = performance.now();
        try {
          // Bounded shared admission counter per minute; old values expire naturally.
          const budget = `commercial-da:${process.env.CACHE_NAMESPACE ?? 'local:shared'}:admission:${Math.floor(Date.now() / 60000)}`;
          const count = Number(
            await redis.eval(
              "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],120) end; return n",
              1,
              budget,
            ),
          );
          if (count <= 200) {
            await redis.set(
              key,
              text,
              'EX',
              60 + Math.floor(Math.random() * 15),
            );
            this.metrics.fill++;
          }
        } catch {
          this.metrics.error++;
          this.until = Date.now() + 2000;
        } finally {
          this.metrics.redisMs += performance.now() - fillStarted;
        }
      }
      return rows;
    })();
    this.inflight.set(key, task);
    try {
      return await task;
    } finally {
      this.inflight.delete(key);
    }
  }
  status() {
    return {
      processMemory: process.memoryUsage(),
      processCpu: process.cpuUsage(),
      enabled: this.enabled,
      degraded: Date.now() < this.until,
      ...this.metrics,
    };
  }
  onModuleDestroy() {
    this.client?.disconnect();
  }
}
