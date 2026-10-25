// Local built applications and synthetic API fixtures; never contacts real accounts.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const http=require('node:http');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'reports/lrf-reference-20261025');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.hdr':'application/octet-stream'};
const checks=[],errors=[];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 let activeKind='studio-one';
 const server=http.createServer((req,res)=>{const dist=path.join(root,activeKind,'dist'),url=new URL(req.url,'http://localhost'),file=path.resolve(dist,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const {commercialReference,purchaseRows}=await import(pathToFileURL(path.join(root,'shared/lrf-server/commercial-reference.mjs')).href);
 const browser=await chromium.launch({executablePath:process.env.LRF_BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const kind of ['studio-one','randal-general']){activeKind=kind;
  const load=file=>import(pathToFileURL(path.join(root,kind,'src/commerce',file)).href);
  const [{initialDraft,draftProject},{quoteProject,money},flow]=await Promise.all([load('guided.js'),load('pricing.js'),load('flow.js')]);
  const draft=kind==='studio-one'?{...initialDraft(),top:'bare',column:false,mirror:null}:initialDraft('aruba');
  const project=draftProject(draft),quote=quoteProject(project),prices=Object.fromEntries(quote.rows.map((row,index)=>[row.ref,index===0?66888-(quote.rows.length-1)*100:100]));
  let code='LRF-12345',allowed=true,incomplete=false,expired=false;
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await context.addInitScript(({project,flow})=>{
   localStorage.setItem(flow.QUOTE_KEY,JSON.stringify(project));localStorage.setItem(flow.CURRENT_KEY,JSON.stringify(project));localStorage.setItem(flow.FLOW_KEY,JSON.stringify({view:'quote',step:4}));localStorage.setItem(flow.QUOTE_CONTEXT,JSON.stringify({mode:'scene'}));
  },{project,flow:{QUOTE_KEY:flow.QUOTE_KEY,CURRENT_KEY:flow.CURRENT_KEY,FLOW_KEY:flow.FLOW_KEY,QUOTE_CONTEXT:flow.QUOTE_CONTEXT}});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin===origin&&url.pathname==='/api/commercial'){
    if(expired)return route.fulfill({status:401,json:{client:null,proHT:null,error:'Session expirée.'}});
    const body=route.request().postDataJSON(),identity={client:{codeClient:code,societe:'Compte synthétique '+code},randalAllowed:allowed,isAdmin:false};
    const result=body.project&&allowed?purchaseRows(quoteProject(body.project),incomplete?{prices:{}}:{prices}):null;
    return route.fulfill({json:{...identity,...commercialReference(identity,result)}});
   }
   let app=url.origin===origin?kind:url.hostname==='studio-one-beta-test-v2.vercel.app'?'studio-one':url.hostname==='randal-catalogue-general-3d.vercel.app'?'randal-general':null;
   const dist=app&&path.join(root,app,'dist'),file=dist&&path.resolve(dist,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
   if(file&&file.startsWith(dist+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
   return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(kind+': '+error.message));
  await page.goto(origin+'/index.html?view=quote',{waitUntil:'domcontentloaded'});
  const reference=page.locator('#quote-private .pro-reference');
  await reference.filter({hasText:'LRF-12345-668.88.00'}).waitFor({timeout:12000}).catch(async error=>{console.error('REFERENCE STATE',kind,await page.evaluate(()=>({view:document.body.dataset.view,private:document.querySelector('#quote-private')?.outerHTML,status:document.querySelector('#account-status')?.textContent,body:document.body.innerText.slice(-1000)})),errors);await page.screenshot({path:path.join(out,kind+'-failure.png'),fullPage:true});throw error;});
  assert.equal(await page.locator('#quote-total').textContent(),money(quote.publicTTC));
  for(const [width,height] of [[1440,900],[390,844],[320,568]]){
   await page.setViewportSize({width,height});await page.locator('#quote-private').scrollIntoViewIfNeeded();
   const sizes=await page.locator('#quote-private').evaluate(element=>{
    const code=element.querySelector('.pro-reference'),line=code.nextElementSibling,css=getComputedStyle(code),other=getComputedStyle(line),bounds=element.getBoundingClientRect();
    return {code:css.fontSize,line:other.fontSize,weight:css.fontWeight,public:getComputedStyle(document.querySelector('#quote-total')).fontSize,left:bounds.left,right:bounds.right,width:innerWidth,text:element.textContent};
   });
   assert.equal(sizes.code,sizes.line);assert(parseFloat(sizes.public)>parseFloat(sizes.code)*2);assert(sizes.left>=0&&sizes.right<=width+1);assert.doesNotMatch(sizes.text,/achat|HT|explication/i);
   await page.screenshot({path:path.join(out,kind+'-'+width+'.png'),fullPage:true});
   checks.push(kind+': '+width+'px, exact reference, equal small font and unchanged large public price');
  }
  assert(!(await page.evaluate(()=>JSON.stringify({...localStorage}))).includes('668.88.00'));
  incomplete=true;await page.evaluate(()=>dispatchEvent(new Event('focus')));await page.waitForFunction(()=>document.querySelector('#quote-private .pro-reference')?.textContent==='LRF-12345');
  assert.equal(await page.locator('#quote-total').textContent(),money(quote.publicTTC));checks.push(kind+': incomplete grid keeps only the own account number and retains public price');
  incomplete=false;allowed=false;await page.evaluate(()=>dispatchEvent(new Event('focus')));await page.waitForFunction(()=>document.querySelector('#quote-private').textContent.includes('non autorisé'));assert.equal(await reference.textContent(),'LRF-12345');
  allowed=true;code='LRF-54321';await page.evaluate(()=>dispatchEvent(new Event('focus')));await reference.filter({hasText:'LRF-54321-668.88.00'}).waitFor();assert(!(await page.locator('#quote-private').textContent()).includes('LRF-12345'));checks.push(kind+': forbidden partner cannot see the amount and account switch uses its own number');
  expired=true;await page.evaluate(()=>dispatchEvent(new Event('focus')));await page.waitForFunction(()=>document.querySelector('#quote-private').hidden);assert(!(await page.locator('#account-connected').textContent()).includes('668.88'));checks.push(kind+': expired session clears the confidential reference');
  await context.close();
 }}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,checks,errors,accounts:'Synthetic local fixtures; no live customer authentication.'},null,2));
 console.log('LRF reference browser checks: '+checks.length+' passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
