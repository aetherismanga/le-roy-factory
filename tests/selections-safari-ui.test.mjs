import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {webkit,chromium,devices,expect} from '@playwright/test';

const root=fileURLToPath(new URL('../',import.meta.url));
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVZkAAAAASUVORK5CYII=','base64');

// Execute the complete selection page and its dynamic loaders. Only external
// services and media are stubbed; CSS, DOM and all local observers remain real.
// Disable the offline worker so network fixtures also handle dynamic PDF loads.
for(const [name,type,device] of [
  ['Mac WebKit',webkit,devices['Desktop Safari']],
  ['iPhone WebKit',webkit,devices['iPhone 13']],
  ['Android Chromium',chromium,devices['Pixel 5']]
]){
  test(name+' keeps universes usable and catalogue observers idle',{timeout:90000},async()=>{
    const server=createServer((req,res)=>{
      const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
      if(!file.startsWith(root)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end();return;}
      res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'})[extname(file)]||'application/octet-stream');
      res.end(readFileSync(file));
    });
    await new Promise(done=>server.listen(0,'127.0.0.1',done));
    const base='http://127.0.0.1:'+server.address().port;
    const browser=await type.launch({headless:true,...(type===webkit&&process.env.LRF_WEBKIT_EXECUTABLE?{executablePath:process.env.LRF_WEBKIT_EXECUTABLE}:{}),args:type===chromium?['--no-sandbox']:[]});
    try{
      const context=await browser.newContext({...device,locale:'fr-FR',serviceWorkers:'block'});
      let pdfRequests=0;
      await context.addInitScript(()=>{
        window.selectionObserverCalls=0;
        const Observer=window.MutationObserver;
        window.MutationObserver=class extends Observer{
          constructor(callback){super((records,observer)=>{window.selectionObserverCalls++;callback(records,observer);});}
        };
      });
      await context.route('**/*',route=>{
        const request=route.request(),url=new URL(request.url());
        if(url.pathname.endsWith('/pdf.min.js')){
          pdfRequests++;
          return route.abort('failed');
        }
        if(url.origin===base)return route.continue();
        if(url.pathname.endsWith('/inspirations/mosaique.webp'))return route.abort('failed');
        if(request.resourceType()==='image')return route.fulfill({contentType:'image/png',body:image});
        if(url.pathname.endsWith('/firebase-app.js'))return route.fulfill({contentType:'text/javascript',body:'export const getApps=()=>[];export const getApp=()=>({});export const initializeApp=()=>({});'});
        if(url.pathname.endsWith('/firebase-auth.js'))return route.fulfill({contentType:'text/javascript',body:'export const getAuth=()=>({currentUser:null});export const onAuthStateChanged=(a,f)=>{f(null);return ()=>{}};export const onIdTokenChanged=(a,f)=>{f(null);return ()=>{}};'});
        if(request.resourceType()==='script')return route.fulfill({contentType:'text/javascript',body:''});
        return route.fulfill({contentType:'application/json',body:'{}'});
      });
      const page=await context.newPage();page.setDefaultTimeout(10000);
      await page.goto(base+'/univers.html',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.getElementById('lrf-aquahome-selection-loader')&&document.getElementById('lrf-reitano-selection-loader'));
      await page.waitForTimeout(4000);
      const universes=await page.locator('.category-card').count();
      assert(universes>=8);
      // Old Safari keeps usable heights. Artwork already contains its label;
      // only the deliberately failed mosaic image needs an HTML title.
      await page.addStyleTag({content:'.category-card{aspect-ratio:auto!important}'});
      for(const card of await page.locator('.category-card').all()){
        assert((await card.boundingBox()).height>=72);
        assert((await card.getAttribute('aria-label'))?.trim(), 'Every universe keeps an accessible name');
        if(await card.getAttribute('data-cat')==='mosaique'){
          await expect(card.locator('.category-name')).toBeVisible();
        }else{
          await expect(card.locator('.category-name')).toBeHidden();
        }
      }
      const idle=async()=>{
        await page.waitForTimeout(300);
        const before=await page.evaluate(()=>window.selectionObserverCalls);
        await page.waitForTimeout(500);
        const calls=await page.evaluate(()=>window.selectionObserverCalls)-before;
        assert(calls<100,'Observer storm while idle: '+calls+' callbacks in 500ms');
        return calls;
      };
      const initial=await idle();
      assert.equal(pdfRequests,0,'Offscreen pool cards must not load the PDF renderer');
      const choose=async brand=>{
        if(device.isMobile)await page.locator('#mobile-partner-trigger').click();
        await page.locator(`[data-partner="${brand}"]`).click();
      };
      // Repeat the trip to catch stale render signatures when returning to a space.
      for(let trip=0;trip<2;trip++){
        await page.locator('[data-cat="robinetterie"]').click();
        await choose('Aquahome');
        await expect(page.locator('.aquahome-space')).toBeVisible();
        await idle();
        await choose('Reitano Rubinetterie');
        await expect(page.locator('.reitano-space')).toBeVisible();
        await idle();
        await page.locator('[data-cat="carrelage"]').click();
        await expect(page.locator('#workspace-title')).toHaveText('Elios Ceramica');
        await expect(page.locator('#partner-products .product-card-v2').first()).toBeVisible();
        await idle();
      }
      const pool=page.locator('[data-id^="elios-pool-"]').first();
      if(await pool.count()){
        await pool.scrollIntoViewIfNeeded();
        await idle();
        await expect(pool.locator('img')).toHaveAttribute('data-pool-hydrated','error');
        assert.equal(pdfRequests,1,'A missing PDF renderer must not cause repeated loads');
        await idle();
      }
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      assert(overflow<=2,'Horizontal page overflow: '+overflow);
      console.log(JSON.stringify({browser:name,universes,initialIdleCallbacks:initial,roundTrips:2}));
    }finally{
      await browser.close();server.closeAllConnections();await new Promise(done=>server.close(done));
    }
  });
}
