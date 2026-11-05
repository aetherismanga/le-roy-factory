import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const codeFields = ['codeClient', 'codeLRF', 'codeLrf', 'code_lrf', 'codesLRF'];
const protectedProspect = {
  type: 'prospect', autoAssignLrfCode: false,
  nonVisite: true, visiteStatus: 'non_visite',
};

// Evaluate the expressions extracted from the rules for focused regression
// coverage. This does not compile Firestore syntax or replace emulator QA.
function translate(expression) {
  return expression
    .replace(/data\.get\(([^)]*)\) in (\[[^\]]*\])/g,
      (_, args, list) => `${list}.includes(data.get(${args}))`)
    .replace(/data\.get\(([^)]*)\) is list/g,
      (_, args) => `Array.isArray(data.get(${args}))`)
    .replace(/\.size\(\)/g, '.length');
}
function ruleFunction(name) {
  const body = rules.match(new RegExp(`function ${name}\\(data\\) \\{([\\s\\S]*?)\\n    \\}`))?.[1];
  assert.ok(body, `missing ${name}`);
  return new Function('data', translate(body));
}
const blocksAutomaticLrfCode = ruleFunction('blocksAutomaticLrfCode');
const hasNoLrfCode = ruleFunction('hasNoLrfCode');

function map(data) {
  return {
    get: (field, fallback) => Object.hasOwn(data, field) ? data[field] : fallback,
    diff: (old) => ({
      affectedKeys: () => ({
        hasAny: (fields) => fields.some((key) =>
          Object.hasOwn(data, key) !== Object.hasOwn(old.value, key)
          || !isDeepStrictEqual(data[key], old.value[key])),
      }),
    }),
    value: data,
  };
}
function clientRule(operation) {
  const expression = rules.match(new RegExp(`allow ${operation}: if ([\\s\\S]*?);`))?.[1];
  assert.ok(expression, `missing client ${operation} rule`);
  return new Function('request', 'resource', 'isAgent',
    'blocksAutomaticLrfCode', 'hasNoLrfCode', `return ${translate(expression)};`);
}
const create = clientRule('create');
const update = clientRule('update');
function allowed(operation, before, after, agent = true) {
  return (operation === 'create' ? create : update)(
    { resource: { data: map(after) } }, { data: map(before) },
    () => agent, blocksAutomaticLrfCode, hasNoLrfCode,
  );
}

test('authenticated agent allowlist is preserved', () => {
  const body = rules.match(/function isAgent\(\) \{([\s\S]*?)\n    \}/)?.[1];
  assert.match(body, /request\.auth != null/);
  assert.match(body, /request\.auth\.token\.email != null/);
  assert.deepEqual([...body.matchAll(/'([^']+@[^']+)'/g)].map((row) => row[1]), [
    'jerome@leroyfactory.fr', 'coryne@leroyfactory.fr',
  ]);
});

test('generic write permission cannot match the protected client document', () => {
  assert.doesNotMatch(rules, /match \/\{document=\*\*\}/);
  assert.match(rules, /match \/\{collection\}\/\{document=\*\*\} \{\s*allow read, write: if isAgent\(\) && collection != 'clients';/);
  assert.match(rules, /match \/clients\/\{clientId\}\/\{subcollection\}\/\{document=\*\*\} \{\s*allow read, write: if isAgent\(\);/);
  assert.doesNotMatch(rules, /match \/clients\/\{clientId\}\/\{document=\*\*\}/);
  assert.match(rules, /match \/clients\/\{clientId\} \{\s*allow read, delete: if isAgent\(\);/);
});

test('protected prospects can be created with absent or empty code fields', () => {
  for (const fields of [{}, { codeClient: '', codeLRF: null, codeLrf: '', codesLRF: [] }]) {
    assert.equal(allowed('create', {}, { ...protectedProspect, ...fields }), true);
  }
});

test('each code alias is blocked on protected prospect creation', () => {
  for (const key of codeFields) {
    const value = key === 'codesLRF' ? ['LRF-00123'] : 'LRF-00123';
    assert.equal(allowed('create', {}, { ...protectedProspect, [key]: value }), false, key);
  }
  assert.equal(allowed('create', {}, { ...protectedProspect, codesLRF: 'LRF-00123' }), false);
});

test('each protection flag individually blocks stale tab code allocation', () => {
  for (const flag of [
    { autoAssignLrfCode: false }, { nonVisite: true }, { visiteStatus: 'non_visite' },
  ]) {
    assert.equal(allowed('create', {}, { ...flag, codeClient: 'LRF-00123' }), false);
    assert.equal(allowed('update', flag, { ...flag, codeClient: 'LRF-00123' }), false);
  }
});

test('protected prospect updates allow phone, address and visit notes', () => {
  assert.equal(allowed('update', protectedProspect, {
    ...protectedProspect, telephone: '0400000000', ville: 'Nice', notes: 'À appeler',
  }), true);
});

test('existing codes survive protection and non-code edits', () => {
  const historical = { type: 'client', codeClient: 'LRF-00012', codesLRF: ['OLD-12'] };
  const protectedClient = { ...historical, ...protectedProspect };
  assert.equal(allowed('update', historical, protectedClient), true);
  assert.equal(allowed('update', protectedClient, { ...protectedClient, notes: 'Ancien client' }), true);
  for (const key of ['codeClient', 'codesLRF']) {
    const removed = { ...protectedClient }; delete removed[key];
    assert.equal(allowed('update', protectedClient, removed), false, `${key} deletion`);
    assert.equal(allowed('update', protectedClient, {
      ...protectedClient, [key]: key === 'codesLRF' ? [] : '',
    }), false, `${key} clearing`);
  }
});

test('removing flags and assigning a code in one request is rejected', () => {
  assert.equal(allowed('update', protectedProspect, {
    type: 'client', autoAssignLrfCode: true, nonVisite: false,
    visiteStatus: 'visite', codeClient: 'LRF-00012',
  }), false);
});

test('ordinary and visited clients retain current code allocation behavior', () => {
  const visited = { type: 'prospect', autoAssignLrfCode: true, nonVisite: false, visiteStatus: 'visite' };
  assert.equal(allowed('create', {}, { type: 'client', codeClient: 'LRF-00012' }), true);
  assert.equal(allowed('update', visited, { ...visited, codeClient: 'LRF-00012' }), true);
});

test('create and update always retain the agent requirement', () => {
  assert.equal(allowed('create', {}, protectedProspect, false), false);
  assert.equal(allowed('create', {}, { codeClient: 'LRF-00012' }, false), false);
  assert.equal(allowed('update', protectedProspect, { ...protectedProspect, notes: 'Test' }, false), false);
  assert.equal(allowed('update', {}, { codeClient: 'LRF-00012' }, false), false);
});
