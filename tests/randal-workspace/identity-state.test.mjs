import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createIdentityState} from '../../randal-general/src/commerce/identity-state.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const profile={codeClient:'LRF-00003',societe:'Magasin de test'};
const verified=amount=>({client:profile,proHT:amount,privateCode:'LRF-00003-'+(amount/100).toFixed(2).replace('.','-')});
test('room changes cannot cancel an in-flight site-session exchange; duplicate messages share it',async()=>{
 const d=deferred(),calls=[];const controller=createIdentityState({getProject:()=>({key:'same'}),getKey:p=>p.key,request:(a)=>{calls.push(a);return d.promise;},delay:0});
 const first=controller.authenticate('exchange',{sessionToken:'test-token'});controller.schedule();controller.schedule();assert.equal(controller.authenticate('exchange',{sessionToken:'test-token'}),first);
 d.resolve(verified(22000));await first;assert.equal(controller.state.proHT,22000);assert.equal(controller.state.pending,false);assert.deepEqual(calls,['exchange']);
 await controller.authenticate('exchange',{sessionToken:'test-token'});assert.deepEqual(calls,['exchange']);
});
test('late anonymous session cannot replace the verified site account',async()=>{
 const anonymous=deferred(),auth=deferred();const c=createIdentityState({getProject:()=>null,getKey:()=>'',request:a=>a==='session'?anonymous.promise:auth.promise});
 const load=c.load(),login=c.authenticate('exchange',{sessionToken:'site'});auth.resolve(verified(22000));await login;anonymous.resolve({client:null,proHT:null});await load;assert.equal(c.state.client.codeClient,'LRF-00003');assert.equal(c.state.proHT,22000);
});
test('focus refreshes coalesce and retain an already verified price while refreshing',async()=>{
 const d=deferred();let n=0;const c=createIdentityState({getProject:()=>({}),getKey:()=>'',request:()=>++n===1?Promise.resolve(verified(22000)):d.promise});await c.load();const a=c.refresh(),b=c.refresh();assert.equal(a,b);assert.equal(c.state.proHT,22000);d.resolve(verified(22000));await a;assert.equal(c.state.pending,false);assert.equal(n,2);
});
test('a different composition clears the old amount and receives its own verified quote',async()=>{
 let key='a';const c=createIdentityState({getProject:()=>({key}),getKey:p=>p.key,request:(_,p)=>Promise.resolve(verified(p.project.key==='a'?22000:25000)),delay:0});await c.load();key='b';c.schedule();assert.equal(c.state.proHT,null);await c.refresh();assert.equal(c.state.proHT,25000);assert.equal(c.state.privateCode,'LRF-00003-250-00');
});
test('network failure finishes the spinner and never retains an unverified purchase amount',async()=>{
 const c=createIdentityState({getProject:()=>null,getKey:()=>'',request:async()=>{throw Object.assign(Error('Réseau indisponible'),{status:503});}});await c.load();assert.equal(c.state.pending,false);assert.equal(c.state.proHT,null);assert.equal(c.state.error,'Réseau indisponible');
});

test('a late logout response cannot hide a newer verified account',async()=>{
 const pending=deferred();const c=createIdentityState({getProject:()=>null,getKey:()=>'',request:a=>a==='logout'?pending.promise:Promise.resolve(verified(22000))});
 await c.load();const logout=c.logout();await c.authenticate('exchange',{sessionToken:'new-account'});pending.resolve({client:null,proHT:null});await logout;
 assert.equal(c.state.client.codeClient,'LRF-00003');assert.equal(c.state.proHT,22000);
});
