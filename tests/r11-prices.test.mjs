import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// All prices and tokens in these tests are synthetic.
const source = readFileSync(new URL('../assets/js/r11-prices.js',import.meta.url),'utf8');
const token = 'A'.repeat(43);
function harness({session = {codeClient:'LRF-12345',departement:'34',sessionToken:token},respond,firebaseEmail} = {}) {
  const events = new Map(), calls = [], writes = [], timers = new Set(), tokenCalls = [], authListeners = new Set();
  const storage = () => { const values = new Map(); return {getItem:k => values.get(k) || null,setItem:(k,v) => { values.set(k,v); writes.push([k,v]); },removeItem:k => values.delete(k)}; };
  let current = session;
  const window = {
    dispatchEvent(event) { for (const fn of events.get(event.type) || []) fn(event); },
    addEventListener(type,fn) { if (!events.has(type)) events.set(type,[]); events.get(type).push(fn); }
  };
  window.LRF_PRO_SESSION = {
    read:() => current,
    write(value) { current = value; window.dispatchEvent({type:'lrf-pro-session-changed'}); return value; },
    clear() { current = null; window.dispatchEvent({type:'lrf-pro-session-changed'}); }
  };
  const user=firebaseEmail?{uid:'synthetic-agent',email:firebaseEmail,async getIdToken(force){tokenCalls.push(force);if(force)for(const listener of authListeners)listener(user);return 'synthetic-id-token';}}:null;
  const firebaseAuth={currentUser:user,authStateReady:async()=>{}};
  const context = {window,AbortController,Intl,console,sessionStorage:storage(),localStorage:storage(),
    testFirebaseApps:{getApps:()=>[{options:{projectId:'le-roy-factory'}}]},
    testFirebaseAuth:{getAuth:()=>firebaseAuth,onIdTokenChanged:(_auth,listener)=>{authListeners.add(listener);listener(user);}},
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options?.detail;}},
    setTimeout(fn) { const id = {fn}; timers.add(id); return id; },clearTimeout(id) { timers.delete(id); },
    async fetch(url,options) {
      const body = JSON.parse(options.body); calls.push({url,body,options});
      const result = await respond?.(url,body) || {status:503,data:{}};
      return {ok:result.status >= 200 && result.status < 300,status:result.status,json:async() => result.data};
    }
  };
  const executable=source.replace("import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js')",'Promise.resolve(testFirebaseApps)').replace("import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')",'Promise.resolve(testFirebaseAuth)');
  vm.runInNewContext(executable,context);
  return {api:window.R11Prices,calls,writes,events,window,timers,tokenCalls,
    refreshToken(){for(const listener of authListeners)listener(firebaseAuth.currentUser);},
    signOut(){firebaseAuth.currentUser=null;for(const listener of authListeners)listener(null);}
  };
}
const bootstrap = extra => ({status:200,data:{success:true,version:1,expiresAt:Date.now()+300000,allowedPartners:['elios-ceramica','view-ceramica'],elios:{},eliosExact:{},view:[],...extra}});
const viewProduct = {format:'60×90',thickness:'20 mm',finish:'Grip R11',variantKey:'corso-6090-20'};
const viewCollection = {id:'view-corso',brand:'VIEW',name:'Corso'};

test('a forged local admin flag cannot authorize or retrieve prices',async() => {
  const {api,calls} = harness({session:{isAdmin:true,email:'jerome@leroyfactory.fr'}});
  const quote = await api.getPrice(viewProduct,viewCollection);
  assert.equal(quote.locked,true); assert.equal(calls.length,0);
});

test('server refusal and a missing partner both keep prices locked',async() => {
  let h = harness({respond:() => ({status:403,data:{}})});
  assert.equal((await h.api.getPrice(viewProduct,viewCollection)).locked,true);
  h = harness({respond:() => bootstrap({allowedPartners:['elios-ceramica'],view:[{productId:'view-corso',variantKey:'corso-6090-20',proPrice:12.34}]})});
  assert.equal((await h.api.getPrice(viewProduct,viewCollection)).locked,true);
});

test('VIEW uses exact product and variant, preserving detail and palette conditions',async() => {
  const {api,calls,writes} = harness({respond:() => bootstrap({view:[{productId:'view-corso',variantKey:'corso-6090-20',proDetail:12.34,proPalette:11.23}]})});
  const quote = await api.getPrice(viewProduct,viewCollection);
  assert.equal(quote.amount,12.34); assert.match(quote.label,/Détail/); assert.match(quote.label,/Palette/);
  assert.equal((await api.getPrice({...viewProduct,variantKey:'corso-6090-10'},viewCollection)).unavailable,true);
  assert.equal((await api.getPrice(viewProduct,{...viewCollection,id:'view-other'})).unavailable,true);
  assert.equal(calls.length,1,'same verified principal shares only the short in-memory response');
  assert.equal(writes.length,0,'no price cache is persisted');
  assert.equal(calls[0].options.cache,'no-store'); assert.equal(calls[0].options.credentials,'omit');
});

test('ELIOS never turns an interior quote into an R11 rate',async() => {
  const {api} = harness({respond:() => bootstrap({elios:{'slate|60x60|standard':{amount:12.34,label:'Synthetic standard'},'slate|30x60|standard':{variants:[{amount:15.67,finish:'R11'}]}}})});
  const collection = {brand:'Elios',slug:'slate',name:'Slate'};
  assert.equal((await api.getPrice({format:'60×60',finish:'R11'},collection)).unavailable,true);
  assert.equal((await api.getPrice({format:'30×60',finish:'R11'},collection)).amount,15.67);
  assert.equal((await api.getPrice({format:'30×60',finish:'R10'},collection)).unavailable,true);
});

