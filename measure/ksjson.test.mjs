// The JSON twin and the savings rules, gated.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import K, { layersOf, splitTop, scalar, parseValue, parseObject, logicalLines, blocksOf, blockValue, toJSON, toJSONText, coverage, dictionaryOf, judgeSavings } from './ksjson.mjs';

const MD = '# Title\n## 🔷 LAYER 1: BASE\n```\nUDT:Value────\n{v:any,unit:str|null}\n```\ntext between\n```\nUDT:Range────\n{lo:num}\n```\n## 🚀 USAGE\nno fence here\n## 📡 LAYER 6: OPC\n```\nID:OPC-UA|SCOPE:interop\n```\n';
test('layersOf: the code under each heading', () => {
  assert.deepEqual(layersOf(MD), [
    { title: '🔷 LAYER 1: BASE', ks: 'UDT:Value────\n{v:any,unit:str|null}\nUDT:Range────\n{lo:num}' },
    { title: '📡 LAYER 6: OPC', ks: 'ID:OPC-UA|SCOPE:interop' },
  ]);
  assert.deepEqual(layersOf('```\nx\n```\n## A\n```\n## not a heading inside a fence\n```'), [{ title: 'A', ks: '## not a heading inside a fence' }]);
  assert.deepEqual(layersOf('## A\r\n```\r\ny\r\n```'), [{ title: 'A', ks: 'y' }]);
  assert.deepEqual(layersOf(null), []);
});

test('splitTop, scalar, parseValue, parseObject', () => {
  assert.deepEqual(splitTop('a,{b,c},[d,e],(f,g),"h,i",j', ','), ['a', '{b,c}', '[d,e]', '(f,g)', '"h,i"', 'j']);
  assert.deepEqual(splitTop('a:"b:c":d', ':'), ['a', '"b:c"', 'd']);
  assert.deepEqual(splitTop('', ','), ['']);
  assert.deepEqual(splitTop(5, ','), ['']);
  assert.equal(scalar(' 192 '), 192);
  assert.equal(scalar('-4.5'), -4.5);
  assert.equal(scalar('0A'), '0A');
  assert.equal(scalar('01'), '01', 'a leading zero stays text');
  assert.equal(scalar('1234567890123456'), '1234567890123456', 'too long for a safe number');
  assert.equal(scalar('123456789012345'), 123456789012345);
  assert.equal(scalar('"quoted"'), 'quoted');
  assert.equal(scalar('+16'), '+16');
  assert.equal(scalar(null), '');
  assert.deepEqual(parseValue('[A, B ,]'), ['A', 'B']);
  assert.deepEqual(parseValue('{a:1}'), { a: 1 });
  assert.deepEqual(parseValue(' x '), 'x');
  assert.deepEqual(parseObject('{a:t,b:{c,d},e:[x,y],f}'), { a: 't', b: ['c', 'd'], e: ['x', 'y'], f: null });
  assert.deepEqual(parseObject('{name,type}'), ['name', 'type']);
  assert.deepEqual(parseObject('{k:a:b}'), { k: 'a:b' });
  assert.deepEqual(parseObject('{}'), []);
});

test('logicalLines joins a multi-line object', () => {
  assert.deepEqual(logicalLines('a\n\n{\n  x:1,\n  y:{z}\n}\nb'), ['a', '{ x:1, y:{z} }', 'b']);
  assert.deepEqual(logicalLines('{\n x:1'), ['{ x:1'], 'an object never closed is kept');
  assert.deepEqual(logicalLines('a}\nb'), ['a}', 'b'], 'a stray closer does not swallow the next line');
  assert.deepEqual(logicalLines(null), []);
});

test('blocksOf: by their ──── headers', () => {
  assert.deepEqual(blocksOf('ID:X|SCOPE:y\n\nUDT:A───────\n{a:1}\nRULES────\nR1:go\nEMPTY───\n'), [
    { name: '_', text: 'ID:X|SCOPE:y\n' }, { name: 'UDT:A', text: '{a:1}' }, { name: 'RULES', text: 'R1:go' }]);
  assert.deepEqual(blocksOf('UDT:B──\nnot a header'), [{ name: '_', text: 'UDT:B──\nnot a header' }], 'three dashes at least');
  assert.deepEqual(blocksOf(null), []);
});

test('blockValue: the fixed rules', () => {
  // a schema line and its positional rows become keyed objects; the schema line itself is then not repeated
  assert.deepEqual(blockValue('{name,type}\nUUID:str\nPATH:str\nBAD:row:three'), [{ name: 'UUID', type: 'str' }, { name: 'PATH', type: 'str' }, { BAD: 'row:three' }]);
  // a schema with no rows stays as its field list
  assert.deepEqual(blockValue('{a,b}'), [{ fields: ['a', 'b'] }]);
  assert.deepEqual(blockValue('{a:int,b:{c,d}}'), [{ a: 'int', b: ['c', 'd'] }]);
  assert.deepEqual(blockValue('GOOD:192|BAD:0'), [{ GOOD: 192, BAD: 0 }]);
  assert.deepEqual(blockValue('ID:ISA-95|SCOPE:a:b'), [{ ID: 'ISA-95', SCOPE: 'a:b' }]);
  assert.deepEqual(blockValue('Object|Variable|Method'), [['Object', 'Variable', 'Method']]);
  assert.deepEqual(blockValue('Normal state here'), ['Normal state here']);
  assert.deepEqual(blockValue('a|b c'), ['a|b c'], 'alternatives with spaces stay text');
  assert.deepEqual(blockValue('NORM:{active:F}→needs attention'), [{ NORM: { active: 'F', note: 'needs attention' } }]);
  assert.deepEqual(blockValue('extends:Equipment\nenum:[Idle,Running]'), [{ extends: 'Equipment' }, { enum: ['Idle', 'Running'] }]);
  assert.deepEqual(blockValue('L4→L3:[Schedule,WorkOrder]'), [{ 'L4→L3': ['Schedule', 'WorkOrder'] }]);
  assert.deepEqual(blockValue('A:1|B'), [{ A: '1|B' }], 'a bar line where not every part is a pair is one pair');
  assert.deepEqual(blockValue(''), []);
});

