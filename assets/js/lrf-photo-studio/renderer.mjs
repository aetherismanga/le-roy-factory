import {planeProjection,tileAt} from './geometry.mjs';
import {resampleMask} from './mask.mjs';
import {decodeBlob} from './import.mjs';
const cache=new Map(),CACHE_LIMIT=10,CACHE_BYTES=96*1024*1024;
export const DEFAULT_SETTINGS=Object.freeze({planeWidthMm:3600,planeHeightMm:3000,scale:1,rotation:0,layout:'straight',groutMm:2,groutColor:'#d6cbbb',lighting:.35,seed:17});
function abort(signal){if(signal?.aborted)throw new DOMException('Rendu annulé.','AbortError');}
function makeCanvas(width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;}
async function loadFace(url,signal,maxSide) {
  const key=url+'#'+maxSide;
  abort(signal); if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
  let image;
  try {
    const response=await fetch(url,{mode:'cors',credentials:'same-origin',signal:controller.signal});
    if(!response.ok||response.type==='opaque')throw new Error('Texture inaccessible.');
    const blob=await response.blob();if(blob.size>20*1024*1024)throw new Error('Texture trop volumineuse.');
    image=await decodeBlob(blob);abort(signal);
    const w=image.width||image.naturalWidth,h=image.height||image.naturalHeight,s=Math.min(1,maxSide/Math.max(w,h));
    if(!(w>0&&h>0))throw new Error('Texture illisible.');
    const c=makeCanvas(Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s))),ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0,c.width,c.height);
    const pixels=ctx.getImageData(0,0,c.width,c.height),face={width:c.width,height:c.height,data:pixels.data,url,sourceWidth:w,sourceHeight:h,reduced:s<1};
    cache.set(key,face);while(cache.size>CACHE_LIMIT||[...cache.values()].reduce((n,f)=>n+f.data.byteLength,0)>CACHE_BYTES)cache.delete(cache.keys().next().value);return face;
  } catch(error) {if(signal?.aborted)throw new DOMException('Rendu annulé.','AbortError');throw new Error('La texture ne peut pas être chargée ou exportée (réseau, fichier ou autorisation CORS). Choisissez une autre référence.',{cause:error});}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);image?.close?.();}
}
export async function loadFaces(product,{signal,quality='preview'}={}) {
  if(!product?.photoStudioEligible)throw new Error(product?.ineligibleReason||'Cette référence ne peut pas être simulée.');
  const originals=product.textureFaces||[],working=product.workingTextureFaces;
  // Balanced/HD lists must retain identical order and cardinality so face hashes
  // choose the same manufacturer face in the workspace and exported image.
  const sources=quality==='preview'&&working?.length===originals.length?working:originals;
  const urls=sources.map(f=>typeof f==='string'?f:f.url||f.src).filter(Boolean);
  if(!urls.length)throw new Error('Aucune texture fabricant vérifiée pour cette référence.');
  // Limit concurrently decoded images on mobile while retaining the same order.
  const count=Math.min(12,urls.length),maxSide=quality==='export'?Math.min(4096,Math.floor(Math.sqrt(24*1024*1024/count))):1024;
  const faces=[];for(const url of urls.slice(0,12))faces.push(await loadFace(url,signal,maxSide));return faces;
}
function parseColor(value){const v=/^#([0-9a-f]{6})$/i.exec(value||'');return v?[parseInt(v[1].slice(0,2),16),parseInt(v[1].slice(2,4),16),parseInt(v[1].slice(4,6),16)]:[214,203,187];}
/** Very low-frequency illumination, never the original joint/motif at pixel resolution. */
export function illuminationField(original,mask,columns=10,rows=10) {
  const w=original.width,h=original.height,grid=new Float32Array(columns*rows),counts=new Uint32Array(grid.length),values=[];
  for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3)if(mask.data[y*w+x]>127){const p=(y*w+x)*4,i=Math.min(rows-1,Math.floor(y*rows/h))*columns+Math.min(columns-1,Math.floor(x*columns/w));grid[i]+=.2126*original.data[p]+.7152*original.data[p+1]+.0722*original.data[p+2];counts[i]++;}
  for(let i=0;i<grid.length;i++)if(counts[i])values.push(grid[i]/counts[i]);
  values.sort((a,b)=>a-b);const mid=values[Math.floor(values.length/2)]||128;
  for(let i=0;i<grid.length;i++)grid[i]=counts[i]?grid[i]/counts[i]:mid;
  for(let pass=0;pass<3;pass++){const next=new Float32Array(grid.length);for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){let sum=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=Math.max(0,Math.min(columns-1,x+dx)),yy=Math.max(0,Math.min(rows-1,y+dy));sum+=grid[yy*columns+xx];n++;}next[y*columns+x]=sum/n;}grid.set(next);}
  return {grid,columns,rows,median:mid};
}
function lightAt(field,x,y,w,h){const fx=Math.max(0,Math.min(field.columns-1,x/w*field.columns-.5)),fy=Math.max(0,Math.min(field.rows-1,y/h*field.rows-.5)),x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(field.columns-1,x0+1),y1=Math.min(field.rows-1,y0+1),dx=fx-x0,dy=fy-y0;const val=field.grid[y0*field.columns+x0]*(1-dx)*(1-dy)+field.grid[y0*field.columns+x1]*dx*(1-dy)+field.grid[y1*field.columns+x0]*(1-dx)*dy+field.grid[y1*field.columns+x1]*dx*dy;return Math.max(.55,Math.min(1.4,val/Math.max(30,field.median)));}
export async function renderFloor({photo,mask,product,faces,quad,settings={},signal,onProgress}={}) {
  abort(signal);if(!product?.photoStudioEligible)throw new Error('Sélectionnez une référence simulable.');
  if(!faces?.length)throw new Error('Texture fabricant manquante.');
  const cfg={...DEFAULT_SETTINGS,...settings},w=photo.width,h=photo.height,canvas=makeCanvas(w,h),ctx=canvas.getContext('2d',{willReadFrequently:true});
  const original=photo.data?photo:photo.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h),output=new ImageData(new Uint8ClampedArray(original.data),w,h);
  const mm=mask.width===w&&mask.height===h?mask:resampleMask(mask,w,h),homo=planeProjection(quad,cfg.planeWidthMm,cfg.planeHeightMm),grout=parseColor(cfg.groutColor),lighting=Math.max(0,Math.min(1,Number(cfg.lighting)||0)),light=lighting?illuminationField(original,mm):null;
  // Inline inverse homography projection, but tile addressing remains the tested pure function.
  for(let y=0;y<h;y++) {
    abort(signal);const ny=(y+.5)/h,denY=homo[7]*ny+homo[8],numX=homo[1]*ny+homo[2],numY=homo[4]*ny+homo[5];
    for(let x=0;x<w;x++) {
      const i=y*w+x,alpha=mm.data[i]/255;if(alpha===0)continue;
      const nx=(x+.5)/w,d=homo[6]*nx+denY;
      // Beyond the projection horizon there is no stable floor plane. Preserve original.
      if(!Number.isFinite(d)||d<=1e-7)continue;
      const px=(homo[0]*nx+numX)/d,py=(homo[3]*nx+numY)/d;if(!Number.isFinite(px)||!Number.isFinite(py)||Math.abs(px)>1e7||Math.abs(py)>1e7)continue;
      const tile=tileAt(px,py,product,cfg,faces.length),p=i*4;let r,g,b;
      if(tile.grout){[r,g,b]=grout;}else{const face=faces[tile.face];let u=tile.u,v=tile.v;const rotation=((Number(product.textureRotation)||0)%360+360)%360;
        if(rotation===90)[u,v]=[v,1-u];else if(rotation===180)[u,v]=[1-u,1-v];else if(rotation===270)[u,v]=[1-v,u];
        const tx=Math.max(0,Math.min(face.width-1,Math.floor(u*face.width))),ty=Math.max(0,Math.min(face.height-1,Math.floor(v*face.height))),j=(ty*face.width+tx)*4;r=face.data[j];g=face.data[j+1];b=face.data[j+2];}
      const factor=light?1+lighting*(lightAt(light,x,y,w,h)-1):1;
      output.data[p]=r*factor*alpha+original.data[p]*(1-alpha);output.data[p+1]=g*factor*alpha+original.data[p+1]*(1-alpha);output.data[p+2]=b*factor*alpha+original.data[p+2]*(1-alpha);
    }
    if(y%32===31){onProgress?.((y+1)/h);await new Promise(resolve=>setTimeout(resolve,0));}
  }
  abort(signal);ctx.putImageData(output,0,0);onProgress?.(1);return canvas;
}
