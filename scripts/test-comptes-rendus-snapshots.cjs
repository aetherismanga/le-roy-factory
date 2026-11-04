'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('a slower previous Firestore snapshot cannot duplicate or replace the current reports', async () => {
  const { reportField, reportFingerprint } = await import('../assets/js/crm-report-core.mjs');
  const html = fs.readFileSync(path.join(__dirname, '../comptes-rendus.html'), 'utf8');
  const body = html.match(/onSnapshot\(collection\(db,"clients"\),async snap=>\{([\s\S]*?)\n      \},err=>/)[1];
  let resolveCity;
  const delayedCity = new Promise(resolve => { resolveCity = resolve; });
  const element = () => ({ children: [], value: '', appendChild(child) { this.children.push(child); }, replaceChildren(fragment) { this.children = [...fragment.children]; } });
  const clientSelect = element(), renders = [];
  const context = vm.createContext({
    document: { createElement: element, createDocumentFragment: element }, clientSelect,
    reportField, reportFingerprint,
    villeFromCP: () => delayedCity, detectUsine: () => 'RANDAL', refreshUsineChoices() {},
    render: () => renders.push(context.inspect().reports.map(item => item.clientId))
  });
  vm.runInContext(`let editing=null,allCRs=[],clientCache=new Map(),crSnapshotVersion=0;
    this.update=async snap=>{${body}};
    this.inspect=()=>({reports:allCRs,clients:[...clientCache.keys()]});`, context);
  const snapshot = (id, city, text) => ({ docs: [{ id, data: () => ({ societe: id, ville: city, code_postal: '34000', comptes_rendus: [{ date: '2026-11-02', text }] }) }] });
  const older = context.update(snapshot('older', '', 'Ancien état'));
  await context.update(snapshot('current', 'Montpellier', 'Mail groupé STUDIO ONE'));
  assert.deepEqual([...context.inspect().reports].map(item => item.clientId), ['current']);
  resolveCity('Montpellier');
  await older;
  assert.deepEqual([...context.inspect().reports].map(item => item.clientId), ['current']);
  assert.deepEqual([...context.inspect().clients], ['current']);
  assert.deepEqual(clientSelect.children.map(option => option.value), ['', '__global__', 'current']);
  assert.deepEqual(renders.map(ids => [...ids]), [['current']]);
});

test('the global campaign appears once in search and renders without a fictitious client link', () => {
  const html = fs.readFileSync(path.join(__dirname, '../comptes-rendus.html'), 'utf8');
  const filterBody = html.match(/function filteredSorted\(\)\{([\s\S]*?)\n      \}\n      function render/)[1];
  const renderBody = html.match(/function render\(\)\{([\s\S]*?)\n      \}\n\n      const cpCache/)[1];
  const global = { globalId: 'campaign', societe: 'Tous les clients', text: 'Envoi d’un mail groupé concernant RANDAL Studio One.', date: '2026-11-02', author: 'Jérôme Hugol', usine: 'RANDAL' };
  const cards = [], counter = {};
  const context = vm.createContext({
    allCRs: [{ clientId: 'real-client', text: 'Visite commerciale', date: '2026-11-02' }], globalCRs: [global],
    searchInput: { value: 'Studio One' }, filterAgent: { value: '' }, filterUsine: { value: '' }, filterDate: { value: '2026-11-02' }, sortSelect: { value: 'date-desc' },
    norm: v => String(v || '').toLowerCase(), isoDate: v => v, compareRecent: () => 0, compareOld: () => 0,
    $: () => counter, feed: { innerHTML: '', appendChild: card => cards.push(card) },
    formatCrDate: v => v, esc: v => String(v || ''), openEdit() {},
    document: { createElement: () => ({ setAttribute() {}, addEventListener() {}, querySelector: selector => selector === '.cr-client-link' ? null : { addEventListener() {} } }) }
  });
  vm.runInContext(`function filteredSorted(){${filterBody}} function render(){${renderBody}}; render();`, context);
  assert.equal(counter.textContent, '1 compte-rendu trouvé');
  assert.equal(cards.length, 1);
  assert.match(cards[0].innerHTML, /Tous les clients/);
  assert.doesNotMatch(cards[0].innerHTML, /clients\.html\?edit=|undefined/);
});
