import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,tileLayout} from '../../assets/js/lrf-plan-pose/core.mjs';
import {TextureCache,textureProduct,textureSources,textureFace,textureMatrix,textureImageRotation} from '../../assets/js/lrf-plan-pose/textures.mjs';

const urls={fluid:'https://example.test/elios/fluid/03V6A10-1.webp',balanced:'https://example.test/elios/balanced/03V6A10-1.webp',max:'https://example.test/elios/max/03V6A10-1.webp'};
const product=()=>({key:'ELIOS|03V6A10',brand:'ELIOS',collection:'Creta',colorId:'avena',reference:'03V6A10',width:120,height:60,nativeFaces:true,textureVariants:Object.fromEntries(Object.entries(urls).map(([quality,url])=>[quality,[url]]))});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

// The browser codecs/canvas are boundary mocks; transport, source selection,
// cache lifecycle and real production layout mathematics run unchanged.
async function browserImages(run,{width=4096,height=2048}={}){
 const previous=new Map(['Image','document','FileReader'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 Object.defineProperty(globalThis,'Image',{configurable:true,value:class{naturalWidth=width;naturalHeight=height;set src(value){this.source=value;}async decode(){}}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(tag){assert.equal(tag,'canvas');return {width:0,height:0,getContext(){return {drawImage(){}};},toBlob(done,type){done(new Blob(['sampled official face'],{type}));}};}}});
 Object.defineProperty(globalThis,'FileReader',{configurable:true,value:class{async readAsDataURL(blob){this.result=`data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onload();}}});
 try{await run();}finally{for(const [key,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}
const imageResponse=()=>new Response('official face fixture',{headers:{'content-type':'image/webp'}});

test('les URLs viennent de la référence ELIOS vérifiée du catalogue, pas du projet importé',()=>{
 const official=product(),catalogue={products:[official]},imported={...official,textureVariants:{max:['https://untrusted.test/replacement.webp']}};
 assert.equal(textureProduct(imported,catalogue),official);
 assert.equal(textureProduct({...imported,brand:'VIEW'},catalogue),null);
 assert.equal(textureProduct({...imported,reference:'03V6A00'},catalogue),null);
 assert.equal(textureProduct({...imported,width:60,height:60},catalogue),null);
 assert.equal(textureProduct({...imported,colorId:'caramello'},catalogue),null);
});

test('les trois qualités sélectionnent leurs vraies sources ; le HD ne retombe jamais sur la basse définition',()=>{
 const official=product();for(const quality of ['fluid','balanced','max'])assert.deepEqual(textureSources(official,quality),[urls[quality]]);
 assert.deepEqual(textureSources({...official,textureVariants:{fluid:[urls.fluid]}},'max'),[]);
 assert.deepEqual(textureSources({...official,brand:'VIEW'},'max'),[]);
 assert.deepEqual(textureSources({...official,textureVariants:{max:['javascript:alert(1)','http://example.test/face.webp','https://user:password@example.test/face.webp',urls.max,urls.max]}},'max'),[urls.max]);
});

test('les faces suivent les vraies cellules, coupes, rotations et contours inversés du calepinage',()=>{
 let vertices=0;
 const outline=[[0,0],[400,80],[340,380],[140,340],[160,240],[-40,200]];
 for(const points of [outline,[...outline].reverse()])for(const rotation of [0,90])for(const scale of [.5,1,2])for(const pattern of ['straight','offset']){
  const room=newRoom(points);Object.assign(room.tile,{width:120,height:60,allowOffset:true});Object.assign(room.layout,{rotation,pattern,x:18,y:7});
  const layout=tileLayout(room,scale);assert.equal(layout.error,'');const m=textureMatrix(layout,rotation);
  for(const cell of layout.cells){
   assert.ok(textureFace(cell,8)>=0&&textureFace(cell,8)<8);
   assert.equal(textureFace({...cell,cut:!cell.cut},8),textureFace(cell,8));
   for(const canonical of cell.polygon){const world=layout.transform.from(canonical),grid=layout.gridPoint(world);near(m[0]*grid[0]+m[2]*grid[1]+m[4],world[0]);near(m[1]*grid[0]+m[3]*grid[1]+m[5],world[1]);vertices++;}
  }
 }
 assert.ok(vertices>1000);
 assert.equal(textureImageRotation(product(),{width:2048,height:4096}),90);
 assert.equal(textureImageRotation(product(),{width:4096,height:2048}),0);
 assert.equal(textureImageRotation({...product(),textureRotation:270},{width:4096,height:2048}),270);
});

test('un export lancé après un aperçu bas charge le HD et embarque uniquement les faces utilisées',async()=>browserImages(async()=>{
 const requested=[],cache=new TextureCache(()=>{},{strictResolution:true,fetcher:async url=>{requested.push(url);return imageResponse();}});
 const official=product();official.textureVariants.max.push('https://example.test/elios/max/03V6A10-2.webp');
 try{
  await cache.get(urls.fluid,{maxDimension:256}).promise;
  const result=await cache.prepareHD([{...official,textureExportSize:1024,textureFaces:[1]}]);
  assert.deepEqual(requested,[urls.fluid,official.textureVariants.max[1]]);
  assert.equal(result.size,1);const image=result.get(official.textureVariants.max[1]);
  assert.match(image.href,/^data:image\/webp;base64,/);assert.ok(!image.href.startsWith('blob:'));assert.equal(image.width,1024);assert.equal(image.height,512);
 }finally{cache.dispose();}
}));

test('une panne de texture peut être reprise par l’export HD ; une réponse non image est refusée',async()=>browserImages(async()=>{
 let attempts=0;const cache=new TextureCache(()=>{},{fetcher:async()=>{if(!attempts++)throw Error('offline');return imageResponse();}});
 try{
  await assert.rejects(cache.get(urls.max,{maxDimension:256}).promise,/offline/);
  const result=await cache.prepareHD([{...product(),textureExportSize:256}]);assert.match(result.get(urls.max).href,/^data:image/);assert.equal(attempts,2);
 }finally{cache.dispose();}
 const invalid=new TextureCache(()=>{},{fetcher:async()=>new Response('<html>sign in</html>',{headers:{'content-type':'text/html'}})});
 try{await assert.rejects(invalid.prepareHD([product()]),/invalide/);}finally{invalid.dispose();}
}));

test('la protection mémoire ne dégrade jamais silencieusement la résolution d’un export HD',async()=>browserImages(async()=>{
 const cache=new TextureCache(()=>{},{strictResolution:true,fetcher:async()=>imageResponse()});
 try{
  const first=await cache.get(urls.max,{maxDimension:4096}).promise;assert.equal(first.width,4096);assert.equal(first.height,4096);assert.equal(first.adapted,false);
  await assert.rejects(cache.get('https://example.test/elios/max/second.webp',{maxDimension:4096}).promise,/mémoire.*HD/);
 }finally{cache.dispose();}
 assert.equal(cache.entries.size,0);assert.equal(cache.pixels,0);
},{width:4096,height:4096}));

test('l’aperçu adapte explicitement ses images sous une borne mémoire, même si toutes les faces sont actives',async()=>browserImages(async()=>{
 const cache=new TextureCache(()=>{},{fetcher:async()=>imageResponse()});
 try{
  const images=await Promise.all(Array.from({length:40},(_,i)=>cache.get(`https://example.test/elios/max/face-${i}.webp`,{maxDimension:4096}).promise));
  assert.ok(images.some(image=>image.adapted));assert.ok(cache.pixels<=18*1024*1024);
 }finally{cache.dispose();}
},{width:4096,height:4096}));

test('abandonner une préparation annule les téléchargements en cours et libère le cache',async()=>browserImages(async()=>{
 let aborted=false;const cache=new TextureCache(()=>{},{fetcher:async(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'));},{once:true}))});
 const pending=cache.get(urls.max).promise;cache.dispose();await assert.rejects(pending,/interrompue/);assert.equal(aborted,true);assert.equal(cache.entries.size,0);assert.equal(cache.queue.length,0);
}));
