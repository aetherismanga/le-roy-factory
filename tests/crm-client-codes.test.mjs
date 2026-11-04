import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function allocator(client, lastNumber) {
  let source = await readFile(new URL('../assets/js/client-codes.js', import.meta.url), 'utf8');
  source = source.replace(/^import .*;\n/gm, '').replace(/if\(document.readyState==="loading"\)document.addEventListener\("DOMContentLoaded",init,\{once:true\}\);else init\(\);\s*$/, '');
  source += '\nglobalThis.testCodes = { assignCode };';
  const documents = new Map([['client', { ...client }], ['client_codes', { lastNumber }]]);
  let writes = 0;
  const context = {
    db: {}, doc: (_, __, id) => id,
    runTransaction: async (_, callback) => callback({
      get: async id => ({ exists: () => documents.has(id), data: () => documents.get(id) }),
      set: (id, patch) => { writes++; documents.set(id, { ...documents.get(id), ...patch }); },
      update: (id, patch) => { writes++; documents.set(id, { ...documents.get(id), ...patch }); }
    }),
    console
  };
  vm.createContext(context); vm.runInContext(source, context);
  return { allocate: () => context.testCodes.assignCode('client'), documents, writes: () => writes };
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
