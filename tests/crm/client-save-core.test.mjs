import test from 'node:test';
import assert from 'node:assert/strict';
import { createClientSaver } from '../../assets/js/crm-client-save-core.mjs';

const clone = value => value === undefined ? undefined : structuredClone(value);
function fakeFirestore(initial = {}, { retryWrites = false, beforeCommit } = {}) {
  const records = new Map(Object.entries(initial).map(([key, value]) => [key, clone(value)]));
  const commits = [];
  let generated = 0, revision = 0, scans = 0;
  const db = {};
  const collection = (_db, name) => ({ path: name });
  const doc = (...args) => {
    const path = args.length === 1 ? `${args[0].path}/fictional-${++generated}` : args.slice(1).join('/');
    return { path, id: path.split('/').at(-1) };
  };
  const snap = ref => {
    const data = clone(records.get(ref.path));
    return { id: ref.id, exists: () => data !== undefined, data: () => clone(data) };
  };
  const getDocs = async ref => {
    scans += 1;
    return { docs: [...records.keys()].filter(key => key.startsWith(`${ref.path}/`)).map(path => snap({ path, id: path.split('/').at(-1) })) };
  };
  const runTransaction = async (_db, fn) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const baseline = revision;
      const writes = [];
      let writing = false;
      const tx = {
        get: async ref => { assert.equal(writing, false, 'Firestore requires all reads before writes'); return snap(ref); },
        set: (ref, data, options) => { writing = true; writes.push({ op: 'set', ref, data: clone(data), options }); },
        update: (ref, data) => { writing = true; writes.push({ op: 'update', ref, data: clone(data) }); }
      };
      const result = await fn(tx);
      if (writes.length && retryWrites && attempt === 0) continue;
      if (beforeCommit) await beforeCommit({ writes, records, commits });
      if (baseline !== revision) continue;
      if (writes.length) {
        for (const write of writes) {
          if (write.op === 'update') assert.ok(records.has(write.ref.path));
          records.set(write.ref.path, write.op === 'update' || write.options?.merge ? { ...records.get(write.ref.path), ...write.data } : write.data);
        }
        commits.push(writes);
        revision += 1;
      }
      return result;
    }
    throw new Error('fake transaction exhausted retries');
  };
  return { db, collection, doc, getDocs, runTransaction, records, commits, generated: () => generated, scans: () => scans };
}
const saver = fake => createClientSaver({ ...fake, now: () => '2026-10-23T12:00:00.000Z' });
const company = extra => ({ societe: 'Atelier Fictif', codePostal: '84000', telephone: '04 90 00 00 01', ...extra });

test('creation allocates the maximum existing or alias code plus one atomically', async () => {
  const fake = fakeFirestore({
    'clients/existing': company({ codeClient: 'LRF-00042', codesLRF: ['LRF-00058'], archived: true }),
    'crm_meta/client_codes': { lastNumber: 7, kept: true }
  });
  const result = await saver(fake)({ draft: company({ societe: 'Nouvelle société fictive', codeClient: 'LRF-99999', id: 'hijacked' }) });
  assert.deepEqual(result, { id: 'fictional-1', created: true, codeClient: 'LRF-00059' });
  assert.equal(fake.records.get('clients/fictional-1').codeClient, 'LRF-00059');
  assert.equal(fake.records.get('clients/fictional-1').id, undefined);
  assert.deepEqual(fake.records.get('crm_meta/client_codes'), { lastNumber: 59, kept: true, updatedAt: '2026-10-23T12:00:00.000Z' });
  assert.equal(fake.commits.length, 1);
  assert.equal(fake.commits[0].length, 2);
});

test('editing uses exact document id and preserves legacy identity, extras and history', async () => {
  const existing = company({ codeClient: 'CUSTOM-LEGACY-7', documents: [{ nom: 'fictif' }], historiqueMails: [{ objet: 'Fictif' }], externalKey: 'external-1' });
  const fake = fakeFirestore({ 'clients/exact-id': existing, 'clients/same-name': company({ codeClient: 'LRF-00001' }) });
  const result = await saver(fake)({ clientId: 'exact-id', draft: company({ adresse: '2 rue du Test', codeClient: 'LRF-99999', id: 'other', archived: true, duplicateOf: 'other' }) });
  assert.deepEqual(result, { id: 'exact-id', created: false, codeClient: 'CUSTOM-LEGACY-7' });
  assert.equal(fake.records.get('clients/exact-id').codeClient, 'CUSTOM-LEGACY-7');
  assert.deepEqual(fake.records.get('clients/exact-id').documents, existing.documents);
  assert.deepEqual(fake.records.get('clients/exact-id').historiqueMails, existing.historiqueMails);
  assert.equal(fake.records.get('clients/exact-id').externalKey, 'external-1');
  assert.equal(fake.records.get('clients/exact-id').archived, undefined);
  assert.equal(fake.records.get('clients/same-name').adresse, undefined);
  assert.equal(fake.scans(), 0);
});

