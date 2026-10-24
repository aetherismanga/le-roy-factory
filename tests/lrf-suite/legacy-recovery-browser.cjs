// Synthetic local storage only. Never reads a customer's browser or calls an account API.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'reports/lrf-suite/legacy-recovery');
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.txt':'text/plain'};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(error,body)=>{if(error){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(body);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.LRF_BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],origin='http://127.0.0.1:'+server.address().port;
 page.on('pageerror',error=>errors.push(error.message));await page.route(/^https:\/\//,route=>route.abort());
 try{
  const surface={collection:'elios-creta',color:'avena',format:'60x60',orientation:'horizontal',layout:'straight',groutWidth:2,groutColor:'#ded5c1'};
  const record={client:'Client synthétique',name:'Ancienne salle de bains',date:'2026-10-18T10:00:00Z',privateCode:'PRIVATE_TEST_ONLY',purchaseHT:987654,data:{version:2,items:[{id:'old-cabinet',kind:'cabinet',model:0,width:80,finish:'ROBLE',option:'bare',position:{x:0,y:40,z:0},open:false,sink:null,catalog:{purchaseHT:987654,token:'PRIVATE_TEST_ONLY'}}]},ambience:{room:{width:4.5,depth:4.5,height:2.6},floor:surface,wall:surface}};
  const key='lrf-studio-one-saved-projects-v2-fixture-compte';
  await page.goto(origin+'/robots.txt');await page.evaluate(({key,record})=>localStorage.setItem(key,JSON.stringify([record])),{key,record});
  const before=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));
  // This scenario verifies the wrapper's recovery notice, not the independent account bridges.
  await page.route('**/assets/js/*session-bridge.js*',route=>route.fulfill({contentType:'text/javascript',body:''}));
  await page.goto(origin+'/studio-one-configurateur.html');
  const recovery=page.getByRole('link',{name:'Récupérer mes anciens projets Studio One',exact:true});await recovery.waitFor();
  const bounds=await page.locator('#studio-one').evaluate(e=>({top:e.getBoundingClientRect().top,height:e.getBoundingClientRect().height,screen:innerHeight}));assert(bounds.top>0);assert(bounds.top+bounds.height<=bounds.screen+1);
  await page.getByRole('button',{name:'Masquer l’avis de récupération'}).click();assert(await page.locator('#legacy-recovery-notice').isHidden());
  await page.reload();await recovery.waitFor();await recovery.click();await page.getByRole('heading',{name:'Retrouver vos anciens projets Studio One'}).waitFor();await page.locator('.project').first().waitFor();
  assert.equal(await page.locator('.project').count(),1);assert.equal(new URL(page.url()).pathname,'/randal-studio-one-3d.html');
  const pending=page.waitForEvent('download');await page.locator('#download-all').click();const download=await pending;
  const archive=JSON.parse(fs.readFileSync(await download.path(),'utf8')),serialized=JSON.stringify(archive);
  assert.equal(archive.projects.length,1);assert.equal(archive.projects[0].record.data.items[0].width,80);assert.equal(archive.projects[0].record.ambience.room.width,4.5);
  assert(!serialized.includes('PRIVATE_TEST_ONLY'));assert(!serialized.includes('987654'));assert(!serialized.includes('fixture-compte'));
  await page.getByRole('button',{name:'Vérifier une conversion',exact:true}).click();
  const link=page.getByRole('link',{name:'Ouvrir cette copie dans le nouvel atelier',exact:true});await link.waitFor({timeout:45000});
  const href=await link.getAttribute('href'),project=JSON.parse(Buffer.from(new URL(href,origin).hash.slice('#projet='.length),'base64url').toString('utf8'));
  const {validateProject}=await import(pathToFileURL(path.join(root,'studio-one/src/projects.js')).href);validateProject(project);
  assert.equal(project.room.height,260);assert.deepEqual(project.room.points,[[0,0],[450,0],[450,450],[0,450]]);assert.equal(project.items[0].type,'cabinet');assert.equal(project.items[0].settings.width,80);
  assert.equal(project.client.name,'Client synthétique');assert.equal(project.legacyRecovery.sourceDate,record.date);
  assert(!JSON.stringify(project).includes('PRIVATE_TEST_ONLY'));assert(!JSON.stringify(project).includes('987654'));
  await page.getByText('Récupérer un fichier déjà téléchargé',{exact:true}).click();
  await page.locator('#recovery-file').setInputFiles({name:'archive.json',mimeType:'application/json',buffer:Buffer.from(serialized)});
  await page.waitForFunction(()=>document.querySelectorAll('.project').length===2);
  assert.equal(await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}})),before);
  assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,'recovery-mobile.png')});
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,archiveFiltered:true,originalStorageUnchanged:true,convertedProjectValidated:true,archiveCanBeReopened:true,errors},null,2));
  console.log('PASS legacy recovery UI: filtered backup, strict modern conversion, archive reimport and original storage unchanged');
 }catch(error){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
