import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/biopietra-access.js',import.meta.url),'utf8');
function harness({admin = null, session = {codeClient:'LRF-99998',departement:'34',partenaires:['Biopietra']}, responseStatus = 200, contentType = 'application/pdf', gate = null} = {}) {
  let s = session, closed = 0;
  const listeners = new Map(), requests = [], readers = [];
  const user = admin ? {email:admin,uid:'test-agent',getIdToken:async force => { assert.equal(force,true); return 'fresh-firebase-token'; }} : null;
  const auth = {currentUser:user,authStateReady:async () => {}};
  const app = {options:{projectId:'le-roy-factory'}};
  const window = {LRF_PRO_SESSION:{read:() => s},
    addEventListener(name,listener) { if (!listeners.has(name)) listeners.set(name,[]); listeners.get(name).push(listener); },
    dispatchEvent(event) { for (const listener of listeners.get(event.type) || []) listener(event); }};
  const context = {window,document:{addEventListener(){},visibilityState:'visible'},sessionStorage:{getItem:() => null},
    AbortController,CustomEvent:class { constructor(type) { this.type = type; } },setTimeout,clearTimeout,
    async loadModule(url) {
      if (url.includes('firebase-app')) return {getApps:() => [{options:{projectId:'other-app'}},app],initializeApp(){ throw Error('Existing LRF app must be reused'); }};
      if (url.includes('firebase-auth')) return {getAuth:a => { assert.equal(a,app); return auth; },onIdTokenChanged(){}};
      return {showSecurePdf:async (blob,options) => { readers.push({blob,options}); return {close(){ closed++; }}; }};
    },
    async fetch(url,options) {
      requests.push({url,body:JSON.parse(options.body),headers:options.headers,cache:options.cache,credentials:options.credentials});
      if (gate) await gate;
      return {ok:responseStatus === 200,status:responseStatus,headers:{get:() => contentType},json:async () => ({error:'Accès refusé'}),blob:async () => ({type:'application/pdf',size:42})};
    }};
  vm.runInNewContext(source.replaceAll('import(','loadModule('),context);
  return {api:window.LRF_BIOPIETRA_ACCESS,requests,readers,auth,get closed(){return closed;},
    logout() { s = null; auth.currentUser = null; window.dispatchEvent({type:'lrf-pro-session-changed'}); }};
}

test('Biopietra documents use private server authorization and the in-page reader',async () => {
  const h = harness(); assert.equal(h.api.canAccess(),true);
  const trigger = {};
  await h.api.openTariff(trigger,'biopietra-code-prix');
  assert.deepEqual(h.requests[0].body,{tariffId:'biopietra-code-prix',codeClient:'LRF-99998',departement:'34'});
  assert.equal(h.requests[0].url,'https://gettariffpdf-5m3lsyu7bq-uc.a.run.app');
  assert.equal(h.requests[0].cache,'no-store'); assert.equal(h.requests[0].credentials,'omit');
  assert.equal(h.readers.length,1); assert.equal(h.readers[0].options.trigger,trigger);
  h.logout(); assert.equal(h.closed,1); assert.equal(h.api.canAccess(),false);
});

test('a verified Firebase agent takes precedence over a client and sends a fresh bearer',async () => {
  const h = harness({admin:'jerome@leroyfactory.fr'});
  await h.api.openTariff();
  assert.deepEqual(h.requests[0].body,{tariffId:'biopietra-code-prix'});
  assert.equal(h.requests[0].headers.Authorization,'Bearer fresh-firebase-token');
});

test('local admin flags, another manufacturer and an arbitrary document id cannot fetch a tariff',async () => {
  const forged = harness({session:{isAdmin:true,email:'jerome@leroyfactory.fr'}});
  await assert.rejects(() => forged.api.openTariff(),/Reconnectez/); assert.equal(forged.requests.length,0);
  const unrelated = harness({session:{codeClient:'LRF-99998',departement:'34',partenaires:['La Fenice']}});
  assert.equal(unrelated.api.canAccess(),false); await assert.rejects(() => unrelated.api.openTariff(),/Reconnectez/);
  assert.equal(unrelated.requests.length,0);
  const valid = harness(); await assert.rejects(() => valid.api.openTariff(null,'elios-2026'),/inconnu/); await assert.rejects(() => valid.api.openTariff(null,'biopietra-2026'),/inconnu/); assert.equal(valid.requests.length,0);
});

test('server refusals and non-PDF responses never render or fall back to a public URL',async () => {
  const refused = harness({responseStatus:403}); await assert.rejects(() => refused.api.openTariff(),/Accès refusé/); assert.equal(refused.readers.length,0);
  const html = harness({contentType:'text/html'}); await assert.rejects(() => html.api.openTariff(),/indisponible/); assert.equal(html.readers.length,0);
});

test('a delayed authorized response is discarded after logout',async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const h = harness({gate}); const opening = h.api.openTariff();
  for (let i = 0; i < 30 && !h.requests.length; i++) await Promise.resolve();
  assert.equal(h.requests.length,1); h.logout(); release();
  await assert.rejects(() => opening,/session a changé/); assert.equal(h.readers.length,0);
});