for (const match of [
  { code_postal: '84000', codePostal: '' },
  { email: '', emails: ['FICTIF@EXAMPLE.TEST'] },
  { telephone: '', telephones: ['+33 4 90 00 00 01'] },
  { telephone: '', telephones: ['0033 4 90 00 00 01'] }
]) test(`duplicate guard accepts legacy field and normalized matching ${JSON.stringify(match)}`, async () => {
  const fake = fakeFirestore({ 'clients/original': company({ codePostal: '75000', telephone: '', codeClient: 'LRF-00004', ...match }) });
  await assert.rejects(saver(fake)({ draft: company({ societe: 'ATELIER FÍCTIF', email: 'fictif@example.test' }) }), error => error.code === 'CRM_DUPLICATE' && error.clientId === 'original' && error.codeClient === 'LRF-00004');
  assert.equal(fake.commits.length, 0);
});

for (const [state, code] of [[undefined, 'CRM_NOT_FOUND'], [{ archived: true }, 'CRM_ARCHIVED'], [{ archive: true }, 'CRM_ARCHIVED'], [{ duplicateOf: 'canonical' }, 'CRM_ARCHIVED']]) {
  test(`edit rejects ${code} and never falls back to creation`, async () => {
    const fake = fakeFirestore(state ? { 'clients/old': company(state) } : {});
    await assert.rejects(saver(fake)({ clientId: 'old', draft: company() }), error => error.code === code);
    assert.equal(fake.commits.length, 0);
    assert.equal(fake.generated(), 0);
  });
}

test('a transaction retry retains one generated document and one code allocation', async () => {
  const fake = fakeFirestore({}, { retryWrites: true });
  const draft = company({ contacts: [{ prenom: 'Fictif' }] });
  const result = await saver(fake)({ draft });
  assert.equal(result.id, 'fictional-1');
  assert.equal(fake.generated(), 1);
  assert.equal(fake.records.get('crm_meta/client_codes').lastNumber, 1);
  assert.equal(fake.commits.length, 1);
  draft.contacts[0].prenom = 'Mutated after save';
  assert.equal(fake.records.get('clients/fictional-1').contacts[0].prenom, 'Fictif');
});

test('two concurrent creations with the same identity rescan and save only one', async () => {
  const fake = fakeFirestore();
  const save = saver(fake);
  const results = await Promise.allSettled([save({ draft: company() }), save({ draft: company() })]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'CRM_DUPLICATE');
  assert.equal([...fake.records.keys()].filter(key => key.startsWith('clients/')).length, 1);
  assert.equal(fake.records.get('crm_meta/client_codes').lastNumber, 1);
});

test('two concurrent distinct clients receive different stable ids and codes', async () => {
  const fake = fakeFirestore();
  const save = saver(fake);
  const results = await Promise.all([
    save({ draft: company({ societe: 'Atelier Fictif A' }) }),
    save({ draft: company({ societe: 'Atelier Fictif B' }) })
  ]);
  assert.equal(new Set(results.map(result => result.id)).size, 2);
  assert.deepEqual(results.map(result => result.codeClient).sort(), ['LRF-00001', 'LRF-00002']);
  assert.equal(fake.generated(), 2);
  assert.equal(fake.records.get('crm_meta/client_codes').lastNumber, 2);
});

test('remote edit conflicts are reported before any write', async () => {
  const original = company({ notes: 'Original', contacts: [{ nom: 'Durand', prenom: 'Fictif' }] });
  const fake = fakeFirestore({ 'clients/exact': { ...original, notes: 'Remote update' } });
  await assert.rejects(saver(fake)({ clientId: 'exact', original, draft: { ...original, notes: 'Local update' } }), error => error.code === 'CRM_CONFLICT' && error.fields.includes('notes'));
  assert.equal(fake.commits.length, 0);
});

test('equivalent object key ordering and convergent edits do not cause conflicts', async () => {
  const original = company({ contacts: [{ prenom: 'Fictif', nom: 'Durand' }], notes: 'Original' });
  const fake = fakeFirestore({ 'clients/exact': { ...original, contacts: [{ nom: 'Durand', prenom: 'Fictif' }], notes: 'Final' } });
  await saver(fake)({ clientId: 'exact', original, draft: { ...original, notes: 'Final' } });
  assert.equal(fake.records.get('clients/exact').notes, 'Final');
});

test('empty company and exhausted codes fail without writes', async () => {
  const fake = fakeFirestore({ 'clients/existing': company({ societe: 'Autre fictif', codeClient: 'LRF-99999' }) });
  await assert.rejects(saver(fake)({ draft: { societe: ' ' } }), error => error.code === 'CRM_INVALID_DRAFT');
  await assert.rejects(saver(fake)({ draft: company() }), error => error.code === 'CRM_CODE_LIMIT');
  assert.equal(fake.commits.length, 0);
});

