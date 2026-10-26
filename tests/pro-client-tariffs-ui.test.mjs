import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit,devices,expect} from '@playwright/test';
import {fixture,localServices} from './fixtures/pro-client-session.mjs';

// Browser integration against local legitimate test accounts. Production HTML,
// styles, data, modal consumers, PRO bridge and tariff bridge are executed.
// Only unrelated scripts/media and the absent Firebase agent SDK are stubbed.
const root=fileURLToPath(new URL('../',import.meta.url));
const scripts=['pro-session-bridge.js','inspirations-elios-data.js','inspirations-elios-thickness-overrides.js','inspirations-elios-pricing.js','inspirations-view-data.js','inspirations-v2.js','inspirations-view-mobile-safe.js','agent-tariffs.js'];
const html=readFileSync(resolve(root,'univers.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>',scripts.map(file=>`<script ${file==='agent-tariffs.js'?'type="module"':'defer'} src="assets/js/${file}"></script>`).join('')+'</body>');
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVZkAAAAASUVORK5CYII=','base64');
const grid={...fixture,elios:{'azulimood|5x15|standard':{amount:12.34,label:'12,34 € net/m² (TEST)'},'azulimood|10x10|standard':{amount:56.78,label:'56,78 € net/m² (TEST)'}},view:[{productId:'view-lux',variantKey:'lux-20x120-nat',proDetail:23.45}]};

async function harness(browser,device){
  const services=localServices(['ELIOS CERAMICA','VIEW CERAMICA'],grid);
  const server=createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/test/login'||pathname==='/test/logout'){
      const parts=[];for await(const part of req)parts.push(part);const body=JSON.parse(Buffer.concat(parts).toString()||'{}');
      const result=pathname.endsWith('login')?await services.login(body):await services.call(services.sessions.revokeProSession,body);
      res.writeHead(result.statusCode,{'Content-Type':'application/json'});res.end(JSON.stringify(result.body));return;
    }
    if(pathname==='/univers.html'||pathname==='/univers-ios.html'){res.setHeader('Content-Type','text/html');res.end(html);return;}
    const path=resolve(root,'.'+pathname);
    if(!path.startsWith(root)||!existsSync(path)){res.writeHead(404);res.end();return;}
    if(extname(path)==='.js'&&!scripts.some(file=>path.endsWith('/'+file))){res.setHeader('Content-Type','text/javascript');res.end('');return;}
    res.setHeader('Content-Type',extname(path)==='.js'?'text/javascript':extname(path)==='.css'?'text/css':'application/octet-stream');res.end(readFileSync(path));
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));const base='http://127.0.0.1:'+server.address().port;
  const context=await browser.newContext({...device,locale:'fr-FR'});
  await context.addInitScript(()=>{window.pdfjsLib={getDocument:()=>({promise:Promise.resolve({getPage:async()=>({getViewport:()=>({width:20,height:20}),render:()=>({promise:Promise.resolve()})})})})};});
  let requests=0;const errors=[];
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin===base)return route.continue();
    if(url.href.includes('/firebase-app.js'))return route.fulfill({contentType:'text/javascript',body:'export const getApps=()=>[];export const getApp=()=>({});export const initializeApp=()=>({});'});
    if(url.href.includes('/firebase-auth.js'))return route.fulfill({contentType:'text/javascript',body:'export const getAuth=()=>({currentUser:null});export const onAuthStateChanged=(a,f)=>{f(null);return ()=>{}};export const onIdTokenChanged=(a,f)=>{f(null);return ()=>{}};'});
    if(url.pathname==='/api/agent-tariffs'){
      if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':base,'Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'}});
      requests++;const body=request.postDataJSON(),result=await services.bootstrap(body.sessionToken,body);
      return route.fulfill({status:result.statusCode,headers:{...result.headers,'Access-Control-Allow-Origin':base,'Content-Type':'application/json'},body:JSON.stringify(result.body)});
    }
    if(request.resourceType()==='image')return route.fulfill({contentType:'image/png',body:image});
    if(request.resourceType()==='script')return route.fulfill({contentType:'text/javascript',body:''});
    return route.abort();
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/univers.html',{waitUntil:'domcontentloaded'});
  try{await page.waitForFunction(()=>window.LRF_PRO_SESSION&&window.LRF_AGENT_TARIFFS&&document.querySelector('[data-id="elios-azuli-mood"]'));}catch(error){console.log(errors,await page.evaluate(()=>({session:!!window.LRF_PRO_SESSION,tariffs:!!window.LRF_AGENT_TARIFFS,elios:window.ELIOS_CATALOGUE?.length,body:document.querySelector('#partner-products')?.innerHTML?.slice(0,300),scripts:[...document.scripts].map(x=>x.src)})));await context.close();server.closeAllConnections();server.close();throw error;}
  const login=async()=>{
    await page.evaluate(async()=>{
      const response=await fetch('/test/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({codeClient:'LRF-99998',departement:'34'})});
      const data=await response.json();if(!response.ok||!data.success)throw Error('Local test login failed');
      window.LRF_PRO_SESSION.write({...data.client,sessionToken:data.sessionToken});
    });
    await page.waitForFunction(()=>window.LRF_AGENT_TARIFFS.canAccess('elios'));
  };
  const logout=async()=>page.evaluate(async()=>{
    const token=window.LRF_PRO_SESSION.read().sessionToken;
    window.LRF_PRO_SESSION.clear({forgetDevice:true});
    await fetch('/test/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionToken:token})});
  });
  const choosePartner=async name=>{
    if(device?.isMobile)await page.locator('#mobile-partner-trigger').click();
    await page.locator(`[data-partner="${name}"]`).click();
    await expect(page.locator('#workspace-title')).toHaveText(name);
  };
  return {page,services,login,logout,choosePartner,errors,get requests(){return requests;},async close(){await context.close();await new Promise(done=>server.close(done));}};
}

for(const [name,type,device] of [['PC Chromium',chromium,devices['Desktop Chrome']],['Android Chromium',chromium,devices['Pixel 5']],['iPhone WebKit',webkit,devices['iPhone 13']]]){
  test(name+' renders authorized format prices and clears them on logout',{timeout:90000},async()=>{
    const browser=await type.launch({headless:true,timeout:15000,...(type===webkit&&process.env.LRF_WEBKIT_EXECUTABLE?{executablePath:process.env.LRF_WEBKIT_EXECUTABLE}:{}),args:type===chromium?['--no-sandbox']:[]});let h;
    try{
      h=await harness(browser,device);const {page}=h;
      await page.locator('[data-id="elios-azuli-mood"]').click();
      await expect(page.locator('.formats-table')).not.toContainText('12,34');
      await page.locator('.modal-v2-close').click();await h.login();
      await page.locator('[data-id="elios-azuli-mood"]').click();
      const rows=page.locator('.formats-table tbody tr');
      await expect(rows.filter({hasText:'5x15'})).toContainText('12,34 €');
      await expect(rows.filter({hasText:'10x10'})).toContainText('56,78 €');
      await h.logout();await expect(page.locator('.formats-table')).not.toContainText('12,34');await expect(page.locator('.formats-table')).not.toContainText('56,78');
      await page.locator('.modal-v2-close').click();await h.login();
      await page.locator('[data-id="elios-azuli-mood"]').click();await expect(page.locator('.formats-table')).toContainText('12,34');
      await page.locator('.modal-v2-close').click();await h.choosePartner('View Ceramica');
      await page.locator('[data-view-safe-id="view-lux"]').click();
      await expect(page.locator('.view-safe-table')).toContainText('23,45 €');
      await h.logout();await expect(page.locator('#product-modal-v2')).not.toHaveClass(/open/);
      h.services.setPartners(['ELIOS CERAMICA']);await h.login();
      await page.locator('[data-view-safe-id="view-lux"]').click();
      await expect(page.locator('.view-safe-table')).not.toContainText('23,45');await expect(page.locator('.view-safe-table')).toContainText('Accès PRO');
      assert(h.requests>=3&&h.requests<15,'Only bounded authenticated tariff refreshes should run');
      assert.deepEqual(h.errors,[],'Production catalogue scripts must not throw');
    }finally{await h?.close();await browser.close();}
  });
}
