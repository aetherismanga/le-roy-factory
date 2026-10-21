import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.HOUSE_URL;
if(!origin)throw Error('Set HOUSE_URL to the deployed house preview.');
const output='qa-results/exterior';fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.HTTPS_PROXY||process.env.https_proxy?{proxy:{server:process.env.https_proxy||process.env.HTTPS_PROXY}}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],network=[],checks=[];
const pass=s=>{checks.push(s);console.log('PASS',s);};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:true,reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(120000);
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push({message:m.text(),url:m.location().url});});p.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ERR_ABORTED'))network.push({url:r.url(),error:r.failure()?.errorText});});
 await p.addInitScript(()=>localStorage.setItem('lrf-house-graphics-v1','eco'));
 const response=await p.goto(origin,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
 const html=fs.readFileSync('dist/index.html','utf8'),expected=html.match(/app\.js\?v=([a-f0-9]+)/)[1];assert.ok((await p.locator('script[type=module]').getAttribute('src')).includes(expected),'Vercel must serve the exact reviewed build');
 await p.waitForFunction(()=>window.maison3D?.getState().ready||!document.querySelector('#fatal').hidden,null,{timeout:180000});assert.equal(await p.evaluate(()=>maison3D?.getState().ready),true);await p.waitForFunction(()=>document.querySelector('#loading').hidden);await p.locator('#enter').click();pass('Live CDN serves and starts the reviewed build');
 await p.evaluate(()=>maison3D.exterior.open('pool'));await p.locator('#pool-drain').click();await p.waitForFunction(()=>maison3D.exterior.getState().level===0);assert.equal(await p.evaluate(()=>maison3D.exterior.getState().waterVisible),false);await p.locator('#pool-fill').click();await p.waitForFunction(()=>maison3D.exterior.getState().level===1);assert.equal(await p.evaluate(()=>maison3D.exterior.getState().volume),41.6);pass('Live pool drains and fills to its measured capacity');
 await p.locator('[data-exterior-tab=wall]').click();await p.locator('[data-stone-series=carsica]').click();await p.waitForFunction(()=>document.querySelector('#exterior-panel').getAttribute('aria-busy')!=='true');await p.locator('[data-stone-color=antracite]').click();await p.waitForFunction(()=>document.querySelector('#exterior-panel').getAttribute('aria-busy')!=='true');assert.equal(await p.evaluate(()=>maison3D.exterior.getState().wall),'carsica/antracite');pass('Manufacturer textures are available on the deployed origin');
 await p.evaluate(()=>maison3D.setMode('character'));assert.equal(await p.evaluate(()=>maison3D.character.select('female')),true);assert.equal(await p.evaluate(()=>maison3D.character.getState().bones),80);
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  await p.setViewportSize(viewport);
  for(const id of ['#avatar-run','#avatar-jump','#avatar-sit','[data-avatar=male]','[data-avatar=female]'])assert.equal(await p.locator(id).evaluate(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return b.width>=40&&b.y>=0&&b.bottom<=innerHeight&&(hit===el||el.contains(hit));}),true,id+' is tappable at '+viewport.width);
 }
 pass('Portrait and landscape action buttons are directly tappable');
 await p.locator('#avatar-jump').click();await p.waitForFunction(()=>maison3D.character.getState().jumpHeight>.02);await p.waitForFunction(()=>!maison3D.character.getState().airborne);
 assert.equal(await p.evaluate(()=>maison3D.character.sit('dining-chair-0')),true);await p.waitForFunction(()=>{const c=maison3D.character.getState();return c.seated&&!c.transition&&c.seatBlend>.95;});assert.equal(await p.evaluate(()=>maison3D.character.stand()),true);await p.waitForFunction(()=>!maison3D.character.getState().seated);pass('Deployed resident jumps, sits on a real chair and stands again');
 const start=await p.evaluate(()=>maison3D.character.getState().position),direction=await p.evaluate(()=>{const a=maison3D,c=a.character.getState(),v=a.getViewProjection(),dx=v.target[0]-v.position[0],dz=v.target[2]-v.position[2],l=Math.hypot(dx,dz),fx=dx/l,fz=dz/l;return [['right',-fz,fx],['down',-fx,-fz],['left',fz,-fx],['up',fx,fz]].find(([,x,z])=>a.canStand(c.position[0]+x*.12,c.position[2]+z*.12,c.ground))?.[0];});assert.ok(direction);
 const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});const b=await p.locator('[data-move='+direction+']').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});try{await p.waitForFunction(start=>{const p=maison3D.character.getState().position;return Math.hypot(p[0]-start[0],p[2]-start[2])>.025;},start);}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}pass('Actual touch input moves the live character');
 await p.evaluate(()=>maison3D.openRoom('shower'));await p.locator('#room-return').click();await p.waitForFunction(()=>maison3D.getState().mode==='character');
 await p.setViewportSize({width:1100,height:760});await p.evaluate(()=>{maison3D.setMode('exterior');maison3D.exterior.frame('pool');});const before=await p.evaluate(()=>{const n=maison3D.getDiagnostics().frames;maison3D.setQuality('balanced');return n;});await p.waitForFunction(n=>maison3D.getDiagnostics().frames>n,before);await p.screenshot({path:path.join(output,'live-exterior.png')});
 assert.deepEqual(await p.evaluate(()=>maison3D.arrangement.audit()),[]);assert.deepEqual(errors,[]);assert.deepEqual(network,[]);pass('Room editing, reflected exterior rendering and asset loading remain healthy');
 fs.writeFileSync(path.join(output,'live-result.json'),JSON.stringify({result:'PASS',url:origin,build:expected,checks,errors,network,diagnostics:await p.evaluate(()=>maison3D.getDiagnostics())},null,2));console.log(JSON.stringify({result:'PASS',url:origin,checks}));
}catch(e){console.log('FAIL',e.stack);console.log('NETWORK',JSON.stringify(network));console.log('ERRORS',JSON.stringify(errors));throw e;}finally{await browser.close();}