test('a corrupted counter is rejected instead of generating malformed identifiers', async () => {
  const fake = fakeFirestore({ 'crm_meta/client_codes': { lastNumber: 2.5 } });
  await assert.rejects(saver(fake)({ draft: company() }), error => error.code === 'CRM_COUNTER_INVALID');
  assert.equal(fake.commits.length, 0);
});

test('explicit import metadata is preserved while internal identity and archive keys are ignored', async () => {
  const fake = fakeFirestore();
  const metadata = {
    emails: ['fictif@example.test'], region: 'PACA', pays: 'FR',
    site: 'https://example.test', segmentation: 'Test', motsCles: 'fictif',
    moovagoId: 'fictional-external-7', moovagoPseudo: 'Fictif',
    moovagoDernierSuivi: '2026-10-22', moovagoCarte: 'fictive',
    source: 'moovago', tva: 'FR-FICTIF'
  };
  const result = await saver(fake)({ draft: company({
    ...metadata, id: 'injected', codeClient: 'LRF-88888', codesLRF: ['LRF-88887'],
    archived: true, archive: true, duplicateOf: 'other', canonicalClientId: 'other',
    duplicateAliasIds: ['other'], createdAt: 'bad timestamp'
  }) });
  const saved = fake.records.get(`clients/${result.id}`);
  for (const [key, value] of Object.entries(metadata)) assert.deepEqual(saved[key], value);
  for (const key of ['id', 'codesLRF', 'archived', 'archive', 'duplicateOf', 'canonicalClientId', 'duplicateAliasIds']) assert.equal(saved[key], undefined);
  assert.equal(saved.codeClient, 'LRF-00001');
  assert.equal(saved.createdAt, '2026-10-23T12:00:00.000Z');
});

test('the same Moovago identifier rejects creation even when company and coordinates changed', async () => {
  const fake = fakeFirestore({ 'clients/external-existing': company({ moovagoId: 'fictif-7', codeClient: 'LRF-00007' }) });
  await assert.rejects(saver(fake)({ draft: company({ societe: 'Nouveau nom fictif', codePostal: '75000', telephone: '', moovagoId: 'fictif-7' }) }), error => error.code === 'CRM_DUPLICATE' && error.clientId === 'external-existing');
  assert.equal(fake.commits.length, 0);
});

test('a concurrent append to legacy history prevents stale canonical history from replacing it', async () => {
  const history = [{ date: '2026-10-22', text: 'Original fictif' }];
  const original = company({ comptesRendus: history });
  const fake = fakeFirestore({ 'clients/legacy-history': { ...original, comptesRendus: [...history, { date: '2026-10-23', text: 'Remote append fictif' }] } });
  await assert.rejects(saver(fake)({ clientId: 'legacy-history', original, draft: company({ comptes_rendus: history }) }), error => error.code === 'CRM_CONFLICT' && error.fields.includes('comptes_rendus'));
  assert.equal(fake.commits.length, 0);
});

test('unchanged legacy history can be saved under the canonical field name', async () => {
  const history = [{ date: '2026-10-22', text: 'Original fictif' }];
  const original = company({ comptesRendus: history });
  const fake = fakeFirestore({ 'clients/legacy-history': original });
  await saver(fake)({ clientId: 'legacy-history', original, draft: company({ comptes_rendus: history }) });
  assert.deepEqual(fake.records.get('clients/legacy-history').comptes_rendus, history);
});

test('nested immutable Firebase timestamp values retain their SDK prototype during a save', async () => {
  class FictionalTimestamp {
    constructor(seconds, nanoseconds) { this.seconds = seconds; this.nanoseconds = nanoseconds; Object.freeze(this); }
    toMillis() { return this.seconds * 1000 + this.nanoseconds / 1e6; }
    toDate() { return new Date(this.toMillis()); }
  }
  const timestamp = new FictionalTimestamp(1792756800, 123000000);
  const current = company({ codeClient: 'LRF-00002', comptes_rendus: [{ date: timestamp, text: 'Fictif' }], documents: [{ uploadedAt: timestamp, nom: 'Fictif' }] });
  let captured;
  const save = createClientSaver({
    db: {},
    doc: (_db, collection, id) => ({ path: `${collection}/${id}`, id }),
    runTransaction: async (_db, action) => action({
      get: async () => ({ exists: () => true, data: () => current }),
      update: (_ref, patch) => { captured = patch; }
    }),
    now: () => '2026-10-23T12:00:00.000Z'
  });
  // A UI snapshot cloned with structuredClone has plain timestamp fields;
  // equality must still work without coercing the SDK object to milliseconds.
  await save({ clientId: 'timestamp-client', original: structuredClone(current), draft: { ...current, notes: 'Edit fictif' } });
  assert.equal(captured.comptes_rendus[0].date, timestamp);
  assert.equal(captured.documents[0].uploadedAt, timestamp);
  assert.ok(captured.comptes_rendus[0].date instanceof FictionalTimestamp);
  assert.notEqual(captured.comptes_rendus, current.comptes_rendus);
  assert.notEqual(captured.comptes_rendus[0], current.comptes_rendus[0]);
});

