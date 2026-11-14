// Read-only browser checks. Run against the dedicated Android emulator CDP port.
const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const output = path.resolve(__dirname, '../release-output/qa');
const pages = [
 ['accueil','/'], ['particuliers','/carrelage-particuliers.html'],
 ['professionnels','/carrelage-professionnels.html'], ['acces-pro','/tarifs-pro.html'],
 ['agent','/agent.html'], ['crm-protege','/dashboard.html'],
 ['catalogues','/catalogues.html'], ['configurateurs','/configurateurs.html'],
 ['studio-one','/studio-one-configurateur.html'], ['plan-pose','/lrf-plan-pose.html'],
 ['anima','/neobath-anima-configurateur.html'], ['commande','/commande-bilt.html'],
 ['confidentialite','/politique-confidentialite.html']
];
(async () => {
 await fs.mkdir(output,{recursive:true});
 const browser = await chromium.connectOverCDP(process.env.LRF_CDP_URL || 'http://127.0.0.1:9226');
 const context = browser.contexts()[0];
 let blockedMutations = 0;
 await context.route('**/*', route => {
   if (!['GET','HEAD','OPTIONS'].includes(route.request().method())) { blockedMutations++; return route.abort(); }
   if (/initializeTariffStorage|sendMail|createOrder|deleteAccount/i.test(route.request().url())) return route.abort();
   return route.continue();
 });
 const page = context.pages().find(p=>p.url().startsWith('https://leroyfactory.fr')) || await context.newPage();
 const results=[];
 for (const [name,pathname] of pages) {
   const consoleErrors=[]; const onError=e=>consoleErrors.push(e.message.slice(0,200));
   page.on('pageerror',onError);
   const start=Date.now();
   try {
     const response=await page.goto('https://leroyfactory.fr'+pathname,{waitUntil:'domcontentloaded',timeout:45000});
     await page.waitForTimeout(2500);
     const metrics=await page.evaluate(()=>{
       const navigation=performance.getEntriesByType('navigation')[0];
       const logo=[...document.images].find(i=>i.src.includes('logo03lrf.png'));
       const box=logo?.getBoundingClientRect();
       const gl=document.createElement('canvas').getContext('webgl2');
       return {url:location.origin+location.pathname,title:document.title,width:innerWidth,documentWidth:document.documentElement.scrollWidth,
        horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,
        logo:logo?{loaded:logo.complete&&logo.naturalWidth>0,x:Math.round(box.x),y:Math.round(box.y),width:Math.round(box.width),height:Math.round(box.height)}:null,
        navigationMs:Math.round(navigation?.domContentLoadedEventEnd||0),resources:performance.getEntriesByType('resource').length,
        webgl2:!!gl,bodyExcerpt:document.body.innerText.slice(0,1000),
        passwordFields:document.querySelectorAll('input[type=password]').length};
     });
     const screenshot=path.join(output,name+'.png'); await page.screenshot({path:screenshot});
     results.push({name,status:response?.status(),elapsedMs:Date.now()-start,...metrics,pageErrors:consoleErrors});
   } catch(e){results.push({name,error:e.message.slice(0,300)});}
   page.off('pageerror',onError);
   console.log(JSON.stringify(results.at(-1)));
 }
 await context.unrouteAll({behavior:'wait'});
 await fs.writeFile(path.join(output,'public-android.json'),JSON.stringify({checkedAt:new Date().toISOString(),scope:'Anonymous Chrome Android; writes blocked. No account login or business submission.',blockedMutations,results},null,2));
 await browser.close();
 if(results.some(r=>r.error||r.status!==200||r.horizontalOverflow||r.pageErrors?.length)) process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
