import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createCipheriv} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import vm from 'node:vm';
import {decodeAgentTariffs,verifyAgentToken,createAgentTariffsHandler,tariffKey,readAgentTariffs} from '../shared/lrf-server/agent-tariffs.mjs';
import {preparePublicAgentTariffs,PROTECTED_TARIFF_SCRIPTS} from '../scripts/public-agent-tariffs.mjs';

// All monetary values in this test file are synthetic, never real tariffs.
const payload={version:1,view:[{productId:'test',variantKey:'test-60',proDetail:12.34}],elios:{'test|60x60|standard':{amount:4.56,label:'Synthetic price'}},documents:{'randal-studio-one-basins':Buffer.from('%PDF-1.4\nSynthetic agent-only document').toString('base64')}};
function encrypt(data=payload,key=randomBytes(32)){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('lrf-agent-tariffs/v1'));
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(data)),cipher.final()]);
 return {key:key.toString('hex'),envelope:{version:1,algorithm:'A256GCM',variant:'site-agent-tariffs',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64')}};
}
const jwt=(extra={})=>'synthetic.'+Buffer.from(JSON.stringify({aud:'le-roy-factory',iss:'https://securetoken.google.com/le-roy-factory',sub:'agent-test',email:'jerome@leroyfactory.fr',email_verified:true,exp:Date.now()/1000+300,auth_time:Date.now()/1000,...extra})).toString('base64url')+'.synthetic';
const liveUser={email:'jerome@leroyfactory.fr',localId:'agent-test',emailVerified:true,validSince:0};
const google=user=>async()=>({ok:true,json:async()=>({users:user?[user]:[]})});
function result(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;},send(v){this.body=v;return this;}};}
function request(body={action:'bootstrap'},headers={}){return {method:'POST',headers:{host:'leroyfactory.fr',origin:'https://leroyfactory.fr',...headers},body};}

test('encrypted agent tariffs require exact key, authenticated bytes and domain',()=>{
 const {key,envelope}=encrypt();assert.deepEqual(decodeAgentTariffs(envelope,key),payload);
 assert.throws(()=>decodeAgentTariffs(envelope,''));assert.throws(()=>decodeAgentTariffs(envelope,randomBytes(32).toString('hex')));
 assert.throws(()=>decodeAgentTariffs({...envelope,variant:'studio-one'},key));
 const corrupted={...envelope,ciphertext:Buffer.from('tampered').toString('base64')};assert.throws(()=>decodeAgentTariffs(corrupted,key));
 assert.throws(()=>decodeAgentTariffs({...envelope,iv:'invalid'},key));
 const publicBytes=JSON.stringify(envelope);assert(!publicBytes.includes('Synthetic price'));assert(!publicBytes.includes(key));
});

test('agent tariff reads fail closed without deployment key and recover with valid key',()=>{
 const directory=mkdtempSync(join(tmpdir(),'lrf-agent-tariffs-')),path=join(directory,'fixture.enc.json'),old=process.env.LRF_AGENT_TARIFFS_KEY,{key,envelope}=encrypt();
 try{writeFileSync(path,JSON.stringify(envelope));delete process.env.LRF_AGENT_TARIFFS_KEY;assert.equal(readAgentTariffs(path),null);process.env.LRF_AGENT_TARIFFS_KEY=key;assert.deepEqual(readAgentTariffs(path),payload);process.env.LRF_AGENT_TARIFFS_KEY='invalid';assert.equal(readAgentTariffs(path),null);}finally{if(old===undefined)delete process.env.LRF_AGENT_TARIFFS_KEY;else process.env.LRF_AGENT_TARIFFS_KEY=old;rmSync(directory,{recursive:true,force:true});}
});

