const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const filename = path.resolve(__dirname, '../src/lib/company-options.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled, filename);
const { filterCompanies } = loaded.exports;
const options = Array.from({ length: 2708 }, (_, i) => ({
  lei: String(i).padStart(20, '0'), label: `Company ${i}`, legalName: `Legal entity ${i}`,
  otherNames: i === 2707 ? ['末尾公司', 'Former final name'] : [],
  country: 'HK', sector: '', featured: i < 15,
}));
const find = (inputValue) => filterCompanies(options, { inputValue, getOptionLabel: (o) => o.label });
test('empty dropdown includes every entity, including those beyond 80 and the last row', () => {
  assert.deepEqual(find(''), options);
});
test('broad search never truncates matches', () => {
  assert.equal(find('Company').length, 2708);
});
test('last nonfeatured entity is searchable by label, legal name, alias and LEI', () => {
  for (const query of ['Company 2707', 'Legal entity 2707', '末尾公司', 'former final name', options[2707].lei]) {
    assert.deepEqual(find(query), [options[2707]]);
  }
});
test('search ignores surrounding whitespace and case; unknown names have no matches', () => {
  assert.deepEqual(find('  FORMER FINAL NAME  '), [options[2707]]);
  assert.deepEqual(find('not-a-recorded-company'), []);
});
test('every actual snapshot entity remains browseable and searchable by its own LEI', () => {
  const snapshot = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../backend/registry-data/gleif-snapshot.json'), 'utf8'));
  const featured = new Map(snapshot.seeds.map((s) => [s.lei, s]));
  const actual = snapshot.entities.map((r) => ({ ...r, label: featured.get(r.lei)?.label ?? r.legalName }));
  const state = { inputValue: '', getOptionLabel: (o) => o.label };
  assert.equal(filterCompanies(actual, state).length, actual.length);
  for (const entity of actual) {
    const found = filterCompanies(actual, { ...state, inputValue: entity.lei });
    assert.ok(found.some((o) => o.lei === entity.lei), entity.lei);
  }
});
