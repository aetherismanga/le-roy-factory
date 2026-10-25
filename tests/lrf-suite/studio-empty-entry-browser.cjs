// Synthetic projects and local static routes only; no real account or production writes.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),dist=path.join(root,'studio-one/dist'),appHost='studio-one-beta-test-v2.vercel.app';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.hdr':'application/octet-stream'};
const unauthorized=JSON.stringify({client:null,error:'Compte non connecté'});
(async()=>{
 const {initialDraft,draftProject}=await import(pathToFileURL(path.join(root,'studio-one/src/commerce/guided.js'))),previous=draftProject({...initialDraft(),top:'plain'});previous.title='Projet précédent conservé';
 // The chooser and wrapper are the real site sources. The embedded atelier is
 // the real built application, served under its normal HTTPS origin by routing.
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){res.writeHead(401,{'Content-Type':'application/json'});return res.end(unauthorized);}
  const siteFile=['/configurateurs-randal.html','/studio-one-configurateur.html'].includes(url.pathname)||url.pathname.startsWith('/assets/js/'),base=siteFile?root:dist;
  const file=path.resolve(base,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.LRF_BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.addInitScript(previous=>{
   if(sessionStorage.getItem('qa-seeded'))return;sessionStorage.setItem('qa-seeded','1');
   localStorage.setItem('studio-one-render-quality','fluid');localStorage.setItem('studio-one-current-project',JSON.stringify(previous));localStorage.setItem('studio-one-active-project-id-v2','prior-id');
   localStorage.setItem('studio-one-projects',JSON.stringify([{id:'prior-id',kind:'bathroom',title:previous.title,status:'draft',data:previous}]));
  },previous);
  await context.route(/^https:\/\//,route=>{
   const url=new URL(route.request().url());
   if(url.hostname===appHost&&url.pathname.startsWith('/api/'))return route.fulfill({status:401,contentType:'application/json',body:unauthorized});
   const local=url.hostname===appHost||url.hostname==='leroyfactory.fr'&&url.pathname.startsWith('/review-studio/assets/');
   if(local){const name=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname.replace(/^\/review-studio/,'')),file=path.resolve(dist,'.'+name);if(file.startsWith(dist+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file,contentType:mime[path.extname(file)]});}
   return route.abort();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/configurateurs-randal.html');await page.locator('a[href="studio-one-configurateur.html"]').click();
  await page.frameLocator('#studio-one').locator('#landing').waitFor({state:'visible'});
  let app=page.frames().find(frame=>frame.url().startsWith('https://'+appHost+'/'));
  assert(app,'The real wrapper embeds Studio One');assert.equal(new URL(app.url()).pathname,'/index.html','Plain chooser entry opens the welcome page');
  for(const id of ['new-project','resume-project','saved-projects','direct-atelier'])assert(await app.locator('#'+id).isVisible(),'Welcome action is visible: '+id);
  assert.equal(await app.evaluate(()=>window.studioOnePrototype===undefined),true,'The welcome page does not automatically open a previous 3D scene');
  assert.equal(await app.evaluate(()=>JSON.parse(localStorage.getItem('studio-one-current-project')).title),previous.title);
  await app.locator('#direct-atelier').click();
  await app.waitForFunction(()=>window.studioOnePrototype?.getState().ready,null,{timeout:45000}).catch(async error=>{console.error(await app.evaluate(()=>({url:location.href,loading:document.querySelector('#loading')?.textContent,error:document.querySelector('#error-text')?.textContent})),errors);throw error;});
  assert.equal(new URL(app.url()).pathname,'/atelier.html');assert.equal(new URL(app.url()).searchParams.has('resume'),false);
  assert.equal(await app.evaluate(()=>studioOnePrototype.exportProject().items.length),0,'Open workshop starts with an empty room');
  await app.waitForTimeout(500);
  assert.equal(await app.evaluate(()=>JSON.parse(localStorage.getItem('studio-one-projects')).find(project=>project.id==='prior-id').data.items.length),previous.items.length,'Entering the empty workshop preserves saved projects');
  await app.goto('https://'+appHost+'/index.html');await app.locator('#resume-project').click();
  await app.waitForFunction(()=>location.pathname==='/atelier.html'&&window.studioOnePrototype?.getState().ready&&studioOnePrototype.exportProject().title==='Projet précédent conservé',null,{timeout:45000});
  assert.equal(await app.evaluate(()=>studioOnePrototype.exportProject().items.length),previous.items.length);assert.equal(await app.evaluate(()=>studioOnePrototype.exportProject().title),previous.title);
  // Returning through the chooser remains a welcome page after explicit Resume.
  await page.goto(origin+'/configurateurs-randal.html');await page.locator('a[href="studio-one-configurateur.html"]').click();await page.frameLocator('#studio-one').locator('#landing').waitFor({state:'visible'});
  app=page.frames().find(frame=>frame.url().startsWith('https://'+appHost+'/'));
  for(const id of ['new-project','resume-project','saved-projects','direct-atelier'])assert(await app.locator('#'+id).isVisible());
  await app.locator('#saved-projects').click();await app.locator('#lrf-project-workspace[open]').waitFor();assert(await app.locator('.lrf-project-row').filter({hasText:previous.title}).count());await app.locator('#lrf-project-workspace .lrf-project-close').click();
  await app.locator('#new-project').click();await app.locator('#wizard-panel').waitFor({state:'visible'});assert(await app.locator('#wizard-panel').isVisible(),'New project opens the existing guided configuration');
  assert.deepEqual(errors,[]);console.log('PASS '+width+'px: chooser → welcome with four actions; direct workshop empty; saved project intact; explicit Resume restores composition; New and My projects remain usable');await context.close();
 }}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
