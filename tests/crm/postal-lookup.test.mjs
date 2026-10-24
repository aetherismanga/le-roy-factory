import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const html = await readFile(new URL('../../clients.html', import.meta.url), 'utf8');
const start = html.indexOf('const cpInput = document.getElementById("edit-code-postal")');
const end = html.indexOf('// 4. Variables locales', start);
assert.ok(start !== -1 && end > start, 'execute the real postal input handler');
const handlerSource = html.slice(start, end);

function setup() {
  const input = () => ({ value: '', style: {}, listeners: new Map(), addEventListener(type, fn) { this.listeners.set(type, fn); } });
  const postal = input(), town = input(), requests = [];
  const context = {
    AbortController,
    document: { getElementById: id => id === 'edit-code-postal' ? postal : town },
    console: { warn() {} },
    setTimeout: fn => fn(),
    // Deliberately ignore cancellation in the transport. The handler must also
    // reject stale responses when a remote request still completes after abort.
    fetch(url, options) {
      let resolve;
      const promise = new Promise(done => { resolve = done; });
      requests.push({ url, signal: options.signal, respond: (data, ok = true) => resolve({ ok, json: async () => data }) });
      return promise;
    }
  };
  runInNewContext(`${handlerSource}\nthis.changeModalGeneration = () => { modalGeneration += 1; };`, context);
  const lookup = value => { postal.value = value; return postal.listeners.get('input')({ target: postal }); };
  return { postal, town, requests, lookup, switchModal: context.changeModalGeneration };
}

test('postal lookup fills the only commune for an unchanged empty town', async () => {
  const ui = setup(); const completed = ui.lookup('34000');
  ui.requests[0].respond([{ nom: 'Ville fictive unique' }]); await completed;
  assert.equal(ui.town.value, 'Ville fictive unique');
});

test('a response for a previous postal code never fills the new postal code', async () => {
  const ui = setup(); const old = ui.lookup('13001'); const current = ui.lookup('84000');
  assert.equal(ui.requests[0].signal.aborted, true);
  ui.requests[0].respond([{ nom: 'Ancienne ville fictive' }]); await old;
  assert.equal(ui.town.value, '');
  ui.requests[1].respond([{ nom: 'Nouvelle ville fictive' }]); await current;
  assert.equal(ui.town.value, 'Nouvelle ville fictive');
});

test('switching client modal with the same postal code rejects the previous response', async () => {
  const ui = setup(); const completed = ui.lookup('84000');
  // Isolate the generation guard independently of the abort also performed by
  // the real openModal/closeModal lifecycle.
  ui.switchModal(); ui.town.value = '';
  ui.requests[0].respond([{ nom: 'Ville de la fiche précédente' }]); await completed;
  assert.equal(ui.town.value, '');
});

test('manual town input is preserved while a lookup is pending', async () => {
  const ui = setup(); const completed = ui.lookup('84000');
  ui.town.value = 'Commune choisie manuellement'; ui.town.listeners.get('input')();
  assert.equal(ui.requests[0].signal.aborted, true);
  ui.requests[0].respond([{ nom: 'Réponse devenue obsolète' }]); await completed;
  assert.equal(ui.town.value, 'Commune choisie manuellement');
});

test('a shared postal code never chooses arbitrarily among multiple communes', async () => {
  const ui = setup(); const completed = ui.lookup('84000');
  ui.requests[0].respond([{ nom: 'Commune fictive A' }, { nom: 'Commune fictive B' }]); await completed;
  assert.equal(ui.town.value, '');
});

test('failed HTTP responses cannot fill the town', async () => {
  const ui = setup(); const completed = ui.lookup('84000');
  ui.requests[0].respond([{ nom: 'Réponse invalide' }], false); await completed;
  assert.equal(ui.town.value, '');
});
