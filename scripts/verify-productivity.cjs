/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS Node verification script. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const XLSX = require('xlsx');

const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const file = path.join(__dirname, '../src/lib', `${name}.ts`);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const compiledModule = { exports: {} };
  const localRequire = (id) => id.startsWith('./') ? load(id.slice(2)) : require(id);
  vm.runInNewContext(code, { module: compiledModule, exports: compiledModule.exports, require: localRequire }, { filename: file });
  cache.set(name, compiledModule.exports);
  return compiledModule.exports;
}
const { parseKpiWorkbook, scoreProductivity, refreshSavedAgent, demoData } = load('agent-kpi');
const { readCallActivities, durationMinutes } = load('call-productivity');
assert.equal(durationMinutes(3600), 60);
assert.equal(durationMinutes('01:30:00'), 90);
assert.equal(durationMinutes(''), null);
assert.equal(durationMinutes(-1), null);
assert.equal(scoreProductivity(demoData)[0].finalKpi, null);
assert.equal(scoreProductivity(demoData)[0].status, 'REVIEW');

if (process.argv[2]) {
  const workbook = XLSX.read(fs.readFileSync(process.argv[2]), { type: 'buffer', cellStyles: true });
  const activities = readCallActivities(workbook);
  const agents = parseKpiWorkbook(workbook);
  assert.equal(activities.size, 40);
  assert.equal(agents.length, 36); // Only the KPI roster is eligible; extra call-export rows stay excluded.
  const sariza = agents.find((a) => a.name === 'Sariza');
  const vodka = agents.find((a) => a.name === 'Vodka Tan Woo Fung');
  assert.equal(sariza.totalCalls, 712);
  assert.equal(vodka.totalCalls, 420);
  assert.ok(Math.abs(sariza.productivityRate - 24.244209938668384) < 1e-8);
  assert.equal(sariza.productivityScore, 20);
  assert.ok(sariza.productivityScore > vodka.productivityScore);
  assert.notEqual(agents.find((a) => a.name === 'Nurhidayah').inboundAnswered, agents.find((a) => a.name === 'Nur Hidayah').inboundAnswered);
  assert.ok(agents.every((a) => a.productivityRate !== null && a.finalKpi >= 0 && a.finalKpi <= 100));
  assert.ok(agents.filter((a) => a.otherNonVoice).every((a) => a.awayScore === 6));
  assert.ok(agents.every((a) => Math.abs(a.finalKpi - (a.productivityScore + a.feedbackScore + a.attendanceScore + a.lateScore + a.awayScore + a.qaScore)) < 0.011));
  const refreshed = scoreProductivity(agents.map(refreshSavedAgent));
  agents.forEach((a, i) => { for (const key of Object.keys(a)) assert.equal(refreshed[i][key], a[key], key); });
  const missing = scoreProductivity([refreshSavedAgent({ ...sariza, inboundHandlingMinutes: null })])[0];
  assert.equal(missing.finalKpi, null);
  assert.equal(missing.status, 'REVIEW');
  const zero = scoreProductivity([refreshSavedAgent({ ...sariza, inboundHandlingMinutes: 0, outboundHandlingMinutes: 0 })])[0];
  assert.equal(zero.productivityScore, 0);
  assert.ok(Number.isFinite(zero.finalKpi));
  const invalid = XLSX.read(fs.readFileSync(process.argv[2]), { type: 'buffer' });
  invalid.Sheets.Sheet2.U2.v = -10;
  assert.throws(() => readCallActivities(invalid), /invalid call data/);
  const duplicate = XLSX.read(fs.readFileSync(process.argv[2]), { type: 'buffer' });
  duplicate.Sheets.Sheet2.A3.v = duplicate.Sheets.Sheet2.A2.v;
  assert.throws(() => readCallActivities(duplicate), /Duplicate call details/);
  console.log(JSON.stringify({ agents: agents.length, callRows: activities.size, sariza: { calls: sariza.totalCalls, productivity: sariza.productivityRate, points: sariza.productivityScore, finalKpi: sariza.finalKpi }, topProductive: [...agents].sort((a,b) => b.productivityRate-a.productivityRate).slice(0,3).map((a) => a.name) }));
}
console.log('Productivity checks passed.');
