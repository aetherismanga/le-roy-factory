import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const apiSource=readFileSync(new URL('../functions/lrf-analytics.js',import.meta.url),'utf8');
const browserSource=readFileSync(new URL('../assets/js/lrf-order-analytics-accuracy.js',import.meta.url),'utf8');
const snapshot=rows=>({size:rows.length,forEach:visit=>rows.forEach((row,index)=>visit({id:row.id||`event-${index}`,data:()=>row}))});

async function analytics(events) {
  const db={collection(name){
    const rows=name==='clients'?[{id:'client-1',codeClient:'LRF-12345',societe:'Société de test',ville:'Test',departement:'34'}]:name==='lrf_client_events'?events:[];
    const query={where(){return query;},orderBy(){return query;},limit(){return query;},async get(){return snapshot(rows);}};
    return query;
  }};
  const firestore=()=>db;
  firestore.Timestamp={fromMillis:ms=>ms};
  const module={exports:{}};
  vm.runInNewContext(apiSource,{module,console,require(name){
    if(name==='firebase-admin')return {firestore};
    if(name==='firebase-functions/v2/https')return {onRequest:(options,handler)=>handler};
    if(name==='./auth')return {requireAgent:async()=>({email:'jerome@leroyfactory.fr'})};
    if(name==='./pro-session')return {clientFromSessionToken:async()=>null};
    if(name==='./lrf-analytics-core')return {EVENTS:'lrf_client_events',SUMMARIES:'lrf_client_analytics'};
    throw Error(name);
  }});
  let result;
  const res={set(){return res;},status(){return res;},send(){return res;},json(value){result=JSON.parse(JSON.stringify(value));return res;}};
  await module.exports.getLrfAnalytics({method:'POST',headers:{origin:'https://leroyfactory.fr'},body:{period:'30d'}},res);
  assert.equal(result?.success,true);
  return result;
}
const event=(id,source,extras={})=>({id,clientId:'client-1',action:'order_view',source,partner:'elios',createdAt:new Date(Date.now()-1000).toISOString(),...extras});

async function sanitized(payload) {
  const window={fetch:async()=>new Response(JSON.stringify(payload),{headers:{'Content-Type':'application/json'}})};
  vm.runInNewContext(browserSource,{window,Response});
  return (await window.fetch('https://example.test/getLrfAnalytics')).json();
}

test('only explicit completed-order markers enter totals and scores; views/ambiguous words do not',async()=>{
  const result=await analytics([
    event('unknown','site-public'),event('missing',undefined),event('negative','not-sent'),event('substring','unsuccessful'),
    event('sent','order-sent'),event('confirmed','order-confirmed')
  ]);
  assert.equal(result.general.orders,2);
  assert.equal(result.clients[0].orderViews,2);
  assert.equal(result.orders.length,2);
  assert.equal(result.orderAnalytics.unconfirmedOrderEvents,4);
  assert.ok(result.orders.every(e=>['order-sent','order-confirmed'].includes(e.source)));
  const unconfirmedOnly=await analytics([event('view','site-public')]);
  assert.equal(unconfirmedOnly.general.orders,0);
  assert.equal(unconfirmedOnly.clients[0].heatScore,0);
});

test('an order identity deduplicates repeats without merging distinct orders for one product',async()=>{
  const result=await analytics([
    event('first','order-confirmed',{orderId:'order-1',productRef:'REF-1'}),
    event('repeat','order-confirmed',{orderId:'order-1',productRef:'REF-1'}),
    event('second','order-confirmed',{orderId:'order-2',productRef:'REF-1'}),
    event('legacy-1','order-confirmed',{productRef:'REF-1'}),
    event('legacy-2','order-confirmed',{productRef:'REF-1'})
  ]);
  assert.equal(result.general.orders,4);
  assert.equal(result.orders.filter(e=>e.orderId==='order-1').length,1);
});

test('confirmed orders and authoritative totals survive the chronology limit and browser sanitization',async()=>{
  const pages=Array.from({length:1250},(_,i)=>event(`page-${i}`,'site-public',{action:'page_view'}));
  const result=await analytics([...pages,event('last-order','order-confirmed',{orderId:'order-8'})]);
  assert.equal(result.timeline.length,1200);
  assert.equal(result.timeline.filter(e=>e.action==='order_view').length,0);
  assert.equal(result.orderAnalytics.timelineTruncated,true);
  assert.equal(result.general.orders,1);
  assert.equal(result.orders[0].orderId,'order-8');
  const clean=await sanitized(result);
  assert.equal(clean.general.orders,1);
  assert.equal(clean.clients[0].orderViews,1);
  assert.equal(clean.orders.length,1);
});

test('legacy responses are conservative and disclose missing confirmation sources',async()=>{
  const clean=await sanitized({success:true,general:{orders:3},clients:[{id:'client-1',orderViews:3,heatScore:100,heatLabel:'Très chaud',heatReasons:['3 commandes']}],timeline:[event('one','order-confirmed'),event('missing',undefined),event('no','not-sent')]});
  assert.equal(clean.general.orders,1);
  assert.equal(clean.clients[0].orderViews,1);
  assert.equal(clean.orders.length,1);
  assert.equal(clean.orderAnalytics.incomplete,true);
  assert.equal(clean.orderAnalytics.version,1);
});
