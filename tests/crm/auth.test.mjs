import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const authSource = readFileSync(new URL('assets/js/firebase.js', root), 'utf8')
  .split('function ensureMobileCss()')[0]
  .replace(/^import .*;\n/gm, '')
  .replace(/^export /gm, '');

function sessionHarness(path = 'clients.html', { failSignOut = false } = {}) {
  const storage = new Map();
  const documentListeners = new Map();
  const redirects = [], alerts = [], auth = { currentUser: null };
  let next, error, signOutCalls = 0;
  const location = { pathname: '/' + path, search: '?edit=fake-client', hash: '#info', replace: url => redirects.push(url) };
  const context = vm.createContext({
    console: { error() {}, warn() {} }, location, alert: message => alerts.push(message),
    document: { documentElement: { style: {} }, addEventListener: (name, fn) => documentListeners.set(name, fn) },
    window: { dispatchEvent() {} }, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    getApps: () => [], getApp: () => ({}), initializeApp: () => ({}), getFirestore: () => ({}), getAuth: () => auth,
    onAuthStateChanged: (_auth, callback, onError) => { next = callback; error = onError; },
    signOut: async () => { signOutCalls++; if (failSignOut) throw new Error('offline'); auth.currentUser = null; }
  });
  const load = () => vm.runInContext('(function(){' + authSource + '\nglobalThis.gate = { waitForAgent, getAgentProfile };})()', context);
  load();
  return {
    auth, storage, location, redirects, alerts, context, load,
    get signOutCalls() { return signOutCalls; },
    emit: async user => { auth.currentUser = user; await next(user); },
    fail: () => error({ code: 'auth/network-request-failed' }),
    logout: async () => { let stopped = false; await documentListeners.get('click')({ target: { closest: () => ({}) }, preventDefault() {}, stopImmediatePropagation() { stopped = true; } }); return stopped; },
    wait: () => context.gate.waitForAgent()
  };
}
const allowedUser = () => ({ email: 'jerome@leroyfactory.fr', uid: 'fictitious-agent' });

test('restored Firebase session is awaited before a CRM consumer starts', async () => {
  const h = sessionHarness();
  let started = false;
  const ready = h.wait().then(profile => { started = true; return profile; });
  await Promise.resolve();
  assert.equal(started, false);
  assert.equal(h.context.document.documentElement.style.visibility, 'hidden');
  await h.emit(allowedUser());
  const profile = await ready;
  assert.equal(profile.uid, 'fictitious-agent');
  assert.equal(h.storage.get('agentLoggedIn'), 'true');
  assert.equal(h.context.document.documentElement.style.visibility, 'visible');
  assert.deepEqual(h.redirects, []);
});

test('cache-query module reimports preserve the restored session and share the gate', async () => {
  const h = sessionHarness(); await h.emit(allowedUser());
  const first = await h.wait();
  h.load();
  assert.equal((await h.wait()).uid, first.uid);
  assert.equal(h.context.document.documentElement.style.visibility, 'visible');
  await h.logout(); assert.equal(h.signOutCalls, 1);
});

test('forged localStorage hints never authorize a missing Firebase session', async () => {
  const h = sessionHarness();
  h.storage.set('agentLoggedIn', 'true'); h.storage.set('agentEmail', 'jerome@leroyfactory.fr');
  await h.emit(null);
  assert.equal(await h.wait(), null);
  assert.equal(h.storage.has('agentLoggedIn'), false);
  assert.equal(h.redirects[0], 'agent.html?return=clients.html%3Fedit%3Dfake-client%23info');
});

test('foreign Firebase account is signed out and never receives a CRM profile', async () => {
  const h = sessionHarness();
  await h.emit({ email: 'fictional@example.invalid', uid: 'foreign' });
  assert.equal(await h.wait(), null);
  assert.equal(h.signOutCalls, 1);
  assert.equal(h.redirects.length, 1);
});

test('logout ends the Firebase session and clears all legacy agent hints', async () => {
  const h = sessionHarness(); await h.emit(allowedUser());
  assert.equal(await h.logout(), true);
  assert.equal(h.signOutCalls, 1); assert.equal(h.auth.currentUser, null);
  for (const key of ['agentLoggedIn', 'agentName', 'agentEmail', 'agentUid']) assert.equal(h.storage.has(key), false);
  assert.equal(h.location.href, 'agent.html');
});

test('failed logout is not reported as success or followed by login redirect', async () => {
  const h = sessionHarness('dashboard.html', { failSignOut: true }); await h.emit(allowedUser());
  await h.logout();
  assert.equal(h.location.href, undefined); assert.equal(h.alerts.length, 1);
  assert.equal(h.storage.get('agentLoggedIn'), 'true');
});

