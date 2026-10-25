import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import {
  DAILY_MESSAGES, authenticatedFirstName, createWelcomeTracker, dailyMessage,
  localDateKey, millisecondsUntilNextLocalDay, welcomeStorageKey
} from '../../assets/js/crm-daily-welcome-core.mjs';

const jerome = { uid: 'agent-j', name: 'Jérôme Hugol', email: 'jerome@example.invalid' };
const coryne = { uid: 'agent-c', name: 'Coryne', email: 'coryne@example.invalid' };
const today = () => new Date(2026, 9, 25, 9, 30);
function storageFixture() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) };
}

test('at least 60 distinct short French messages, with a new message each local day', () => {
  assert.ok(DAILY_MESSAGES.length >= 60);
  assert.equal(new Set(DAILY_MESSAGES).size, DAILY_MESSAGES.length);
  assert.ok(DAILY_MESSAGES.every(message => message.length < 100));
  for (let n = 0; n < 500; n++) {
    const a = new Date(2026, 0, n + 1), b = new Date(2026, 0, n + 2);
    assert.notEqual(dailyMessage(a), dailyMessage(b));
    assert.equal(dailyMessage(a), dailyMessage(new Date(2026, 0, n + 1, 23, 59)));
  }
});

test('names come only from a supplied authenticated UID profile', () => {
  assert.equal(authenticatedFirstName(jerome), 'Jérôme');
  assert.equal(authenticatedFirstName(coryne), 'Coryne');
  assert.equal(authenticatedFirstName({ name: 'Jérôme' }), '');
  assert.equal(authenticatedFirstName({ uid: '', name: 'Coryne' }), '');
  assert.equal(authenticatedFirstName({ uid: 'x' }), '');
  assert.equal(authenticatedFirstName({ uid: 'x', displayName: '  Anne-Marie  Durand ' }), 'Anne-Marie');
  assert.equal(authenticatedFirstName({ uid: 'x', name: 'coryne@example.invalid' }), '');
  assert.equal(authenticatedFirstName({ uid: 'x', name: '<script>' }), '');
  assert.equal(authenticatedFirstName({ uid: 'x', firstName: 'Élodie', name: 'Autre Nom' }), 'Élodie');
});

test('first opening shows once per UID, independent of account order', () => {
  const storage = storageFixture(), tracker = createWelcomeTracker(storage);
  assert.equal(tracker.claim(jerome, today()).show, true);
  assert.equal(tracker.claim(jerome, today()).show, false);
  assert.equal(tracker.claim(coryne, today()).show, true);
  assert.equal(tracker.claim(coryne, today()).show, false);
  assert.equal(tracker.claim(jerome, today()).show, false);
  assert.equal(storage.data.size, 2);
  assert.ok([...storage.data.values()].every(value => value === '2026-10-25'));
});

test('refresh and close/reopen use the persistent display date', () => {
  const storage = storageFixture();
  assert.equal(createWelcomeTracker(storage).claim(jerome, today()).show, true);
  assert.equal(createWelcomeTracker(storage).claim(jerome, today()).show, false);
  assert.equal(createWelcomeTracker(storage).claim(coryne, today()).show, true);
  assert.equal(createWelcomeTracker(storage).claim(coryne, today()).show, false);
});

test('local midnight resets each user independently, including year changes', () => {
  const tracker = createWelcomeTracker(storageFixture());
  const before = new Date(2026, 11, 31, 23, 59, 59);
  const after = new Date(2027, 0, 1, 0, 0, 1);
  assert.equal(tracker.claim(jerome, before).show, true);
  assert.equal(tracker.claim(coryne, before).show, true);
  assert.equal(tracker.claim(jerome, after).show, true);
  assert.equal(tracker.claim(jerome, after).show, false);
  assert.equal(tracker.claim(coryne, after).show, true);
  assert.equal(localDateKey(after), '2027-01-01');
});

test('denied storage degrades to page memory without breaking the CRM', () => {
  const blocked = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Denied'); } };
  const tracker = createWelcomeTracker(blocked);
  const first = tracker.claim(jerome, today());
  assert.equal(first.show, true);
  assert.equal(first.persisted, false);
  assert.equal(tracker.claim(jerome, today()).show, false);
  assert.equal(tracker.claim(coryne, today()).show, true);
  assert.equal(tracker.claim(jerome, new Date(2026, 9, 26)).show, true);
});

