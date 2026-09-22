import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import Module from 'node:module';
function load(file) {
  const full = path.resolve(file), testModule = new Module(full);
  testModule.filename = full;
  testModule.paths = Module._nodeModulePaths(path.dirname(full));
  testModule.require = function(id) { if(id==='./model')return model; return Module.prototype.require.call(this,id); };
  testModule._compile(ts.transpileModule(fs.readFileSync(full,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,full);
  return testModule.exports;
}
const model = load('src/lib/productivity/model.ts');
const {parseCallWorkbook} = load('src/lib/productivity/import.ts');
const a = {id:'synthetic:1',name:'Synthetic test',...Object.fromEntries(model.numericFields.map(k=>[k,0])),offered:100,inbound:90,attempts:20,outbound:10,inHandle:27000};
assert.equal(model.validAgents([a]),true);
assert.equal(model.validAgents([a,a]),false);
assert.equal(model.validAgents([{...a,inbound:101}]),false);
assert.equal(model.ratio(0,0),null);
assert.equal(model.inboundAht(a),300);
assert.equal(model.productivity(a,model.emptySettings()),null);
const settings={inboundMinutes:4,outboundMinutes:2,work:{[a.id]:{availableHours:10,nonVoiceMinutes:40,qa:90}}};
assert.equal(model.productivity(a,settings),70);
assert.equal(model.validSettings(settings,[a]),true);
assert.equal(model.validSettings({...settings,inboundMinutes:0},[a]),false);
assert.equal(model.productivity(a,{...settings,work:{[a.id]:{availableHours:10,nonVoiceMinutes:null,qa:null}}}),null);
assert.equal(model.validSettings({...settings,work:{unknown:{availableHours:10,nonVoiceMinutes:0,qa:90}}},[a]),false);
if(process.argv[2]) {
 const b=fs.readFileSync(process.argv[2]);
 const parsed=parseCallWorkbook(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'seconds');
 const t=model.totals(parsed.agents);
 assert.equal(parsed.agents.length,57);
 assert.equal(parsed.agents.filter(a=>model.calls(a)>0).length,49);
 assert.equal(t.inbound,10144); assert.equal(t.outbound,4427);
 assert.equal(t.offered,10368); assert.equal(t.inHandle,2708299);
 assert.equal(parsed.suggestedMonth,'2026-08');
 console.log('Uploaded report reconciles: 57 accounts, 49 active, 14,571 calls.');
}
console.log('Calculation, validation, missing-data and duplicate-agent checks passed.');
