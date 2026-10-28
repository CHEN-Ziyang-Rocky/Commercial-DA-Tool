import { readFileSync } from 'fs';
import { resolve } from 'path';
import { appendSnapshot } from './append-snapshot';
import { snapshotHash } from './validate-snapshot';
import { RegistrySnapshot } from './registry.types';
const source = JSON.parse(readFileSync(resolve(__dirname, '../../../registry-data/gleif-snapshot.json'), 'utf8')) as RegistrySnapshot;
function snapshot(rows: RegistrySnapshot['entities']): RegistrySnapshot {
  return {...source, seeds: [], coverage: [], entities: rows.map(r => ({...r, groups: []})), contentHash: snapshotHash(rows.map(r => ({...r, groups: []})))};
}
it('preserves production evidence and retains every existing entity during expansion', () => {
  const current = snapshot(source.entities.slice(0,2));
  current.entities[0].legalName = 'Existing updated legal name';
  current.contentHash = snapshotHash(current.entities);
  const incoming = snapshot(source.entities.slice(0,3));
  const combined = appendSnapshot(current,incoming);
  expect(combined.entities).toHaveLength(3);
  expect(combined.entities.find(r=>r.lei===current.entities[0].lei)).toEqual(current.entities[0]);
  expect(combined.fetchedAt).toBe(current.fetchedAt);
  expect(appendSnapshot(combined,incoming).contentHash).toBe(combined.contentHash);
});
it('rejects an invalid incoming snapshot before merging', () => {
  expect(()=>appendSnapshot(snapshot(source.entities.slice(0,1)), {...source,contentHash:'0'.repeat(64)})).toThrow('hash mismatch');
});
