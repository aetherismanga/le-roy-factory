/** Prompt selection and quality gates for the local, promptable boundary refiner.
 * Semantic detection still establishes which surface is the floor. SAM never
 * supplies a camera plane and its quality score never establishes floor identity.
 */
function distances(binary,width,height){
 const out=new Float32Array(binary.length),inf=width+height;
 for(let i=0;i<out.length;i++)out[i]=binary[i]?inf:0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(!binary[i])continue;out[i]=Math.min(out[i],x?out[i-1]+1:1,y?out[i-width]+1:1);}
 for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){const i=y*width+x;if(!binary[i])continue;out[i]=Math.min(out[i],x+1<width?out[i+1]+1:1,y+1<height?out[i+width]+1:1);}
 return out;
}
export function detailPrompts(mask,width,height,{positiveCount=5,negativeCount=10}={}){
 if(mask?.length!==width*height)throw Error('Invalid floor prompt dimensions.');
 const foreground=Uint8Array.from(mask,v=>v>127?1:0),distance=distances(foreground,width,height);
 let minY=height,maxY=0,minX=width,maxX=0,pixels=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(foreground[y*width+x]){pixels++;minY=Math.min(minY,y);maxY=Math.max(maxY,y);minX=Math.min(minX,x);maxX=Math.max(maxX,x);}
 if(pixels<width*height*.005)return {points:[],labels:[],bounds:null};
 const points=[],labels=[],minimum=Math.max(2,Math.min(width,height)*.012);
 // Spread positive points through substantial, eroded floor regions; do not
 // seed thin protrusions at furniture boundaries.
 for(let n=0;n<positiveCount;n++){
  let best=-1,score=0;
  for(let y=minY;y<=maxY;y+=2)for(let x=minX;x<=maxX;x+=2){const i=y*width+x;if(distance[i]<minimum)continue;
   const apart=points.length?Math.min(...points.map(p=>Math.hypot(x-p[0],y-p[1]))):Math.min(width,height);
   if(apart<Math.min(width,height)*.08)continue;
   const value=Math.min(distance[i],Math.min(width,height)*.08)*Math.sqrt(apart);
   if(value>score){score=value;best=i;}
  }
  if(best<0)break;points.push([best%width,Math.floor(best/width)]);labels.push(1);
 }
 const outside=new Uint8Array(mask.length),top=Math.max(0,minY-Math.round(height*.06));
 for(let y=top;y<=maxY;y++)for(let x=minX;x<=maxX;x++)outside[y*width+x]=foreground[y*width+x]?0:1;
 const backgroundDistance=distances(outside,width,height),negatives=[];
 // Spatial cells retain separate chair, sofa and rug prompts even when their
 // backgrounds are connected through the top of the photo.
 for(let gy=0;gy<4;gy++)for(let gx=0;gx<4;gx++){
  const xa=Math.floor(minX+(maxX-minX+1)*gx/4),xb=Math.floor(minX+(maxX-minX+1)*(gx+1)/4),ya=Math.floor(top+(maxY-top+1)*gy/4),yb=Math.floor(top+(maxY-top+1)*(gy+1)/4);
  let best=-1,d=minimum;
  for(let y=ya;y<yb;y+=2)for(let x=xa;x<xb;x+=2){const i=y*width+x;if(backgroundDistance[i]>d){d=backgroundDistance[i];best=i;}}
  if(best>=0)negatives.push({point:[best%width,Math.floor(best/width)],distance:d});
 }
 negatives.sort((a,b)=>b.distance-a.distance);
 for(const item of negatives.slice(0,negativeCount)){points.push(item.point);labels.push(0);}
 return {points,labels,bounds:{minX,maxX,minY,maxY},positiveCount:labels.filter(v=>v===1).length};
}

/** Select an actual SAM prediction, requiring agreement with semantic evidence.
 * No interpolated mask, arbitrary polygon or manufactured floor is accepted.
 */
