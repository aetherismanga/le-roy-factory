import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/js/secure-tariff-links.js',import.meta.url),'utf8');
const tariffIds=['elios-2026','life-2026','view-2026','lafenice-2026','reviglass-2026','petracers','pecchioli','bulbo-2026','randal','neobath-anima','neobath-dna-pdf','aquahome','bilt','uptrend-2026'];

function harness({email=null,session=null,restoring=false,tokenError=false,responseStatus=200,viewerError=false,responseGate=null}={}){
  const requests=[],alerts=[],viewers=[],nativeOpenings=[],order=[];
  const user=email?{email,getIdToken:async force=>{order.push('token');assert.equal(force,true);if(tokenError)throw Error('Firebase session revoked');return 'synthetic-firebase-token';}}:null;
  const auth={currentUser:restoring?null:user,async authStateReady(){order.push('ready');await Promise.resolve();this.currentUser=user;}};
  const firebaseApp={options:{projectId:'le-roy-factory'}};
  const pdf={type:'application/pdf',size:20};
  const location={origin:'https://leroyfactory.fr',pathname:'/tarifs-pro.html',replace:url=>nativeOpenings.push(url)};
  Object.defineProperty(location,'href',{get:()=> 'https://leroyfactory.fr/tarifs-pro.html',set:url=>nativeOpenings.push(url)});
  const window={
    location,LRF_PRO_SESSION:{read:()=>session},
    open(url){nativeOpenings.push(url);return {document:{write(){},close(){}},location:{replace:url=>nativeOpenings.push(url)},close(){}};}
  };
  class TrackedURL extends URL{
    static createObjectURL(){nativeOpenings.push('blob:synthetic-protected-pdf');return 'blob:synthetic-protected-pdf';}
    static revokeObjectURL(){}
  }
  const context={window,document:{readyState:'loading',addEventListener(){}},location,sessionStorage:{getItem:()=>null},
    MutationObserver:class{},URL:TrackedURL,setTimeout(){},alert:message=>alerts.push(message),
    async loadModule(url){
      if(url.includes('secure-pdf-viewer'))return {async showSecurePdf(blob,options){
        order.push('viewer');assert.equal(blob,pdf);assert.equal(options.trigger.getAttribute('aria-busy'),'true');
        viewers.push({blob,options});if(viewerError)throw Error('Reader temporarily unavailable');
      }};
      return url.includes('firebase-app.js')?{getApps:()=>[{options:{projectId:'unrelated-app'}},firebaseApp],initializeApp(){throw Error('Must reuse the existing LRF app');}}:{getAuth:app=>{assert.equal(app,firebaseApp);return auth;}};
    },
    async fetch(url,options){order.push('request');requests.push({url,headers:options.headers,body:JSON.parse(options.body)});if(responseGate)await responseGate;return {ok:responseStatus===200,status:responseStatus,headers:{get:()=>null},blob:async()=>pdf,json:async()=>({error:'Accès refusé par le serveur'})};}
  };
  const end=source.lastIndexOf('})();');
  const code=source.slice(0,end)+'window.openTestTariff=openSecureTariff;window.testPublicTariffUrl=publicTariffUrl;'+source.slice(end);
  vm.runInNewContext(code.replaceAll('import(','loadModule('),context);
  function anchor(tariffId='elios-2026',{locked=false}={}){
    const attributes=new Map();
    return {dataset:{secureTariffId:tariffId,secureTariffLabel:'Tarifs'},textContent:'Tarifs',
      closest:selector=>selector==='.card-premium'&&locked?{querySelector:()=>null}:null,
      getAttribute:key=>attributes.get(key)??null,setAttribute:(key,value)=>attributes.set(key,value),removeAttribute:key=>attributes.delete(key)};
  }
  async function open(tariffId='elios-2026'){
    const link=anchor(tariffId);await window.openTestTariff(link);
    assert.equal(link.textContent,'Tarifs');assert.equal(link.getAttribute('aria-busy'),null);
    assert.deepEqual(nativeOpenings,[],'Tariff opening never launches the native PDF/download pathway');
    return link;
  }
  return {requests,alerts,viewers,nativeOpenings,order,open,anchor,window};
}

for(const email of ['jerome@leroyfactory.fr','coryne@leroyfactory.fr'])test(email+' renders every protected tariff after Firebase persistence restores the agent',async()=>{
  const h=harness({email,restoring:true});
  for(const id of tariffIds)await h.open(id);
  assert.deepEqual(h.alerts,[]);assert.equal(h.requests.length,tariffIds.length);assert.equal(h.viewers.length,tariffIds.length);
  for(let i=0;i<tariffIds.length;i++){
    assert.equal(h.requests[i].headers.Authorization,'Bearer synthetic-firebase-token');
    assert.deepEqual(h.requests[i].body,{tariffId:tariffIds[i]});
    assert.equal(h.viewers[i].options.filename,tariffIds[i]+'.pdf');
  }
  assert.deepEqual(h.order.slice(0,4),['ready','token','request','viewer'],'Identity restoration and authorized response precede PDF display');
});

