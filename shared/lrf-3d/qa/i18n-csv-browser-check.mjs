// Verify the actual CSV download, not a second implementation of the exporter.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.hdr':'application/octet-stream'};
const variants=['studio-one','randal-general'],checks=[],errors=[];
let browser,server,variant='studio-one';
const asset=(app,pathname)=>{const dir=path.join(root,app,'dist'),file=path.resolve(dir,'.'+decodeURIComponent(pathname));return file.startsWith(dir+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{path:file,contentType:mime[path.extname(file)]||'application/octet-stream'}:null;};
function csvRows(text){return text.replace(/^\uFEFF/,'').split(/\r?\n/).map(line=>{const cells=[];let start=0,quoted=false,escaped=false;for(let i=0;i<=line.length;i++){const c=line[i];if(escaped){escaped=false;continue;}if(c==='\\'&&quoted){escaped=true;continue;}if(c==='"')quoted=!quoted;if((c===';'&&!quoted)||i===line.length){const raw=line.slice(start,i);cells.push(raw?JSON.parse(raw):'');start=i+1;}}return cells;});}
try{
 server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');return res.end('{"client":null,"isAdmin":false,"proHT":null,"proRows":[]}');}const found=asset(variant,u.pathname==='/'?'/atelier.html':u.pathname);if(!found){res.writeHead(404);return res.end();}res.setHeader('Content-Type',found.contentType);fs.createReadStream(found.path).pipe(res);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(variant of variants){const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});try{
  await context.addInitScript(()=>{window.__LRF_STANDALONE_PREVIEW__=true;localStorage.setItem('studio-one-render-quality','fluid');localStorage.setItem('randal-general-render-quality','fluid');});
  await context.route(/^https:\/\//,route=>{const u=new URL(route.request().url()),app=u.hostname==='studio-one-beta-test-v2.vercel.app'?'studio-one':u.hostname==='randal-catalogue-general-3d.vercel.app'?'randal-general':u.hostname==='leroyfactory.fr'&&u.pathname.startsWith('/review-studio/')?'studio-one':null,found=app&&asset(app,u.pathname.replace(/^\/review-studio/,''));return found?route.fulfill({...found,headers:{'Access-Control-Allow-Origin':'*'}}):route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(variant+': '+e.message));await page.goto(origin+'/atelier.html?standalone=1&lang=es');await page.waitForFunction(()=>window.studioOnePrototype?.getState().ready,null,{timeout:90000});
  const before=await page.evaluate(()=>({project:studioOnePrototype.exportProject(),quantities:studioOnePrototype.quantityReport()}));
  const download=async locale=>{await page.locator('[data-testid=lrf-language-selector]').selectOption(locale);const pending=page.waitForEvent('download');await page.evaluate(()=>document.querySelector('#export-quantities').click());const file=await pending;return fs.readFileSync(await file.path(),'utf8');};
  const spanish=await download('es'),french=await download('fr'),es=csvRows(spanish),fr=csvRows(french);
  assert.equal(es[0][0],'Zona');assert.equal(es[0][1],'Fabricante');assert.equal(es[0][2],'Colección');assert.equal(fr[0][0],'Zone');assert.equal(fr[0][1],'Fabricant');assert.equal(es.length,fr.length);
  for(let row=0;row<fr.length;row++){assert.equal(es[row].length,fr[row].length);for(let col=0;col<fr[row].length;col++)if(typeof fr[row][col]==='number')assert.equal(es[row][col],fr[row][col],'Every calculated numeric cell is unchanged');}
  for(let row=1;row<fr.length;row++)if(fr[row].length>=14){const expected=fr[row].slice(1,6);if(expected[0]==='Peinture'&&expected[1]==='Peinture')expected[0]='Pintura';assert.deepEqual(es[row].slice(1,6),expected,'Manufacturer, collection, colour ID, format and reference remain exact; the generic paint category may be localized');}
  assert.doesNotMatch(spanish,/Achat|precio de compra|importe de compra|proHT|privateCode|LRF-\d{5}/i);assert.deepEqual(await page.evaluate(()=>({project:studioOnePrototype.exportProject(),quantities:studioOnePrototype.quantityReport()})),before);
  checks.push(variant+': native Spanish/French CSV headings, immutable numeric cells/manufacturer identifiers/project, no confidential tariff columns');console.log('PASS',checks.at(-1));
 }finally{await context.close();}}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks.length,checks,errors},null,2));
}catch(error){console.error(error.stack);process.exitCode=1;}finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
