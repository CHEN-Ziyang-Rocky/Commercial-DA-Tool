import { snapshotDiff } from './snapshot-diff';
import { RegistryRecord } from './registry.types';
const entity = (lei: string) =>
  ({
    lei,
    legalName: 'Example',
    country: 'HK',
    city: 'Hong Kong',
    entityStatus: 'ACTIVE',
    registrationStatus: 'ISSUED',
    nextRenewal: '2027-01-01',
    parents: {
      direct: { kind: 'exception', record: null },
      ultimate: { kind: 'exception', record: null },
    },
  }) as RegistryRecord;
describe('Snapshot business changes', () => {
  it('does not invent changes for identical snapshots or source housekeeping timestamps', () => {
    const a = entity('A');
    expect(snapshotDiff([a], [{ ...a, lastUpdate: '2026-10-21' }])).toEqual([]);
  });
  it('distinguishes scope changes from field changes with before and after evidence', () => {
    const a = entity('A'),
      b = entity('B'),
      c = entity('C');
    const delta = snapshotDiff(
      [a, b],
      [{ ...a, legalName: 'Renamed', registrationStatus: 'LAPSED' }, c],
    );
    expect(delta.map((d) => d.kind)).toEqual(['changed', 'added', 'removed']);
    expect(delta[0].fields).toEqual([
      { field: 'legalName', before: 'Example', after: 'Renamed' },
      { field: 'registrationStatus', before: 'ISSUED', after: 'LAPSED' },
    ]);
  });
});
