import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {SAVED_PREFIX,DRAFT_KEY,AMBIENCE_KEY,scanLegacyStorage,publicLegacyRecord,recoveryBackup,readRecoveryFile} from '../../assets/js/studio-one/legacy-recovery-core.mjs';
import {preparePublicAgentTariffs} from '../../scripts/public-agent-tariffs.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const clone=value=>JSON.parse(JSON.stringify(value));
// Synthetic records only: no real account, token or purchase data is used.
const cabinet={id:'cabinet-test',kind:'cabinet',model:2,width:83,height:37.5,depth:46,finish:'BISC.',facade:'Onglet 45°',option:'top',open:true,doorSide:'left',ledOn:false,mirrorRotated:false,mirror:'Basic',mirrorSize:'60 × 80 cm',mirrorFinish:'Noir',drawers:1,position:{x:-71.3,y:28,z:0},sink:{model:'Neris',color:'namibie',layout:'single',width:46,height:14,depth:33,reference:'9562'},accessories:[{id:'accessory-test',kind:'tap',model:'test',reference:'PUBLIC-REFERENCE',position:{x:3,y:80,z:-10}}]};
const mirror={...cabinet,id:'mirror-test',kind:'mirror',model:0,width:80,height:60,depth:3,finish:'ROBLE',open:false,option:'bare',mirrorRotated:true,ledOn:true,position:{x:-71.3,y:131.7,z:-23},sink:null,accessories:[]};
const ambience={room:{width:5.3,depth:3.7,height:2.8},floor:'elios-creta:caramello:60x120',wall:'view-corso:sabbia:60x90',floorOrientation:'horizontal',wallOrientation:'vertical',floorSelection:{collection:'elios-creta',brand:'elios',color:'caramello',format:'60x120',orientation:'horizontal',layout:'straight',groutWidth:2,groutColor:'#c8c9c5',reference:'PUBLIC-TILE',quality:'high'},wallSelection:{collection:'view-corso',color:'sabbia',format:'60x90',orientation:'vertical',layout:'staggered',groutWidth:3,groutColor:'#ded5c1'}};
const project={client:'Client synthétique',name:'Salle de bains test',date:'2026-10-24T12:00:00.000Z',data:{version:2,items:[cabinet,mirror]},ambience};

function storage(values={}){
 const data=new Map(Object.entries(values).map(([key,value])=>[key,typeof value==='string'?value:JSON.stringify(value)])),writes=[];
 return {data,writes,get length(){return data.size;},key:index=>[...data.keys()][index]??null,getItem:key=>data.get(key)??null,setItem(key,value){writes.push(['setItem',key,value]);throw Error('Recovery must never write storage');},removeItem(key){writes.push(['removeItem',key]);throw Error('Recovery must never remove storage');},clear(){writes.push(['clear']);throw Error('Recovery must never clear storage');}};
}

test('scans every historical account and the current draft without modifying either store',()=>{
 const key1=SAVED_PREFIX+encodeURIComponent('client@example.invalid'),key2=SAVED_PREFIX+'another-client';
 const local=storage({[key1]:[project,{...project,name:'Second record'}],[key2]:[{...project,name:'Other account'}],unrelated:'not a project'}),session=storage({[DRAFT_KEY]:project.data,[AMBIENCE_KEY]:ambience});
 const originalLocal=[...local.data],originalSession=[...session.data];
 const {entries,issues}=scanLegacyStorage(local,session);
 assert.equal(entries.length,4);assert.deepEqual(issues,[]);assert(entries.every(entry=>entry.recognized));
 assert.deepEqual(entries.map(entry=>entry.storage),['localStorage','localStorage','localStorage','sessionStorage']);
 assert.deepEqual(entries.slice(0,3).map(entry=>entry.key),[key1,key1,key2]);
 assert.equal(entries[3].key,DRAFT_KEY);assert.deepEqual(entries[3].record.ambience,ambience);
 assert.deepEqual([...local.data],originalLocal);assert.deepEqual([...session.data],originalSession);assert.deepEqual(local.writes,[]);assert.deepEqual(session.writes,[]);
});

