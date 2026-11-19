// Run on the existing Ubuntu/Playwright CI renderer. No production account or writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{handle}=require('./anonymous-commercial-fixture.cjs');
const root=path.resolve(__dirname,'../..'),roots={studio:path.join(root,'studio-one/dist'),general:path.join(root,'randal-general/dist')},out=path.join(root,'reports/lrf-suite/water-heater');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
fs.mkdirSync(out,{recursive:true});
function read(dir,relative){const file=path.resolve(dir,'.'+relative);return file.startsWith(dir+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}:null;}
let server,browser,active='studio',currentPage;const checks=[],errors=[];
(async()=>{
 server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(handle(req,res,p))return;if(p.includes('/api/')){res.writeHead(401,{'Content-Type':'application/json'});return res.end('{"success":false}');}const kind=p.split('/')[1],asset=roots[kind]?read(roots[kind],p.slice(kind.length+1)):p.startsWith('/assets/')?read(roots[active],p):null;if(!asset){res.writeHead(404);return res.end();}res.setHeader('Content-Type',asset.contentType);res.end(asset.body);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const kind of ['studio','general'])for(const mobile of [false,true]){
  active=kind;const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
  await context.addInitScript(()=>{window.__LRF_STANDALONE_PREVIEW__=true;for(const key of ['studio-one-render-quality','randal-general-render-quality'])localStorage.setItem(key,'fluid');});
  await context.route(/^https:\/\//,route=>{const u=new URL(route.request().url()),legacy=u.hostname==='leroyfactory.fr'&&u.pathname.startsWith('/review-studio/'),dir=u.hostname==='studio-one-beta-test-v2.vercel.app'||legacy?roots.studio:u.hostname==='randal-catalogue-general-3d.vercel.app'?roots.general:null,asset=dir&&read(dir,legacy?u.pathname.slice('/review-studio'.length):u.pathname);return asset?route.fulfill({...asset,headers:{'Access-Control-Allow-Origin':'*'}}):route.abort();});
  const page=currentPage=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(kind+': '+e.message));await page.goto(origin+'/'+kind+'/atelier.html?standalone=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.studioOnePrototype?.getState().ready,null,{timeout:90000});
  await page.evaluate(()=>{const app=studioOnePrototype,p=app.exportProject();p.items=[];p.room={height:260,points:[[0,0],[300,0],[300,300],[0,300]]};p.renovation={locked:false};p.walls=p.walls.slice(0,4).map(()=>({collection:'Peinture',color:'white'}));p.layouts.walls=p.walls.map(()=>({width:1.2,height:.6,x:0,y:0,groutWidth:2}));if(!app.restoreProject(p)||!app.addItem('towel',0,{model:'atlantic-lineo',waterHeaterCapacity:80}))throw Error('Heater fixture failed');app.setView('perspective',true);});
  assert.equal(await page.locator('#object-editor-title').textContent(),'Chauffe-eau Atlantic Linéo 80 L');
  const fields=page.locator('#object-editor .fixture-fields');await fields.getByLabel('Capacité (litres)').selectOption('65');assert.equal(await page.evaluate(()=>studioOnePrototype.exportProject().items.find(i=>i.settings.model==='atlantic-lineo').settings.waterHeaterCapacity),65);
  await fields.getByLabel('Capacité (litres)').selectOption('100');assert.equal(await page.evaluate(()=>studioOnePrototype.exportProject().items.find(i=>i.settings.model==='atlantic-lineo').settings.waterHeaterCapacity),100);
  await fields.getByLabel('Capacité (litres)').selectOption('80');
  const project=await page.evaluate(()=>studioOnePrototype.exportProject());await page.evaluate(p=>{if(!studioOnePrototype.restoreProject(p))throw Error('Heater restore failed');const item=studioOnePrototype.getState().items.find(i=>i.settings.model==='atlantic-lineo');studioOnePrototype.selectItem(item.id);studioOnePrototype.handleObjectTap({itemId:item.id,editTarget:'towel'});studioOnePrototype.setView('perspective',true);},project);
  await page.screenshot({path:path.join(out,kind+(mobile?'-mobile':'-desktop')+'-controls.png')});
  // The heater is procedural; external floor textures are intentionally blocked in this isolated fixture.
  await page.locator('#object-editor-close').click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:path.join(out,kind+(mobile?'-mobile':'-desktop')+'-perspective.png')});
  if(!mobile){await page.evaluate(()=>studioOnePrototype.setView('front',true));await page.screenshot({path:path.join(out,kind+'-front.png')});await page.evaluate(()=>studioOnePrototype.setView('side',true));await page.screenshot({path:path.join(out,kind+'-side.png')});}
  checks.push(kind+(mobile?' mobile':' desktop')+': native capacity controls, saved settings, complete rendered model and fitted camera');await context.close();currentPage=null;
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
})().catch(async e=>{if(currentPage)await currentPage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