test('La Fenice requires a matching explicit Grip rate with matching thickness',async() => {
  const {api} = harness({respond:(_url,body) => {
    assert.equal(body.action,'fenice');
    return bootstrap({allowedPartners:['la-fenice'],fenice:[
      {collection:'Calcarea',description:'Calcarea matt',format:'60×120',unit:'m²',amount:10.11},
      {collection:'Calcarea',description:'Calcarea R11 Grip 20 mm',format:'60×120',unit:'m²',amount:20.22},
      {collection:'Calcarea',description:'Calcarea R11 Grip 9 mm',format:'30×60',unit:'m²',amount:15.16}
    ]});
  }});
  const collection = {brand:'La Fenice',name:'Calcarea',id:'la-fenice-calcarea'};
  assert.equal((await api.getPrice({finish:'Grip R11',format:'60×120',thickness:'9 mm'},collection)).unavailable,true);
  assert.equal((await api.getPrice({finish:'Grip R11',format:'60×120',thickness:'20 mm'},collection)).amount,20.22);
  assert.equal((await api.getPrice({finish:'Grip R11',format:'30×60',thickness:'9 mm'},collection)).amount,15.16);
});

test('login stores only a server-issued token and logout removes access immediately',async() => {
  const {api,calls,writes} = harness({session:null,respond:(_url,body) => {
    if (body.codeClient) return {status:200,data:{success:true,client:{id:'synthetic',codeClient:'LRF-12345',departement:'34',societe:'Test',partenaires:['view-ceramica']},sessionToken:token,expiresAt:Date.now()+300000}};
    return {status:200,data:{success:true}};
  }});
  await api.login('12345','34');
  assert.equal(api.getSession().codeClient,'LRF-12345');
  assert.equal(calls[0].body.codeClient,'LRF-12345');
  assert.equal(writes.length,1); assert.equal(writes[0][0],'lrfProSessionToken');
  await api.logout();
  assert.equal(api.getSession(),null);
  assert.equal((await api.getPrice(viewProduct,viewCollection)).locked,true);
});

test('logout invalidates a tariff request that was already in flight',async() => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const {api,calls} = harness({respond:async(_url,body) => body.action ? await gate : {status:200,data:{success:true}}});
  const pending = api.getPrice(viewProduct,viewCollection);
  // Allow identity and network continuations to reach the held response.
  for (let i=0;i<8 && !calls.length;i++) await Promise.resolve();
  await api.logout();
  release(bootstrap({view:[{productId:'view-corso',variantKey:'corso-6090-20',proPrice:12.34}]}));
  await assert.rejects(pending,/session a changé/);
});

test('a connected Firebase agent can read Fenice rates without forcing a token refresh',async()=>{
  const h=harness({session:{isAdmin:true,email:'jerome@leroyfactory.fr'},firebaseEmail:'jerome@leroyfactory.fr',respond:()=>bootstrap({allowedPartners:['la-fenice'],fenice:[{collection:'Briccole',description:'Briccole Grip R11',format:'20×120',unit:'m²',amount:12.34}]})});
  const product={format:'20×120',thickness:'9 mm',finish:'Grip R11'},collection={brand:'La Fenice',name:'Briccole'};
  await h.api.restore();
  assert.equal((await h.api.getPrice(product,collection)).amount,12.34);
  assert.equal((await h.api.getPrice(product,collection)).amount,12.34);
  assert.equal(h.calls.length,1);
  assert.deepEqual(h.tokenCalls,[undefined]);
  assert.equal(h.calls[0].options.headers.Authorization,'Bearer synthetic-id-token');
});

test('a routine same-agent token change retries the verification and discards the old price',async()=>{
  let h,requests=0;
  h=harness({session:{isAdmin:true,email:'jerome@leroyfactory.fr'},firebaseEmail:'jerome@leroyfactory.fr',respond:()=>{
    requests++;if(requests===1)h.refreshToken();
    return bootstrap({view:[{productId:'view-corso',variantKey:'corso-6090-20',proPrice:requests===1?99.99:12.34}]});
  }});
  await h.api.restore();
  assert.equal((await h.api.getPrice(viewProduct,viewCollection)).amount,12.34);
  assert.equal(requests,2);
});

test('a Firebase sign-out during a request cannot reveal its response',async()=>{
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const h=harness({session:{isAdmin:true,email:'jerome@leroyfactory.fr'},firebaseEmail:'jerome@leroyfactory.fr',respond:()=>gate});
  await h.api.restore();
  const pending=h.api.getPrice(viewProduct,viewCollection);
  for(let i=0;i<12&&!h.calls.length;i++)await Promise.resolve();
  assert.equal(h.calls.length,1);
  h.signOut();release(bootstrap({view:[{productId:'view-corso',variantKey:'corso-6090-20',proPrice:12.34}]}));
  await assert.rejects(pending,/session a changé/);
  assert.equal((await h.api.getPrice(viewProduct,viewCollection)).locked,true);
});

test('a bridge refresh keeps the connected client visible without authorizing prices locally',async()=>{
  const h=harness({respond:()=>({status:403,data:{}})});
  h.window.LRF_PRO_SESSION.write({codeClient:'LRF-12345',departement:'34',sessionToken:token,societe:'Synthetic client'});
  assert.equal(h.api.getSession().societe,'Synthetic client');
  assert.equal((await h.api.getPrice(viewProduct,viewCollection)).locked,true);
});
