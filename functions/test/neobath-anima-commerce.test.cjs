const {test}=require('node:test');
const assert=require('node:assert/strict');
const {publicCatalogue,quoteClient}=require('../neobath-anima-commerce.cjs');
const {createNeobathAnimaHandler}=require('../neobath-anima-access-core.cjs');
const {pathToFileURL}=require('node:url');
const {resolve}=require('node:path');
const client={id:'synthetic-neobath',codeClient:'LRF-99998',societe:'Synthetic Neobath'};
function response(){return {code:200,set(){return this;},status(n){this.code=n;return this;},json(data){this.data=data;return this;},send(){return this;}};}
test('public Anima catalogue converts each public HT price once, with no purchase fields',async()=>{
 const result=await publicCatalogue(),source=require('../neobath-anima/catalogue.json');
 assert.equal(result.products.length,source.products.length);
 for(const p of result.products){const original=source.products.find(s=>s.id===p.id);for(const v of p.prices){const amount=original.prices?.find(s=>s.key===v.key)?.price??original.pricePublicHT;assert.equal(v.publicTTC,typeof amount==='number'?Math.round(amount*120):null);}assert(!('pricePublicHT' in p));assert(!('proHT' in p));assert(p.prices.every(v=>! /\bHT\b/.test(v.label)));}
});
test('Neobath purchase reference is quoted from canonical products, ignoring submitted totals',async()=>{
 const {initialDraft,draftProject}=await import(pathToFileURL(resolve(__dirname,'../neobath-anima/studio-adapter/commerce/guided.js')));
 const project=draftProject({...initialDraft(),top:'tk80-integrated-top'});
 const state=await quoteClient({project,proHT:1,publicTTC:1},client);
 assert.equal(state.proHT,38400);assert.equal(state.privateCode,'LRF-99998-384.00.00');assert.equal(state.referenceAllowed,true);
 await assert.rejects(()=>quoteClient({project:{...project,manufacturer:'randal'}},client));
});
test('client application access never grants access to the team projects',async()=>{
 const application={html:'private',css:'style',module:'module',catalogue:{},visuals:{}};
 const handler=createNeobathAnimaHandler({getAgent:async()=>null,getClient:async()=>client,loadApplication:async()=>application,projectStore:{'projects-list':async()=>{throw Error('must not access team store');}}});
 const res=response();await handler({method:'POST',headers:{origin:'https://leroyfactory.fr'},body:{action:'application'}},res);
 assert.equal(res.code,200);assert.equal(res.data.identity.neobathAllowed,true);assert.equal(res.data.identity.client.codeClient,client.codeClient);assert.equal(res.data.identity.email,undefined);
 const denied=response();await handler({method:'POST',headers:{},body:{action:'projects-list'}},denied);assert.equal(denied.code,403);assert.equal(denied.data.projects,undefined);
});
test('invalid session cannot load app or quote; catalogue action returns only public data',async()=>{
 const handler=createNeobathAnimaHandler({getAgent:async()=>null,getClient:async()=>null,publicCatalogue,loadApplication:async()=>{throw Error('must not load');},quoteClient});
 for(const action of ['application','quote']){const res=response();await handler({method:'POST',headers:{},body:{action,sessionToken:'forged',client,isAdmin:true}},res);assert.equal(res.code,401);assert.equal(res.data.module,undefined);assert.equal(res.data.proHT,undefined);}
 const publicRes=response();await handler({method:'POST',headers:{},body:{action:'catalogue'}},publicRes);assert.equal(publicRes.code,200);assert(!JSON.stringify(publicRes.data).includes('proHT'));
});
