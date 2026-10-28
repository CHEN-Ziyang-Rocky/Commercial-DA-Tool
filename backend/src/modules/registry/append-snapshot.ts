import { RegistrySnapshot } from './registry.types';
import { snapshotHash, validateSnapshot } from './validate-snapshot';

// Expansion imports must not replace newer production evidence with an older local baseline.
export function appendSnapshot(current: RegistrySnapshot, incoming: RegistrySnapshot): RegistrySnapshot {
  validateSnapshot(current);
  validateSnapshot(incoming);
  const records = new Map(incoming.entities.map(r => [r.lei, r]));
  for (const record of current.entities) records.set(record.lei, record);
  const merge = <T extends { lei: string }>(old: T[], added: T[]) =>
    [...new Map([...added, ...old].map(row => [row.lei, row])).values()];
  const result: RegistrySnapshot = {
    ...incoming,
    fetchedAt: current.fetchedAt,
    scope: 'Existing reference records plus reviewed company and regional additions. Existing entity evidence is retained on overlap; retrieval dates vary by record. Bounded public reference coverage, not a client list or complete ownership register.',
    seeds: merge(current.seeds, incoming.seeds),
    coverage: merge(current.coverage, incoming.coverage),
    sourcePublishDates: [...new Set([...current.sourcePublishDates, ...incoming.sourcePublishDates])].sort(),
    entities: [...records.values()].sort((a,b) => a.lei.localeCompare(b.lei)),
  };
  result.contentHash = snapshotHash(result.entities);
  validateSnapshot(result);
  return result;
}
