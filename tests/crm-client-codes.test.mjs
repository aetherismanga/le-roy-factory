import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function allocator(client, lastNumber, { beforeGet } = {}) {
  let source = await readFile(new URL('../assets/js/client-codes.js', import.meta.url), 'utf8');
  source = source.replace(/^import .*;\n/gm, '').replace(/if\(document.readyState==="loading"\)document.addEventListener\("DOMContentLoaded",init,\{once:true\}\);else init\(\);\s*$/, '');
  source += '\nglobalThis.testCodes = { assignCode, assignMissingCodes, setClients: value => { clients = value; } };';
  const documents = new Map([['client', { ...client }], ['client_codes', { lastNumber }]]);
  let writes = 0;
  const reads = [];
  const context = {
    db: {}, doc: (_, __, id) => id,
    runTransaction: async (_, callback) => callback({
      get: async id => {
        reads.push(id);
        await beforeGet?.(id, documents);
        return { exists: () => documents.has(id), data: () => documents.get(id) };
      },
      set: (id, patch) => { writes++; documents.set(id, { ...documents.get(id), ...patch }); },
      update: (id, patch) => { writes++; documents.set(id, { ...documents.get(id), ...patch }); }
    }),
    console
  };
  vm.createContext(context); vm.runInContext(source, context);
  return {
    allocate: () => context.testCodes.assignCode('client'),
    assignMissing: async snapshot => {
      context.testCodes.setClients(snapshot || [{ ...client, id: 'client' }]);
      await context.testCodes.assignMissingCodes();
    },
    documents, reads, writes: () => writes
  };
}

test('an archived client queued before its archive receives no new code', async () => {
  const view = await allocator({ archived: true }, 100);
  assert.equal(await view.allocate(), null);
  assert.equal(view.writes(), 0);
});

test('nonstandard historical codes remain searchable aliases after a new LRF allocation', async () => {
  const view = await allocator({ codeClient: 'OLD-123', codesLRF: ['FACTORY-9'], codePostal: '34160' }, 100);
  assert.equal(await view.allocate(), 'LRF-00101');
  assert.deepEqual(Array.from(view.documents.get('client').codesLRF), ['FACTORY-9', 'OLD-123', 'LRF-00101']);
  assert.equal(view.documents.get('client').departement, '34');
  assert.equal(await view.allocate(), 'LRF-00101');
  assert.equal(view.documents.get('client_codes').lastNumber, 101);
});

const unvisitedProspect = {
  societe: 'Nouveau négoce', type: 'prospect', visiteStatus: 'non_visite',
  nonVisite: true, autoAssignLrfCode: false,
  prospectionSource: 'recherche-publique-2026-11-05', codePostal: '34000'
};

test('public unvisited prospects receive no code and consume no counter number', async () => {
  const view = await allocator(unvisitedProspect, 100);
  assert.equal(await view.allocate(), null);
  assert.equal(view.writes(), 0);
  assert.deepEqual(view.reads, ['client']);
  assert.equal(view.documents.get('client_codes').lastNumber, 100);
  assert.deepEqual(view.documents.get('client'), unvisitedProspect);
});

test('each independent opt-out prevents allocation even on a partial record', async () => {
  for (const optOut of [
    { autoAssignLrfCode: false }, { nonVisite: true },
    { visiteStatus: 'non_visite' }, { visiteStatus: 'Non visité' }
  ]) {
    const view = await allocator({ ...optOut, type: 'prospect' }, 100);
    assert.equal(await view.allocate(), null);
    assert.equal(view.writes(), 0);
    assert.deepEqual(view.reads, ['client']);
  }
});

test('a queue containing only unvisited prospects does not read or write the counter', async () => {
  const view = await allocator(unvisitedProspect, 100);
  await view.assignMissing();
  assert.deepEqual(view.reads, []);
  assert.equal(view.writes(), 0);
});

test('existing LRF and legacy codes on unvisited records are preserved verbatim', async () => {
  for (const codeClient of ['LRF-00123', 'OLD-123']) {
    const client = { ...unvisitedProspect, codeClient, codesLRF: ['FACTORY-9', codeClient] };
    const view = await allocator(client, 100);
    assert.equal(await view.allocate(), codeClient);
    await view.assignMissing();
    assert.equal(view.writes(), 0);
    assert.equal(view.documents.get('client_codes').lastNumber, 100);
    assert.deepEqual(view.documents.get('client'), client);
  }
});

test('a queued client made unvisited before allocation is rechecked in the transaction', async () => {
  const queued = { societe: 'Client en attente', type: 'prospect', codePostal: '34000' };
  const view = await allocator(queued, 100, {
    beforeGet(id, documents) {
      if (id === 'client') documents.set('client', { ...documents.get('client'), ...unvisitedProspect });
    }
  });
  await view.assignMissing([{ ...queued, id: 'client' }]);
  assert.deepEqual(view.reads, ['client']);
  assert.equal(view.writes(), 0);
  assert.equal(view.documents.get('client_codes').lastNumber, 100);
  assert.equal(view.documents.get('client').codeClient, undefined);
});

test('visiting a prospect still requires clearing its explicit automatic-allocation opt-out', async () => {
  const visited = { ...unvisitedProspect, nonVisite: false, visiteStatus: 'visite' };
  const view = await allocator(visited, 100);
  assert.equal(await view.allocate(), null);
  assert.equal(view.writes(), 0);
});

test('ordinary eligible clients keep automatic allocation and historical aliases', async () => {
  const view = await allocator({ societe: 'Client existant', codeClient: 'OLD-5', codesLRF: ['LEGACY-1'], codePostal: '83120' }, 100);
  await view.assignMissing();
  assert.equal(view.documents.get('client').codeClient, 'LRF-00101');
  assert.deepEqual(Array.from(view.documents.get('client').codesLRF), ['LEGACY-1', 'OLD-5', 'LRF-00101']);
  assert.equal(view.documents.get('client').departement, '83');
  assert.equal(view.documents.get('client_codes').lastNumber, 101);
});
