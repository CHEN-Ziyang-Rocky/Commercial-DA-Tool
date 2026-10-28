import { RegistryRecord, publishedParent } from './registry.types';
export interface SnapshotChange {
  lei: string;
  legalName: string;
  kind: 'added' | 'removed' | 'changed';
  fields: { field: string; before: string; after: string }[];
}
export interface ChangeSet {
  comparedAt: string;
  previousFetchedAt: string | null;
  currentFetchedAt: string;
  initial: boolean;
  added: number;
  removed: number;
  changed: number;
  entries: SnapshotChange[];
}
function businessFields(r: RegistryRecord): Record<string, string> {
  return {
    legalName: r.legalName,
    country: r.country,
    city: r.city,
    entityStatus: r.entityStatus,
    registrationStatus: r.registrationStatus,
    nextRenewal: r.nextRenewal ?? '',
    directParent: publishedParent(r.parents.direct) ?? '',
    ultimateParent: publishedParent(r.parents.ultimate) ?? '',
    directEvidence: r.parents.direct.kind,
    ultimateEvidence: r.parents.ultimate.kind,
  };
}
export function snapshotDiff(
  before: RegistryRecord[],
  after: RegistryRecord[],
): SnapshotChange[] {
  const old = new Map(before.map((r) => [r.lei, r]));
  const next = new Map(after.map((r) => [r.lei, r]));
  const entries: SnapshotChange[] = [];
  for (const r of after) {
    const previous = old.get(r.lei);
    if (!previous) {
      entries.push({
        lei: r.lei,
        legalName: r.legalName,
        kind: 'added',
        fields: [],
      });
      continue;
    }
    const a = businessFields(previous),
      b = businessFields(r);
    const fields = Object.keys(b)
      .filter((k) => a[k] !== b[k])
      .map((field) => ({ field, before: a[field], after: b[field] }));
    if (fields.length)
      entries.push({
        lei: r.lei,
        legalName: r.legalName,
        kind: 'changed',
        fields,
      });
  }
  for (const r of before)
    if (!next.has(r.lei))
      entries.push({
        lei: r.lei,
        legalName: r.legalName,
        kind: 'removed',
        fields: [],
      });
  return entries;
}