test('a Firebase agent takes precedence over a stale client session',async()=>{
  const h=harness({email:'jerome@leroyfactory.fr',session:{codeClient:'LRF-99998',departement:'34'}});
  await h.open();assert.deepEqual(h.requests[0].body,{tariffId:'elios-2026'});assert.equal(h.requests[0].headers.Authorization,'Bearer synthetic-firebase-token');assert.equal(h.viewers.length,1);
});

for(const email of [null,'client@example.test'])test('local admin flags grant no access with Firebase identity '+email,async()=>{
  const h=harness({email,session:{isAdmin:true,email:'jerome@leroyfactory.fr'}});
  await h.open();assert.equal(h.requests.length,0);assert.equal(h.viewers.length,0);assert.match(h.alerts[0],/Espace Agent/);
});

test('signed-out visitors remain blocked and real clients retain their manufacturer checks',async()=>{
  const anonymous=harness();await anonymous.open();assert.equal(anonymous.requests.length,0);assert.equal(anonymous.viewers.length,0);assert.match(anonymous.alerts[0],/accès PRO a expiré/);
  const client=harness({email:'client@example.test',session:{codeClient:'LRF-99998',departement:'34'}});
  await client.open('view-2026');assert.deepEqual(client.alerts,[]);assert.deepEqual(client.requests[0].body,{tariffId:'view-2026',codeClient:'LRF-99998',departement:'34'});assert.equal(client.requests[0].headers.Authorization,undefined);assert.equal(client.viewers.length,1);
});

test('revoked credentials and server refusals never display a document or fall back to a stale client',async()=>{
  const revoked=harness({email:'jerome@leroyfactory.fr',tokenError:true,session:{codeClient:'LRF-99998',departement:'34'}});
  await revoked.open();assert.equal(revoked.requests.length,0);assert.equal(revoked.viewers.length,0);assert.match(revoked.alerts[0],/revoked/);
  const refused=harness({email:'jerome@leroyfactory.fr',responseStatus:403});await refused.open();assert.equal(refused.requests.length,1);assert.equal(refused.viewers.length,0);assert.match(refused.alerts[0],/Accès refusé/);
});

test('a locked manufacturer card never starts authentication or PDF display',async()=>{
  const h=harness({email:'jerome@leroyfactory.fr'}),link=h.anchor('view-2026',{locked:true});
  await h.window.openTestTariff(link);assert.equal(h.requests.length,0);assert.equal(h.viewers.length,0);assert.deepEqual(h.order,[]);assert.equal(link.getAttribute('aria-busy'),null);
});

test('a reader load failure restores the link without starting a native download',async()=>{
  const h=harness({email:'jerome@leroyfactory.fr',viewerError:true});
  await h.open();assert.equal(h.requests.length,1);assert.equal(h.viewers.length,1);assert.match(h.alerts[0],/Reader temporarily unavailable/);
});

test('double tapping a busy tariff sends one authorized request and opens one reader',async()=>{
  let release;const responseGate=new Promise(resolve=>{release=resolve;});
  const h=harness({email:'jerome@leroyfactory.fr',responseGate}),link=h.anchor();
  const first=h.window.openTestTariff(link);
  for(let i=0;i<20&&h.requests.length===0;i++)await Promise.resolve();
  assert.equal(link.getAttribute('aria-busy'),'true');assert.equal(h.requests.length,1);
  const second=h.window.openTestTariff(link);release();await Promise.all([first,second]);
  assert.equal(h.requests.length,1);assert.equal(h.viewers.length,1);assert.deepEqual(h.nativeOpenings,[]);assert.equal(link.textContent,'Tarifs');assert.equal(link.getAttribute('aria-busy'),null);
});


test('the public reader route preserves protected, agent-only and external document paths',()=>{
  const h=harness();
  const link=(href,{grid=true,secureId=null}={})=>({dataset:{secureTariffId:secureId},closest:selector=>selector==='#grid-tarifs'&&grid?{}:null,getAttribute:()=>href});
  const publicDocument=h.window.testPublicTariffUrl(link('assets/pdf/RANDAL-STUDIO-ONE-FRANCE-20261022.pdf'));
  assert.equal(publicDocument.href,'https://leroyfactory.fr/assets/pdf/RANDAL-STUDIO-ONE-FRANCE-20261022.pdf');
  assert.equal(h.window.testPublicTariffUrl(link('assets/pdf/elios2026.pdf',{secureId:'elios-2026'})),null);
  assert.equal(h.window.testPublicTariffUrl(link('assets/pdf/RANDAL-STUDIO-ONE-VASQUES-TARIF-PRO-HT.pdf?v=20261016-pro50')),null);
  assert.equal(h.window.testPublicTariffUrl(link('https://example.test/tariff.pdf')),null);
  assert.equal(h.window.testPublicTariffUrl(link('assets/pdf/public.pdf',{grid:false})),null);
  assert.equal(h.window.testPublicTariffUrl(link('neobath-anima-interactif.html')),null);
  assert.deepEqual(h.requests,[]);assert.deepEqual(h.viewers,[]);
});