test('readable but full storage retains in-memory once-per-day behavior', () => {
  const full = { getItem() { return null; }, setItem() { throw new Error('Quota exceeded'); } };
  const tracker = createWelcomeTracker(full);
  assert.equal(tracker.claim(jerome, today()).show, true);
  assert.equal(tracker.claim(jerome, today()).show, false);
  const missingStorage = createWelcomeTracker();
  assert.equal(missingStorage.claim(jerome, today()).show, true);
  assert.equal(missingStorage.claim(jerome, today()).show, false);
});

test('invalid or signed-out users neither greet nor store data', () => {
  const storage = storageFixture(), tracker = createWelcomeTracker(storage);
  for (const profile of [null, undefined, {}, { name: 'Jérôme' }, { uid: ' ' }]) {
    assert.equal(tracker.claim(profile, today()).show, false);
  }
  assert.equal(storage.data.size, 0);
});

test('malformed stored dates are safely replaced and UID keys cannot collide', () => {
  const storage = storageFixture();
  storage.setItem(welcomeStorageKey(jerome.uid), '{invalid');
  assert.equal(createWelcomeTracker(storage).claim(jerome, today()).show, true);
  assert.equal(storage.getItem(welcomeStorageKey(jerome.uid)), '2026-10-25');
  assert.notEqual(welcomeStorageKey('a:b'), welcomeStorageKey('a%3Ab'));
  assert.equal(welcomeStorageKey(null), null);
});

test('midnight timer follows local dates and invalid dates are rejected', () => {
  const before = new Date(2026, 9, 25, 23, 59, 59, 500);
  assert.equal(millisecondsUntilNextLocalDay(before), 500);
  const expected = new Date(2026, 9, 26).getTime() - today().getTime();
  assert.equal(millisecondsUntilNextLocalDay(today()), expected);
  assert.throws(() => localDateKey(new Date('invalid')), /invalide/);
  assert.throws(() => dailyMessage(new Date('invalid')), /invalide/);
});

async function browserHarness() {
  const source = (await readFile(new URL('../../assets/js/crm-daily-welcome.js', import.meta.url), 'utf8'))
    .replace(/^import[\s\S]*?from '\.\/crm-daily-welcome-core\.mjs';/, '')
    .replace(/export (?=(?:async )?function )/g, '');
  const nodes = [], timers = new Map(), windowListeners = new Map(), documentListeners = new Map();
  let timerId = 0;
  const element = tag => ({
    tag, children: [], attributes: {}, listeners: new Map(),
    append(...children) { this.children.push(...children); },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, callback) { this.listeners.set(type, callback); },
    remove() { this.removed = true; }
  });
  const document = {
    visibilityState: 'visible',
    body: { append(node) { nodes.push(node); } },
    createElement: element,
    querySelector: () => ({ src: '/existing-round-lrf-logo.png' }),
    addEventListener: (type, callback) => documentListeners.set(type, callback),
    removeEventListener: type => documentListeners.delete(type)
  };
  const window = {
    localStorage: storageFixture(),
    addEventListener: (type, callback) => windowListeners.set(type, callback),
    removeEventListener: type => windowListeners.delete(type)
  };
  const context = {
    window, document, Date, authenticatedFirstName, createWelcomeTracker,
    dailyMessage, millisecondsUntilNextLocalDay, welcomeStorageKey,
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  runInNewContext(source + '\nthis.start = startDailyWelcome; this.show = showDailyWelcome; this.showSafely = showDailyWelcomeSafely;', context);
  return {
    ...context, nodes, timers, windowListeners, documentListeners,
    active: () => nodes.filter(node => !node.removed),
    flush: async () => { await Promise.resolve(); await Promise.resolve(); }
  };
}

