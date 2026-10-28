import { createServer, Socket } from 'net';
/* Test loaders intentionally return immediately or reject without I/O. */
/* eslint-disable @typescript-eslint/require-await */
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { QueryCache, AggregateRow } from '../src/modules/registry/query-cache';
describe('real Redis cache contracts', () => {
  const saved = { ...process.env };
  let redis: Redis;
  let cache: QueryCache;
  let prefix: string;
  const row: AggregateRow = {
    level: '1',
    country: 'HK',
    registrationStatus: 'ISSUED',
    count: 1,
  };
  beforeEach(async () => {
    process.env.CACHE_ENABLED = 'true';
    process.env.CACHE_NAMESPACE = 'test:' + randomUUID();
    prefix = 'commercial-da:' + process.env.CACHE_NAMESPACE + ':';
    redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6380/15');
    await redis.ping();
    cache = new QueryCache();
  });
  afterEach(async () => {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(
        cursor,
        'MATCH',
        prefix + '*',
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length) await redis.unlink(...keys);
    } while (cursor !== '0');
    redis.disconnect();
    cache.onModuleDestroy();
    process.env = { ...saved };
  });
  it('merges cold loads, verifies TTL and rejects corruption', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const loader = jest.fn(async () => {
      await gate;
      return [row];
    });
    const requests = Array.from({ length: 5 }, () =>
      cache.read('a', {}, loader),
    );
    release();
    await Promise.all(requests);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.status().joined).toBe(4);
    const [, keys] = await redis.scan(
      '0',
      'MATCH',
      prefix + 'aggregate*',
      'COUNT',
      1000,
    );
    const key = keys[0];
    expect(await redis.ttl(key)).toBeGreaterThan(0);
    expect(await redis.ttl(key)).toBeLessThanOrEqual(74);
    await redis.pexpire(key, 1);
    await new Promise((r) => setTimeout(r, 10));
    await cache.read('a', {}, loader);
    expect(loader).toHaveBeenCalledTimes(2);
    await redis.set(key, '{"schema":99,"rows":[]}');
    await cache.read('a', {}, loader);
    expect(cache.status().error).toBe(1);
    expect(loader).toHaveBeenCalledTimes(3);
    await redis.del(key);
    const realNow = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(realNow + 1000);
    try {
      await cache.read('a', {}, loader);
      expect(cache.status().degraded).toBe(true);
      clock.mockReturnValue(realNow + 2100);
      await cache.read('a', {}, loader);
      await cache.read('a', {}, loader);
      expect(cache.status().hit).toBeGreaterThan(0);
    } finally {
      clock.mockRestore();
    }
  });
  it('late old fills cannot poison new version; failures release flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const old = cache.read('old', {}, async () => {
      await gate;
      return [row];
    });
    const fresh = await cache.read('new', {}, async () => [
      { ...row, count: 2 },
    ]);
    release();
    await old;
    expect(fresh[0].count).toBe(2);
    expect(
      (
        await cache.read('new', {}, async () => {
          throw Error('Should hit');
        })
      )[0].count,
    ).toBe(2);
    await expect(
      cache.read('failed', {}, async () => {
        throw Error('SQL failure');
      }),
    ).rejects.toThrow('SQL failure');
    expect(await cache.read('failed', {}, async () => [row])).toEqual([row]);
  });
  it('Redis failure falls back promptly without a false hit', async () => {
    cache.onModuleDestroy();
    process.env.REDIS_URL = 'redis://127.0.0.1:1';
    cache = new QueryCache();
    const t = Date.now();
    expect(await cache.read('v', {}, async () => [row])).toEqual([row]);
    expect(Date.now() - t).toBeLessThan(1500);
    expect(cache.status().error).toBe(1);
    expect(cache.status().hit).toBe(0);
  });
  it('GET and SET errors fall back; disconnected client reconnects', async () => {
    await cache.read('ready', {}, () => Promise.resolve([row]));
    const client = (cache as unknown as { client: Redis }).client;
    const get = jest
      .spyOn(client, 'get')
      .mockRejectedValueOnce(Error('GET failed'));
    expect(
      await cache.read('get-fail', {}, () => Promise.resolve([row])),
    ).toEqual([row]);
    get.mockRestore();
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now + 3000);
    try {
      const set = jest
        .spyOn(client, 'set')
        .mockRejectedValueOnce(Error('SET failed'));
      expect(
        await cache.read('set-fail', {}, () => Promise.resolve([row])),
      ).toEqual([row]);
      set.mockRestore();
      clock.mockReturnValue(now + 6000);
      client.disconnect();
      await new Promise((r) => setTimeout(r, 20));
      expect(
        await cache.read('recovered', {}, () => Promise.resolve([row])),
      ).toEqual([row]);
      expect(
        await cache.read('recovered', {}, () =>
          Promise.reject(Error('Expected hit')),
        ),
      ).toEqual([row]);
    } finally {
      clock.mockRestore();
    }
  });
  it('bounds a silent connection timeout and retries SQL during circuit open', async () => {
    const sockets = new Set<Socket>();
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address() as { port: number };
    process.env.REDIS_URL = `redis://127.0.0.1:${address.port}`;
    cache.onModuleDestroy();
    cache = new QueryCache();
    try {
      const start = performance.now();
      expect(await cache.read('timeout', {}, async () => [row])).toEqual([row]);
      expect(performance.now() - start).toBeLessThan(1500);
      expect(cache.status().degraded).toBe(true);
      expect(await cache.read('timeout', {}, async () => [row])).toEqual([row]);
      expect(cache.status().sql).toBe(2);
      expect(cache.status().hit).toBe(0);
    } finally {
      cache.onModuleDestroy();
      sockets.forEach((s) => s.destroy());
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
