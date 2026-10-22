import {detectRooms} from './recognition.mjs';
import {bounds,distance,signedArea} from './core.mjs';
import {usableContours,nearestWall,dimensionValue,chooseReadings} from './dimensions.mjs';

const vendor=new URL('../../vendor/lrf-plan-pose/ocr/',import.meta.url);
let libraryPromise;
const makeCanvas=(width,height)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(width));c.height=Math.max(1,Math.round(height));return c;};
const cancelError=()=>new Error('Conversion annulée. Votre plan importé est conservé.');

export function normalizePixels(rgba,width,height,{radius=Math.max(8,Math.round(Math.max(width,height)/65)),contrast=6}={}){
 const gray=new Float32Array(width*height),result=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<gray.length;i++)gray[i]=rgba[i*4]*.2126+rgba[i*4+1]*.7152+rgba[i*4+2]*.0722;
 let background=gray.slice();
 // Three box filters approximate a Gaussian and remove lighting gradients without erasing pencil.
 for(let pass=0;pass<3;pass++){
  const horizontal=new Float32Array(gray.length),next=new Float32Array(gray.length);
  for(let y=0;y<height;y++){let sum=0,count=0;for(let x=-radius;x<width;x++){const add=x+radius,remove=x-radius-1;if(add<width){sum+=background[y*width+add];count++;}if(remove>=0){sum-=background[y*width+remove];count--;}if(x>=0)horizontal[y*width+x]=sum/count;}}
  for(let x=0;x<width;x++){let sum=0,count=0;for(let y=-radius;y<height;y++){const add=y+radius,remove=y-radius-1;if(add<height){sum+=horizontal[add*width+x];count++;}if(remove>=0){sum-=horizontal[remove*width+x];count--;}if(y>=0)next[y*width+x]=sum/count;}}
  background=next;
 }
 for(let i=0;i<gray.length;i++){const v=Math.max(0,Math.min(255,230-(background[i]-gray[i])*contrast));result[i*4]=result[i*4+1]=result[i*4+2]=v;result[i*4+3]=255;}
 return result;
}

export function preparePlan(image,{canvasFactory=makeCanvas,maxSize=1300}={}){
 const factor=Math.min(3,maxSize/Math.max(image.width,image.height)),canvas=canvasFactory(image.width*factor,image.height*factor),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
 const original=ctx.getImageData(0,0,canvas.width,canvas.height),pixels=normalizePixels(original.data,canvas.width,canvas.height),normalized=canvasFactory(canvas.width,canvas.height),nc=normalized.getContext('2d'),out=nc.createImageData(canvas.width,canvas.height);out.data.set(pixels);nc.putImageData(out,0,0);
 const regions=[];
 for(const [threshold,gap]of [[198,2],[198,3],[184,3]])regions.push(...detectRooms(pixels,canvas.width,canvas.height,{threshold,gap,minFraction:.008}));
 const shapes=usableContours(regions,canvas.width,canvas.height);
 return {canvas,normalized,shapes,factor:canvas.width/image.width,width:canvas.width,height:canvas.height};
}

function rotated(canvas,turn,factory){
 const odd=turn%2,c=factory(odd?canvas.height:canvas.width,odd?canvas.width:canvas.height),ctx=c.getContext('2d');ctx.translate(c.width/2,c.height/2);ctx.rotate(turn*Math.PI/2);ctx.drawImage(canvas,-canvas.width/2,-canvas.height/2);return c;
}
function unrotatePoint(x,y,turn,width,height){return turn===1?[y,height-x]:turn===2?[width-x,height-y]:turn===3?[width-y,x]:[x,y];}
function wordsOf(data){return (data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[])));}

export function numeralPatches(canvas){
 const {width,height}=canvas,data=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,width,height).data,n=width*height,seen=new Uint8Array(n),queue=new Int32Array(n),glyphs=[];
 for(let start=0;start<n;start++){
  if(seen[start]||data[start*4]>150)continue;let head=0,tail=1,minX=start%width,maxX=minX,minY=(start/width)|0,maxY=minY;queue[0]=start;seen[start]=1;
  while(head<tail){const i=queue[head++],x=i%width,y=(i/width)|0;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(let yy=Math.max(0,y-1);yy<=Math.min(height-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(width-1,x+1);xx++){const k=yy*width+xx;if(!seen[k]&&data[k*4]<=150){seen[k]=1;queue[tail++]=k;}}
  }
  const w=maxX-minX+1,h=maxY-minY+1;
  if(h>=Math.max(7,height/220)&&h<=height*.09&&w>=3&&w<=width*.14&&tail>=12&&tail/(w*h)>.045)glyphs.push({x0:minX,x1:maxX+1,y0:minY,y1:maxY+1,h,w});
 }
 const groups=[];
 for(const glyph of glyphs.sort((a,b)=>a.x0-b.x0)){
  let best=null,bestGap=Infinity;
  for(const group of groups){const gap=glyph.x0-group.x1,overlap=Math.min(glyph.y1,group.y1)-Math.max(glyph.y0,group.y0),maxH=Math.max(group.y1-group.y0,glyph.h);if(gap>=-2&&gap<maxH*.9&&overlap>Math.min(group.y1-group.y0,glyph.h)*.45&&Math.abs((group.y0+group.y1-glyph.y0-glyph.y1)/2)<maxH*.4&&gap<bestGap){best=group;bestGap=gap;}}
  if(best){best.x1=Math.max(best.x1,glyph.x1);best.y0=Math.min(best.y0,glyph.y0);best.y1=Math.max(best.y1,glyph.y1);best.count++;}else groups.push({...glyph,count:1});
 }
 return groups.filter(g=>g.count>=2&&g.count<=5&&g.x1-g.x0<(g.y1-g.y0)*6&&g.x1-g.x0>(g.y1-g.y0)*.65);
}

