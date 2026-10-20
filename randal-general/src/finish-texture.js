import {CanvasTexture} from 'three';
// The JSON media endpoint serves the same public Storage objects with CORS.
// Raw bucket URLs can display in <img> while being rejected as WebGL textures.
export function finishTextureURL(definition){
 const url=definition.textureURL||'https://studio-one-beta-test-v2.vercel.app/assets/'+definition.texture;
 const source=new URL(url,'https://randal-catalogue-general-3d.vercel.app');
 if(source.hostname!=='storage.googleapis.com'||source.pathname.startsWith('/download/'))return url;
 const [bucket,...key]=source.pathname.slice(1).split('/');
 return `https://storage.googleapis.com/download/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(key.join('/'))}?alt=media`;
}
// Some official swatches are circles on white. Only their centre is usable as
// a material map; white borders must never be projected onto furniture.
export function prepareFinishTexture(texture,definition){
 if(definition?.materialSample){
  const im=texture.image,canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const ctx=canvas.getContext('2d');
  if(definition.materialSample==='aruba-flat-nogal'){
   // Original 2500 × 2229 catalogue photograph, plain drawer only. Exclude
   // the handle, ceramic, room and inter-drawer joint from the material map.
   ctx.drawImage(im,785,1412,950,280,0,0,1024,1024);
  }else{
   // Native macro photo p.15, sample the wood faces between the dark cuts.
   // The grooves themselves are supplied by the real parametric geometry.
   const strips=[[184,275],[302,346],[375,416],[443,485],[510,552],[576,615],[639,677],[701,737],[760,797],[820,855],[878,911],[934,951]],total=strips.reduce((n,[a,b])=>n+b-a,0);let x=0;
   for(const [a,b]of strips){const w=(b-a)/total*1024;ctx.drawImage(im,a,410,b-a,350,x,0,w+1,1024);x+=w;}
  }
  const sampled=new CanvasTexture(canvas);sampled.userData.sourceDimensions=[im.width,im.height];sampled.userData.cataloguePage=definition.materialSample==='aruba-flat-nogal'?17:15;texture.dispose();return sampled;
 }
 if(!definition?.textureCrop)return texture;
 const im=texture.image,canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 canvas.getContext('2d').drawImage(im,im.width*.32,im.height*.32,im.width*.36,im.height*.36,0,0,256,256);
 const cropped=new CanvasTexture(canvas);texture.dispose();return cropped;
}
