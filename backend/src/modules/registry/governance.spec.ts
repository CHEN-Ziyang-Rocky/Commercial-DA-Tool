import {
  renewalBucket,
  recordFingerprint,
  reviewIsStale,
  ReviewState,
} from './governance';
import { RegistryRecord } from './registry.types';
const now = Date.parse('2026-10-21T00:00:00Z');
const row = (nextRenewal: string | null, entityStatus = 'ACTIVE') =>
  ({ nextRenewal, entityStatus }) as RegistryRecord;
describe('Management date and evidence rules', () => {
  it('separates overdue, upcoming, unknown and inactive records at precise boundaries', () => {
    expect(renewalBucket(row('2026-10-20T23:59:59Z'), now)).toBe('overdue');
    expect(renewalBucket(row('2026-10-21T00:00:00Z'), now)).toBe('due-30');
    expect(renewalBucket(row('2026-11-20T00:00:00Z'), now)).toBe('due-30');
    expect(renewalBucket(row('2026-11-20T00:00:01Z'), now)).toBe('due-90');
    expect(renewalBucket(row('2027-01-19T00:00:00Z'), now)).toBe('due-90');
    expect(renewalBucket(row('2027-01-20'), now)).toBe('later');
    expect(renewalBucket(row(null), now)).toBe('unknown');
    expect(renewalBucket(row('invalid'), now)).toBe('unknown');
    expect(renewalBucket(row('2020-01-01', 'INACTIVE'), now)).toBe(
      'not-applicable',
    );
  });
  it('ignores JSON key ordering but invalidates reviews when evidence changes or disappears', () => {
    const a = row('2027-01-01');
    const b = {
      entityStatus: 'ACTIVE',
      nextRenewal: '2027-01-01',
    } as RegistryRecord;
    expect(recordFingerprint(a)).toBe(recordFingerprint(b));
    const state = { recordHash: recordFingerprint(a) } as ReviewState;
    expect(reviewIsStale(state, b)).toBe(false);
    expect(reviewIsStale(state, row('2028-01-01'))).toBe(true);
    expect(reviewIsStale(state)).toBe(true);
  });
});
