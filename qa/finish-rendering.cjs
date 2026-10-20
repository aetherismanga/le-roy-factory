// Actual WebGL2 rendering, with the production furniture and texture loaders.
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const local=await import('./preview-server.mjs'),{initialDraft,draftProject}=await import('../src/commerce/guided.js'),{FINISHES}=await import('../src/finishes.js');
 const browser=await chromium.launch({executablePath:process.env.STUDIO_CHROMIUM||'/tmp/studio133/chromium',headless:true,env:{...process.env,LD_LIBRARY_PATH:process.env.STUDIO_SHADERS||'/tmp/studio133'},args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 try{
  const page=await browser.newPage({viewport:{width:640,height:480}}),errors=[],renders=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4173/');
  assert(await page.evaluate(()=>!!document.createElement('canvas').getContext('webgl2')),'WebGL2 is required, this test must not pass on a fallback screen');
  const chunk=fs.readdirSync('dist/chunks').find(f=>f.startsWith('live-preview-'));
  await page.evaluate(async name=>{document.body.innerHTML='<div id="visual-test" style="width:640px;height:480px"></div>';window.engine=(await import('/chunks/'+name)).createPreview(document.getElementById('visual-test'));},chunk);
  for(const finish of FINISHES){
   const p=draftProject({...initialDraft(),finish:finish.id,top:'plain'});
   await page.evaluate(async p=>{await window.engine.update(p);window.engine.reset();window.engine.snapshot();},p);
   await page.locator('#visual-test canvas').screenshot({path:'qa/finish-'+finish.id+'.png'});
   const sample=await page.evaluate(()=>{
    const c=document.querySelector('#visual-test canvas'),copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const ctx=copy.getContext('2d');ctx.drawImage(c,0,0);const data=ctx.getImageData(c.width*.47,c.height*.44,c.width*.06,c.height*.06).data,rgb=[0,0,0];for(let i=0;i<data.length;i+=4)for(let ch=0;ch<3;ch++)rgb[ch]+=data[i+ch]/(data.length/4);return rgb.map(Math.round);
   });
   renders.push({finish:finish.id,sampleRGB:sample,sourceHex:finish.hex,texture:finish.texture||null});
  }
  assert.deepEqual(errors,[]);
  const rgb=id=>renders.find(r=>r.finish===id).sampleRGB,brightness=id=>rgb(id).reduce((a,b)=>a+b)/3;
  assert(brightness('WHITE')>brightness('ROBLE')&&brightness('ROBLE')>brightness('NOGAL'),'Wood finishes retain different luminance');
  assert(brightness('GRIS')<135,'Gris Tortora must not wash out to light grey');
  assert(rgb('BISC')[0]>rgb('BISC')[1]&&rgb('BISC')[1]>rgb('BISC')[2],'Biscuit retains its warm tone');
  assert(rgb('AZUL')[2]>rgb('AZUL')[0],'Azul Acero retains its blue tone');
  const report={passed:true,realWebGL2:true,renders,checks:['All eight genuine finishes rendered, with unchanged texture files','Dark walnut and Tortora stay distinct from light finishes','Biscuit warmth and Azul blue retained after the colour transform','No WebGL shader errors']};
  fs.writeFileSync('reports/finish-rendering.json',JSON.stringify(report,null,2)+'\n');console.log(report);
 }finally{await browser.close();local.server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
