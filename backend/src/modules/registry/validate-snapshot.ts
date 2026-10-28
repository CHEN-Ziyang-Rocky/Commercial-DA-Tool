import { createHash } from 'crypto';
import { RegistrySnapshot, relationship } from './registry.types';
import { ancestorsOf } from './registry.service';
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export function snapshotHash(entities: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(entities)))
    .digest('hex');
}
export function validateSnapshot(snapshot: RegistrySnapshot) {
  if (
    snapshot.schemaVersion !== 1 ||
    !Array.isArray(snapshot.entities) ||
    !snapshot.entities.length ||
    snapshot.entities.length > 3000 ||
    !Number.isFinite(Date.parse(snapshot.fetchedAt)) ||
    !/^[a-f0-9]{64}$/.test(snapshot.contentHash)
  )
    throw new Error('Invalid snapshot envelope');
  if (snapshotHash(snapshot.entities) !== snapshot.contentHash)
    throw new Error('Snapshot content hash mismatch');
  const seeds = new Set(snapshot.seeds.map((s) => s.lei));
  const ids = new Set<string>();
  for (const r of snapshot.entities) {
    if (!/^[A-Z0-9]{20}$/.test(r.lei) || ids.has(r.lei))
      throw new Error('Invalid or duplicate LEI');
    ids.add(r.lei);
    if (
      (r.retrievedAt !== undefined && !Number.isFinite(Date.parse(r.retrievedAt))) ||
      !r.legalName ||
      r.legalName.length > 512 ||
      !/^[A-Z]{2}$/.test(r.country) ||
      typeof r.city !== 'string' ||
      r.city.length > 255 ||
      !Number.isFinite(Date.parse(r.lastUpdate)) ||
      (r.nextRenewal !== null && !Number.isFinite(Date.parse(r.nextRenewal))) ||
      !['ACTIVE', 'INACTIVE'].includes(r.entityStatus) ||
      typeof r.registrationStatus !== 'string' ||
      r.registrationStatus.length > 40 ||
      !Array.isArray(r.otherNames) ||
      r.otherNames.some((n) => typeof n !== 'string') ||
      !Array.isArray(r.groups) ||
      r.groups.some((g) => !seeds.has(g)) ||
      r.sourceUrl !== `https://api.gleif.org/api/v1/lei-records/${r.lei}`
    )
      throw new Error(`Invalid entity ${r.lei}`);
    for (const kind of ['direct', 'ultimate'] as const) {
      const evidence = r.parents[kind];
      if (
        !['relationship', 'exception', 'unavailable', 'not-fetched'].includes(
          evidence.kind,
        ) ||
        (evidence.sourceUrl &&
          !evidence.sourceUrl.startsWith(
            'https://api.gleif.org/api/v1/lei-records/',
          ))
      )
        throw new Error('Invalid evidence');
      const rel = relationship(evidence);
      if (
        evidence.kind === 'relationship' &&
        (!rel ||
          rel.startNode.id !== r.lei ||
          !/^[A-Z0-9]{20}$/.test(rel.endNode.id) ||
          rel.type !==
            (kind === 'direct'
              ? 'IS_DIRECTLY_CONSOLIDATED_BY'
              : 'IS_ULTIMATELY_CONSOLIDATED_BY'))
      )
        throw new Error('Relationship identity/type mismatch');
    }
  }
  for (const seed of seeds)
    if (!ids.has(seed)) throw new Error('Seed missing from snapshot');
  for (const r of snapshot.entities) {
    // A source parent can be outside this bounded snapshot. Preserve its LEI; FK stays null.
    if (ancestorsOf(r.lei, snapshot.entities).stopReason.startsWith('Cycle'))
      throw new Error('Published parent cycle');
  }
}
