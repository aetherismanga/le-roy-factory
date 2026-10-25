#!/usr/bin/env node
/* Direct top-level viewport QA. Fictional local preview only; official CDN libraries cached locally. */
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
let playwright;
try { playwright=require(process.env.LRF_PLAYWRIGHT_MODULE||'playwright'); }
catch(error) { try { playwright=require('@playwright/test'); } catch { throw new Error('Playwright 1.55 requis : npm install puis npx playwright install chromium, ou LRF_PLAYWRIGHT_MODULE pour un module existant.'); } }
const {chromium}=playwright;
const root=path.resolve(__dirname,'../..'),preview=path.join(root,'crm-preview'),out=path.join(root,'reports/crm-v2'),captures=path.join(out,'captures');
const browserPath=process.env.CHROMIUM_EXECUTABLE||undefined;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const widths=[{width:320,height:568},{width:360,height:800},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1366,height:900}];
const report={mode:'direct-top-level-local-fictional-only',engine:'Chromium 140 / Playwright 1.55',started:new Date().toISOString(),checks:[],failures:[],screenshots:[],externalRequests:[],pageErrors:[],limitations:['Viewport emulation, not physical Android/iPhone or Safari.','No production authentication, Firestore or mail service contacted. The BFM audio endpoint is requested only after the explicit radio-click scenario.','Actual official Leaflet/FullCalendar code served from local CDN caches; map tiles blocked in this controlled browser.']};
function check(name,pass,details){report.checks.push({name,pass,details});if(!pass){report.failures.push({name,details});console.log('FAIL '+name,JSON.stringify(details));}}
let browser,server;
async function screenshot(page,name){const file=path.join(captures,name);await page.screenshot({path:file,fullPage:false});report.screenshots.push(path.relative(root,file));}
async function configure(context){
 await context.addInitScript(()=>{window.__qaMediaPlayCalls=0;const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){window.__qaMediaPlayCalls++;return play.apply(this,args)};});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.hostname==='127.0.0.1')return route.continue();
  report.externalRequests.push({url:url.origin+url.pathname,type:route.request().resourceType(),method:route.request().method()});
  const library=url.pathname.endsWith('/leaflet.js')?'leaflet.js':url.pathname.endsWith('/leaflet.css')?'leaflet.css':url.pathname.endsWith('/fullcalendar@6.1.10/index.global.min.js')?'fullcalendar.js':null;
  const cached=library&&process.env.LRF_CDN_CACHE?path.join(process.env.LRF_CDN_CACHE,library):null;
  if(cached){try{return await route.fulfill({status:200,contentType:cached.endsWith('.css')?'text/css':'text/javascript',body:await fs.readFile(cached)});}catch{}}
  if(library&&route.request().method()==='GET')return route.continue();
  return route.abort('blockedbyclient');
 });
 context.on('page',page=>page.on('pageerror',error=>report.pageErrors.push({url:page.url(),error:error.message})));
}
async function settle(page){await page.waitForSelector('body.crm-v2',{timeout:5000});await page.waitForTimeout(450);const close=page.locator('.lrf-daily-close');if(await close.count())await close.click({timeout:1000}).catch(()=>{});await page.waitForTimeout(250);}
async function measure(page){return page.evaluate(()=>{
 const rect=selector=>{const e=document.querySelector(selector);if(!e)return null;const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right,visible:b.width>0&&b.height>0,loaded:e instanceof HTMLImageElement?e.complete&&e.naturalWidth>0:undefined,alt:e.alt,src:e.getAttribute('src')}};
 const nav=rect('.crm-v2-bottom-nav'),content=rect('main');
 return{viewport:{width:innerWidth,height:innerHeight},scrollWidth:document.documentElement.scrollWidth,header:rect('.crm-v2-appbar'),logo:rect('.crm-v2-app-logo'),portrait:rect('#lrf-agent-avatar'),nav,bodyPadding:parseFloat(getComputedStyle(document.body).paddingBottom),main:content,headingColor:document.querySelector('main h1')?getComputedStyle(document.querySelector('main h1')).color:null,audio:[...document.querySelectorAll('audio')].map(a=>({paused:a.paused,src:a.getAttribute('src'),autoplay:a.autoplay})),playCalls:window.__qaMediaPlayCalls};
 });}
