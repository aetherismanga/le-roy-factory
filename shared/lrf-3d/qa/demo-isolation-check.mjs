import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {scopedDemoStorage,isRandalDemo,anonymousDemoState,createDemoIdentity,demoRoute,demoPreviewOrigin,demoConfiguratorURL,setDemoVariant} from '../demo-session.js';
const values=new Map([['studio-one-projects','PRIVATE CLIENT'],['studio-one-session','SECRET TOKEN']]);
const storage={get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
const demo=scopedDemoStorage(storage,{demo:true});assert.equal(demo.getItem('studio-one-projects'),null);assert.equal(demo.getItem('studio-one-session'),null);demo.setItem('studio-one-projects','DEMO');assert.equal(storage.getItem('studio-one-projects'),'PRIVATE CLIENT');assert.equal(demo.getItem('studio-one-projects'),'DEMO');assert.equal(demo.length,1);demo.clear();assert.equal(storage.getItem('studio-one-projects'),'PRIVATE CLIENT');assert.equal(storage.getItem('studio-one-session'),'SECRET TOKEN');assert.equal(scopedDemoStorage(storage,{demo:false}),storage);
assert.equal(isRandalDemo('https://example.com/?demo=randal'),true);assert.equal(isRandalDemo('https://example.com/?demo=admin'),false);
assert.equal(demoPreviewOrigin('https://attacker.example'),null);assert.equal(demoPreviewOrigin('javascript:alert(1)'),null);assert.equal(demoPreviewOrigin('https://studio-one-beta-test-v2-review-hugol-trading.vercel.app/path'),'https://studio-one-beta-test-v2-review-hugol-trading.vercel.app');
const url=new URL(demoRoute('atelier.html?guided=1','https://studio-one-beta-test-v2-review-hugol-trading.vercel.app/index.html?demo=randal&lang=es'));assert.equal(url.searchParams.get('guided'),'1');assert.equal(url.searchParams.get('demo'),'randal');assert.equal(url.searchParams.get('lang'),'es');assert.equal(demoRoute('atelier.html','https://example.com/index.html'),'atelier.html');
setDemoVariant('studio-one');assert.match(demoConfiguratorURL('studio-one','atelier.html','https://localhost/index.html?demo=randal'),/atelier.html\?demo=randal&lang=es/);assert.throws(()=>demoConfiguratorURL('randal-general','atelier.html','https://localhost/index.html?demo=randal'));
const identity=createDemoIdentity();for(const method of ['load','refresh','resync','reconnect','authenticate','logout'])assert.deepEqual(await identity[method]('admin-token',{idToken:'MUST NOT BE USED'}),anonymousDemoState());assert.equal(identity.state.client,null);assert.equal(identity.state.privateCode,'');
console.log('Demo isolation: storage, credentials, private references and preview routes OK.');

// Run actual clients in a fresh realm so their module-level credential loading is exercised.
const clientPaths=['studio-one','randal-general'].map(app=>new URL('../../../'+app+'/src/commerce/client.js',import.meta.url).href);
for(const clientPath of clientPaths){const child=spawnSync(process.execPath,['--input-type=module'],{encoding:'utf8',input:`
 import assert from 'node:assert/strict';
 const reads=[];globalThis.location={href:'https://example.com/?demo=randal'};
 globalThis.sessionStorage={getItem:key=>{reads.push(key);return key.startsWith('lrf-demo-randal-v1:')?null:'PRIVATE AUTH';}};
 globalThis.localStorage={getItem:()=>null};let requests=0;globalThis.fetch=()=>{requests++;throw Error('Demo must not request a service');};
 const client=await import(${JSON.stringify(clientPath)});
 const state=await client.commercialRequest('admin-token',{idToken:'PRIVATE AUTH'});assert.equal(state.client,null);assert.equal(state.privateCode,'');
 await assert.rejects(client.projectRequest('local-order',{record:{}}),error=>error.status===403);
 assert.equal(requests,0);assert.ok(reads.every(key=>key.startsWith('lrf-demo-randal-v1:')));
 `});assert.equal(child.status,0,child.stderr);}
console.log('Actual commerce clients: no credential reads or network calls in demo.');