test('agent identity is verified against Google, email verification and revocation',async()=>{
 assert.deepEqual(await verifyAgentToken('Bearer '+jwt(),{request:google(liveUser)}),{uid:'agent-test',email:'jerome@leroyfactory.fr'});
 const denied=[{email:'client@example.invalid'},{email_verified:false},{aud:'other'},{iss:'other'},{exp:1},{exp:'9999999999'},{auth_time:0},{auth_time:'9999999999'}];
 for(const claims of denied)assert.equal(await verifyAgentToken('Bearer '+jwt(claims),{request:google({...liveUser,validSince:1})}),null);
 for(const user of [null,{...liveUser,emailVerified:false},{...liveUser,disabled:true},{...liveUser,localId:'other'},{...liveUser,email:'client@example.invalid'},{...liveUser,validSince:Date.now()/1000+30}])assert.equal(await verifyAgentToken('Bearer '+jwt(),{request:google(user)}),null);
 assert.equal(await verifyAgentToken('Bearer '+jwt(),{request:async()=>({ok:false})}),null);
 assert.equal(await verifyAgentToken('forged-local-session'),null);
});

test('anonymous and client-local role fields cannot trigger a private read',async()=>{
 let reads=0;const handler=createAgentTariffsHandler({verify:async()=>null,read:async()=>{reads++;return payload;}});
 for(const body of [{action:'bootstrap'},{action:'bootstrap',isAdmin:true,admin:true,email:'jerome@leroyfactory.fr',sessionToken:'client-session'},{action:'document',id:'randal-studio-one-basins'}]){const res=result();await handler(request(body),res);assert.equal(res.statusCode,401);assert.equal(reads,0);assert.equal(res.body.view,undefined);assert.equal(res.body.elios,undefined);assert.match(res.headers['Cache-Control'],/no-store/);}
});

test('verified agents receive only requested data, and PDF is never in bootstrap JSON',async()=>{
 const handler=createAgentTariffsHandler({verify:async()=>({uid:'agent-test'}),read:async()=>payload});
 let res=result();await handler(request(),res);assert.equal(res.statusCode,200);assert.deepEqual(res.body.view,payload.view);assert.deepEqual(res.body.elios,payload.elios);assert.equal(res.body.documents,undefined);
 res=result();await handler(request({action:'document',id:'randal-studio-one-basins'}),res);assert.equal(res.statusCode,200);assert.equal(res.headers['Content-Type'],'application/pdf');assert.equal(res.body.subarray(0,5).toString(),'%PDF-');
 res=result();await handler(request({action:'document',id:'other'}),res);assert.equal(res.statusCode,404);
});

test('HTTP method, origin, body size and missing grid are bounded',async()=>{
 let checks=0,reads=0;const handler=createAgentTariffsHandler({verify:async()=>{checks++;return {};},read:async()=>{reads++;return null;}});
 let req=request();req.method='GET';let res=result();await handler(req,res);assert.equal(res.statusCode,405);assert.equal(checks,0);
 res=result();await handler(request(undefined,{origin:'https://other.example'}),res);assert.equal(res.statusCode,403);assert.equal(checks,0);
 res=result();await handler(request({action:'bootstrap',padding:'x'.repeat(3000)}),res);assert.equal(res.statusCode,400);assert.equal(reads,0);
 res=result();await handler(request({action:'other'}),res);assert.equal(res.statusCode,400);assert.equal(reads,0);
 res=result();await handler(request(),res);assert.equal(res.statusCode,503);assert.equal(res.body.view,undefined);
 const broken=createAgentTariffsHandler({verify:async()=>({}),read:async()=>{throw Error('PRIVATE_DATA_MUST_NOT_LEAK');}});res=result();await broken(request(),res);assert.equal(res.statusCode,503);assert(!JSON.stringify(res.body).includes('PRIVATE_DATA'));
});

test('cross-origin GitHub Pages preflight allows only exact public LRF origins without credentials',async()=>{
 let verified=0;const handler=createAgentTariffsHandler({verify:async()=>{verified++;return {};},read:async()=>payload});
 const req=request(undefined,{host:'randal-catalogue-general-3d.vercel.app',origin:'https://leroyfactory.fr'});req.method='OPTIONS';
 let res=result();await handler(req,res);assert.equal(res.statusCode,204);assert.equal(verified,0);assert.equal(res.headers['Access-Control-Allow-Origin'],'https://leroyfactory.fr');assert.equal(res.headers['Access-Control-Allow-Credentials'],undefined);assert.match(res.headers['Access-Control-Allow-Headers'],/Authorization/);
 res=result();await handler({...req,headers:{...req.headers,origin:'https://leroyfactory.fr.attacker.invalid'}},res);assert.equal(res.statusCode,403);assert.equal(res.headers['Access-Control-Allow-Origin'],undefined);
});