async function matrix(origin,pages,size){
 const context=await browser.newContext({viewport:size,deviceScaleFactor:1,isMobile:size.width<901,hasTouch:size.width<901,serviceWorkers:'block'});await configure(context);
 const page=await context.newPage();page.setDefaultTimeout(5000);
 for(const file of pages){
  try{
   await page.goto(origin+'/'+file,{waitUntil:'domcontentloaded',timeout:15000});await settle(page);const metrics=await measure(page);
   check(`${size.width}×${size.height} ${file} no page overflow`,metrics.scrollWidth<=size.width+1,metrics);
   if(size.width<=900){check(`${size.width} ${file} header 61 / logo 40`,metrics.header?.height===61&&metrics.logo?.width===40&&metrics.logo?.height===40,metrics);check(`${size.width} ${file} thumb navigation`,metrics.nav?.visible&&metrics.nav.bottom<=size.height+1&&metrics.bodyPadding>=metrics.nav.height,{nav:metrics.nav,padding:metrics.bodyPadding});}
   check(`${size.width} ${file} portrait authenticated and loaded`,metrics.portrait?.loaded&&metrics.portrait?.alt==='Photo de Jérôme',metrics.portrait);
   check(`${size.width} ${file} heading is visible`,metrics.headingColor!==null&&!['rgb(255, 255, 255)','rgba(0, 0, 0, 0)'].includes(metrics.headingColor),metrics.headingColor);
   check(`${size.width} ${file} no autoplay`,metrics.playCalls===0&&metrics.audio.every(a=>a.paused&&!a.autoplay&&!a.src),{playCalls:metrics.playCalls,audio:metrics.audio});
   if(size.width===390)await screenshot(page,file.replace('.html','')+'-390-vivant.png');
   if(file==='dashboard.html'&&size.width===1366)await screenshot(page,'accueil-pc-vivant.png');
  }catch(error){check(`${size.width} ${file} loading`,false,String(error));}
 }
 await context.close();
}
async function journeys(origin){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});await configure(context);const page=await context.newPage();page.setDefaultTimeout(5000);
 await page.goto(origin+'/dashboard.html',{waitUntil:'domcontentloaded'});await settle(page);await screenshot(page,'accueil-mobile390-vivant.png');
 await page.getByRole('button',{name:'Ouvrir le menu',exact:true}).click();check('mobile menu opens',await page.locator('body').evaluate(e=>e.classList.contains('crm-v2-menu-open')));await screenshot(page,'menu-mobile-vivant.png');await page.locator('.crm-v2-drawer-close').click();
 await page.locator('#lrf-radio-btn').click();check('profile opens radio panel',await page.locator('#lrf-radio-panel').isVisible());await screenshot(page,'radio-mobile-vivant.png');await page.locator('.lrf-radio-close').click();check('radio closes immediately',!await page.locator('#lrf-radio-panel').isVisible());check('profile interaction never autoplay',await page.evaluate(()=>window.__qaMediaPlayCalls===0));
 await page.locator('#crm-preview-actor').selectOption('coryne');await page.waitForLoadState('domcontentloaded');await settle(page);const actor=await page.locator('#lrf-agent-avatar').evaluate(img=>({alt:img.alt,src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0}));check('Coryne actor changes authenticated portrait',actor.alt==='Photo de Coryne'&&actor.src.includes('corynelogo')&&actor.loaded,actor);await screenshot(page,'accueil-coryne-vivant.png');
 await page.goto(origin+'/clients.html',{waitUntil:'domcontentloaded'});await settle(page);check('Coryne portrait retained across rubrics',(await page.locator('#lrf-agent-avatar').getAttribute('alt'))==='Photo de Coryne');await screenshot(page,'clients-mobile-vivant.png');
 await page.locator('#clients-table-body tr[data-client-id]').first().locator('.btn-edit-row').click();await page.waitForTimeout(200);await page.locator('.lrf-tab[data-tab="partners"]').click();await page.waitForTimeout(200);
 const panels=await page.locator('#client-modal').evaluate(modal=>({infos:getComputedStyle(modal.querySelector('.modal-grid-edit')).display,partners:[...modal.querySelectorAll('[data-lrf-pane="partners"]')].map(e=>getComputedStyle(e).display),width:modal.scrollWidth,viewport:innerWidth}));check('partner tab paints only partner panels',panels.infos==='none'&&panels.partners.some(x=>x!=='none')&&panels.width<=panels.viewport+1,panels);await screenshot(page,'fiche-partenaires-vivant.png');await page.locator('#btn-close-modal').click();
 await page.goto(origin+'/carte.html',{waitUntil:'domcontentloaded'});await settle(page);await page.waitForFunction(()=>window.__lrfCarteVisiblePoints?.length>0,{timeout:5000});const count=await page.evaluate(()=>window.__lrfCarteVisiblePoints.length);check('real Leaflet map shows six fictional markers',count===6,count);await page.locator('#dept-select').selectOption('34');check('department filter gives two actual markers',await page.evaluate(()=>window.__lrfCarteVisiblePoints.length===2));await page.locator('#partner-select').selectOption('elios-ceramica');check('manufacturer filter combines with department',await page.evaluate(()=>window.__lrfCarteVisiblePoints.length===2));await screenshot(page,'carte-mobile-vivant.png');
 await page.goto(origin+'/tournees.html',{waitUntil:'domcontentloaded'});await settle(page);const savedTour=page.locator('#tour-saved-list .tour-saved-item[data-tour-id="demo-tour-1"]');const savedTourText=await savedTour.innerText();check('tour page loads its existing fictional itinerary',await savedTour.count()===1&&savedTourText.includes('2 visite(s)')&&savedTourText.includes('77,0 km'),savedTourText);await savedTour.locator('.tour-open-btn').click();await page.waitForTimeout(200);check('saved fictional tour opens its two exact client stops',await page.locator('#tour-route .route-stop-v5[data-client-id]').count()===2,await page.locator('#tour-summary').innerText());await screenshot(page,'tournees-mobile-vivant.png');
 await page.goto(origin+'/dashboard.html',{waitUntil:'domcontentloaded'});await settle(page);await page.locator('#lrf-radio-btn').click();
 let streamFailure='';await page.route('https://audio.bfmtv.com/**',route=>route.continue());
 page.on('requestfailed',request=>{if(request.url().startsWith('https://audio.bfmtv.com/'))streamFailure=request.failure()?.errorText||'network unavailable'});
 await page.locator('[data-radio-play=\"bfm-business\"]').click();await page.waitForTimeout(3500);
 const stream=await page.locator('audio').evaluate(audio=>({source:audio.src,readyState:audio.readyState,paused:audio.paused,error:audio.error?.message||null}));
 check('radio user click explicitly loads BFM source',stream.source.startsWith('https://audio.bfmtv.com/'),stream);
 report.radioUserClick={...stream,networkFailure:streamFailure,livePlaybackConfirmed:stream.readyState>=2&&!stream.paused};
 if(!report.radioUserClick.livePlaybackConfirmed)report.limitations.push('BFM playback was explicitly requested; this browser could not confirm live audio: '+(streamFailure||stream.error||'stream not ready'));
 await context.close();
}
(async()=>{await fs.mkdir(captures,{recursive:true});const manifest=JSON.parse(await fs.readFile(path.join(preview,'preview-manifest.json'),'utf8'));server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://test'),file=path.resolve(preview,'.'+u.pathname);if(!file.startsWith(preview+path.sep)){res.writeHead(403);return res.end();}try{const body=await fs.readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({executablePath:browserPath,headless:true,args:['--no-sandbox']});
 try{let next=0;await Promise.all(Array.from({length:3},async()=>{while(next<widths.length){const size=widths[next++];await matrix(origin,manifest.pages,size);}}));await journeys(origin);check('no Firestore or mail service browser requests',!report.externalRequests.some(r=>/firestore|cloudfunctions|identitytoolkit|securetoken|sendgrid|mailgun/i.test(r.url)),report.externalRequests.filter(r=>/firestore|cloudfunctions|identitytoolkit|securetoken|sendgrid|mailgun/i.test(r.url)));check('no unhandled page exceptions',report.pageErrors.length===0,report.pageErrors);}catch(error){check('browser journey completion',false,String(error));}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));report.finished=new Date().toISOString();report.passed=report.checks.filter(c=>c.pass).length;report.failed=report.failures.length;await fs.writeFile(path.join(out,'vivant-browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,screenshots:report.screenshots.length,pageErrors:report.pageErrors.length,report:path.join(out,'vivant-browser-results.json')},null,2));process.exitCode=report.failed?1:0;}
})().catch(error=>{console.error(error);process.exitCode=1;server?.close();});
