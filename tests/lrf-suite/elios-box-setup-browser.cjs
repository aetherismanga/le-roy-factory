// Native Elios box in a real WebGL2 browser. All identities and prices below
// are synthetic fixtures; production APIs and customer accounts are blocked.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),dist=path.join(root,'studio-one/dist'),output=path.join(root,'reports/lrf-suite/elios-box');
const site='https://leroyfactory.fr',studio='https://studio-one-beta-test-v2.vercel.app',endpoint='https://us-central1-le-roy-factory.cloudfunctions.net/eliosSamples';
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'assets/data/elios-samples.json'))),canonical=JSON.parse(fs.readFileSync(path.join(root,'shared/lrf-3d/commercial-surfaces.json'))).products;
const floor=canonical.find(p=>p.collection==='Yosemite'&&p.colorId==='honey'&&p.format==='23.4x119.5'&&p.packVerified);
const wall=canonical.find(p=>p.collection==='Stone Icon'&&p.colorId==='leccese'&&p.format==='60x90'&&p.finish.startsWith('Tumbled ·'));
assert(floor&&wall);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.hdr':'application/octet-stream'};
function read(dir,relative){const file=path.resolve(dir,'.'+relative);return file.startsWith(dir+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}:null;}
const host=`<!doctype html><html><meta charset="utf-8"><title>Elios box local QA</title><style>body{margin:0}iframe{border:0;width:100vw;height:100vh}</style><iframe id="box" title="Box Elios" src="${studio}/elios-box.html"></iframe><script>
window.drafts=[];window.closed=false;window.bridgeId='qa-opening-1';
window.loadBox=(value)=>document.querySelector('iframe').contentWindow.postMessage({type:'lrf-elios-box-load',bridgeId:window.bridgeId,targetClientId:'qa-client',...value},'${studio}');
addEventListener('message',event=>{if(event.origin!=='${studio}'||event.source!==document.querySelector('iframe').contentWindow)return;const m=event.data;if(m.type==='lrf-configurator-session-needed')event.source.postMessage({type:'lrf-configurator-session',sessionToken:'synthetic-local-session'},'${studio}');if(m.type==='lrf-elios-box-ready')window.loadBox({fresh:true});if(m.type==='lrf-elios-box-draft')window.drafts.push(m);if(m.type==='lrf-elios-box-close')window.closed=true;});
</script></html>`;
let browser,page;const checks=[],errors=[],quotes=[];
(async()=>{
 fs.mkdirSync(output,{recursive:true});browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',async route=>{
  const url=route.request().url(),u=new URL(url);const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Cache-Control':'no-store'};
  if(url===site+'/qa-elios-box')return route.fulfill({body:host,contentType:'text/html',headers});
  if(url===endpoint){if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});const body=route.request().postDataJSON();assert.equal(body.sessionToken,'synthetic-local-session');if(body.action==='context')return route.fulfill({json:{success:true,customer:{societe:'QA synthetic account'}},headers});assert.equal(body.action,'quote');assert.equal(body.targetClientId,'qa-client');quotes.push(body);return route.fulfill({json:{success:true,quote:{subtotalHT:123.45,incomplete:false,rows:body.items}},headers});}
  const asset=u.origin===studio?read(dist,decodeURIComponent(u.pathname)):u.origin===site?read(root,decodeURIComponent(u.pathname)):null;
  return asset?route.fulfill({...asset,headers}):route.abort();
 });
 page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));await page.goto(site+'/qa-elios-box');
 const frame=page.frameLocator('#box'),panel=frame.locator('#elios-box-setup');
 await panel.getByRole('heading',{name:'Les dimensions de votre box',exact:true}).waitFor({timeout:90000});
 await frame.locator('body').evaluate(async()=>{await studioOnePrototype.waitForTextures();return true;});
 const project=()=>frame.locator('body').evaluate(()=>studioOnePrototype.exportProject());
 const choose=async p=>{for(const [field,value]of [['collection',p.collection],['color',p.colorId],['format',p.format],['reference',p.key]]){await panel.locator('[data-'+field+'] + [data-visual-choice] [data-visual-choice-trigger]').click();const popup=frame.locator('[data-visual-choice-popup]:visible');await popup.locator('[data-visual-choice-value='+JSON.stringify(value)+']').click();}};
 for(const count of [1,2,3]){
  if(count>1){await page.evaluate(count=>{window.bridgeId='qa-opening-'+count;window.loadBox({fresh:true});},count);await panel.getByRole('heading',{name:'Les dimensions de votre box',exact:true}).waitFor();}
  await panel.getByRole('button',{name:count===1?'1 mur':count+' pans',exact:true}).click();
  await panel.locator('[name=width]').fill('260');await panel.locator('[name=depth]').fill('200');if(count===3)await panel.locator('[name=left]').fill('180');
  let p=await project();assert.equal(p.room.expoWalls.filter(w=>w.enabled).length,count);assert.equal(p.room.points[1][0],260);
  await panel.locator('[data-next]').click();assert.equal(await panel.locator('[data-next]').isEnabled(),false);
  await choose(floor);p=await project();assert.equal(p.floor.catalogueKey,floor.key);assert.equal(p.layouts.floor.pattern,'third');await panel.locator('[data-next]').click();
  for(let i=0;i<count;i++){await panel.getByRole('heading',{name:'Choisissez le mur '+(i+1),exact:true}).waitFor();await choose(wall);await panel.locator('[data-next]').click();}
  await panel.getByRole('heading',{name:'Votre base est prête',exact:true}).waitFor();
  await panel.locator('[data-setup-total]').filter({hasText:'123,45'}).waitFor();
  const report=await frame.locator('body').evaluate(()=>studioOnePrototype.quantityReport());assert.equal(report.rows.filter(r=>!r.paint&&r.label!=='Sol').length,count,JSON.stringify(report.rows.map(r=>({label:r.label,paint:r.paint,area:r.area}))));assert(report.groups.every(g=>g.packVerified&&g.boxes>0&&g.orderArea>=g.needed));
  await panel.getByRole('button',{name:'Accéder aux finitions →',exact:true}).click();assert.equal((await project()).room.expoComplete,true);
  const diagnostics=await frame.locator('body').evaluate(async()=>{await studioOnePrototype.waitForTextures();return studioOnePrototype.getDiagnostics();});assert(diagnostics.drawCalls>0);assert(diagnostics.triangles>0);
  checks.push(count+' pans: native room, numbered dimensions, floor/wall selections, third-offset wood, complete packs and progressive estimate');
 }
 await frame.locator('body').evaluate(()=>{const p=studioOnePrototype.exportProject();p.room.niches=[{id:'niche-qa-preserved',wallKey:'boundary-0',u:130,width:60,bottom:90,height:30,depth:8}];p.floor.groutColor='Gris';p.layouts.floor.direction='vertical';p.layouts.floor.x=.17;if(!studioOnePrototype.restoreProject(p))throw Error('Native niche fixture failed: '+document.querySelector('#placement-status')?.textContent);});
 await frame.getByText('Modifier les dimensions et les revêtements de base',{exact:true}).click();await frame.getByRole('button',{name:'Modifier la base du box',exact:true}).click();await panel.locator('[name=width]').fill('280');
 const edited=await project();assert.equal(edited.room.niches[0].id,'niche-qa-preserved');assert.equal(edited.floor.groutColor,'Gris');assert.equal(edited.layouts.floor.direction,'vertical');assert.equal(edited.layouts.floor.x,.17);
 await page.waitForFunction(()=>window.drafts.some(d=>d.bridgeId==='qa-opening-3'&&d.project.room.points[1][0]===280&&d.project.room.niches?.[0]?.id==='niche-qa-preserved'));
 checks.push('Changing the base preserves a native niche, joints and manual layout; its draft returns to the exact parent session');
 const capture=await frame.locator('body').evaluate(async()=>{const app=studioOnePrototype;await app.waitForTextures();const before=JSON.stringify(app.exportProject()),image=new Image();image.src=await app.captureHD({width:1920});await image.decode();return {width:image.naturalWidth,height:image.naturalHeight,preserved:before===JSON.stringify(app.exportProject())};});
 assert.equal(capture.width,1920);assert(capture.height>0);assert(capture.preserved);checks.push('Native 1920px HD capture succeeds with real tile textures and preserves the box');
 await page.screenshot({path:path.join(output,'elios-box-native.png')});assert(quotes.length>0);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,checks,capture,quotes:quotes.length,errors},null,2));console.log(JSON.stringify({passed:true,checks,capture,quotes:quotes.length,errors},null,2));
})().catch(async error=>{console.error(error);if(page)await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,error:error.stack,checks,errors},null,2));process.exitCode=1;}).finally(async()=>{await browser?.close();});
