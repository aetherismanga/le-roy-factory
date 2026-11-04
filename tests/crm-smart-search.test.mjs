import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function searchView(rows, search = '') {
  const events = [];
  const handlers = {};
  const boxHandlers = {};
  const wrap = { classList: { add() {} }, appendChild() {}, contains() { return true; } };
  const input = { dataset: {}, value: '', closest: () => wrap, addEventListener(type, handler) { handlers[type] = handler; } };
  const box = { classList: { add() {}, remove() {}, toggle() {} }, addEventListener(type, handler) { boxHandlers[type] = handler; }, innerHTML: '' };
  const document = {
    readyState: 'loading',
    addEventListener() {},
    getElementById: id => id === 'search-input' ? input : id === 'lrf-smart-search-style' ? {} : null,
    createElement: () => box
  };
  let source = await readFile(new URL('../assets/js/crm-smart-search.js', import.meta.url), 'utf8');
  source = source.replace(/^import .*;\n/gm, '');
  source = source.slice(0, source.lastIndexOf("  if (document.readyState === 'loading')")) + '\n globalThis.testSearch = { enhanceClientsPage, requestExactClient };\n}';
  const context = {
    db: {}, collection() {},
    getDocs: async () => ({ forEach: handler => rows.forEach(row => handler({ id: row.id, data: () => row.data })) }),
    document, location: { pathname: '/clients.html', search },
    window: { dispatchEvent: event => events.push(event) },
    URLSearchParams,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    console
  };
  vm.createContext(context); vm.runInContext(source, context);
  await context.testSearch.enhanceClientsPage();
  return {
    events, box, input, request: context.testSearch.requestExactClient,
    type(value) { input.value = value; handlers.input(); },
    click(id) { boxHandlers.click({ target: { closest: () => ({ dataset: { clientId: id } }) }, preventDefault() {}, stopPropagation() {} }); }
  };
}

test('same-name search result opens its real Firestore ID even when its row is filtered out', async () => {
  const view = await searchView([
    { id: 'bonifay-la-garde', data: { id: 'legacy-import-id', societe: 'Bonifay', ville: 'La Garde', codeClient: 'LRF-00038' } },
    { id: 'bonifay-toulon', data: { societe: 'Bonifay', ville: 'Toulon', codeClient: 'LRF-00039' } }
  ]);
  view.type('Bonifay');
  assert.match(view.box.innerHTML, /data-client-id="bonifay-la-garde"/);
  assert.doesNotMatch(view.box.innerHTML, /data-client-id="legacy-import-id"/);
  view.click('bonifay-la-garde');
  assert.equal(view.events.length, 1);
  assert.equal(view.events[0].type, 'lrf-request-open-client');
  assert.equal(view.events[0].detail.clientId, 'bonifay-la-garde');
});

test('direct-link alias and missing IDs are delegated to the page resolver without a false opened event', async () => {
  const view = await searchView([], '?edit=archived-alias');
  assert.equal(view.events.length, 1);
  assert.equal(view.events[0].type, 'lrf-request-open-client');
  assert.equal(view.events[0].detail.clientId, 'archived-alias');
  assert.equal(view.events[0].detail.source, 'direct-link');
  view.request('missing-client');
  assert.equal(view.events.at(-1).type, 'lrf-request-open-client');
  assert.equal(view.events.at(-1).detail.clientId, 'missing-client');
  assert.equal(view.request(''), false);
  assert.equal(view.events.length, 2);
});

test('archived aliases are absent from suggestions and historical LRF codes remain searchable', async () => {
  const view = await searchView([
    { id: 'canonical', data: { societe: 'Céramique du Midi', codeClient: 'LRF-00050', codesLRF: ['LRF-00992'] } },
    { id: 'alias', data: { societe: 'Céramique du Midi', archived: true, codeClient: 'LRF-00992' } },
    { id: 'alias-2', data: { societe: 'Céramique du Midi', duplicateOf: 'canonical', codeClient: 'LRF-00993' } }
  ]);
  view.type('LRF-00992');
  assert.match(view.box.innerHTML, /data-client-id="canonical"/);
  assert.doesNotMatch(view.box.innerHTML, /data-client-id="alias/);
});
