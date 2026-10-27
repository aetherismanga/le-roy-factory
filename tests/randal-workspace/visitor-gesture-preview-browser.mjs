import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const output=path.resolve(process.env.QA_GESTURE_OUTPUT||'/tmp/randal-gesture-preview');fs.mkdirSync(output,{recursive:true});
const bundle=Buffer.from((await build({entryPoints:[path.join(root,'tests/randal-workspace/visitor-gesture-preview.js')],bundle:true,format:'esm',target:['es2022'],write:false})).outputFiles[0].contents);
const errors=[],requests=[],measurements=[];
const cases=(process.env.QA_GESTURE_CASES||'studio,general,door').split(',');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:540,height:540},deviceScaleFactor:1});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());requests.push(url.pathname);
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><script type="module" src="/qa.js"></script></body></html>'});
  if(url.pathname==='/qa.js')return route.fulfill({contentType:'text/javascript',body:bundle});
  if(url.pathname.startsWith('/assets/avatar/jerome-v1/')){
   const filename=path.basename(url.pathname),file=path.join(root,'shared/avatar/jerome-v1',filename);
   if(fs.existsSync(file))return route.fulfill({path:file,contentType:filename.endsWith('.glb')?'model/gltf-binary':'image/webp'});
  }
  return route.fulfill({status:404,body:'Missing QA asset'});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://gesture-qa.test/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.gestureQA?.ready,null,{timeout:60000});
 for(const kind of cases){
  const start=await page.evaluate(kind=>gestureQA.setup(kind),kind);assert.ok(start.hitObject);
  if(kind==='studio')await page.screenshot({path:path.join(output,'studio-idle.png')});
  const begin=await page.evaluate(()=>gestureQA.begin());assert.equal(begin,true);
  let d=await page.evaluate(()=>gestureQA.step(.20));assert.equal(d.commits,0,'Visual harness must not open mechanism before contact');
  if(kind==='studio')await page.screenshot({path:path.join(output,'studio-reach.png')});
  d=await page.evaluate(()=>gestureQA.step(.15));assert.equal(d.commits,1);assert.equal(d.driver.committed,true);
  if(kind==='door')await page.evaluate(()=>gestureQA.front());
  await page.screenshot({path:path.join(output,kind+'-contact.png')});measurements.push({kind,phase:'contact',diagnostics:d});
  d=await page.evaluate(()=>gestureQA.step(.4));assert.equal(d.commits,1);
  if(kind==='studio')await page.screenshot({path:path.join(output,'studio-follow.png')});
  d=await page.evaluate(()=>gestureQA.step(1));assert.equal(d.driver.active,false);assert.equal(d.commits,1);
  if(kind==='studio')await page.screenshot({path:path.join(output,'studio-return.png')});measurements.push({kind,phase:'idle',diagnostics:d});
 }
 assert.deepEqual(errors,[]);assert.ok(requests.some(p=>p.endsWith('resident.glb')));
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,errors,requests,measurements},null,2));
 console.log(JSON.stringify({passed:true,output,cases:cases.length,captures:fs.readdirSync(output).filter(file=>file.endsWith('.png')).length,errors}));await context.close();
}catch(error){fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,errors,requests,measurements,failure:String(error)},null,2));throw error;}
finally{await browser.close();}
