import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function editor(initial) {
  const modal = { dataset: { clientId: initial.id } };
  const state = { textContent: '' };
  let buttons = [];
  const grid = {
    set innerHTML(html) {
      buttons = [...html.matchAll(/data-pid="([^"]+)"/g)].map(match => ({
        dataset: { pid: match[1] }, classList: { toggle() {} }, setAttribute() {},
        addEventListener(type, handler) { this[type] = handler; }
      }));
    },
    querySelectorAll() { return buttons; }
  };
  const section = { querySelector: key => key === '#crm-partner-grid' ? grid : state };
  const document = { querySelector: key => ({ '#client-modal': modal, '#client-form': {}, '#lrf-partner-access-section': section, '#lrf-partner-access-section .lrf-partner-state': state }[key] || null) };
  let stored = { ...initial };
  let writes = 0;
  const events = [];
  let source = await readFile(new URL('../assets/js/crm-client-partner-access.js', import.meta.url), 'utf8');
  source = source.replace(/^import .*;\n/gm, '');
  source = source.slice(0, source.lastIndexOf('  installStyles();')) + '\n globalThis.testEditor = { setClients(rows) { clients=rows; }, resetDraft, renderPartners, saveDraft };\n}';
  const context = {
    db: {}, doc: (_, __, id) => id, document,
    window: { dispatchEvent: event => events.push(event) },
    runTransaction: async (_, callback) => callback({
      get: async () => ({ exists: () => true, data: () => stored }),
      update: (_, patch) => { writes++; stored = { ...stored, ...patch }; }
    }),
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    console: { error() {} }
  };
  vm.createContext(context); vm.runInContext(source, context);
  const api = context.testEditor;
  api.setClients([{ ...initial }]); api.resetDraft(initial.id); api.renderPartners();
  return {
    api, globalApi: context.window.LRFClientPartnerAccess, state, events,
    click(id) { buttons.find(button => button.dataset.pid === id).click({ preventDefault() {}, stopPropagation() {} }); },
    changeRemote(patch) { stored = { ...stored, ...patch }; api.setClients([{ ...stored }]); api.renderPartners(); },
    stored: () => stored, writes: () => writes
  };
}

test('untouched partner editor contributes no update to the main form', async () => {
  const view = await editor({ id: 'shop', partenaires: ['elios-ceramica'] });
  assert.equal(Object.keys(view.globalApi.getPatch()).length, 0);
  assert.deepEqual(Array.from(view.globalApi.getBaseline().partenaires), ['elios-ceramica']);
  assert.equal(view.writes(), 0);
});

test('unknown partner IDs and unsaved toggles survive a live snapshot refresh', async () => {
  const view = await editor({ id: 'shop', partenaires: ['legacy-factory', 'elios-ceramica'] });
  view.click('view-ceramica');
  view.changeRemote({ notes: 'new visit' });
  assert.deepEqual(Array.from(view.globalApi.getPatch().partenaires), ['legacy-factory', 'elios-ceramica', 'view-ceramica']);
  assert.equal(view.writes(), 0);
  await view.api.saveDraft();
  assert.deepEqual(Array.from(view.stored().partenaires), ['legacy-factory', 'elios-ceramica', 'view-ceramica']);
  assert.equal(view.writes(), 1);
});

test('explicit partner save rejects another session changes and retains the local draft', async () => {
  const view = await editor({ id: 'shop', partenaires: ['elios-ceramica'] });
  view.click('view-ceramica');
  view.changeRemote({ partenaires: ['elios-ceramica', 'opal'] });
  await view.api.saveDraft();
  assert.equal(view.writes(), 0);
  assert.match(view.state.textContent, /autre session/);
  assert.deepEqual(Array.from(view.globalApi.getPatch().partenaires), ['elios-ceramica', 'view-ceramica']);
});

test('a client archived in another session cannot receive new authorizations', async () => {
  const view = await editor({ id: 'shop', partenaires: ['elios-ceramica'] });
  view.click('view-ceramica');
  view.changeRemote({ archived: true });
  await view.api.saveDraft();
  assert.equal(view.writes(), 0);
  assert.match(view.state.textContent, /archivée/);
});


test('opening with authoritative client data retains partners before the module snapshot arrives', async () => {
  const view=await editor({id:'shop',partenaires:['elios-ceramica','unknown-factory']});
  view.api.setClients([]);
  view.api.resetDraft('shop',{partenaires:['elios-ceramica','unknown-factory']});
  view.api.renderPartners();
  view.click('view-ceramica');
  assert.deepEqual(Array.from(view.globalApi.getPatch().partenaires),['elios-ceramica','unknown-factory','view-ceramica']);
});
