// Build both ateliers first, then: node tests/lrf-quercia-mobile.browser.mjs
// Requires Playwright, Chromium (LRF_BROWSER_EXECUTABLE) and Python 3. Only the
// exact public face URLs exercised by this test are downloaded on demand; no
// credentials or prepopulated cache required. LRF_QUERCIA_CACHE is optional.
// Emulated touch/software WebGL does not certify physical-phone memory behavior.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import * as core from '../assets/js/lrf-plan-pose/core.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),cache=path.resolve(process.env.LRF_QUERCIA_CACHE||path.join(root,'..','quercia-byte-cache'));
const reportFile=path.join(root,'reports/quercia-mobile-20261025.json'),screenshotDir=path.join(root,'reports/quercia-mobile-20261025');fs.mkdirSync(screenshotDir,{recursive:true});
const roots={studio:path.join(root,'studio-one/dist'),general:path.join(root,'randal-general/dist')},mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const inventory=JSON.parse(fs.readFileSync(path.join(root,'reports/elios-hd/quercia-inventory.json'))).entries,publication=JSON.parse(fs.readFileSync(path.join(root,'reports/elios-hd/quercia-published-assets.json'))).faces,assets=new Map();
for(const face of publication){const entry=inventory.find(e=>e.reference===face.reference&&e.face===face.face);for(const profile of ['fluid','balanced','max']){const variant=entry.variants[profile];assets.set(face.variants[profile][0],{reference:face.reference,face:face.face,profile,...variant,file:path.join(cache,variant.sha256+'.webp')});}}
const execute=promisify(execFile);
async function assetBytes(asset,url){
 let body;
 if(fs.existsSync(asset.file))body=fs.readFileSync(asset.file);
 else{
  // urllib honors HTTPS_PROXY in CI. Pass the observed public URL as an argv
  // value, never through a shell, and verify before any browser receives bytes.
  const script="import sys,urllib.request; r=urllib.request.Request(sys.argv[1],headers={'Origin':'https://randal-catalogue-general-3d.vercel.app'}); sys.stdout.buffer.write(urllib.request.urlopen(r,timeout=35).read())";
  ({stdout:body}=await execute('python3',['-c',script,url],{encoding:'buffer',maxBuffer:16*1024*1024,timeout:45000}));
  assert.equal(createHash('sha256').update(body).digest('hex'),asset.sha256,'Published Quercia face differs from the verified inventory');
  fs.mkdirSync(cache,{recursive:true});fs.writeFileSync(asset.file,body);
 }
 assert.equal(createHash('sha256').update(body).digest('hex'),asset.sha256);return body;
}
function local(dir,relative){const file=path.resolve(dir,'.'+relative);return file.startsWith(dir+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}:null;}
const results=[],errors=[],requests=[],blocked=new Set();let browser,server,page,kind='studio',stage='startup',delay=0;
const report={passed:false,test:'Quercia native exact reference textures in both active ateliers',date:'2026-10-25',environment:'Chromium headless WebGL2 with SwiftShader, 390x844 viewport, emulated mobile/touch; not a physical smartphone memory or performance benchmark',media:'Exact published WebP bodies, SHA-256 checked against the reviewed official-face inventory; unrelated remote thumbnails blocked',results,errors,requests};
try{
 server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),part=pathname.split('/')[1];if(pathname.includes('/api/')){res.writeHead(401,{'Content-Type':'application/json'});return res.end('{"success":false}');}const found=roots[part]?local(roots[part],pathname.slice(part.length+1)||'/atelier.html'):pathname.startsWith('/assets/')?local(roots[kind],pathname):null;res.writeHead(found?200:404,{'Content-Type':found?.contentType||'text/plain'});res.end(found?.body||'Missing local QA asset');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.LRF_BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(kind of ['studio','general']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});await context.addInitScript(()=>{localStorage.setItem('studio-one-render-quality','balanced');localStorage.setItem('randal-general-render-quality','balanced');});
  await context.route(/^https:\/\//,async route=>{const url=route.request().url(),asset=assets.get(url);if(asset){const body=await assetBytes(asset,url);requests.push({app:kind,stage,reference:asset.reference,face:asset.face,profile:asset.profile,bytes:body.length});if(delay)await new Promise(r=>setTimeout(r,delay));return route.fulfill({body,contentType:'image/webp',headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}}).catch(()=>{});}const u=new URL(url);let found;if(u.hostname==='leroyfactory.fr'&&u.pathname.startsWith('/review-studio/assets/'))found=local(roots.studio,u.pathname.slice('/review-studio'.length));else if(u.hostname==='studio-one-beta-test-v2.vercel.app')found=local(roots.studio,u.pathname);else if(u.hostname==='randal-catalogue-general-3d.vercel.app')found=local(roots.general,u.pathname);if(found)return route.fulfill({...found,headers:{'Access-Control-Allow-Origin':'*'}});blocked.add(u.hostname+u.pathname);return route.abort();});
  page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(kind+': '+e.message));
  const project=core.newProject(),room=core.newRoom([[0,0],[250,0],[250,200],[0,200]],'Quercia mobile');room.confirmed=true;room.plinths.enabled=false;const product=JSON.parse(fs.readFileSync(path.join(root,'assets/js/lrf-plan-pose/catalogue.json'))).products.find(p=>p.reference==='00Y2900');room.tile={...room.tile,...product,color:'white'};project.rooms=[room];const data=core.nativeProject(project,room,kind);stage='startup';
  await page.goto(origin+'/'+kind+'/atelier.html#projet='+Buffer.from(JSON.stringify(data)).toString('base64url'),{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.studioOnePrototype?.getState().ready,null,{timeout:90000});
  await page.evaluate(()=>{document.querySelector('#scene')?.addEventListener('webglcontextlost',()=>{window.qaContextLost=true;});});
  const state=()=>page.evaluate(()=>{const d=studioOnePrototype.getDiagnostics(),surface=d.textures.surfaces;return {profile:d.qualityProfile,mode:d.qualityMode,triangles:d.triangles,drawCalls:d.drawCalls,contextLost:!!window.qaContextLost,surfaces:Array.isArray(surface)?surface:Object.values(surface).flatMap(lib=>Object.entries(lib).map(([id,t])=>({...t,id}))),lastCapture:d.capture?.last};});
  const check=async(profile,count)=>{await page.evaluate(p=>{studioOnePrototype.setQualityMode(p);return studioOnePrototype.waitForTextures();},profile);const d=await state(),tx=d.surfaces.find(t=>t.reference==='00Y2900'||t.id.includes('00Y2900'));assert(tx,kind+' missing exact white reference');assert.equal(tx.faceCount,count,kind+' '+profile+' face count');assert(!d.contextLost);return {profile,count,width:tx.width,height:tx.height};};
  const profiles=[];stage='balanced';profiles.push(await check('balanced',6));stage='fluid';profiles.push(await check('fluid',4));stage='manual-max';profiles.push(await check('max',8));
  stage='export';const before=await page.evaluate(()=>JSON.stringify(studioOnePrototype.exportProject()));const capture=await page.evaluate(async()=>{const data=await studioOnePrototype.captureHD({width:1920}),image=new Image();image.src=data;await image.decode();return {width:image.naturalWidth,height:image.naturalHeight};});assert.equal(capture.width,1920);await page.evaluate(()=>studioOnePrototype.waitForTextures());const restored=await state();assert.equal(restored.surfaces.find(t=>t.reference==='00Y2900'||t.id.includes('00Y2900')).faceCount,8);assert.equal(await page.evaluate(()=>JSON.stringify(studioOnePrototype.exportProject())),before);const exportFaces=new Set(requests.filter(r=>r.app===kind&&r.stage==='export'&&r.profile==='max'&&r.reference==='00Y2900').map(r=>r.face));assert.equal(exportFaces.size,15,'HD requests all official native faces');
  stage='rapid-switch';delay=180;await page.evaluate(async()=>{studioOnePrototype.setQualityMode('balanced');studioOnePrototype.setSurface('floor','honey');await new Promise(r=>setTimeout(r,35));studioOnePrototype.setSurface('floor','natural');await new Promise(r=>setTimeout(r,35));studioOnePrototype.setSurface('floor','white');await studioOnePrototype.waitForTextures();});delay=0;const final=await state();assert(!final.contextLost);assert(final.surfaces.every(t=>!t.id.includes('honey')&&!t.id.includes('natural')),'stale colour texture cache released');assert.equal(final.surfaces.find(t=>t.reference==='00Y2900'||t.id.includes('00Y2900')).faceCount,6);assert(final.triangles>0&&final.drawCalls>0);await page.screenshot({path:path.join(screenshotDir,kind+'-mobile-quercia.png')});
  results.push({app:kind,passed:true,reference:'00Y2900',format:'20.3x90.6',profiles,capture:{...capture,nativeFaces:exportFaces.size,restoredFaces:8,projectPreserved:true},rapidSwitch:{latestColor:'white',staleSurfaces:0,contextLost:false},screenshot:'quercia-mobile-20261025/'+kind+'-mobile-quercia.png'});console.log(JSON.stringify(results.at(-1)));await context.close();page=null;
 }
 assert.deepEqual(errors,[]);report.passed=true;
}catch(error){report.error=error.stack;if(page){report.failureState=await page.evaluate(()=>({ready:window.studioOnePrototype?.getState().ready,error:document.querySelector('#error-text')?.textContent,status:document.querySelector('#placement-status')?.textContent,diagnostics:window.studioOnePrototype?.getDiagnostics()})).catch(()=>null);await page.screenshot({path:path.join(screenshotDir,'failure.png')}).catch(()=>{});}throw error;
}finally{report.blockedRemoteThumbnailCount=blocked.size;fs.writeFileSync(reportFile,JSON.stringify(report,null,2));await browser?.close();if(server)await new Promise(r=>server.close(r));}
