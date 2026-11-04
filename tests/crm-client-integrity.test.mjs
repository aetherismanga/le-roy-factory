import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../assets/js/crm-client-integrity-core.mjs';

const shop = (id, extra = {}) => ({ id, societe: 'Céramique du Midi', adresse: '12 rue des Artisans', codePostal: '34160', ville: 'Castries', telephone: '04 67 10 20 30', ...extra });

test('shared LRF codes and chain names do not merge distinct stores', () => {
  assert.equal(core.safeDuplicate(shop('a', { codeClient: 'LRF-00300' }), shop('b', { codeClient: 'LRF-00300', codePostal: '34000', ville: 'Montpellier' })), false);
  assert.equal(core.safeDuplicate({ id: 'a', societe: 'Union Matériaux', codeClient: 'LRF-00300' }, { id: 'b', societe: 'Union Matériaux', codeClient: 'LRF-00300' }), false);
  assert.equal(core.safeDuplicate(shop('a'), shop('b', { adresse: '15 avenue de Montpellier' })), false);
});

test('matching manufacturer-import identity or complete shop identity permits safe repairs', () => {
  assert.equal(core.safeDuplicate(shop('a'), shop('b', { telephone: '+33 4 67 10 20 30' })), true);
  assert.equal(core.safeDuplicate({ id: 'a', societe: 'Maison Test', moovagoId: 'M-78' }, { id: 'b', societe: 'MAISON TEST', moovagoId: 'M-78' }), true);
  assert.equal(core.safeDuplicate(shop('a', { moovagoId: 'M-78' }), shop('b', { moovagoId: 'M-79' })), false);
  assert.equal(core.safeDuplicate(shop('a'), shop('b', { archived: true })), false);
});

test('transitive weak bridge cannot merge conflicting establishment addresses', () => {
  const a = shop('a', { moovagoId: 'same' });
  const b = shop('b', { moovagoId: 'same', adresse: '' });
  const c = shop('c', { moovagoId: 'same', adresse: '98 route de Nîmes' });
  assert.deepEqual(core.duplicateGroups([a, b, c]).map(group => group.map(row => row.id)), [['a', 'b']]);
});

test('contact variants, both report schemas, mail contents and unknown fields survive a merge', () => {
  const a = shop('a', { codeClient: 'LRF-00042', contacts: [{ nom: 'Martin', email: 'contact@test.fr', telephone: '0467000001' }], comptes_rendus: [{ date: '2026-11-04', text: 'Visite magasin' }], comptesRendus: [{ date: '2026-11-03', text: 'Ancien suivi' }], historiqueMails: [{ date: '2026-11-04', objet: 'Tarif', body: 'Version A' }], photoFacadeUrl: 'https://example.test/facade.jpg', customPreference: 'samedi' });
  const b = shop('b', { codeClient: 'LRF-00100', contacts: [{ nom: 'Claire', email: 'contact@test.fr', telephone: '0467000002' }], comptes_rendus: [{ date: '2026-11-04', text: 'Visite magasin' }, { date: '2026-11-04', text: 'Commande validée' }], historiqueMails: [{ date: '2026-11-04', objet: 'Tarif', body: 'Version B' }], customAgency: { region: 'Occitanie' } });
  const result = core.mergedPayload([a, b], a, 'now');
  assert.equal(result.contacts.length, 2);
  assert.equal(result.comptes_rendus.length, 3);
  assert.equal(result.historiqueMails.length, 2);
  assert.equal(result.photoFacadeUrl, a.photoFacadeUrl);
  assert.equal(result.customPreference, 'samedi');
  assert.deepEqual(result.customAgency, { region: 'Occitanie' });
  assert.deepEqual(result.codesLRF, ['LRF-00042', 'LRF-00100']);
  assert.equal(core.chooseCanonical([b, a]).id, 'a');
});

test('old aliases resolve through multiple generations, while cycles are rejected', () => {
  assert.equal(core.resolveCanonical('old', new Map([['old', 'middle'], ['middle', 'current']])), 'current');
  assert.equal(core.resolveCanonical('old', new Map([['old', 'middle'], ['middle', 'old']])), null);
});

async function runtime(rows, beforeTransaction = () => {}) {
  const records = new Map(rows.map(row => [row.id, { ...row }]));
  const writes = [];
  const snapshot = () => ({ docs: [...records].map(([id, data]) => ({ id, data: () => ({ ...data }) })) });
  let source = await readFile(new URL('../assets/js/crm-client-integrity.js', import.meta.url), 'utf8');
  source = source.replace(/^import .*;\n/gm, '').replace(/export /g, '');
  source += '\n globalThis.auditRuntime = { repairDuplicates };';
  const context = {
    ...core, db: {}, collection: () => 'clients', doc: (_, __, id) => id,
    getDocs: async () => snapshot(), onSnapshot: () => {},
    runTransaction: async (_, callback) => {
      beforeTransaction(records);
      const pending = [];
      const result = await callback({
        get: async id => ({ id, exists: () => records.has(id), data: () => ({ ...records.get(id) }) }),
        set: (id, patch) => pending.push([id, patch]), update: (id, patch) => pending.push([id, patch])
      });
      for (const [id, patch] of pending) { writes.push([id, patch]); records.set(id, { ...records.get(id), ...patch }); }
      return result;
    }, window: { dispatchEvent() {}, addEventListener() {} },
    document: { readyState: 'loading', addEventListener() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, console
  };
  vm.createContext(context); vm.runInContext(source, context);
  return { records, writes, repair: context.auditRuntime.repairDuplicates };
}

test('transaction re-reads sources and refuses an archive that happened after discovery', async () => {
  const audit = await runtime([shop('a'), shop('b')], rows => rows.set('b', { ...rows.get('b'), archived: true }));
  assert.equal(await audit.repair(), 0);
  assert.equal(audit.writes.length, 0);
});

test('transaction preserves complete original alias contents and writes only archival metadata', async () => {
  const first = shop('a', { codeClient: 'LRF-00042' });
  const original = shop('b', { codeClient: 'LRF-00101', contacts: [{ nom: 'Alice' }, { nom: 'Bruno' }], customField: 'original', photoFacadeUrl: 'https://example.test/original.jpg' });
  const audit = await runtime([first, original]);
  assert.equal(await audit.repair(), 1);
  const alias = audit.records.get('b');
  assert.equal(alias.codeClient, original.codeClient);
  assert.equal(alias.customField, 'original');
  assert.deepEqual(alias.contacts, original.contacts);
  assert.equal(alias.photoFacadeUrl, original.photoFacadeUrl);
  assert.equal(alias.archived, true);
  assert.equal(alias.canonicalClientId, 'a');
  assert.equal(audit.records.get('a').contacts.length, 2);
});