async function browserWorker(onProgress){
 if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{if(globalThis.Tesseract)return resolve(globalThis.Tesseract);const script=document.createElement('script');script.src=new URL('tesseract.min.js',vendor);script.onload=()=>globalThis.Tesseract?resolve(globalThis.Tesseract):reject(Error('Le lecteur de cotes n’a pas pu démarrer.'));script.onerror=()=>{libraryPromise=null;reject(Error('Le lecteur de cotes n’a pas pu être chargé. Vérifiez la connexion et réessayez.'));};document.head.append(script);});
 const library=await libraryPromise;
 return library.createWorker('eng',1,{workerPath:new URL('worker.min.js',vendor).href,corePath:vendor.href,langPath:vendor.href.replace(/\/$/,''),cachePath:'lrf-plan-pose-ocr-7',gzip:true,logger:m=>{if(m.status!=='recognizing text')onProgress('Chargement du lecteur de cotes… '+Math.round((m.progress||0)*100)+' %');}});
}

function addObservation(candidates,wall,reading){
 const list=candidates[wall],key=String(dimensionValue(reading.text)),existing=list.find(x=>String(dimensionValue(x.text))===key);
 if(existing){existing.score=Math.max(existing.score,reading.score)+3;existing.votes++;}else list.push({...reading,votes:1});
}

