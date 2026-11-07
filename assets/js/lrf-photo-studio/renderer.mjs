import {planeProjection,tileAt} from './geometry.mjs';
import {resampleMask} from './mask.mjs';
import {decodeBlob} from './import.mjs';
import {projectionCoverage} from './perspective.mjs';
import {tryRenderFloorWebGL} from './renderer-webgl.mjs';
const cache=new Map(),CACHE_LIMIT=10,CACHE_BYTES=96*1024*1024;
export const DEFAULT_SETTINGS=Object.freeze({planeWidthMm:3600,planeHeightMm:3000,scale:1,rotation:0,alignLongEdge:true,layout:'straight',groutMm:2,groutColor:'#d6cbbb',lighting:.85,seed:17});
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
/** Exact box coverage of periodic joints, even when thinner than a distant pixel. */
export function jointCoverage(coordinate,size,joint,footprint){
 if(!(joint>0))return 0;const pitch=size+joint,half=Math.max(.001,Math.min(pitch*4,footprint))/2;
 const positive=coordinate+half,negative=coordinate-half,nPositive=Math.floor(positive/pitch),nNegative=Math.floor(negative/pitch);
 const integralPositive=nPositive*joint+Math.max(0,positive-nPositive*pitch-size),integralNegative=nNegative*joint+Math.max(0,negative-nNegative*pitch-size);
 return Math.max(0,Math.min(1,(integralPositive-integralNegative)/(2*half)));
}
/** Very low-frequency illumination, never the original joint/motif at pixel resolution. */
export function illuminationField(original,mask,columns=10,rows=10,passes=3) {
  const w=original.width,h=original.height,grid=new Float32Array(columns*rows),counts=new Uint32Array(grid.length),support=new Float32Array(grid.length),values=[];
  for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3)if(mask.data[y*w+x]>127){const p=(y*w+x)*4,i=Math.min(rows-1,Math.floor(y*rows/h))*columns+Math.min(columns-1,Math.floor(x*columns/w));grid[i]+=.2126*original.data[p]+.7152*original.data[p+1]+.0722*original.data[p+2];counts[i]++;}
  for(let i=0;i<grid.length;i++)if(counts[i])values.push(grid[i]/counts[i]);
  values.sort((a,b)=>a-b);const mid=values[Math.floor(values.length/2)]||128;
  for(let i=0;i<grid.length;i++){grid[i]=counts[i]?grid[i]/counts[i]:mid;support[i]=counts[i]?1:0;}
  // Normalised convolution: unknown furniture cells carry zero support. Their
  // median placeholder must never whiten a narrow floor/contact-shadow cell.
  // Propagate the filtered support so later passes can interpolate empty cells
  // from actual floor evidence, without treating placeholders as observations.
  for(let pass=0;pass<passes;pass++){
    const next=new Float32Array(grid.length),nextSupport=new Float32Array(grid.length);
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
      let sum=0,weight=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=Math.max(0,Math.min(columns-1,x+dx)),yy=Math.max(0,Math.min(rows-1,y+dy)),i=yy*columns+xx,s=support[i];
        if(s>0){sum+=grid[i]*s;weight+=s;}
      }
      const i=y*columns+x;next[i]=weight>0?sum/weight:mid;nextSupport[i]=weight/9;
    }
    grid.set(next);support.set(nextSupport);
  }
  return {grid,columns,rows,median:mid};
}
/** Independent, small CPU reference for checking a GPU result, not a render loop. */
export function sampleFloorReference({original,mask,product,faces,homo,cfg,grout,light,lighting},x,y,out=new Uint8ClampedArray(4)) {
  const w=original.width,h=original.height,i=y*w+x,p=i*4,source=original.data,alpha=mask.data[i]/255;
  out[0]=source[p];out[1]=source[p+1];out[2]=source[p+2];out[3]=source[p+3];
  if(alpha===0)return out;
  const nx=(x+.5)/w,ny=(y+.5)/h,denY=homo[7]*ny+homo[8],numX=homo[1]*ny+homo[2],numY=homo[4]*ny+homo[5],d=homo[6]*nx+denY;
  if(!Number.isFinite(d)||d<=1e-7)return out;
  const px=(homo[0]*nx+numX)/d,py=(homo[3]*nx+numY)/d;
  if(!Number.isFinite(px)||!Number.isFinite(py)||Math.abs(px)>1e7||Math.abs(py)>1e7)return out;
  const tile=tileAt(px,py,product,cfg,faces.length),face=faces[tile.face];
  let u=Math.min(1,tile.u),v=Math.min(1,tile.v);const rotation=((Number(product.textureRotation)||0)%360+360)%360;
  if(rotation===90)[u,v]=[v,1-u];else if(rotation===180)[u,v]=[1-u,1-v];else if(rotation===270)[u,v]=[1-v,u];
  const fx=Math.max(0,Math.min(face.width-1,u*face.width-.5)),fy=Math.max(0,Math.min(face.height-1,v*face.height-.5)),x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(face.width-1,x0+1),y1=Math.min(face.height-1,y0+1),dx=fx-x0,dy=fy-y0;
  const a=(y0*face.width+x0)*4,b=(y0*face.width+x1)*4,c=(y1*face.width+x0)*4,e=(y1*face.width+x1)*4,data=face.data;
  const scale=Math.max(.1,Math.min(6,Number(cfg.scale)||1)),ax=(Math.abs(homo[0]-px*homo[6])/w+Math.abs(homo[1]-px*homo[7])/h)/d/scale,ay=(Math.abs(homo[3]-py*homo[6])/w+Math.abs(homo[4]-py*homo[7])/h)/d/scale;
  const jx=jointCoverage(tile.u*product.widthMm,product.widthMm,cfg.groutMm,cfg.rotation===90?ay:ax),jy=jointCoverage(tile.v*product.heightMm,product.heightMm,cfg.groutMm,cfg.rotation===90?ax:ay),joint=1-(1-jx)*(1-jy);
  let factor=1;
  if(light){
    const lx=Math.max(0,Math.min(light.columns-1,x/w*light.columns-.5)),ly=Math.max(0,Math.min(light.rows-1,y/h*light.rows-.5)),lx0=Math.floor(lx),ly0=Math.floor(ly),lx1=Math.min(light.columns-1,lx0+1),ly1=Math.min(light.rows-1,ly0+1),ldx=lx-lx0,ldy=ly-ly0;
    const value=light.grid[ly0*light.columns+lx0]*(1-ldx)*(1-ldy)+light.grid[ly0*light.columns+lx1]*ldx*(1-ldy)+light.grid[ly1*light.columns+lx0]*(1-ldx)*ldy+light.grid[ly1*light.columns+lx1]*ldx*ldy;
    factor=1+lighting*(Math.max(.12,Math.min(1.6,value/Math.max(30,light.median)))-1);
  }
  for(let k=0;k<3;k++){
    let value=data[a+k]*(1-dx)*(1-dy)+data[b+k]*dx*(1-dy)+data[c+k]*(1-dx)*dy+data[e+k]*dx*dy;
    value=value*(1-joint)+grout[k]*joint;out[k]=value*factor*alpha+source[p+k]*(1-alpha);
  }
  return out;
}
export async function renderFloor({photo,mask,product,faces,quad,settings={},signal,onProgress,backend='auto'}={}) {
  abort(signal);if(!product?.photoStudioEligible)throw new Error('Sélectionnez une référence simulable.');
  if(!faces?.length)throw new Error('Texture fabricant manquante.');
  if(projectionCoverage(quad,mask)<.995)throw new Error('La perspective coupe une partie du sol. Ouvrez « Aligner au sol » et replacez les quatre repères.');
  const cfg={...DEFAULT_SETTINGS,...settings},w=photo.width,h=photo.height;
  if(cfg.alignLongEdge&&product.widthMm>product.heightMm*1.2)cfg.rotation=(Number(cfg.rotation)+90)%180;
  const original=photo.data?photo:photo.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h);
  const mm=mask.width===w&&mask.height===h?mask:resampleMask(mask,w,h),homo=planeProjection(quad,cfg.planeWidthMm,cfg.planeHeightMm),grout=parseColor(cfg.groutColor),lighting=Math.max(0,Math.min(1,Number(cfg.lighting)||0)),light=lighting?illuminationField(original,mm,Math.min(96,Math.ceil(mask.width/12)),Math.min(96,Math.ceil(mask.height/12)),1):null;
  // One GPU composition replaces the per-pixel JavaScript loop when supported.
  // Export and preview use the same geometry, hash, face order and shader. A
  // driver/context/memory limitation keeps the full-resolution CPU path usable.
  if(backend!=='cpu'){
    const composition={original,mask:mm,product,faces,homo,cfg,grout,light,lighting,signal};
    composition.sampleReference=(x,y)=>sampleFloorReference(composition,x,y);
    const accelerated=tryRenderFloorWebGL(composition);
    if(accelerated){onProgress?.(1);return accelerated;}
  }
  const canvas=makeCanvas(w,h),ctx=canvas.getContext('2d',{willReadFrequently:true}),output=new ImageData(new Uint8ClampedArray(original.data),w,h),started=performance.now();
  // Scalar equivalent of geometry.mjs tileAt/deterministicFace. Keep their
  // operation order: the CPU path must retain the previous byte-level output,
  // including negative rows and the last fraction of a subpixel grout line.
  // Allocate axes once per render, never objects/arrays/closures per pixel.
  const source=original.data,target=output.data,maskData=mm.data,faceCount=faces.length;
  const scale=Math.max(.1,Math.min(6,Number(cfg.scale)||1)),width=Number(product.widthMm),height=Number(product.heightMm),tileGrout=Math.max(0,Math.min(20,Number(cfg.groutMm)||0));
  if(!(width>0&&height>0))throw new Error('Format commercial manquant.');
  const pitchX=width+tileGrout,pitchY=height+tileGrout,rotatePlane=Number(cfg.rotation)===90,swapFootprint=cfg.rotation===90,third=cfg.layout==='third',seed=(cfg.seed??17)|0;
  const textureRotation=((Number(product.textureRotation)||0)%360+360)%360,joints=cfg.groutMm>0;
  const hx=homo[0],hy=homo[1],hz=homo[2],vx=homo[3],vy=homo[4],vz=homo[5],dxh=homo[6],dyh=homo[7],dh=homo[8];
  const nxAxis=new Float64Array(w),lightX0=light?new Int32Array(w):null,lightX1=light?new Int32Array(w):null,lightDX=light?new Float64Array(w):null;
  const lightGrid=light?.grid,lightColumns=light?.columns,lightRows=light?.rows,lightMedian=light?Math.max(30,light.median):1;
  for(let x=0;x<w;x++){
    nxAxis[x]=(x+.5)/w;
    if(light){const fx=Math.max(0,Math.min(lightColumns-1,x/w*lightColumns-.5)),x0=Math.floor(fx);lightX0[x]=x0;lightX1[x]=Math.min(lightColumns-1,x0+1);lightDX[x]=fx-x0;}
  }
  let yieldedAt=performance.now();
  for(let y=0;y<h;y++) {
    abort(signal);const ny=(y+.5)/h,denY=dyh*ny+dh,numX=hy*ny+hz,numY=vy*ny+vz,rowStart=y*w;
    let lightRow0=0,lightRow1=0,lightDY=0,lightOneDY=1;
    if(light){const fy=Math.max(0,Math.min(lightRows-1,y/h*lightRows-.5)),y0=Math.floor(fy);lightRow0=y0*lightColumns;lightRow1=Math.min(lightRows-1,y0+1)*lightColumns;lightDY=fy-y0;lightOneDY=1-lightDY;}
    for(let x=0;x<w;x++) {
      const i=rowStart+x,alpha=maskData[i]/255;if(alpha===0)continue;
      const nx=nxAxis[x],d=dxh*nx+denY;
      // Beyond the projection horizon there is no stable floor plane. Preserve original.
      if(!Number.isFinite(d)||d<=1e-7)continue;
      const px=(hx*nx+numX)/d,py=(vx*nx+numY)/d;if(!Number.isFinite(px)||!Number.isFinite(py)||Math.abs(px)>1e7||Math.abs(py)>1e7)continue;
      let addressX=px/scale,addressY=py/scale;
      if(rotatePlane){const previous=addressX;addressX=addressY;addressY=-previous;}
      const row=Math.floor(addressY/pitchY),offset=third?((row%3+3)%3)*pitchX/3:0,column=Math.floor((addressX+offset)/pitchX);
      const uRaw=(addressX+offset-column*pitchX)/width,vRaw=(addressY-row*pitchY)/height;
      let hash=Math.imul(column|0,73856093)^Math.imul(row|0,19349663)^seed;hash^=hash>>>16;hash=Math.imul(hash,0x45d9f3b);hash^=hash>>>16;
      const face=faces[(hash>>>0)%faceCount],fw=face.width,fh=face.height,data=face.data;
      let u=Math.min(1,uRaw),v=Math.min(1,vRaw);
      if(textureRotation===90){const previous=u;u=v;v=1-previous;}else if(textureRotation===180){u=1-u;v=1-v;}else if(textureRotation===270){const previous=u;u=1-v;v=previous;}
      const sampleX=Math.max(0,Math.min(fw-1,u*fw-.5)),sampleY=Math.max(0,Math.min(fh-1,v*fh-.5)),x0=Math.floor(sampleX),y0=Math.floor(sampleY),x1=Math.min(fw-1,x0+1),y1=Math.min(fh-1,y0+1),fx=sampleX-x0,fy=sampleY-y0,oneFX=1-fx,oneFY=1-fy;
      const a=(y0*fw+x0)*4,b=(y0*fw+x1)*4,c=(y1*fw+x0)*4,e=(y1*fw+x1)*4;
      let r=data[a]*oneFX*oneFY+data[b]*fx*oneFY+data[c]*oneFX*fy+data[e]*fx*fy;
      let g=data[a+1]*oneFX*oneFY+data[b+1]*fx*oneFY+data[c+1]*oneFX*fy+data[e+1]*fx*fy;
      let blue=data[a+2]*oneFX*oneFY+data[b+2]*fx*oneFY+data[c+2]*oneFX*fy+data[e+2]*fx*fy;
      if(joints){
        const ax=(Math.abs(hx-px*dxh)/w+Math.abs(hy-px*dyh)/h)/d/scale,ay=(Math.abs(vx-py*dxh)/w+Math.abs(vy-py*dyh)/h)/d/scale;
        const jointX=jointCoverage(uRaw*product.widthMm,product.widthMm,cfg.groutMm,swapFootprint?ay:ax),jointY=jointCoverage(vRaw*product.heightMm,product.heightMm,cfg.groutMm,swapFootprint?ax:ay),joint=1-(1-jointX)*(1-jointY);
        r=r*(1-joint)+grout[0]*joint;g=g*(1-joint)+grout[1]*joint;blue=blue*(1-joint)+grout[2]*joint;
      }
      let factor=1;
      if(light){
        const lx0=lightX0[x],lx1=lightX1[x],ldx=lightDX[x],oneLDX=1-ldx;
        const value=lightGrid[lightRow0+lx0]*oneLDX*lightOneDY+lightGrid[lightRow0+lx1]*ldx*lightOneDY+lightGrid[lightRow1+lx0]*oneLDX*lightDY+lightGrid[lightRow1+lx1]*ldx*lightDY;
        factor=1+lighting*(Math.max(.12,Math.min(1.6,value/lightMedian))-1);
      }
      const p=i*4;
      target[p]=r*factor*alpha+source[p]*(1-alpha);target[p+1]=g*factor*alpha+source[p+1]*(1-alpha);target[p+2]=blue*factor*alpha+source[p+2]*(1-alpha);
    }
    if(y%32===31){onProgress?.((y+1)/h);abort(signal);if(performance.now()-yieldedAt>=8){await new Promise(resolve=>setTimeout(resolve,0));yieldedAt=performance.now();}}
  }
  abort(signal);ctx.putImageData(output,0,0);if(canvas.dataset){canvas.dataset.renderer='cpu';canvas.dataset.renderMs=String(Math.round((performance.now()-started)*10)/10);}onProgress?.(1);return canvas;
}
