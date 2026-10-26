import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/js/secure-tariff-links.js',import.meta.url),'utf8');
const tariffIds=['elios-2026','life-2026','view-2026','lafenice-2026','reviglass-2026','petracers','pecchioli','bulbo-2026','randal','neobath-anima','neobath-dna-pdf','aquahome','bilt','uptrend-2026'];

function harness({email=null,session=null,restoring=false,tokenError=false,responseStatus=200}={}){
  const requests=[],alerts=[],popups=[],order=[];
  const user=email?{email,getIdToken:async force=>{order.push('token');assert.equal(force,true);if(tokenError)throw Error('Firebase session revoked');return 'synthetic-firebase-token';}}:null;
  const auth={currentUser:restoring?null:user,async authStateReady(){order.push('ready');await Promise.resolve();this.currentUser=user;}};
  const firebaseApp={options:{projectId:'le-roy-factory'}};
  const window={
    LRF_PRO_SESSION:{read:()=>session},
    open(){order.push('popup');const popup={document:{write(){},close(){}},location:{replace(url){this.url=url;}},close(){this.closed=true;}};popups.push(popup);return popup;}
  };
  const context={window,document:{readyState:'loading',addEventListener(){}},location:{href:'tarifs-pro.html'},sessionStorage:{getItem:()=>null},
    MutationObserver:class{},URL:{createObjectURL:()=> 'blob:synthetic-protected-pdf',revokeObjectURL(){}},setTimeout(){},alert:message=>alerts.push(message),
    async loadFirebase(url){return url.includes('firebase-app.js')?{getApps:()=>[{options:{projectId:'unrelated-app'}},firebaseApp],initializeApp(){throw Error('Must reuse the existing LRF app');}}:{getAuth:app=>{assert.equal(app,firebaseApp);return auth;}};},
    async fetch(url,options){requests.push({url,headers:options.headers,body:JSON.parse(options.body)});return {ok:responseStatus===200,status:responseStatus,blob:async()=>({type:'application/pdf'}),json:async()=>({error:'Accès refusé par le serveur'})};}
  };
  const end=source.lastIndexOf('})();');
  const code=source.slice(0,end)+'window.openTestTariff=openSecureTariff;'+source.slice(end);
  vm.runInNewContext(code.replaceAll('import(','loadFirebase('),context);
  const open=async(tariffId='elios-2026')=>{
    const anchor={dataset:{secureTariffId:tariffId},textContent:'Tarifs',closest:()=>null,setAttribute(){},removeAttribute(){}};
    await window.openTestTariff(anchor);assert.equal(anchor.textContent,'Tarifs');
  };
  return {requests,alerts,popups,order,open};
}

for(const email of ['jerome@leroyfactory.fr','coryne@leroyfactory.fr'])test(email+' opens every protected tariff after the PRO page clears local session state',async()=>{
  const h=harness({email,restoring:true});
  for(const id of tariffIds)await h.open(id);
  assert.deepEqual(h.alerts,[]);assert.equal(h.requests.length,tariffIds.length);
  for(let i=0;i<tariffIds.length;i++){
    assert.equal(h.requests[i].headers.Authorization,'Bearer synthetic-firebase-token');
    assert.deepEqual(h.requests[i].body,{tariffId:tariffIds[i]});
    assert.equal(h.popups[i].location.url,'blob:synthetic-protected-pdf');
  }
  assert.deepEqual(h.order.slice(0,3),['popup','ready','token'],'Popup stays synchronous; credentials wait for Firebase persistence restoration');
});

test('a Firebase agent takes precedence over a stale client session',async()=>{
  const h=harness({email:'jerome@leroyfactory.fr',session:{codeClient:'LRF-99998',departement:'34'}});
  await h.open();assert.deepEqual(h.requests[0].body,{tariffId:'elios-2026'});assert.equal(h.requests[0].headers.Authorization,'Bearer synthetic-firebase-token');
});

for(const email of [null,'client@example.test'])test('local admin flags grant no access with Firebase identity '+email,async()=>{
  const h=harness({email,session:{isAdmin:true,email:'jerome@leroyfactory.fr'}});
  await h.open();assert.equal(h.requests.length,0);assert.equal(h.popups[0].closed,true);assert.match(h.alerts[0],/Espace Agent/);
});

test('signed-out visitors remain blocked and real client credentials keep the existing server checks',async()=>{
  const anonymous=harness();await anonymous.open();assert.equal(anonymous.requests.length,0);assert.match(anonymous.alerts[0],/accès PRO a expiré/);assert.equal(anonymous.popups[0].closed,true);
  const client=harness({email:'client@example.test',session:{codeClient:'LRF-99998',departement:'34'}});
  await client.open('view-2026');assert.deepEqual(client.alerts,[]);assert.deepEqual(client.requests[0].body,{tariffId:'view-2026',codeClient:'LRF-99998',departement:'34'});assert.equal(client.requests[0].headers.Authorization,undefined);
});

test('revoked Firebase credentials and server refusals never fall back to another identity',async()=>{
  const revoked=harness({email:'jerome@leroyfactory.fr',tokenError:true,session:{codeClient:'LRF-99998',departement:'34'}});
  await revoked.open();assert.equal(revoked.requests.length,0);assert.equal(revoked.popups[0].closed,true);assert.match(revoked.alerts[0],/revoked/);
  const refused=harness({email:'jerome@leroyfactory.fr',responseStatus:403});await refused.open();assert.equal(refused.requests.length,1);assert.equal(refused.popups[0].closed,true);assert.match(refused.alerts[0],/Accès refusé/);
});
