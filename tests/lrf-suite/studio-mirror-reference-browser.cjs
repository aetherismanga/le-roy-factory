// Real built UI -> real commercial gateway -> real purchaseQuote. Only the
// upstream account and encrypted furniture grid are synthetic local fixtures.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),fsp=require('node:fs/promises');
const path=require('node:path'),http=require('node:http'),os=require('node:os');
const {pathToFileURL}=require('node:url'),{randomBytes,createCipheriv}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),dist=path.join(root,'studio-one/dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.hdr':'application/octet-stream'};
let browser,server,page,temp;const originalKey=process.env.LRF_PURCHASE_GRID_KEY,originalFetch=globalThis.fetch;
const errors=[],checks=[],requests=[];
function pass(message){checks.push(message);console.log('PASS',message);}
function asset(name){const file=path.resolve(dist,'.'+decodeURIComponent(name==='/'?'/index.html':name));return file.startsWith(dist+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?file:null;}
(async()=>{
 const {initialDraft,DRAFT_KEY}=await import(pathToFileURL(path.join(root,'studio-one/src/commerce/guided.js')).href);
 const draft={...initialDraft(),top:'tampa',column:true};
 temp=await fsp.mkdtemp(path.join(os.tmpdir(),'studio-mirror-browser-'));
 const app=path.join(temp,'studio-one');await fsp.mkdir(path.join(app,'server/data'),{recursive:true});await fsp.mkdir(path.join(app,'api'));
 await fsp.writeFile(path.join(temp,'package.json'),'{"type":"module"}');
 await fsp.symlink(path.join(root,'shared'),path.join(temp,'shared'),'dir');await fsp.symlink(path.join(root,'studio-one/src'),path.join(app,'src'),'dir');
 for(const file of ['server/purchase.js','api/commercial.js'])await fsp.copyFile(path.join(root,'studio-one',file),path.join(app,file));
 // These synthetic starting values reproduce the reported composition. No
 // real purchase grid, secret, account or upstream connection is used.
 const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('lrf-purchase-grid/v1/studio-one'));
 const prices={'13692 80@ROBLE':22000,'6228':7100,'14177 ROBLE':17700};
 const ciphertext=Buffer.concat([cipher.update(JSON.stringify({source:'Synthetic browser fixture',prices})),cipher.final()]);
 await fsp.writeFile(path.join(app,'server/data/studio-one-purchase.enc.json'),JSON.stringify({version:1,algorithm:'A256GCM',variant:'studio-one',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}));
 process.env.LRF_PURCHASE_GRID_KEY=key.toString('hex');
 globalThis.fetch=async url=>{assert(String(url).startsWith('https://us-central1-le-roy-factory.cloudfunctions.net/'));return {ok:true,json:async()=>({success:true,client:{id:'synthetic-customer',codeClient:'LRF-00317',departement:'99',societe:'Compte synthétique',partenaires:['randal-pro']}})};};
 const {default:handler}=await import(pathToFileURL(path.join(app,'api/commercial.js')).href);
 server=http.createServer((req,res)=>{const file=asset(new URL(req.url,'http://localhost').pathname);if(!file){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.LRF_BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await context.addInitScript(({draft,DRAFT_KEY})=>{if(sessionStorage.getItem('mirror-fixture-seeded'))return;sessionStorage.setItem('mirror-fixture-seeded','1');sessionStorage.setItem('studio-one-session','synthetic-session-abcdefghijklmnopqrstuvwxyz');localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));localStorage.setItem('studio-one-render-quality','fluid');},{draft,DRAFT_KEY});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin===origin&&url.pathname==='/api/commercial'){
   const body=route.request().postDataJSON();requests.push(body.action);
   let status=200,response;await handler({method:'POST',headers:{host:'fixture.vercel.app',authorization:'Bearer synthetic-session-abcdefghijklmnopqrstuvwxyz'},body},{setHeader(){},status(value){status=value;return this;},json(value){response=value;}});
   return route.fulfill({status,json:response});
  }
  const relative=url.hostname==='leroyfactory.fr'?url.pathname.replace(/^\/review-studio/,''):url.pathname;
  const local=url.origin===origin||['leroyfactory.fr','studio-one-beta-test-v2.vercel.app'].includes(url.hostname),file=local&&asset(relative);
  return file?route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'}):route.abort();
 });
 page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/index.html?view=configure&step=4',{waitUntil:'domcontentloaded'});
 const expectReference=async(code,total,selector='#estimate-account')=>{
  await page.waitForFunction(({selector,code})=>document.querySelector(selector+' .pro-reference')?.textContent===code,{selector,code});
  assert.equal(await page.locator(selector==='#estimate-account'?'#estimate-total':'#quote-total').innerText(),total);
  assert.doesNotMatch(await page.locator(selector).innerText(),/achat|HT/i);
 };
 await expectReference('LRF-00317-468.00.00','1 098,40 €');
 pass('without mirror: actual public total 1098.40 and synthetic encrypted grid reference 468.00');
 await page.locator('[data-choice="round"]').click();await page.locator('#mirrorFinish').selectOption('Doré');
 await expectReference('LRF-00317-549.00.00','1 292,80 €');
 assert.match(await page.locator('#estimate-lines').innerText(),/3722/);
 await page.waitForFunction(()=>document.querySelector('#preview-status')?.hidden===true,null,{timeout:30000});
 pass('round gold 60cm: reference 549.00, ref3722, unchanged public1292.80 and real WebGL preview');
 await page.locator('#mirrorFinish').selectOption('Bronze');await expectReference('LRF-00317-549.00.00','1 292,80 €');assert.match(await page.locator('#estimate-lines').innerText(),/3723/);
 await page.locator('[data-choice="metal-rect"]').click();await expectReference('LRF-00317-575.50.00','1 356,40 €');
 await page.locator('#mirrorSize').selectOption('1');await expectReference('LRF-00317-638.00.00','1 506,40 €');
 pass('frame finish and rectangular80/120cm changes reprice automatically to575.50/638.00');
 await page.locator('[data-choice="zen"]').click();await expectReference('LRF-00317-560.00.00','1 319,20 €');
 await page.locator('#mirrorSize').selectOption('3');await expectReference('LRF-00317-599.50.00','1 414,00 €');
 pass('LED60/120cm changes reprice to560.00/599.50 with unchanged public tariffs');
 await page.locator('[data-choice="none"]').click();await expectReference('LRF-00317-468.00.00','1 098,40 €');
 await page.locator('[data-choice="round"]').click();await page.locator('#mirrorFinish').selectOption('Doré');await expectReference('LRF-00317-549.00.00','1 292,80 €');
 await page.locator('#next').click();await expectReference('LRF-00317-549.00.00','1 292,80 €','#quote-private');
 await page.locator('#save-composition').click();const dialog=page.locator('#lrf-project-workspace');await dialog.locator('[name="title"]').fill('Miroir test sauvegardé');await dialog.locator('[name="name"]').fill('Chantier synthétique');await dialog.locator('button[type="submit"]').click();await dialog.waitFor({state:'hidden'});
 await page.reload({waitUntil:'domcontentloaded'});await expectReference('LRF-00317-549.00.00','1 292,80 €','#quote-private');
 await page.locator('#return-home').click();await page.locator('#saved-projects').click();await dialog.locator('.lrf-project-row').filter({hasText:'Miroir test sauvegardé'}).getByRole('button',{name:'Ouvrir',exact:true}).click();
 await expectReference('LRF-00317-549.00.00','1 292,80 €','#quote-private');
 assert.match(await page.locator('#quote-lines').innerText(),/3722/);
 const stored=await page.evaluate(()=>localStorage.getItem('studio-one-projects'));assert(!stored.includes('549.00.00'));assert(!stored.includes('proHT'));assert(!stored.includes('privateCode'));
 pass('remove/add, recap, save, reload and My projects reopen recalculate exact reference without persisting private amount');
 assert.deepEqual(errors,[]);assert(requests.includes('quote'));console.log(JSON.stringify({passed:true,checks,apiRequests:requests.length,errors}));
 await context.close();
})().catch(async error=>{if(page){console.error(await page.evaluate(()=>({url:location.href,text:document.querySelector('#estimate-account')?.innerText,quote:document.querySelector('#quote-private')?.innerText,preview:document.querySelector('#preview-status')?.dataset.reason})).catch(()=>null));await page.screenshot({path:path.join(os.tmpdir(),'studio-mirror-reference-failure.png'),fullPage:true}).catch(()=>{});}console.error(error);process.exitCode=1;}).finally(async()=>{
 if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
 if(originalKey===undefined)delete process.env.LRF_PURCHASE_GRID_KEY;else process.env.LRF_PURCHASE_GRID_KEY=originalKey;globalThis.fetch=originalFetch;
 if(temp)await fsp.rm(temp,{recursive:true,force:true});
});