test('archives and reimports all allowed geometry, finishes, sink and ambience fields faithfully',()=>{
 const input=clone(project),entry={storage:'localStorage',key:SAVED_PREFIX+'synthetic-account',index:7,record:input};
 const archive=recoveryBackup([entry]),restored=readRecoveryFile(JSON.parse(JSON.stringify(archive)));
 assert.equal(archive.format,'lrf-studio-one-legacy-recovery');assert.equal(archive.version,1);
 assert.deepEqual(archive.projects[0].record,project);assert.deepEqual(restored[0].record,project);assert.equal(restored[0].recognized,true);
 assert.equal(restored[0].storage,'file');assert.deepEqual(input,project,'Input record is untouched');
 assert.deepEqual(archive.projects[0].source,{storage:'localStorage',index:0},'Opaque account storage keys are omitted');
});

test('standalone legacy JSON retains geometry without inventing missing room dimensions',()=>{
 const [entry]=readRecoveryFile(clone(project.data));
 assert.equal(entry.recognized,true);assert.deepEqual(entry.record.data,project.data);assert.equal(entry.record.ambience,undefined);
 assert.equal(publicLegacyRecord({data:project.data}).ambience,undefined);
 assert.throws(()=>readRecoveryFile({version:2,room:{width:5}}),/ancien projet/);
});

test('modern version-2 projects cannot be mistaken for the historical version-2 schema',()=>{
 const modern={version:2,room:{points:[[0,0],[450,0],[450,450],[0,450]],height:260},items:[{id:'modern-test',type:'cabinet',settings:{format:'two',width:80,finish:'ROBLE',top:'bare'},placement:{wall:0,u:225,height:28}}]};
 for(const input of [modern,{data:modern},{...modern,items:[]}]){
  const before=JSON.stringify(input);assert.throws(()=>readRecoveryFile(input),/atelier actuel/);assert.equal(JSON.stringify(input),before);
 }
 const local=storage({[SAVED_PREFIX+'modern-file-in-wrong-key']:[{name:'Modern',data:modern}]}),before=[...local.data],result=scanLegacyStorage(local,undefined);
 assert.equal(result.entries.length,1);assert.equal(result.entries[0].recognized,false);assert.deepEqual([...local.data],before);assert.deepEqual(local.writes,[]);
});

test('strict archive projection removes purchases, private codes, previews, catalogues and tokens at every supported nesting level',()=>{
 const input=clone(project),secret='SYNTHETIC_PRIVATE_MARKER';
 input.purchaseHT=101.23;input.proRows=[{secret}];input.catalogue={secret};input.preview='data:image/jpeg;base64,SYNTHETIC_PREVIEW';input.authToken=secret;input.session={secret};
 input.data.purchaseHT=102.34;input.data.catalogue={secret};input.data.items[0].privateCode=secret;input.data.items[0].proRows=[{secret}];input.data.items[0].catalogue={secret};
 input.data.items[0].position.token=secret;input.data.items[0].sink.purchaseHT=103.45;input.data.items[0].sink.catalogue={secret};
 input.data.items[0].accessories[0].position.privateCode=secret;input.data.items[0].accessories[0].catalogue={secret};
 input.ambience.room.proRows=[{secret}];input.ambience.floorSelection.catalogue={secret};input.ambience.wallSelection.token=secret;
 const original=JSON.stringify(input),archive=recoveryBackup([{storage:'localStorage',key:SAVED_PREFIX+secret,index:0,record:input}]),text=JSON.stringify(archive);
 assert.deepEqual(archive.projects[0].record,project);assert(!text.includes(secret));assert(!text.includes('SYNTHETIC_PREVIEW'));
 for(const key of ['purchaseHT','proRows','authToken','privateCode','catalogue'])assert(!text.includes('"'+key+'"'));
 assert.equal(JSON.stringify(input),original);
});