test('public VIEW projections preserve products and contain no purchase fields',()=>{
 const context={window:{dispatchEvent(){}},CustomEvent:class{}};vm.createContext(context);
 for(const path of PROTECTED_TARIFF_SCRIPTS.filter(p=>p.includes('view')))vm.runInContext(readFileSync(new URL('../'+path,import.meta.url),'utf8'),context);
 const products=context.window.VIEW_CATALOGUE;assert.equal(products.length,21);assert(products.some(p=>p.id==='view-golden-stone'));
 for(const product of products)for(const variant of product.variants||[])for(const key of ['proPrice','proPalette','proDetail','purchaseHT'])assert.equal(variant[key],undefined);
 assert(products.flatMap(p=>p.variants).some(v=>Number.isFinite(v.publicPrice)),'Real public prices remain');
});

test('ELIOS public pricing contains no generic or special rate table and keeps Pool UI',()=>{
 const source=readFileSync(new URL('../assets/js/inspirations-elios-pricing.js',import.meta.url),'utf8');
 assert(source.includes('__LRF_PUBLIC_TARIFFS_V1__'));assert(source.includes('installPoolShortcut'));assert(source.includes('renderPoolPage'));
 assert(!source.includes('const generic ='));assert(!source.includes('function specialPrice'));assert(source.includes('LRF_AGENT_TARIFFS'));
 assert.equal(tariffKey('Pool Surfaces','60 × 120 cm 20 mm'),tariffKey('pool-surfaces','60x120 20 mm'));
 const overrides=readFileSync(new URL('../assets/js/inspirations-elios-thickness-overrides.js',import.meta.url),'utf8');assert(overrides.includes('__LRF_PUBLIC_TARIFFS_V1__'));assert(!overrides.includes('patchAzuliPricing'));assert(!/amount\s*:\s*\d/.test(overrides));assert(!/\d+(?:[,.]\d+)?\s*€\s*(?:HT|net)/i.test(overrides));assert(overrides.includes('hydrateAzuliCard'));
});

for(const filename of ['inspirations-view-v1.js','inspirations-view-mobile-safe.js'])test(filename+' grants verified agent access and clears an open private modal on logout',()=>{
 const events=new Map(),classes=new Set(['open','view-modal-card']);
 const modal={classList:{remove:v=>classes.delete(v)},addEventListener(){}},box={classList:{remove:v=>classes.delete(v)},dataset:{viewModal:'1'},innerHTML:'Synthetic private price'},grid={dataset:{},addEventListener(){}};
 const nodes={'#workspace-title':{textContent:'View Ceramica'},'#product-modal-v2':modal,'#product-modal-v2-card':box,'#partner-products':grid};
 const document={readyState:'loading',addEventListener(){},querySelector:s=>nodes[s]||null,querySelectorAll:()=>[],body:{style:{overflow:'hidden'}}};
 const window={VIEW_CATALOGUE:[{id:'test',name:'Test',variants:[]}],LRF_AGENT_TARIFFS:{verified:true},addEventListener:(type,fn)=>events.set(type,fn)};
 const source=readFileSync(new URL('../assets/js/'+filename,import.meta.url),'utf8'),safe=filename.includes('mobile-safe');
 const hook='\nwindow.__viewSecurityTest={hasViewAccess,setActive(v){activeProduct=v;},getActive(){return activeProduct;}};render=()=>{};'+(safe?'bind();':'activate=()=>{};');
 const end=source.lastIndexOf('})();');const instrumented=source.slice(0,end)+hook+source.slice(end);
 const context={window,document,setTimeout(){},clearTimeout(){},sessionStorage:{getItem:()=>null}};vm.createContext(context);vm.runInContext(instrumented,context);
 assert.equal(window.__viewSecurityTest.hasViewAccess(),true,'No client session is needed');window.__viewSecurityTest.setActive({id:'test'});window.LRF_AGENT_TARIFFS.verified=false;
 events.get('lrf-pro-session-changed')();assert.equal(window.__viewSecurityTest.getActive(),null);assert.equal(box.innerHTML,'');assert.equal(classes.has('open'),false);
});

