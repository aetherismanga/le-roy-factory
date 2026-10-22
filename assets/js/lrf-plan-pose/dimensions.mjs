import {area,bounds,distance,inside,polygonError,simplify,signedArea} from './core.mjs?v=20261022-5';

// Text readings are observations. Pixel distances are never substituted for missing dimensions.
export function dimensionValue(text,defaultUnit='cm'){
 const match=String(text).trim().replace(/[\u00a0\u202f]/g,' ').match(/^(\d{1,5}(?:[.,]\d{1,3})?|\d{1,2}(?: \d{3})+)\s*(mm|cm|m)?$/i);
 if(!match)return null;
 const value=Number(match[1].replace(/ /g,'').replace(',','.'))*({mm:.1,cm:1,m:100}[match[2]?.toLowerCase()||defaultUnit]||1);
 return Number.isFinite(value)&&value>=5&&value<=10000?value:null;
}

export function orthogonalContour(points){
 const box=bounds(points),tolerance=Math.max(2,Math.max(box.width,box.height)*.018);
 let p=simplify(points,tolerance);
 if(p.length<4||p.length>24)return null;
 let cx=0,cy=0;
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],d=distance(a,b),angle=Math.atan2(b[1]-a[1],b[0]-a[0]);cx+=d*Math.cos(angle*4);cy+=d*Math.sin(angle*4);}
 const angle=Math.atan2(cy,cx)/4,c=Math.cos(angle),s=Math.sin(angle),local=p.map(([x,y])=>[x*c+y*s,-x*s+y*c]);
 let axes=local.map((a,i)=>{const b=local[(i+1)%local.length],dx=Math.abs(b[0]-a[0]),dy=Math.abs(b[1]-a[1]);return Math.min(dx,dy)/Math.max(dx,dy)>.28?-1:dx>dy?0:1;});
 if(axes.includes(-1))return null;
 // Remove short staircase artifacts introduced by thresholding and pencil thickness.
 let changed=true;
 while(changed&&p.length>4){changed=false;for(let i=0;i<p.length;i++){const prev=(i+p.length-1)%p.length;if(axes[prev]===axes[i]){p.splice(i,1);local.splice(i,1);axes.splice(i,1);changed=true;break;}}}
 if(axes.some((a,i)=>a===axes[(i+1)%axes.length]))return null;
 const straight=local.map((a,i)=>{const prev=(i+local.length-1)%local.length,next=(i+1)%local.length;return axes[i]===0?[(local[prev][0]+a[0])/2,(a[1]+local[next][1])/2]:[(a[0]+local[next][0])/2,(local[prev][1]+a[1])/2];});
 if(polygonError(straight))return null;
 const levels=[0,1].map(axis=>{const values=straight.map(p=>p[axis]).sort((a,b)=>a-b),groups=[];for(const value of values){const group=groups.at(-1);if(group&&value-group.at(-1)<tolerance*1.5)group.push(value);else groups.push([value]);}return groups.map(g=>g.reduce((a,b)=>a+b,0)/g.length);});
 const indices=straight.map(p=>p.map((v,axis)=>levels[axis].reduce((best,n,i)=>Math.abs(n-v)<Math.abs(levels[axis][best]-v)?i:best,0)));
 const snapped=indices.map(p=>p.map((v,axis)=>levels[axis][v]));
 if(polygonError(snapped))return null;
 const world=snapped.map(([x,y])=>[x*c-y*s,x*s+y*c]);
 return {points:world,local:snapped,indices,levels,angle,axes:snapped.map((a,i)=>Math.abs(a[0]-snapped[(i+1)%snapped.length][0])>Math.abs(a[1]-snapped[(i+1)%snapped.length][1])?0:1)};
}

export function usableContours(regions,width,height){
 const unique=[];
 for(const r of regions){const shape=orthogonalContour(r.points);if(!shape)continue;const a=area(shape.points),b=bounds(shape.points);if(a<width*height*.008||b.width<30||b.height<30)continue;
  if(unique.some(s=>Math.abs(area(s.points)-a)<a*.1&&distance([bounds(s.points).minX,bounds(s.points).minY],[b.minX,b.minY])<Math.max(width,height)*.035))continue;
  unique.push(shape);
 }
 const frames=unique.filter(r=>{const b=bounds(r.points);return area(r.points)>width*height*.5&&((b.width>width*.9&&b.height>height*.7)||(b.minX<width*.04&&b.minY<height*.04&&b.maxX>width*.96&&b.maxY>height*.96))&&unique.some(s=>s!==r&&area(s.points)<area(r.points)*.8&&s.points.every(p=>inside(p,r.points)));});
 const rooms=unique.filter(r=>!frames.includes(r));
 return rooms.filter(r=>!rooms.some(s=>s!==r&&area(s.points)>area(r.points)*1.2&&r.points.every(p=>inside(p,s.points)))).sort((a,b)=>area(b.points)-area(a.points)).slice(0,20);
}