test('objects or arrays smuggled into scalar fields cannot carry catalogues or tokens through the whitelist',()=>{
 const input=clone(project),secret='SYNTHETIC_HIDDEN_CATALOGUE';
 input.name={catalogue:{marker:secret}};input.data.version={catalogue:{marker:secret}};
 const item=input.data.items[0];item.finish={catalogue:{marker:secret}};item.position.x={catalogue:{marker:secret}};item.sink.color=[{marker:secret}];item.accessories[0].reference={catalogue:{marker:secret}};item.accessories[0].position.y={marker:secret};
 input.ambience.room.width={catalogue:{marker:secret}};input.ambience.floorSelection.reference=[{marker:secret}];
 const projected=publicLegacyRecord(input),text=JSON.stringify(projected);
 assert(!text.includes(secret));assert.equal(projected.name,undefined);assert.equal(projected.data.version,null);assert.equal(projected.data.items[0].finish,undefined);
 assert.equal(projected.data.items[0].position.x,undefined);assert.equal(projected.data.items[0].sink.color,undefined);assert.equal(projected.ambience.room.width,undefined);
});

test('historical private reference suffixes and currency strings are scrubbed while ordinary public references survive',()=>{
 const input=clone(project);input.name='LRF-TEST-12.34-56 — 12.34 € HT';input.data.items[0].sink.reference='LRF-TEST-98,76';input.ambience.floorSelection.label='24 EUR et 18 HT';
 const projected=publicLegacyRecord(input),text=JSON.stringify(projected);
 for(const token of ['12.34','98,76','24 EUR','18 HT'])assert(!text.includes(token));
 assert.equal(projected.data.items[0].sink.reference,'LRF-TEST');assert.equal(projected.data.items[0].accessories[0].reference,'PUBLIC-REFERENCE');
 assert.match(projected.name,/montant retiré/);
});

test('corrupt or wrong-shaped saved JSON is reported and does not prevent recovery of other accounts or draft',()=>{
 const local=storage({[SAVED_PREFIX+'broken']:'{broken',[SAVED_PREFIX+'wrong']:{items:[]},[SAVED_PREFIX+'valid']:[project]}),session=storage({[DRAFT_KEY]:project.data,[AMBIENCE_KEY]:'{broken'}),before=[...local.data];
 const {entries,issues}=scanLegacyStorage(local,session);
 assert.equal(entries.length,2);assert.equal(issues.length,3);assert(entries.every(entry=>entry.recognized));assert.equal(entries[1].record.ambience,undefined);
 assert.deepEqual([...local.data],before);assert.deepEqual(local.writes,[]);assert.deepEqual(session.writes,[]);
});

test('blocked storage and read failures are handled without clearing user data',()=>{
 const inaccessible={get length(){throw Error('SecurityError');},getItem(){throw Error('SecurityError');},setItem(){assert.fail('No write allowed');},removeItem(){assert.fail('No removal allowed');},clear(){assert.fail('No clear allowed');}};
 let result=scanLegacyStorage(inaccessible,inaccessible);assert.deepEqual(result.entries,[]);assert.equal(result.issues.length,2);
 result=scanLegacyStorage(undefined,undefined);assert.deepEqual(result,{entries:[],issues:[]});
 const local=storage({[SAVED_PREFIX+'hidden']:[project]});local.getItem=()=>{throw Error('Quota/security denial');};result=scanLegacyStorage(local,undefined);
 assert.equal(result.entries.length,0);assert.equal(result.issues.length,1);assert.equal(local.data.size,1);assert.deepEqual(local.writes,[]);
});

