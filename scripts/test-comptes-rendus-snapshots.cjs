'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('successive Firestore snapshots replace reports and options without waiting for a city lookup', async () => {
  const { reportField, reportFingerprint } = await import('../assets/js/crm-report-core.mjs');
  const html = fs.readFileSync(path.join(__dirname, '../comptes-rendus.html'), 'utf8');
  const match = html.match(/onSnapshot\(collection\(db,"clients"\),async snap=>\{([\s\S]*?)\n      \},err=>/);
  assert.ok(match, 'The real client snapshot callback must be exercised');
  const body = match[1];
  const element = () => ({ children: [], value: '', appendChild(child) { this.children.push(child); }, replaceChildren(fragment) { this.children = [...fragment.children]; } });
  const clientSelect = element(), renders = [];
  const context = vm.createContext({
    document: { createElement: element, createDocumentFragment: element }, clientSelect,
    reportField, reportFingerprint,
    clientsReady:false,filterClient:{value:"",innerHTML:""},esc:String,
    villeFromCP: () => { throw Error('Report rendering must not wait for an external city lookup'); },
    detectUsine: () => 'RANDAL', refreshUsineChoices() {},
    render: () => renders.push(context.inspect().reports.map(item => item.clientId))
  });
  vm.runInContext(`let editing=null,allCRs=[],clientCache=new Map(),crSnapshotVersion=0;
    this.update=async snap=>{${body}};
    this.inspect=()=>({reports:allCRs,clients:[...clientCache.keys()]});`, context);
  const snapshot = (id, city, text) => ({ docs: [{ id, data: () => ({ societe: id, ville: city, code_postal: '34000', comptes_rendus: [{ date: '2026-11-02', text }] }) }] });
  // The current page uses the stored city synchronously. A missing city must
  // not delay the first snapshot; the next snapshot must replace it entirely.
  const older = context.update(snapshot('older', '', 'Ancien état'));
  assert.deepEqual([...context.inspect().reports].map(item => item.clientId), ['older']);
  await context.update(snapshot('current', 'Montpellier', 'Mail groupé STUDIO ONE'));
  assert.deepEqual([...context.inspect().reports].map(item => item.clientId), ['current']);
  await older;
  assert.deepEqual([...context.inspect().reports].map(item => item.clientId), ['current']);
  assert.deepEqual([...context.inspect().clients], ['current']);
  assert.deepEqual(clientSelect.children.map(option => option.value), ['', '__global__', 'current']);
  assert.deepEqual(renders.map(ids => [...ids]), [['older'], ['current']]);
  assert.equal(context.clientsReady, true);
});

test('the global campaign appears once in search and renders without a fictitious client link', async () => {
  const { reportInPeriod, reportMatchesClient } = await import('../assets/js/crm-report-export-core.mjs');
  const {reportMatchesPartner} = await import('../assets/js/crm-report-partners.mjs');
  const html = fs.readFileSync(path.join(__dirname, '../comptes-rendus.html'), 'utf8');
  const filterMatch = html.match(/function filteredSorted\(\)\{([\s\S]*?)\n      \}\n      function render/);
  // The obsolete cpCache block was removed with remote city enrichment.
  // Bound the real render body by the following client snapshot subscription.
  const renderMatch = html.match(/function render\(\)\{([\s\S]*?)\n      \}\n\s*onSnapshot\(collection\(db,"clients"\)/);
  assert.ok(filterMatch, 'The real filter function must be exercised');
  assert.ok(renderMatch, 'The real renderer must be exercised');
  const filterBody = filterMatch[1], renderBody = renderMatch[1];
  const global = { globalId: 'campaign', societe: 'Tous les clients', text: 'Envoi d’un mail groupé concernant RANDAL Studio One.', date: '2026-11-02', author: 'Jérôme Hugol', usine: 'RANDAL' };
  const cards = [], counter = {};
  const context = vm.createContext({
    reportMatchesPartner,reportInPeriod,reportMatchesClient,clientsReady:true,globalReady:true,loadFailed:false,
    allCRs: [{ clientId: 'real-client', text: 'Visite commerciale', date: '2026-11-02' }], globalCRs: [global],
    searchInput: { value: 'Studio One' }, filterAgent: { value: '' }, filterUsine: { value: '' }, filterDate: { value: '2026-11-02' }, filterEnd: {value:'2026-11-02'},filterClient:{value:''}, sortSelect: { value: 'date-desc' },
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