test('Firebase restoration errors settle waiters and send CRM back to login', async () => {
  const h = sessionHarness(); h.fail();
  assert.equal(await h.wait(), null); assert.equal(h.redirects.length, 1);
});

test('private CRM pages share the real Firebase gate, public catalogue does not redirect', async () => {
  for (const page of ['documents-clients.html', 'analyse-ventes-clients.html', 'controle-site.html', 'contrats-usine-jerome.html']) {
    const h = sessionHarness(page); await h.emit(null); assert.equal(h.redirects.length, 1, page);
  }
  const publicPage = sessionHarness('catalogues.html'); await publicPage.emit(null); assert.equal(publicPage.redirects.length, 0);
});

const fetchSource = readFileSync(new URL('assets/js/account-requests-nav.js', root), 'utf8')
  .split('function addNav()')[0].replace(/^import .*;\n/gm, '');
function fetchHarness(profile, getIdToken = async () => 'test-only-token') {
  const requests = [], auth = { currentUser: profile ? { getIdToken } : null };
  const window = { fetch: async (input, init) => { requests.push({ input, init }); return { ok: true }; } };
  vm.runInNewContext(fetchSource, { window, auth, waitForAgent: async () => profile, Headers, Request });
  return { fetch: window.fetch, requests };
}

test('CRM function requests attach the current bearer explicitly', async () => {
  const h = fetchHarness({ uid: 'fake' });
  await h.fetch('https://us-central1-le-roy-factory.cloudfunctions.net/sendGroupEmail', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  assert.equal(h.requests[0].init.headers.get('Authorization'), 'Bearer test-only-token');
  assert.equal(h.requests[0].init.headers.get('Content-Type'), 'application/json');
});

test('missing or expired auth never falls through to an unauthenticated Cloud Function request', async () => {
  const none = fetchHarness(null);
  await assert.rejects(none.fetch('https://us-central1-le-roy-factory.cloudfunctions.net/crmFilesUpload'), /Session CRM/);
  assert.equal(none.requests.length, 0);
  const expired = fetchHarness({ uid: 'fake' }, async () => { throw new Error('token-expired'); });
  await assert.rejects(expired.fetch('https://us-central1-le-roy-factory.cloudfunctions.net/sendGroupEmail'), /token-expired/);
  assert.equal(expired.requests.length, 0);
});

test('unrelated requests receive no agent bearer', async () => {
  const h = fetchHarness({ uid: 'fake' });
  await h.fetch('https://geo.api.gouv.fr/communes', { method: 'GET' });
  assert.equal(h.requests[0].init.headers, undefined);
});

const safeReturnStatement = readFileSync(new URL('agent.html', root), 'utf8').match(/const safeReturn = [^\n]+/)[0];
test('login returns to the requested CRM page and rejects external destinations', () => {
  const redirectFor = returnTo => {
    const context = { returnTo };
    vm.runInNewContext(safeReturnStatement + '; globalThis.result = safeReturn;', context);
    return context.result;
  };
  for (const path of ['documents-clients.html?client=fake', 'parametres.html', 'contrats-usine-jerome.html', 'analyse-ventes-clients.html']) assert.equal(redirectFor(path), path);
  for (const path of ['https://example.invalid', '//example.invalid', 'javascript:alert(1)', 'clients.html/../../outside.html']) assert.equal(redirectFor(path), 'dashboard.html');
});

test('active CRM readers keep Firestore document IDs authoritative over stored payload IDs', () => {
  const files = ['assets/js/demandes-clients.js', 'assets/js/statistiques-core.js', 'assets/js/statistiques-commissions.js', 'assets/js/statistiques-ux-fix.js', 'assets/js/analyse-ventes-clients.js', 'assets/js/merchandising-files.js', 'assets/js/agenda-v2.js', 'document-usines.html', 'expo-clients.html'];
  for (const file of files) {
    const source = readFileSync(new URL(file, root), 'utf8');
    assert.doesNotMatch(source, /\{\s*id\s*:\s*\w+\.id\s*,\s*\.\.\./, file);
    const readers = [...source.matchAll(/\{\.\.\.(\w+)\.data\(\),id:\1\.id\}/g)];
    assert.ok(readers.length, file + ' includes an authoritative document reader');
    for (const reader of readers) {
      const snapshot = { id: 'actual-document', data: () => ({ id: 'stale-import-id', societe: 'Fictitious customer' }) };
      const parsed = vm.runInNewContext('(' + reader[0] + ')', { [reader[1]]: snapshot });
      assert.equal(parsed.id, 'actual-document');
    }
  }
});
