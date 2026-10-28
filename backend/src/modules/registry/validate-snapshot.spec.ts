import 'reflect-metadata';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { RegistrySnapshot } from './registry.types';
import { snapshotHash, validateSnapshot } from './validate-snapshot';
const snapshot = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../registry-data/gleif-snapshot.json'),
    'utf8',
  ),
) as RegistrySnapshot;
describe('Snapshot import validation', () => {
  it('accepts the checked-in sourced snapshot', () =>
    expect(() => validateSnapshot(snapshot)).not.toThrow());
  it('rejects modified content before import', () => {
    const s = structuredClone(snapshot);
    s.entities[0].legalName = 'Tampered';
    expect(() => validateSnapshot(s)).toThrow('hash mismatch');
  });
  it('rejects duplicate LEIs even with a recomputed hash', () => {
    const s = structuredClone(snapshot);
    s.entities.push(s.entities[0]);
    s.contentHash = snapshotHash(s.entities);
    expect(() => validateSnapshot(s)).toThrow('duplicate LEI');
  });
  it('rejects a source URL outside the official entity endpoint', () => {
    const s = structuredClone(snapshot);
    s.entities[0].sourceUrl = 'https://example.com';
    s.contentHash = snapshotHash(s.entities);
    expect(() => validateSnapshot(s)).toThrow('Invalid entity');
  });
  it('keeps an outside-scope parent reference but rejects self and multi-node cycles', () => {
    const s = structuredClone(snapshot);
    const child = s.entities[0];
    const second = s.entities[1];
    const evidence = (from: string, to: string) => ({
      kind: 'relationship' as const,
      sourceUrl: null,
      record: {
        attributes: {
          relationship: {
            startNode: { id: from },
            endNode: { id: to },
            type: 'IS_DIRECTLY_CONSOLIDATED_BY',
            status: 'ACTIVE',
          },
          registration: { status: 'PUBLISHED' },
        },
      },
    });
    child.parents.direct = evidence(child.lei, 'ZZZZZZZZZZZZZZZZZZZZ');
    s.contentHash = snapshotHash(s.entities);
    expect(() => validateSnapshot(s)).not.toThrow();
    child.parents.direct = evidence(child.lei, child.lei);
    s.contentHash = snapshotHash(s.entities);
    expect(() => validateSnapshot(s)).toThrow('cycle');
    child.parents.direct = evidence(child.lei, second.lei);
    second.parents.direct = evidence(second.lei, child.lei);
    s.contentHash = snapshotHash(s.entities);
    expect(() => validateSnapshot(s)).toThrow('cycle');
  });
});
