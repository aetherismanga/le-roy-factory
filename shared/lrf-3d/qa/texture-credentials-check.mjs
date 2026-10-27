import assert from 'node:assert/strict';
import {loadQueuedTexture} from '../texture-loader.js';
import {textureQueueState} from '../texture-queue.mjs';

const origin='https://protected-preview.invalid';
const originalFetch=globalThis.fetch,originalImage=globalThis.Image;
const calls=[],images=[];
globalThis.Image=class{
 constructor(){this.naturalWidth=16;this.naturalHeight=8;this.currentSrc='';images.push(this);}
 set src(value){this.currentSrc=value;queueMicrotask(()=>this.onload?.());}
 removeAttribute(name){if(name==='src')this.currentSrc='';}
};
globalThis.fetch=async(input,options={})=>{
 const url=new URL(String(input),origin),sameOrigin=url.origin===origin;
 const credentials=options.credentials??'same-origin';
 const cookieSent=credentials==='include'||credentials==='same-origin'&&sameOrigin;
 calls.push({url:url.href,sameOrigin,credentials,cookieSent});
 if(!sameOrigin)assert.equal(cookieSent,false,'Manufacturer CDN must not receive preview credentials');
 return new Response(new Blob(['decoded-by-image-double'],{type:'image/png'}),{status:sameOrigin&&!cookieSent?401:200});
};
try{
 for(const url of ['/assets/wood.webp',origin+'/assets/stone.webp','https://manufacturer.invalid/tile.webp']){
  const texture=await loadQueuedTexture(url);
  assert.deepEqual(texture.userData.sourceDimensions,[16,8]);
  texture.dispose();
 }
 assert(calls.filter(c=>c.sameOrigin).every(c=>c.cookieSent),'Protected same-origin textures authenticate');
 assert(calls.filter(c=>!c.sameOrigin).every(c=>!c.cookieSent),'Cross-origin textures remain credential-free');
 assert(images.every(image=>image.currentSrc===''),'Decoded image resources released');
 assert.deepEqual(textureQueueState(),{active:0,pending:0,concurrency:3});
 console.log(JSON.stringify({passed:true,checks:['relative protected image','absolute same-origin protected image','cross-origin credential isolation','decode/dispose and queue completion']}));
}finally{
 globalThis.fetch=originalFetch;
 if(originalImage===undefined)delete globalThis.Image;else globalThis.Image=originalImage;
}
