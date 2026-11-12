import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {cachedAgentProfile, verifiedAgentProfile} from '../assets/js/agent-identity.mjs';
import * as core from '../assets/js/crm-client-integrity-core.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
function delayedAgent(email, hasRole = true) {
  let finish;
  const token = new Promise(resolve => { finish = resolve; });
  const user = {uid:email, email, emailVerified:true, getIdTokenResult:() => token};
  return {user, finish:() => finish({
    claims:{email_verified:true, ...(hasRole ? {lrfAgentUid:user.uid} : {})},
    expirationTime:new Date(Date.now() + 60000).toISOString()
  })};
}
function authState(user) {
  let stopped = 0;
  return {
    auth:{currentUser:user},
    onAuthStateChanged(_auth, callback) {
      queueMicrotask(() => callback(user));
      return () => { stopped++; };
    },
    get stopped() { return stopped; }
  };
}

for (const email of ['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']) {
  test(`clients wait for delayed signed-agent verification and integrity: ${email}`, async () => {
    const agent = delayedAgent(email), session = authState(agent.user);
    const html = await readFile(new URL('../clients.html', import.meta.url), 'utf8');
    const start = html.indexOf('const profile = await new Promise');
    const end = html.indexOf('const currentAgent = profile.name;', start);
    assert.ok(start >= 0 && end > start);
    let integrityDone;
    const integrityReady = new Promise(resolve => { integrityDone = resolve; });
    const context = vm.createContext({
      auth:session.auth, onAuthStateChanged:session.onAuthStateChanged,
      getAgentProfile:cachedAgentProfile, verifiedAgentProfile, integrityReady
    });
    // Reproduce firebase.js verifying the same session asynchronously.
    const centralVerification = verifiedAgentProfile(agent.user);
    let settled = false, result;
    const pending = vm.runInContext(`(async () => { ${html.slice(start, end)} return profile; })()`, context)
      .then(profile => { settled = true; result = profile; });
    await tick();
    assert.equal(settled, false, 'must not abandon the controller while verification is pending');
    agent.finish();
    await centralVerification;
    await tick();
    assert.equal(settled, false, 'must also wait for the client integrity map');
    integrityDone();
    await pending;
    assert.equal(result.email, email);
    assert.equal(session.stopped, 1);
  });

  test(`integrity startup resumes after delayed agent verification without writes: ${email}`, async () => {
    const agent = delayedAgent(email), session = authState(agent.user);
    let reads = 0, subscriptions = 0, settled = false;
    let source = await readFile(new URL('../assets/js/crm-client-integrity.js', import.meta.url), 'utf8');
    source = source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
    const context = vm.createContext({
      ...core, auth:session.auth, onAuthStateChanged:session.onAuthStateChanged,
      getAgentProfile:cachedAgentProfile, verifiedAgentProfile,
      db:{}, collection:() => 'clients',
      getDocs:async () => { reads++; return {docs:[]}; },
      onSnapshot:() => { subscriptions++; return () => {}; },
      runTransaction:() => { throw Error('Opening clients must never write data'); },
      document:{readyState:'complete',getElementById:() => null,querySelectorAll:() => [],addEventListener() {}},
      window:{addEventListener() {}}, URLSearchParams, location:{search:''}, history:{}, console
    });
    const centralVerification = verifiedAgentProfile(agent.user);
    vm.runInContext(source + '\nglobalThis.startupReady = ready;', context);
    context.startupReady.then(() => { settled = true; });
    await tick();
    assert.equal(reads, 0);
    agent.finish();
    await centralVerification;
    await tick();
    assert.equal(settled, true, 'integrity must not wait forever for another auth-state event');
    assert.equal(reads, 1);
    assert.equal(subscriptions, 1);
    assert.equal(session.stopped, 1);
  });
}
