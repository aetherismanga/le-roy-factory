import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const data = JSON.parse(read('assets/data/elios-segmento.json'));

test('the official Segmento drawings include all references and complete repeat grids', () => {
  assert.equal(data.colors.length, 16);
  assert.equal(new Set(data.colors.map(color => color.ref)).size, 16);
  assert.equal(data.patterns.length, 12);
  assert.equal(data.compositions.length, 48);
  assert.equal(data.packaging.pieces, 46);
  assert.equal(data.packaging.area, 1.04);
  const references = new Set(data.colors.map(color => color.id));
  const expected = [4, 6, 4, 3, 4, 3, 4, 3, 4, 3, 7, 3];
  for (const [index, pattern] of data.patterns.entries()) {
    assert.equal(data.compositions.filter(c => c.patternId === pattern.id).length, expected[index]);
  }
  for (const composition of data.compositions) {
    assert.equal(composition.columns, 6);
    assert.equal(composition.rows, 6);
    assert.equal(composition.tiles.length, 36);
    assert.equal(new Set(composition.tiles.map(tile => `${tile.col}:${tile.row}`)).size, 36);
    assert.ok(existsSync(new URL(`../${composition.preview}`, import.meta.url)));
    for (const tile of composition.tiles) {
      assert.ok(references.has(tile.color));
      assert.ok(tile.col >= 0 && tile.col < 6 && tile.row >= 0 && tile.row < 6);
      assert.ok([0, 90, 180, 270].includes(tile.rotation));
    }
  }
});

async function calculator() {
  const elements = new Map();
  const $ = selector => {
    if (!elements.has(selector)) elements.set(selector, { value: '', textContent: '', innerHTML: '' });
    return elements.get(selector);
  };
  $('#ep-surface').value = '30';
  $('#ep-waste').value = '10';
  const state = { group: 'modular', pattern: 'S01' };
  const S = {
    $, $$: () => [], state, D: {}, root: { prepend() {} },
    esc: String, fr: n => String(n), collectionKey: () => 'segmento',
    renderSelection() {}, renderPattern() {}, renderAll() {},
    pattern: () => ({ id: state.pattern, label: state.pattern }),
  };
  const context = vm.createContext({
    window: { LRF_ELIOS_POSE_V2: S },
    document: { createElement: () => ({}), head: { append() {} } },
    fetch: async () => ({ ok: true, json: async () => data }),
    location: { search: '' }, URLSearchParams, console,
  });
  vm.runInContext(read('assets/js/elios-pose-segmento.js'), context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof S.segmentoRows, 'function');
  vm.runInContext(read('assets/js/elios-pose-v2-calc.js'), context);
  state.group = 'segmento';
  return { S, state, $ };
}

test('all 48 Segmento drawings produce nonzero per-reference needs and full-box ordering', async () => {
  const { S, state } = await calculator();
  for (const composition of data.compositions) {
    state.pattern = composition.patternId;
    state.segmentoComposition = composition.id;
    S.calculate();
    assert.equal(state.last.target, 33);
    assert.ok(state.last.rows.length > 0);
    assert.ok(Math.abs(state.last.rows.reduce((sum, row) => sum + row.need, 0) - 33) < 1e-9);
    assert.match(state.last.pattern.label, new RegExp(composition.patternId.slice(1)));
    for (const row of state.last.rows) {
      assert.ok(row.need > 0, `${composition.id}: ${row.ref}`);
      assert.equal(row.boxes, Math.ceil((row.need - 1e-9) / 1.04));
      assert.equal(row.pieces, row.boxes * 46);
      assert.ok(row.ordered >= row.need - 1e-9);
    }
  }
});

test('multicolour compositions retain the source proportions and follow the selected motif', async () => {
  const { S, state } = await calculator();
  state.pattern = 'S11';
  state.segmentoComposition = 'S11-G';
  S.calculate();
  assert.deepEqual(Array.from(state.last.rows, row => [row.ref, Number(row.need.toFixed(9))]), [
    ['04I15D0', 22], ['04I1540', 5.5], ['04I1590', 5.5],
  ]);
  state.pattern = 'S12'; // a stale second selector must not retain S11-G
  S.calculate();
  assert.equal(state.segmentoComposition, 'S12-A');
  assert.match(state.last.pattern.label, /Pattern 12/);
});