test('recovery entry point is a local, user-driven page without auto redirect, old catalogue or initial Three.js',()=>{
 const html=readFileSync(join(ROOT,'randal-studio-one-3d.html'),'utf8'),module=readFileSync(join(ROOT,'assets/js/studio-one/legacy-recovery.mjs'),'utf8');
 assert.match(html,/id="projects"/);assert.match(html,/id="download-all"/);assert.match(html,/legacy-recovery\.mjs/);
 for(const source of [html,module]){
  assert(!/http-equiv\s*=\s*["']refresh/i.test(source));assert(!/location\.(?:replace|assign)\s*\(/.test(source));assert(!/location(?:\.href)?\s*=/.test(source));
  assert(!/studio-one\/(?:catalog|model|scene|editor)\.js/.test(source));assert(!/three(?:\.module)?(?:\.min)?\.js|from\s*["']three["']|window\.THREE/.test(source));
  assert(!/\.setItem\s*\(|\.removeItem\s*\(|\.clear\s*\(/.test(source));
 }
 assert.match(module,/legacy-recovery-converter\.mjs/);assert.match(module,/\.onclick\s*=\s*\(\)\s*=>\s*convert/,'Conversion is explicitly requested');
});

test('public tariff preparation preserves the recovery HTML exactly and still redirects the old guided page',async()=>{
 const temporary=mkdtempSync(join(tmpdir(),'lrf-recovery-build-')),root=join(temporary,'source'),out=join(temporary,'output'),file='randal-studio-one-3d.html',html=readFileSync(join(ROOT,file),'utf8');
 try{
  mkdirSync(root,{recursive:true});mkdirSync(out,{recursive:true});writeFileSync(join(out,file),html);writeFileSync(join(out,'randal-studio-one.html'),'<html>Old guided page</html>');
  await preparePublicAgentTariffs({root,out,files:[file,'randal-studio-one.html']});
  assert.equal(readFileSync(join(out,file),'utf8'),html);assert.match(readFileSync(join(out,'randal-studio-one.html'),'utf8'),/location\.replace/);
 }finally{rmSync(temporary,{recursive:true,force:true});}
});

test('browser UI lists all recovered projects, downloads a scrubbed archive and imports it without touching storage',async t=>{
 let chromium;try{({chromium}=await import('playwright'));}catch{return t.skip('Playwright is unavailable');}
 if(!existsSync(chromium.executablePath()))return t.skip('Local Chromium is unavailable');
 const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),path=resolve(ROOT,'.'+decodeURIComponent(url.pathname));
  if(path!==ROOT&&!path.startsWith(ROOT+sep)){res.writeHead(403);res.end();return;}
  try{const body=readFileSync(path);res.setHeader('Content-Type',path.endsWith('.mjs')?'text/javascript':path.endsWith('.html')?'text/html':'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true});const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage();
  const key=SAVED_PREFIX+'synthetic-ui-account',unsafe=clone(project);unsafe.purchaseHT=111.11;unsafe.authToken='SYNTHETIC_UI_SECRET';unsafe.preview='SYNTHETIC_PREVIEW';
  await context.addInitScript(({key,record,draft,ambience,keys})=>{
   localStorage.setItem(key,JSON.stringify([record]));sessionStorage.setItem(keys.draft,JSON.stringify(draft));sessionStorage.setItem(keys.ambience,JSON.stringify(ambience));
   window.__recoveryWrites=[];for(const name of ['setItem','removeItem','clear'])Storage.prototype[name]=function(){window.__recoveryWrites.push(name);throw Error('Recovery changed storage');};
  },{key,record:unsafe,draft:project.data,ambience,keys:{draft:DRAFT_KEY,ambience:AMBIENCE_KEY}});
  const requests=[];page.on('request',request=>requests.push(request.url()));const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const base='http://127.0.0.1:'+server.address().port;await page.goto(base+'/randal-studio-one-3d.html');await page.waitForFunction(()=>document.querySelectorAll('#projects article').length===2);
  assert.match(await page.locator('#status').innerText(),/^2 projet/);assert.equal(await page.locator('#projects article').count(),2);assert.equal(await page.locator('#issues').isVisible(),false);
  const downloadPromise=page.waitForEvent('download');await page.locator('#download-all').click();const download=await downloadPromise,archive=JSON.parse(readFileSync(await download.path(),'utf8'));
  assert.equal(archive.projects.length,2);assert(!JSON.stringify(archive).includes('SYNTHETIC_UI_SECRET'));assert(!JSON.stringify(archive).includes('purchaseHT'));assert(!JSON.stringify(archive).includes('SYNTHETIC_PREVIEW'));
  const saved=await page.evaluate(key=>({record:JSON.parse(localStorage.getItem(key)),writes:window.__recoveryWrites}),key);assert.deepEqual(saved.record,[unsafe]);assert.deepEqual(saved.writes,[]);
  await page.locator('#recovery-file').setInputFiles({name:'recovery.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});await page.waitForFunction(()=>document.querySelectorAll('#projects article').length===4);
  assert.match(await page.locator('#file-status').innerText(),/2 projet/);assert.deepEqual(await page.evaluate(()=>window.__recoveryWrites),[]);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Recovery UI fits a phone viewport');
  assert(!requests.some(url=>/\/catalog\.js|\/scene\.js|three|\/legacy-recovery-converter\.mjs/.test(url)));assert.deepEqual(errors,[]);
  await context.close();
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
});