test('toJSON, toJSONText and coverage', () => {
  const ks = 'ID:X|SCOPE:y\nUDT:Q────\n{value:int}\nGOOD:192|BAD:0';
  assert.deepEqual(toJSON(ks), { _: [{ ID: 'X', SCOPE: 'y' }], 'UDT:Q': [{ value: 'int' }, { GOOD: 192, BAD: 0 }] });
  assert.equal(toJSONText(ks), '{"_":[{"ID":"X","SCOPE":"y"}],"UDT:Q":[{"value":"int"},{"GOOD":192,"BAD":0}]}');
  assert.equal(coverage(ks, toJSONText(ks)), 1);
  assert.equal(coverage('a a b', 'a b'), 2 / 3, 'counted with multiplicity');
  assert.equal(coverage('a b', 'a b b b'), 1);
  assert.equal(coverage('', 'x'), 1);
  assert.equal(coverage('a', ''), 0);
  assert.equal(coverage(null, null), 1);
});

test('dictionaryOf: an address per block', () => {
  assert.deepEqual(dictionaryOf('📡 LAYER 6: OPC', 'ID:OPC-UA|SCOPE:x\nUDT:Node────\n{id:str}\n'), [{ address: 'OPC-UA/UDT:Node', entry: 'UDT:Node\n{id:str}' }]);
  assert.deepEqual(dictionaryOf('🔀 CROSSWALKS (δ maps)', 'A↔B────\nx=y'), [{ address: 'CROSSWALKS/A↔B', entry: 'A↔B\nx=y' }], 'no ID line: the heading names it');
  assert.deepEqual(dictionaryOf('T', 'just a line'), []);
  assert.deepEqual(dictionaryOf(null, null), []);
});

test('judgeSavings: the sealed rules', () => {
  const bars = { savesAtLeast: 1.2, dictionaryAtLeast: 10 };
  const layers = [{ ks: 100, json: 130, coverage: 1 }, { ks: 50, json: 55, coverage: 0.9995 }];
  const j = judgeSavings({ layers, dict: { entries: 1000, addresses: 80 }, coverageMin: 0.999, bars });
  assert.deepEqual(j.rules.map((r) => [r.id, r.pass]), [['lossless-twin', true], ['saves-without-dictionary', true], ['every-layer-saves', true], ['dictionary-multiplies', true]]);
  assert.deepEqual(j.rules.map((r) => r.value), ['the JSON twin of every held-out layer carries every word and number of the notation', '1.23× — JSON 185 tokens, KonomiStandard 150',
    'every held-out layer is smaller as KonomiStandard', '12.5× — 1000 tokens of entries against 80 tokens of addresses, when the receiver already holds them']);
  assert.deepEqual([j.passed, j.of, j.ratio, j.dictionaryRatio], [4, 4, 1.23, 12.5]);
  const bad = judgeSavings({ layers: [{ ks: 100, json: 100, coverage: 0.99 }, { ks: 10, json: 9, coverage: 1 }], dict: { entries: 99, addresses: 10 }, coverageMin: 0.999, bars });
  assert.deepEqual(bad.rules.map((r) => r.pass), [false, false, false, false]);
  assert.deepEqual(bad.rules.map((r) => r.value).filter((v, k) => k !== 1), ['1 layer(s) where the JSON twin dropped words', '2 of 2 layers cost as much or more as KonomiStandard', '9.9× — 99 tokens of entries against 10 tokens of addresses, when the receiver already holds them']);
  const edge = judgeSavings({ layers: [{ ks: 100, json: 120, coverage: 0.999 }], dict: { entries: 100, addresses: 10 }, coverageMin: 0.999, bars });
  assert.deepEqual(edge.rules.map((r) => r.pass), [true, true, true, true], 'exactly at every bar passes');
  const why = { ok: false, why: 'per-layer token counts for both forms with coverage, the dictionary totals, and the sealed bars' };
  const good = { layers, dict: { entries: 1, addresses: 1 }, coverageMin: 0.999, bars };
  for (const b of [{ ...good, layers: [] }, { ...good, layers: [{ ks: 0, json: 1, coverage: 1 }] }, { ...good, layers: [{ ks: 1, json: 'x', coverage: 1 }] }, { ...good, layers: [{ ks: 1, json: 1 }] }, { ...good, layers: [null] },
    { ...good, dict: { entries: 1, addresses: 0 } }, { ...good, dict: null }, { ...good, dict: { entries: 'x', addresses: 1 } }, { ...good, bars: { savesAtLeast: 1 } }, { ...good, bars: null }, { ...good, coverageMin: 'x' }, { ...good, layers: 'x' }]) {
    assert.deepEqual(judgeSavings(b), why);
  }
  assert.deepEqual(judgeSavings(), why);
  assert.equal(Object.keys(K).length, 13);
});

test('a single bare word stays a word', () => {
  assert.deepEqual(blockValue('Lonely'), ['Lonely']);
});