export async function readPlan(prepared,{onProgress=()=>{},signal,workerFactory=browserWorker,canvasFactory=makeCanvas}={}){
 if(!prepared.shapes.length)throw Error('Le contour de la pièce n’est pas assez lisible. Essayez une photo cadrée sur la feuille, prise de face, avec des traits plus contrastés.');
 if(signal?.aborted)throw cancelError();
 let worker,terminated=false,finished=false,timer,abort;
 const stop=()=>{if(worker&&!terminated){terminated=true;worker.terminate();}};
 const cancelled=new Promise((_,reject)=>{abort=()=>{stop();reject(cancelError());};signal?.addEventListener('abort',abort,{once:true});});
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{stop();reject(Error('La lecture prend trop de temps sur cet appareil. Votre photo reste conservée ; vous pouvez réessayer avec un cadrage plus serré.'));},150000);});
 try{
  const creation=workerFactory(onProgress).then(w=>{if(finished||signal?.aborted){w.terminate();throw cancelError();}return w;});
  worker=await Promise.race([creation,timeout,cancelled]);if(signal?.aborted)throw cancelError();
  const recognize=async(canvas,psm='11')=>{if(signal?.aborted)throw cancelError();await Promise.race([worker.setParameters({tessedit_pageseg_mode:psm,tessedit_char_whitelist:'0123456789.,',user_defined_dpi:'300'}),timeout,cancelled]);const input=canvas.toDataURL('image/png');return Promise.race([worker.recognize(input,{}, {blocks:true}),timeout,cancelled]);};
  const rows=prepared.shapes.map(shape=>({shape,candidates:shape.points.map(()=>[])})),observations=[];
  for(const turn of [0,1,2,3]){
   onProgress('Lecture des cotes écrites · orientation '+(turn+1)+' / 4…');
   const canvas=rotated(prepared.normalized,turn,canvasFactory);
   for(const psm of ['11','6']){const {data}=await recognize(canvas,psm);
   for(const word of wordsOf(data)){const text=String(word.text||'').replace(/\s+/g,'');if(dimensionValue(text)===null)continue;const b=word.bbox,center=unrotatePoint((b.x0+b.x1)/2,(b.y0+b.y1)/2,turn,prepared.width,prepared.height),observation={text,confidence:word.confidence||0,center,turn,bbox:b};observations.push(observation);
    for(const row of rows){const closest=nearestWall(row.shape,center);if(closest)addObservation(row.candidates,closest.wall,{...observation,score:(word.confidence||0)*.4+20-closest.score/8});}
   }
  }
  }
  // Refine small numeral crops independently of the long wall strokes around them.
  const refinements=observations.filter(o=>o.confidence<85).sort((a,b)=>b.confidence-a.confidence).filter((o,i,a)=>a.findIndex(p=>p.turn===o.turn&&distance(p.center,o.center)<20)===i).slice(0,24);
  for(let i=0;i<refinements.length;i++){
   onProgress('Vérification des chiffres · '+(i+1)+' / '+refinements.length+'…');
   const o=refinements[i],rot=rotated(prepared.normalized,o.turn,canvasFactory),b=o.bbox,pad=30,w=b.x1-b.x0,h=b.y1-b.y0,patch=canvasFactory(Math.max(60,w*2+pad*2),Math.max(60,h*2+pad*2)),ctx=patch.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,patch.width,patch.height);ctx.drawImage(rot,b.x0-3,b.y0-3,w+6,h+6,pad,pad,w*2,h*2);
   for(const psm of ['7','8']){const {data}=await recognize(patch,psm),text=String(data.text||'').trim().replace(/\s+/g,'');if(dimensionValue(text)===null)continue;
   for(const row of rows){const closest=nearestWall(row.shape,o.center);if(closest)addObservation(row.candidates,closest.wall,{...o,text,score:(data.confidence||0)*.4+25-closest.score/8});}}
  }
  // Isolate handwritten numeral groups: page layout OCR often mistakes adjacent wall strokes for digits.
  const patches=[];
  for(const turn of [0,1,2,3]){
   const rot=rotated(prepared.normalized,turn,canvasFactory),groups=numeralPatches(rot);
   for(const row of rows)for(let wall=0;wall<row.shape.points.length;wall++){
    const near=groups.map(b=>{const center=unrotatePoint((b.x0+b.x1)/2,(b.y0+b.y1)/2,turn,prepared.width,prepared.height),closest=nearestWall(row.shape,center);return {b,center,closest};}).filter(g=>g.closest?.wall===wall).sort((a,b)=>a.closest.score-b.closest.score).slice(0,2);
    patches.push(...near.map(p=>({...p,rot,row,wall,turn})));
   }
  }
  for(let i=0;i<Math.min(64,patches.length);i++){
   onProgress('Lecture des chiffres manuscrits · '+(i+1)+' / '+Math.min(64,patches.length)+'…');
   const p=patches[i],b=p.b,w=b.x1-b.x0,h=b.y1-b.y0,zoom=Math.min(5,Math.max(2,65/h)),pad=24,patch=canvasFactory(w*zoom+pad*2,h*zoom+pad*2),ctx=patch.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,patch.width,patch.height);ctx.drawImage(p.rot,b.x0-2,b.y0-2,w+4,h+4,pad,pad,w*zoom,h*zoom);
   for(const psm of ['7','8']){const {data}=await recognize(patch,psm),text=String(data.text||'').trim().replace(/\s+/g,'');if(dimensionValue(text)===null||text.replace(/\D/g,'').length<2)continue;
   addObservation(p.row.candidates,p.wall,{text,confidence:data.confidence||0,center:p.center,turn:p.turn,score:(data.confidence||0)*.5+30+Math.min(15,text.length*4)-p.closest.score/10});}
  }
  for(const row of rows){
   const current=chooseReadings(row.shape,row.candidates);if(!current.error&&!current.requiresReview)continue;
   const span=Math.max(bounds(row.shape.points).width,bounds(row.shape.points).height),margin=span*.32;
   for(let wall=0;wall<row.shape.points.length;wall++){
    const a=row.shape.points[wall],b=row.shape.points[(wall+1)%row.shape.points.length],horizontal=Math.abs(b[0]-a[0])>Math.abs(b[1]-a[1]),x0=horizontal?Math.min(a[0],b[0])+4:(a[0]+b[0])/2-margin,y0=horizontal?(a[1]+b[1])/2-margin:Math.min(a[1],b[1])+4,w=horizontal?Math.abs(b[0]-a[0])-8:margin*2,h=horizontal?margin*2:Math.abs(b[1]-a[1])-8;
    if(w<20||h<20)continue;const band=canvasFactory(w,h),ctx=band.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,band.width,band.height);ctx.drawImage(prepared.normalized,-x0,-y0);
    for(const turn of [0,1,2,3]){
     onProgress('Rapprochement des cotes et des murs · '+(wall+1)+' / '+row.shape.points.length+'…');
     const rot=rotated(band,turn,canvasFactory),{data}=await recognize(rot,'6');
     for(const word of wordsOf(data)){const text=String(word.text||'').replace(/\s+/g,'');if(dimensionValue(text)===null||text.replace(/\D/g,'').length<2)continue;const box=word.bbox,point=unrotatePoint((box.x0+box.x1)/2,(box.y0+box.y1)/2,turn,band.width,band.height),center=[x0+point[0],y0+point[1]],closest=nearestWall(row.shape,center);if(closest?.wall!==wall)continue;addObservation(row.candidates,wall,{text,center,confidence:word.confidence||0,score:(word.confidence||0)*.4+25+Math.min(15,text.length*4)-closest.score/10});}
    }
   }
  }
  return rows.map(row=>({...row,...chooseReadings(row.shape,row.candidates)}));
 }finally{finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);stop();}
}

export function measuredPoints(row,solved,scale){
 const first=solved.points[0],anchor=row.shape.points[0],c=Math.cos(row.shape.angle),s=Math.sin(row.shape.angle);
 return solved.points.map(p=>{const x=(p[0]-first[0])/scale,y=(p[1]-first[1])/scale;return [anchor[0]+x*c-y*s,anchor[1]+x*s+y*c];});
}