test('browser lifecycle preserves welcome on duplicate refreshes and closes immediately', async () => {
  const h = await browserHarness();
  const stop = h.start({ getProfile: async () => jerome });
  await h.flush();
  assert.equal(h.active().length, 1);
  const card = h.active()[0];
  assert.equal(card.attributes.role, 'status');
  assert.equal(card.children[0].src, '/existing-round-lrf-logo.png');
  assert.equal(card.children[1].children[0].textContent, 'Bonjour Jérôme !');
  await h.windowListeners.get('focus')();
  await h.windowListeners.get('pageshow')();
  assert.equal(h.active()[0], card);
  card.children[2].listeners.get('click')();
  assert.equal(h.active().length, 0);
  assert.equal(h.show(jerome), false);
  stop();
  assert.equal(h.windowListeners.size, 0);
  assert.equal(h.documentListeners.size, 0);
  assert.equal(h.timers.size, 0);
});

test('browser account switching replaces visible name and never greets a signed-out user', async () => {
  const h = await browserHarness();
  const stop = h.start({ getProfile: async () => jerome });
  await h.flush();
  h.windowListeners.get('lrf-agent-auth-ready')({ detail: coryne });
  assert.equal(h.active().length, 1);
  assert.equal(h.active()[0].children[1].children[0].textContent, 'Bonjour Coryne !');
  h.windowListeners.get('lrf-agent-auth-ready')({ detail: jerome });
  assert.equal(h.active().length, 0);
  h.windowListeners.get('lrf-agent-auth-ready')({ detail: null });
  assert.equal(h.active().length, 0);
  stop();
});

test('background tabs defer greeting until visible and a stale async session cannot overwrite a new one', async () => {
  const h = await browserHarness();
  h.document.visibilityState = 'hidden';
  const stop = h.start({ getProfile: async () => jerome });
  await h.flush();
  assert.equal(h.nodes.length, 0);
  h.document.visibilityState = 'visible';
  h.documentListeners.get('visibilitychange')();
  await h.flush();
  assert.equal(h.active().length, 1);
  stop();

  const h2 = await browserHarness();
  let resolveOld;
  const stop2 = h2.start({ getProfile: () => new Promise(resolve => { resolveOld = resolve; }) });
  h2.windowListeners.get('lrf-agent-auth-ready')({ detail: coryne });
  resolveOld(jerome);
  await h2.flush();
  assert.equal(h2.active().length, 1);
  assert.equal(h2.active()[0].children[1].children[0].textContent, 'Bonjour Coryne !');
  stop2();
});

test('two simultaneous tabs show only one greeting through the shared Web Lock', async () => {
  const a = await browserHarness(), b = await browserHarness();
  const storage = storageFixture();
  a.window.localStorage = storage;
  b.window.localStorage = storage;
  let queue = Promise.resolve(), requests = 0;
  const locks = { request(name, callback) {
    assert.equal(name, welcomeStorageKey(jerome.uid));
    requests++;
    const operation = queue.then(callback);
    queue = operation.catch(() => {});
    return operation;
  } };
  a.window.navigator = { locks };
  b.window.navigator = { locks };
  const results = await Promise.all([a.showSafely(jerome), b.showSafely(jerome)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(a.active().length + b.active().length, 1);
  assert.equal(requests, 2);
});

test('Web Locks permission errors gracefully fall back to the normal tracker', async () => {
  const h = await browserHarness();
  h.window.navigator = { locks: { request: async () => { throw new Error('SecurityError'); } } };
  assert.equal(await h.showSafely(jerome), true);
  assert.equal(await h.showSafely(jerome), false);
  assert.equal(h.active().length, 1);
});

test('a queued Web Lock cannot greet the old account after an account change', async () => {
  const h = await browserHarness(), pending = [];
  h.window.navigator = { locks: { request: (_, callback) => new Promise(resolve => pending.push(() => resolve(callback()))) } };
  const stop = h.start({ getProfile: async () => jerome });
  await h.flush();
  assert.equal(pending.length, 1);
  h.windowListeners.get('lrf-agent-auth-ready')({ detail: coryne });
  assert.equal(pending.length, 2);
  pending[0](); pending[1]();
  await h.flush();
  assert.equal(h.active().length, 1);
  assert.equal(h.active()[0].children[1].children[0].textContent, 'Bonjour Coryne !');
  stop();
});