test('ELIOS pricing uses verified agent cache without requiring a client PRO session',()=>{
 const quote={amount:4.56,label:'Synthetic agent quote'},context={window:{LRF_AGENT_TARIFFS:{verified:true,eliosPrice:()=>quote}},document:{readyState:'loading',addEventListener(){}},sessionStorage:{getItem:()=>null}};vm.createContext(context);
 vm.runInContext(readFileSync(new URL('../assets/js/inspirations-elios-pricing.js',import.meta.url),'utf8'),context);
 assert.equal(context.window.LRF_INSPIRATIONS_PRICING.canAccess('elios'),true);
 assert.equal(context.window.LRF_INSPIRATIONS_PRICING.getPrice('elios',{},'60x60'),quote);
 context.window.LRF_AGENT_TARIFFS.verified=false;assert.equal(context.window.LRF_INSPIRATIONS_PRICING.getPrice('elios',{},'60x60').locked,true);
});

test('browser enrichment keeps purchases only in memory and clears catalogue fields on logout',()=>{
 const catalogue=[{id:'test',variants:[{key:'test-60',publicPrice:99}]}],window={VIEW_CATALOGUE:catalogue,addEventListener(){},dispatchEvent(){}},document={addEventListener(){},querySelectorAll(){return [];},getElementById(){return null;},body:{style:{}}};
 const source=readFileSync(new URL('../assets/js/agent-tariffs.js',import.meta.url),'utf8').replace('connect().catch(()=>{clear();redraw();});','');
 const context={window,document,CustomEvent:class{},console,localStorage:{getItem:()=>'{"isAdmin":true}'}};vm.createContext(context);
 vm.runInContext(source+'\nverified=true;view=[{productId:"test",variantKey:"test-60",proDetail:12.34}];elios={"test|60x60|standard":{amount:4.56}};enrich();globalThis.testClear=clear;',context);
 assert.equal(catalogue[0].variants[0].proDetail,12.34);assert.equal(window.LRF_AGENT_TARIFFS.verified,true);
 context.testClear();assert.equal(catalogue[0].variants[0].proDetail,undefined);assert.equal(catalogue[0].variants[0].publicPrice,99);assert.equal(window.LRF_AGENT_TARIFFS.verified,false);assert.equal(window.LRF_AGENT_TARIFFS.eliosPrice({slug:'test'},'60x60').locked,true);
});

test('public build helper needs no secret, preserves encrypted server artifact and redirects legacy UI',async()=>{
 const root=mkdtempSync(join(tmpdir(),'lrf-public-tariffs-')),out=join(root,'out');
 try{
  const put=(path,text)=>{const p=join(root,path);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,text);};
  put('randal-general/server/data/agent-tariffs.enc.json','{}');put(PROTECTED_TARIFF_SCRIPTS[0],'/* __LRF_PUBLIC_TARIFFS_V1__ */ window.VIEW_CATALOGUE=[];');
  put('out/univers.html','<html><body><script src="assets/js/inspirations-view-data.js"></script></body></html>');put('out/randal-studio-one.html','OLD');
  const stats=await preparePublicAgentTariffs({root,out,files:['univers.html','randal-studio-one.html']});assert.equal(stats.publicTariffScripts,1);assert(readFileSync(join(out,'univers.html'),'utf8').includes('agent-tariffs.js'));assert(readFileSync(join(out,'randal-studio-one.html'),'utf8').includes('location.replace'));
  put(PROTECTED_TARIFF_SCRIPTS[0],'window.VIEW_CATALOGUE=[{proPrice:1}];');await assert.rejects(preparePublicAgentTariffs({root,out,files:[]}));
 }finally{rmSync(root,{recursive:true,force:true});}
});
