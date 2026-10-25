import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

// Execute the actual object expressions used by the active CRM readers. Legacy
// imported records can contain an `id` field which must never become a write or
// navigation target instead of the authoritative Firestore document identifier.
const readers = [
  'clients.html',
  'assets/js/client-direct-email.js',
  'assets/js/client-codes.js',
  'assets/js/clients-operations.js',
  'assets/js/crm-smart-search.js',
  'assets/js/crm-client-enhancements.js',
  'assets/js/crm-client-partner-access.js',
  'assets/js/crm-moovago.js'
];
for (const path of readers) {
  test(`${path}: stored legacy id cannot replace the document id`, async () => {
    const source = await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
    const expressionPattern = /\{\s*(?:id\s*:\s*(\w+)\.id\s*,\s*\.\.\.\s*\1\.data\(\)|\.\.\.\s*(\w+)\.data\(\)\s*,\s*id\s*:\s*\2\.id)\s*\}/g;
    const expressions = [...source.matchAll(expressionPattern)];
    assert.ok(expressions.length, 'the active reader must expose its snapshot mapping');
    for (const match of expressions) {
      const snapshot = { id: 'actual-fictional-document', data: () => ({ id: 'legacy-conflicting-id', societe: 'Fiche fictive' }) };
      const value = runInNewContext(`(${match[0]})`, { [match[1] || match[2]]: snapshot });
      assert.equal(value.id, snapshot.id, 'an imported data.id must never become the client identity');
      assert.equal(value.societe, 'Fiche fictive');
    }
  });
}

