import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const data = JSON.parse(read('assets/data/elios-segmento.json'));
const original = JSON.stringify(data);
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
freeze(data);
const context = vm.createContext({window: {}});
vm.runInContext(read('assets/js/elios-pose-designs.js'), context);
const designs = context.window.LRF_ELIOS_POSE_DESIGNS;
const plain = value => JSON.parse(JSON.stringify(value));
const signature = composition => JSON.stringify([...composition.tiles].sort((a, b) => a.row - b.row || a.col - b.col));
const mappingFor = (base, palette) => Object.fromEntries(designs.roles(data, base).map((role, index) => [role.id, palette.colors[index]]));

test('the classic design core adds twelve complete drawings and twelve palettes using only actual Segmento references', () => {
  const templates = designs.templates(data), palettes = designs.palettes(data), ids = new Set(data.colors.map(color => color.id));
  assert.equal(templates.length, 12); assert.equal(palettes.length, 12);
  assert.equal(new Set(templates.map(item => item.id)).size, 12);
  assert.equal(new Set(templates.map(signature)).size, 12);
  assert.equal(new Set(palettes.map(item => item.colors.join('|'))).size, 12);
  assert.deepEqual(new Set(palettes.flatMap(item => Array.from(item.colors))), ids, 'The proposed harmonies cover all sixteen real references');
  for (const item of templates) {
    assert.equal(item.origin, 'lrf'); assert.match(item.label, /^Création LRF/); assert.equal(item.preview, null);
    assert.equal(item.rows, 6); assert.equal(item.columns, 6); assert.equal(item.tiles.length, 36);
    assert.equal(designs.validate(data, item), true);
    assert(designs.roles(data, item).length >= 2 && designs.roles(data, item).length <= 4);
  }
  for (const palette of palettes) { assert.equal(palette.origin, 'lrf'); assert.equal(palette.colors.length, 4); assert.equal(new Set(palette.colors).size, 4); for (const color of palette.colors) assert(ids.has(color)); }
  assert.equal(JSON.stringify(data), original, 'The official version-2 manufacturer data remains unchanged');
});

test('every official or LRF base accepts every proposed palette and physical quarter turn without changing its source', () => {
  let combinations = 0;
  for (const base of [...data.compositions, ...designs.templates(data)]) {
    const before = JSON.stringify(base); freeze(base);
    for (const palette of designs.palettes(data)) for (const rotation of [0, 90, 180, 270]) {
      const mapping = mappingFor(base, palette), result = designs.compose(data, base, {mapping, rotation});
      assert.notEqual(result, base); assert.notEqual(result.tiles, base.tiles); assert.equal(result.tiles.length, 36);
      assert.equal(result.origin, 'lrf'); assert.match(result.label, /^Création LRF/); assert.equal(result.preview, null);
      assert.equal(result.sourceComposition, base.id); assert.equal(result.provenance.rotation, rotation);
      assert.equal(designs.validate(data, result), true);
      const expected = new Map();
      for (const tile of base.tiles) expected.set(mapping[tile.color], (expected.get(mapping[tile.color]) || 0) + 1);
      const rows = designs.rows(data, result);
      assert.deepEqual(new Map(rows.map(row => [row.colorId, row.count])), expected);
      assert(Math.abs(rows.reduce((sum, row) => sum + row.share, 0) - 100) < 1e-9);
      assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 36);
      for (const row of rows) { assert.equal(row.pcs, 46); assert.equal(row.boxM2, 1.04); assert.equal(row.ref, data.colors.find(color => color.id === row.colorId).ref); }
      combinations++;
    }
    assert.equal(JSON.stringify(base), before);
  }
  assert.equal(combinations, 2880);
  assert.equal(JSON.stringify(data), original);
});

test('quarter turns move positions and real tile angles together, and four turns recover the physical drawing', () => {
  const base = data.compositions.find(item => item.id === 'S01-C'), turned = designs.compose(data, base, {rotation: 90});
  for (const tile of base.tiles) {
    const actual = turned.tiles.find(item => item.col === 5 - tile.row && item.row === tile.col);
    assert(actual); assert.equal(actual.color, tile.color); assert.equal(actual.rotation, (tile.rotation + 90) % 360);
  }
  let result = base;
  for (let i = 0; i < 4; i++) result = designs.compose(data, result, {rotation: 90});
  assert.equal(signature(result), signature(base));
  assert.equal(signature(designs.compose(data, base, {rotation: -90})), signature(designs.compose(data, base, {rotation: 270})));
  assert.equal(signature(designs.compose(data, base, {rotation: 360})), signature(base));
});

test('all sixteen real references can replace source groups, merged colours count once, and fictitious colours or mirrored pictures are rejected', () => {
  const base = data.compositions.find(item => item.id === 'S11-D');
  for (const target of data.colors) {
    const mapping = Object.fromEntries(designs.roles(data, base).map(role => [role.id, target.id]));
    const result = designs.compose(data, base, {mapping});
    const rows = designs.rows(data, result); assert.equal(rows.length, 1); assert.equal(rows[0].count, 36); assert.equal(rows[0].share, 100); assert.equal(rows[0].ref, target.ref);
  }
  assert.throws(() => designs.compose(data, base, {mapping: {albus: '#aabbcc'}}), /vraies références/);
  assert.throws(() => designs.compose(data, base, {mapping: {'reference-inconnue': 'albus'}}), /départ/);
  assert.throws(() => designs.compose(data, base, {rotation: 45}), /quarts de tour/);
  assert.throws(() => designs.compose(data, base, {mirror: true}), /miroir/);
  const missing = plain(base); missing.tiles.pop(); assert.throws(() => designs.validate(data, missing), /grille complète/);
  const duplicate = plain(base); duplicate.tiles[0] = {...duplicate.tiles[1]}; assert.throws(() => designs.validate(data, duplicate), /exactement un carreau/);
  const foreign = plain(base); foreign.tiles[0].color = 'faux-bleu'; assert.throws(() => designs.validate(data, foreign), /vrai carreau/);
  assert.equal(JSON.stringify(data), original);
});

test('generated rows feed the real 2D calculator and round every true SKU to its manufacturer box', () => {
  const elements = new Map(), $ = selector => { if (!elements.has(selector)) elements.set(selector, {value: '', textContent: '', innerHTML: ''}); return elements.get(selector); };
  $('#ep-surface').value = '30'; $('#ep-waste').value = '10';
  let selected;
  const state = {group: 'segmento'}, S = {D: {}, $, state, pattern: () => selected, segmentoRows: () => designs.rows(data, selected), esc: String, fr: String, collectionKey: () => 'segmento'};
  vm.runInNewContext(read('assets/js/elios-pose-v2-calc.js'), {window: {LRF_ELIOS_POSE_V2: S}});
  for (const base of [data.compositions.find(item => item.id === 'S01-C'), data.compositions.find(item => item.id === 'S11-D'), ...designs.templates(data)]) {
    const palette = designs.palettes(data)[3];
    selected = designs.compose(data, base, {mapping: mappingFor(base, palette), rotation: 90}); S.calculate();
    assert.match(state.last.pattern.label, /^Création LRF/); assert.equal(state.last.target, 33);
    assert(Math.abs(state.last.rows.reduce((sum, row) => sum + row.need, 0) - 33) < 1e-9);
    for (const row of state.last.rows) { assert(row.need > 0); assert.equal(row.boxes, Math.ceil((row.need - 1e-9) / 1.04)); assert.equal(row.pieces, row.boxes * 46); assert(row.ordered >= row.need); }
  }
});
