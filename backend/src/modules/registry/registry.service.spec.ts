import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegistryQueryDto } from './registry-query.dto';
import {
  ancestorsOf,
  portfolioMembers,
  companyOptions,
  csvCell,
  reviewFlags,
  selectRecords,
} from './registry.service';
import { RegistryRecord, publishedParent } from './registry.types';
const fixture = (lei: string, parent?: string): RegistryRecord => ({
  lei,
  legalName: lei,
  otherNames: ['Former name'],
  country: 'HK',
  city: 'Hong Kong',
  jurisdiction: 'HK',
  category: 'GENERAL',
  entityStatus: 'ACTIVE',
  registrationStatus: 'ISSUED',
  lastUpdate: '2026-10-20T00:00:00Z',
  nextRenewal: '2099-01-01T00:00:00Z',
  createdAt: null,
  groups: ['AAAAAAAAAAAAAAAAAAAA'],
  sourceUrl: `https://api.gleif.org/api/v1/lei-records/${lei}`,
  contextOnly: false,
  parents: {
    direct: parent
      ? {
          kind: 'relationship',
          sourceUrl: null,
          record: {
            attributes: {
              relationship: {
                startNode: { id: lei },
                endNode: { id: parent },
                status: 'ACTIVE',
                type: 'IS_DIRECTLY_CONSOLIDATED_BY',
              },
              registration: { status: 'PUBLISHED' },
            },
          },
        }
      : { kind: 'exception', sourceUrl: null, record: null },
    ultimate: { kind: 'unavailable', sourceUrl: null, record: null },
  },
});
describe('Registry semantics', () => {
  const a = fixture('AAAAAAAAAAAAAAAAAAAA');
  const b = fixture('BBBBBBBBBBBBBBBBBBBB', a.lei);
  it('combines arbitrary roots without counting overlapping descendants twice', () => {
    const c = fixture('CCCCCCCCCCCCCCCCCCCC', b.lei);
    const d = fixture('DDDDDDDDDDDDDDDDDDDD', c.lei);
    const other = fixture('EEEEEEEEEEEEEEEEEEEE');
    expect([...portfolioMembers([a,b,c,d,other], [a.lei,b.lei,a.lei])].sort()).toEqual([a.lei,b.lei,c.lei,d.lei]);
    expect(selectRecords([a,b,c,d,other], { ...new RegistryQueryDto(), portfolio: [a.lei,b.lei] })).toHaveLength(4);
    expect(selectRecords([a,b,c,d], { ...new RegistryQueryDto(), portfolio: [a.lei] })).toHaveLength(3);
    expect(selectRecords([a,b,c,d], { ...new RegistryQueryDto(), portfolio: [a.lei], root: b.lei })).toHaveLength(2);
    expect(selectRecords([a,b], { ...new RegistryQueryDto(), portfolio: ['ZZZZZZZZZZZZZZZZZZZZ'] })).toHaveLength(0);
  });
  it('does not use brand membership or unpublished links to expand a review portfolio', () => {
    const inactive = structuredClone(b);
    if (inactive.parents.direct.record && !Array.isArray(inactive.parents.direct.record))
      inactive.parents.direct.record.attributes.registration = { status: 'LAPSED' };
    expect(selectRecords([a,inactive], { ...new RegistryQueryDto(), portfolio: [a.lei] }).map(r => r.lei)).toEqual([a.lei]);
    expect(selectRecords([a,inactive], { ...new RegistryQueryDto(), group: a.lei })).toHaveLength(2);
  });
  it('lists every recorded entity, including non-seeds, with curated shortcuts first', () => {
    const options = companyOptions([b,a], [{lei:a.lei,label:'Featured 示例',sector:'Demo'}]);
    expect(options.map(o => o.lei)).toEqual([a.lei,b.lei]);
    expect(options[0].label).toBe('Featured 示例');
    expect(options[1]).toMatchObject({legalName:b.legalName, otherNames:b.otherNames, featured:false});
  });
  it('accepts repeated portfolio parameters but rejects excessive or malformed scopes', () => {
    expect(validateSync(plainToInstance(RegistryQueryDto, {portfolio:a.lei}))).toEqual([]);
    expect(validateSync(plainToInstance(RegistryQueryDto, {portfolio:[a.lei,b.lei]}))).toEqual([]);
    for (const portfolio of [Array(11).fill(a.lei), ['bad-lei'], {bad:a.lei}])
      expect(validateSync(plainToInstance(RegistryQueryDto, {portfolio})).length).toBeGreaterThan(0);
  });
  it('finds former names and combines filters', () => {
    expect(
      selectRecords([a, b], {
        ...new RegistryQueryDto(),
        q: 'former',
        country: ['HK'],
        group: a.lei,
      }),
    ).toHaveLength(2);
    expect(
      selectRecords([a, b], { ...new RegistryQueryDto(), country: ['SG'] }),
    ).toHaveLength(0);
  });
  it('treats wildcard input literally', () =>
    expect(
      selectRecords([a], { ...new RegistryQueryDto(), q: '%' }),
    ).toHaveLength(0));
  it('does not equate an exception to a confirmed parent or a data defect', () => {
    expect(publishedParent(a.parents.direct)).toBeNull();
    expect(reviewFlags(a)).toEqual([]);
  });
  it('excludes lapsed relationships from hierarchy', () => {
    const copy = structuredClone(b);
    if (
      copy.parents.direct.record &&
      !Array.isArray(copy.parents.direct.record)
    )
      copy.parents.direct.record.attributes.registration = { status: 'LAPSED' };
    expect(publishedParent(copy.parents.direct)).toBeNull();
    expect(reviewFlags(copy)).toContain(
      'Parent relationship not active/published',
    );
  });
  it('traverses chains and stops at cycles and scope boundaries', () => {
    expect(ancestorsOf(b.lei, [a, b]).ancestors.map((r) => r.lei)).toEqual([
      a.lei,
    ]);
    expect(ancestorsOf(b.lei, [b]).stopReason).toContain('outside');
    expect(ancestorsOf(a.lei, [fixture(a.lei, b.lei), b]).stopReason).toContain(
      'Cycle',
    );
  });
  it('escapes CSV delimiters and formulas', () => {
    expect(csvCell('hello,"world"')).toBe('"hello,""world"""');
    expect(csvCell(' =1+1')).toBe('"\' =1+1"');
  });
  it('rejects invalid query types and limits', () => {
    for (const input of [
      { q: [] },
      { country: ['HKG'] },
      { quality: 'risky' },
      { page: 0 },
      { limit: 101 },
      { group: 'HSBC' },
    ])
      expect(
        validateSync(plainToInstance(RegistryQueryDto, input)).length,
      ).toBeGreaterThan(0);
    expect(
      validateSync(plainToInstance(RegistryQueryDto, { country: 'HK' })),
    ).toEqual([]);
  });
});