export function nearestWall(shape,point,{exteriorOnly=true,maxFraction=.28}={}){
 const winding=signedArea(shape.points)>0?1:-1,span=Math.max(bounds(shape.points).width,bounds(shape.points).height);let best=null;
 for(let i=0;i<shape.points.length;i++){const a=shape.points[i],b=shape.points[(i+1)%shape.points.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),t=((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(len*len),side=winding*(dx*(point[1]-a[1])-dy*(point[0]-a[0]))/len,perp=Math.abs(side);
  if(t<-.08||t>1.08||perp>span*maxFraction||exteriorOnly&&side>3)continue;
  const score=perp+Math.abs(t-.5)*span*.10;
  if(!best||score<best.score)best={wall:i,score,t,perp};
 }
 return best;
}

// Derive each side from a path of written dimensions on the same axis.
// This also works while the other axis is still missing an observation.
export function dimensionDeductions(shape,values){
 const partialLengths=values.map(v=>Number.isFinite(v)&&v>0?v:null),deductions=[],conflicts=[];
 if(!shape||values.length!==shape.points.length)return {partialLengths,deductions,conflicts};
 for(let wall=0;wall<values.length;wall++){
  const axis=shape.axes[wall],start=shape.indices[wall][axis],end=shape.indices[(wall+1)%values.length][axis],graph=shape.levels[axis].map(()=>[]);
  for(let j=0;j<values.length;j++){
   if(j===wall||shape.axes[j]!==axis||!Number.isFinite(values[j])||values[j]<5||values[j]>10000)continue;
   const a=shape.indices[j][axis],b=shape.indices[(j+1)%values.length][axis],sign=Math.sign(shape.levels[axis][b]-shape.levels[axis][a]);graph[a].push({to:b,delta:values[j]*sign,wall:j,sign});graph[b].push({to:a,delta:-values[j]*sign,wall:j,sign:-sign});
  }
  const seen=new Set([start]),queue=[{node:start,total:0,terms:[]}];let found=null;
  while(queue.length){const current=queue.shift();if(current.node===end){found=current;break;}for(const edge of graph[current.node])if(!seen.has(edge.to)){seen.add(edge.to);queue.push({node:edge.to,total:current.total+edge.delta,terms:[...current.terms,{wall:edge.wall,value:values[edge.wall],sign:edge.sign}]});}}
  if(!found||Math.abs(found.total)<5)continue;
  const sign=Math.sign(found.total),value=Math.abs(found.total),terms=found.terms.map(t=>({...t,sign:t.sign*sign})).sort((a,b)=>b.sign-a.sign||b.value-a.value),deduction={wall,value,terms};
  if(partialLengths[wall]===null){partialLengths[wall]=value;deductions.push(deduction);}else if(Math.abs(partialLengths[wall]-value)>.5)conflicts.push({...deduction,observed:partialLengths[wall]});
 }
 return {partialLengths,deductions,conflicts};
}

export function solveDimensions(shape,values){
 if(!shape||values.length!==shape.points.length)return {error:'Contour ou nombre de cotes invalide.'};
 const partial=dimensionDeductions(shape,values),coordinates=[],inferred=[];
 for(let axis=0;axis<2;axis++){
  const count=shape.levels[axis].length,positions=Array(count).fill(null),edges=[];positions[0]=0;
  for(let i=0;i<values.length;i++){if(shape.axes[i]!==axis||values[i]===null||values[i]==='')continue;const value=Number(values[i]);if(!Number.isFinite(value)||value<5||value>10000)return {...partial,error:'Mur '+(i+1)+' : cote invalide (5 à 10 000 cm).'};const a=shape.indices[i][axis],b=shape.indices[(i+1)%values.length][axis],sign=Math.sign(shape.levels[axis][b]-shape.levels[axis][a]);edges.push({a,b,delta:value*sign,wall:i});}
  for(let round=0;round<count;round++)for(const e of edges){if(positions[e.a]!==null&&positions[e.b]===null)positions[e.b]=positions[e.a]+e.delta;else if(positions[e.b]!==null&&positions[e.a]===null)positions[e.a]=positions[e.b]-e.delta;}
  if(positions.includes(null))return {...partial,error:'Une cote '+(axis?'verticale':'horizontale')+' manque pour reconstruire ce contour.',missing:shape.axes.map((a,i)=>a===axis&&!values[i]?i:null).filter(x=>x!==null)};
  for(const e of edges)if(Math.abs(positions[e.b]-positions[e.a]-e.delta)>.5)return {...partial,error:'Les cotes ne se referment pas : vérifiez le mur '+(e.wall+1)+'.',conflict:e.wall};
  if(positions.some((v,i)=>i>0&&v<=positions[i-1]))return {...partial,error:'Les cotes inversent deux murs. Vérifiez leur lecture et leur emplacement.'};
  coordinates.push(positions);
 }
 const points=shape.indices.map(p=>p.map((v,axis)=>coordinates[axis][v])),error=polygonError(points);
 if(error)return {...partial,error};
 const lengths=points.map((p,i)=>distance(p,points[(i+1)%points.length]));
 for(let i=0;i<values.length;i++)if(!values[i])inferred.push(i);
 return {...partial,error:'',points,lengths,inferred,area:area(points)/10000};
}

// Pick only OCR observations that form a consistent, fully constrained drawing.
// Missing sides may be derived algebraically; an inconsistent digit is never "fixed" by guessing.
export function chooseReadings(shape,candidates,unit='cm'){
 const valueOf=text=>dimensionValue(text,unit);
 const anchors=candidates.flatMap((list,i)=>{const preferred=list.filter(c=>valueOf(c.text)>=100).sort((a,b)=>b.score-a.score)[0];return preferred?[valueOf(preferred.text)/distance(shape.points[i],shape.points[(i+1)%shape.points.length])]:[];}).sort((a,b)=>a-b),reference=anchors.length>=2?anchors[Math.floor(anchors.length/2)]:null;
 const options=candidates.map((list,i)=>list.filter(c=>{const v=valueOf(c.text);if(v===null)return false;const ratio=v/distance(shape.points[i],shape.points[(i+1)%shape.points.length]);return reference===null||ratio>=reference/1.8&&ratio<=reference*1.8;}).sort((a,b)=>b.score-a.score).slice(0,4));
 let best=null,bestPartial=null,visited=0,allowReview=false;
 const walk=(i,chosen,score,discarded=[])=>{if(++visited>20000)return;if(i===options.length){const values=chosen.map(c=>c?valueOf(c.text):null),solved=solveDimensions(shape,values);if(solved.error&&(!solved.missing||solved.conflicts?.length))return;if(discarded.some(wall=>!Number.isFinite(solved.partialLengths?.[wall])))return;const scales=chosen.flatMap((c,j)=>c?[values[j]/distance(shape.points[j],shape.points[(j+1)%values.length])]:[]).sort((a,b)=>a-b);if(scales.length<2||scales.at(-1)/scales[0]>1.8)return;const rank=score+values.reduce((sum,v)=>sum+(v||0),0)*.6+chosen.filter(Boolean).length*30;const result={score:rank,readings:chosen.slice(),rejected:discarded.map(wall=>({wall,text:options[wall][0].text,proposed:(solved.lengths||solved.partialLengths)[wall]})),requiresReview:discarded.length>0,...solved};if(solved.error){if(!bestPartial||rank>bestPartial.score)bestPartial=result;}else if(!best||rank>best.score)best=result;return;}
  for(const option of options[i])walk(i+1,[...chosen,option],score+option.score,discarded);
  if(!options[i].length)walk(i+1,[...chosen,null],score-8,discarded);
  else if(allowReview&&discarded.length<1)walk(i+1,[...chosen,null],score-8,[...discarded,i]);
 };
 walk(0,[],0);
 if(!best){allowReview=true;visited=0;walk(0,[],0);}
 return best||bestPartial||{readings:options.map(c=>c[0]||null),...solveDimensions(shape,options.map(c=>c[0]?valueOf(c[0].text):null))};
}
