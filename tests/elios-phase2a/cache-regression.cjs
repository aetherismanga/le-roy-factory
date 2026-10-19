// A cached display-only image must not be returned to a canvas/WebGL CORS read.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
async function check(type,mode,expectedFetch){
  let handler,result,requests=0;
  const cached={type,status:type==='opaque'?0:200},fresh={type:'cors',status:200,clone(){return this}};
  const context={URL,location:{origin:'https://leroyfactory.fr'},self:{addEventListener(name,fn){if(name==='fetch')handler=fn}},caches:{match:async()=>cached,open:async()=>({put:async()=>{}})},fetch:async()=>{requests++;return fresh}};
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../../sw.js'),'utf8'),context);
  handler({request:{method:'GET',mode,destination:'image',url:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/sample.webp'},respondWith(p){result=p}});
  assert.equal(await result,expectedFetch?fresh:cached);
  assert.equal(requests,expectedFetch);
}
(async()=>{await check('opaque','cors',1);await check('cors','cors',0);await check('opaque','no-cors',0);console.log('PASS: opaque-cache recovery, readable cache reuse, display-only image compatibility');})().catch(e=>{console.error(e);process.exitCode=1});
