const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const filename = path.resolve(__dirname, '../src/lib/recent-companies.ts');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { orderCompanies, readRecentCompanies, rememberCompanies } = loaded.exports;
const lei = (i) => String(i).padStart(20, '0');
test('history tolerates malformed storage, deduplicates and stays bounded', () => {
  for (const raw of ['bad', '{}', 'null', '[1,"bad-lei"]']) assert.deepEqual(readRecentCompanies(raw), []);
  assert.deepEqual(readRecentCompanies(JSON.stringify([lei(1), lei(1)])), [lei(1)]);
  assert.equal(rememberCompanies(Array.from({length:12}, (_, i) => lei(i)), [lei(9)]).length, 8);
});
test('newly selected company is first; clearing and missing companies cannot hide records', () => {
  const options = [{lei:lei(1),label:'Zebra',featured:true}, {lei:lei(2),label:'Apple',featured:false}, {lei:lei(3),label:'Microsoft',featured:false}];
  assert.deepEqual(orderCompanies(options, []).map((o) => o.label), ['Apple','Microsoft','Zebra']);
  const recent = rememberCompanies([lei(1)], [lei(3)]);
  assert.deepEqual(orderCompanies(options, recent).map((o) => o.label), ['Microsoft','Zebra','Apple']);
  assert.equal(orderCompanies(options, [lei(99)]).length, 3);
  assert.equal(options[0].label, 'Zebra');
});
