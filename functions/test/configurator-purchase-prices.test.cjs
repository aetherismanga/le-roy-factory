'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createPurchasePricesHandler, priceMap, storagePath} = require('../configurator-purchase-prices-core');
const {extractPrices} = require('../../tools/migrate-configurator-purchase-prices.cjs');

const verified = {uid: 'agent-test', email: 'jerome@leroyfactory.fr', token: {email_verified: true}};
const catalogue = variant => ({version: 1, variant, products: [{key: 'BRAND|REF', purchaseHT: 12.34, purchasePaletteHT: null, hidden: 'never return this'}], plinths: [{key: 'BRAND|PLINTH', purchaseHT: 3.21}]});
function harness(agent = verified, reader = async variant => catalogue(variant)) {
  let reads = 0, authenticationCalls = 0;
  const handler = createPurchasePricesHandler({getAgentFromRequest: async () => {authenticationCalls++; return agent;}, readPrices: async variant => {reads++; return reader(variant);}});
  async function call(body = {variant: 'plan-pose'}, {method = 'POST', origin = 'https://leroyfactory.fr'} = {}) {
    let status = 200, data; const headers = {};
    const res = {set(name, value) {headers[name] = value; return this;}, status(value) {status = value; return this;}, json(value) {data = value; return this;}, send(value) {data = value; return this;}};
    await handler({method, headers: {origin}, body}, res);
    return {status, data, headers};
  }
  return {call, reads: () => reads, authenticationCalls: () => authenticationCalls};
}

test('anonymous or client-pro-only identity cannot trigger any private read, even with forged role fields', async () => {
  const h = harness(null), response = await h.call({variant: 'plan-pose', type: 'admin', isAdmin: true, codeClient: 'LRF-12345', sessionToken: 'client-session'});
  assert.equal(response.status, 401); assert.equal(response.data.success, false); assert.equal(h.reads(), 0);
  assert.equal(response.data.products, undefined); assert.match(response.headers['Cache-Control'], /no-store/);
});

test('unverified email, unlisted email and absent UID fail closed before catalogue access', async () => {
  for (const agent of [{...verified, token: {email_verified: false}}, {...verified, token: {}}, {...verified, email: 'client@example.com'}, {...verified, uid: ''}]) {
    const h = harness(agent), response = await h.call();
    assert.equal(response.status, 403); assert.equal(h.reads(), 0); assert.equal(response.data.products, undefined);
  }
});

test('verified agent receives whitelisted amounts by reference for each supported configurator', async () => {
  const h = harness();
  for (const variant of ['plan-pose', 'studio-one', 'randal-general']) {
    const {status, data, headers} = await h.call({variant});
    assert.equal(status, 200); assert.equal(data.variant, variant); assert.equal(data.version, 1);
    assert.deepEqual(data.products['BRAND|REF'], {purchaseHT: 12.34, purchasePaletteHT: null});
    assert.equal(data.plinths['BRAND|PLINTH'].purchaseHT, 3.21);
    assert.equal(data.products['BRAND|REF'].hidden, undefined);
    assert.equal(headers['Access-Control-Allow-Origin'], 'https://leroyfactory.fr');
  }
  assert.equal(h.reads(), 3);
});

test('method, origin, preflight, path traversal and excessive input are bounded', async () => {
  const h = harness();
  assert.equal((await h.call(undefined, {origin: 'https://attacker.example'})).status, 403);
  assert.equal((await h.call(undefined, {method: 'GET'})).status, 405);
  assert.equal((await h.call(undefined, {method: 'OPTIONS'})).status, 204);
  assert.equal(h.authenticationCalls(), 0);
  assert.equal((await h.call({variant: '../private'})).status, 400);
  assert.equal((await h.call({variant: 'plan-pose', padding: 'x'.repeat(3000)})).status, 400);
  assert.equal(h.reads(), 0); assert.throws(() => storagePath('../private'));
});

test('storage failures and corrupted prices return no sensitive data or internal error', async () => {
  for (const reader of [async () => {throw new Error('SECRET_STORAGE_CONTENT');}, async variant => ({...catalogue(variant), variant: 'other'}), async variant => ({...catalogue(variant), products: [{key: 'bad', purchaseHT: -1}]})]) {
    const {status, data} = await harness(verified, reader).call();
    assert.equal(status, 503); assert.equal(data.products, undefined); assert.doesNotMatch(JSON.stringify(data), /SECRET|purchaseHT|bad/);
  }
});

test('reference validation rejects prototype keys, conflicting duplicates and coercible prices', () => {
  assert.throws(() => priceMap([{key: '__proto__', purchaseHT: 1}]));
  assert.throws(() => priceMap([{key: 'same', purchaseHT: 1}, {key: 'same', purchaseHT: 2}]));
  assert.throws(() => priceMap([{key: 'key', purchaseHT: '12'}]));
  assert.throws(() => priceMap([{key: 'key', purchaseHT: Infinity}]));
});

test('migration retains only amounts and reference keys, never public metadata or download tokens', () => {
  const migrated = extractPrices(catalogue('plan-pose'), 'plan-pose', 'source-commit');
  assert.deepEqual(migrated.products, [{key: 'BRAND|REF', purchaseHT: 12.34, purchasePaletteHT: null}]);
  assert.equal(migrated.sourceCommit, 'source-commit');
  assert.doesNotMatch(JSON.stringify(migrated), /hidden|never return/);
  assert.throws(() => extractPrices({products: [], plinths: []}, 'plan-pose', 'source'));
});

test('shared Firebase authentication checks live token revocation and rejects client sessions and other emails', async () => {
  let checkRevoked;
  const sandbox = {module: {exports: {}}, console: {warn() {}}, require(name) {
    assert.equal(name, 'firebase-admin');
    return {auth: () => ({verifyIdToken: async (token, revoked) => {
      checkRevoked = revoked;
      if (token === 'revoked') throw Object.assign(new Error('revoked'), {code: 'auth/id-token-revoked'});
      return {uid: 'test', email: token === 'agent' ? 'jerome@leroyfactory.fr' : 'client@example.com', email_verified: true};
    }})};
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../auth.js'), 'utf8'), sandbox);
  const authenticate = token => sandbox.module.exports.getAgentFromRequest({headers: {authorization: 'Bearer ' + token}});
  assert.equal((await authenticate('agent')).uid, 'test'); assert.equal(checkRevoked, true);
  assert.equal(await authenticate('revoked'), null); assert.equal(await authenticate('client-session'), null);
});
