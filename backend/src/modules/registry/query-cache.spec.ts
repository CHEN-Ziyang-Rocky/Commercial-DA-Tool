import { QueryCache, canonicalQuery } from './query-cache';
describe('query cache contract', () => {
  it('normalizes unordered sets, preserving text semantics', () => {
    expect(canonicalQuery({ country: ['HK', 'SG', 'HK'], city: ['a'] })).toBe(
      canonicalQuery({ city: ['a'], country: ['SG', 'HK'] }),
    );
    expect(canonicalQuery({ city: ['a'] })).not.toBe(
      canonicalQuery({ city: ['A'] }),
    );
  });
  it('disabled cache performs authoritative loads without a connection', async () => {
    const old = process.env.CACHE_ENABLED;
    process.env.CACHE_ENABLED = 'false';
    const c = new QueryCache();
    const load = jest.fn().mockResolvedValue([]);
    try {
      await c.read('v', {}, load);
      await c.read('v', {}, load);
      expect(load).toHaveBeenCalledTimes(2);
      expect(c.status().hit).toBe(0);
    } finally {
      c.onModuleDestroy();
      process.env.CACHE_ENABLED = old;
    }
  });
});
