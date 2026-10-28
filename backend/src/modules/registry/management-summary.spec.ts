import { managementSummary } from './management-summary';
import { planDemoReviews } from './demo-reviews';
import { recordFingerprint, reviewIsStale } from './governance';
import { RegistryRecord } from './registry.types';
const now = Date.parse('2026-10-28T12:00:00Z');
const record = (index: number, nextRenewal: string | null, entityStatus = 'ACTIVE'): RegistryRecord => ({
  lei: String(index).padStart(20, '0'), legalName: `Entity ${index}`, otherNames: [], country: index % 2 ? 'HK' : 'US',
  city: 'Test', jurisdiction: 'HK', category: 'GENERAL', registrationStatus: 'ISSUED', entityStatus,
  nextRenewal, lastUpdate: '2026-10-27', createdAt: null, groups: [], sourceUrl: 'https://api.gleif.org/', contextOnly: false,
  parents: { direct: { kind: 'unavailable', sourceUrl: null, record: null }, ultimate: { kind: 'unavailable', sourceUrl: null, record: null } },
});
describe('Management overview and demonstration tasks', () => {
  it('partitions every scoped entity into exactly one renewal bucket, including unknown and inactive', () => {
    const records = [record(1, '2026-10-27'), record(2, '2026-11-01'), record(3, '2026-12-10'), record(4, '2027-05-01'), record(5, null), record(6, '2020-01-01', 'INACTIVE')];
    const result = managementSummary(records, records, [], now);
    expect(result.renewalBuckets.map((b) => b.count)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(result.countries).toBe(2);
    expect(result.reviewQueue).toEqual([]);
    expect(managementSummary([], records, [], now).renewalBuckets.every((b) => b.count === 0)).toBe(true);
  });
  it('creates four labeled scenarios without changing public evidence and preserves existing work on repeat', () => {
    const records = Array.from({ length: 6 }, (_, i) => record(i, '2027-05-01'));
    const hashes = records.map(recordFingerprint);
    const existing = [{ lei: records[0].lei, state: { recordHash: hashes[0] } as never }];
    const plan = planDemoReviews(records, existing, now);
    expect(plan).toHaveLength(4);
    expect(plan.every((r) => r.lei !== records[0].lei)).toBe(true);
    expect(records.map(recordFingerprint)).toEqual(hashes);
    expect(planDemoReviews(records, [...existing, ...plan], now)).toEqual([]);
    expect(plan.filter((r) => reviewIsStale(r.state, records.find((e) => e.lei === r.lei)))).toHaveLength(1);
    expect(plan.find((r) => r.state.demo?.scenario === 'evidence_changed')!.state.demo!.simulatedPriorEvidence).toBe(true);
    const summary = managementSummary(records, records, plan, now);
    expect(summary.demoReviews).toBe(4);
    expect(summary.reviewQueue[0].stale).toBe(true);
    expect(summary.reviewQueue[1].overdue).toBe(true);
    const scoped = managementSummary([records[0]], records, plan, now);
    expect(scoped.demoReviews).toBe(0);
  });
  it('fails before writing when too few unused entities are available', () => {
    expect(() => planDemoReviews([record(1, null)], [], now)).toThrow('Not enough');
  });
  it('expands to ten tasks per scenario without resetting assessments, dates or history', () => {
    const records = Array.from({ length: 50 }, (_, i) => record(i, '2027-05-01'));
    const original = planDemoReviews(records, [], now);
    const before = JSON.stringify(original);
    const added = planDemoReviews(records, original, now, 10);
    expect(added).toHaveLength(36);
    expect(JSON.stringify(original)).toBe(before);
    const all = [...original, ...added];
    expect(new Set(all.map((r) => r.lei)).size).toBe(40);
    for (const scenario of ['open', 'overdue', 'evidence_changed', 'reviewed'])
      expect(all.filter((r) => r.state.demo?.scenario === scenario)).toHaveLength(10);
    expect(planDemoReviews(records, all, now + 86400000, 10)).toEqual([]);
    expect(new Set(added.map((r) => r.state.dueDate)).size).toBeGreaterThan(3);
    for (const invalid of [0, 26, NaN, 2.5]) expect(() => planDemoReviews(records, [], now, invalid)).toThrow('Per-scenario');
  });
});