export function chooseDetailMask({data,count,width,height,coarse,points,labels,scores=[],protectedMask}){
 const size=width*height;
 if(!Number.isInteger(count)||count<1||count>4||data?.length!==count*size||coarse?.length!==size)throw Error('Invalid detail-mask output.');
 let coarsePixels=0,minY=height;
 for(let i=0;i<size;i++)if(coarse[i]>127){coarsePixels++;minY=Math.min(minY,Math.floor(i/width));}
 if(!coarsePixels)return {mask:new Uint8ClampedArray(coarse),accepted:false,reason:'no-semantic-floor'};
 const top=Math.max(0,minY-Math.ceil(height*.04));let best=null;
 for(let candidate=0;candidate<count;candidate++){
  const offset=candidate*size;let area=0,intersection=0,violations=0,positiveHits=0,positiveTotal=0;
  for(let i=0;i<size;i++){const inside=Number.isFinite(data[offset+i])&&data[offset+i]>0&&Math.floor(i/width)>=top&&!protectedMask?.[i];if(inside){area++;if(coarse[i]>127)intersection++;}}
  for(let p=0;p<points.length;p++){const [x,y]=points[p],i=Math.max(0,Math.min(height-1,Math.round(y)))*width+Math.max(0,Math.min(width-1,Math.round(x))),inside=Number.isFinite(data[offset+i])&&data[offset+i]>0;if(labels[p]===1){positiveTotal++;if(inside)positiveHits++;}else if(inside)violations++;}
  const overlap=intersection/(area+coarsePixels-intersection||1),recall=intersection/coarsePixels,ratio=area/coarsePixels;
  const quality=Number.isFinite(Number(scores[candidate]))?Math.max(0,Math.min(1,Number(scores[candidate]))):0;
  if(overlap<.45||recall<.55||ratio<.5||ratio>1.65||positiveHits<positiveTotal||violations>1)continue;
  const value=overlap*.65+recall*.2+quality*.15-violations*.1;
  if(!best||value>best.value)best={candidate,value,overlap,recall,quality,ratio};
 }
 if(!best)return {mask:new Uint8ClampedArray(coarse),accepted:false,reason:'detail-disagrees-with-floor'};
 const mask=new Uint8ClampedArray(size),offset=best.candidate*size;
 for(let i=0;i<size;i++)if(Number.isFinite(data[offset+i])&&data[offset+i]>0&&Math.floor(i/width)>=top&&!protectedMask?.[i])mask[i]=255;
 return {mask,accepted:true,...best};
}

/** A user-selected object is subtracted only. Other manual edits stay intact. */
export function subtractObject(mask,object){
 if(mask?.length!==object?.length)throw Error('Invalid protected-object dimensions.');
 const out=new Uint8ClampedArray(mask);
 for(let i=0;i<out.length;i++)if(object[i]>127)out[i]=0;
 return out;
}

/** A real prompted object prediction, never a bounding-box cutout. Automatic
 * protection additionally requires a confident prediction near its semantic box.
 */
export function chooseObjectMask({data,count,width,height,scores=[],point,bounds}){
 const size=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||!Number.isInteger(count)||count<1||count>4||data?.length!==count*size||!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))throw Error('Invalid object prediction.');
 const px=Math.max(0,Math.min(width-1,Math.round(point[0]))),py=Math.max(0,Math.min(height-1,Math.round(point[1]))),pixel=py*width+px;
 const box=bounds?{minX:Math.max(0,bounds.minX-(bounds.maxX-bounds.minX)*.2-4),maxX:Math.min(width-1,bounds.maxX+(bounds.maxX-bounds.minX)*.2+4),minY:Math.max(0,bounds.minY-(bounds.maxY-bounds.minY)*.2-4),maxY:Math.min(height-1,bounds.maxY+(bounds.maxY-bounds.minY)*.35+4)}:null;
 let chosen=-1,quality=-Infinity;
 for(let candidate=0;candidate<count;candidate++){
  const offset=candidate*size;if(!Number.isFinite(data[offset+pixel])||!(data[offset+pixel]>0))continue;let area=0,outside=0;
  for(let i=0;i<size;i++)if(Number.isFinite(data[offset+i])&&data[offset+i]>0){area++;if(box&&(i%width<box.minX||i%width>box.maxX||Math.floor(i/width)<box.minY||Math.floor(i/width)>box.maxY))outside++;}
  const score=Number(scores[candidate])||0;
  if(area<4||area>size*.65||(box&&(score<.75||outside/area>.2)))continue;
  if(score>quality){quality=score;chosen=candidate;}
 }
 if(chosen<0)return null;
 const mask=new Uint8ClampedArray(size),offset=chosen*size;
 for(let i=0;i<size;i++)if(Number.isFinite(data[offset+i])&&data[offset+i]>0&&(!box||(i%width>=box.minX&&i%width<=box.maxX&&Math.floor(i/width)>=box.minY&&Math.floor(i/width)<=box.maxY)))mask[i]=255;
 return {mask,quality,candidate:chosen};
}
