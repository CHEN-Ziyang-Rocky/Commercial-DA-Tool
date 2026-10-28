import { createHash } from 'crypto';
import { RegistryRecord } from './registry.types';
export function recordFingerprint(record: RegistryRecord) {
  const canonical = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => a.localeCompare(b, 'en'))
          .map(([k, value]) => [k, canonical(value)]),
      );
    return v;
  };
  return createHash('sha256')
    .update(JSON.stringify(canonical(record)))
    .digest('hex');
}
export function renewalBucket(r: RegistryRecord, now = Date.now()) {
  if (r.entityStatus !== 'ACTIVE') return 'not-applicable';
  if (!r.nextRenewal || !Number.isFinite(Date.parse(r.nextRenewal)))
    return 'unknown';
  const due = Date.parse(r.nextRenewal);
  if (due < now) return 'overdue';
  if (due <= now + 30 * 86400000) return 'due-30';
  if (due <= now + 90 * 86400000) return 'due-90';
  return 'later';
}
export interface ReviewState {
  demo?: {
    scenario: 'open' | 'overdue' | 'evidence_changed' | 'reviewed';
    seededAt: string;
    simulatedPriorEvidence: boolean;
  };
  version: number;
  status: 'open' | 'in_progress' | 'reviewed';
  owner: string;
  dueDate: string;
  note: string;
  recordHash: string;
  updatedAt: string;
  history: {
    version: number;
    status: string;
    owner: string;
    dueDate: string;
    note: string;
    actor: string;
    at: string;
    recordHash: string;
  }[];
}
export function reviewIsStale(state: ReviewState, record?: RegistryRecord) {
  return !record || state.recordHash !== recordFingerprint(record);
}
