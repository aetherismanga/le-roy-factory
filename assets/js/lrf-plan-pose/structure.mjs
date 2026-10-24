import {distance} from './core.mjs?v=20261024-1';
import {orthogonalContour} from './dimensions.mjs?v=20261024-1';

// Architectural bands have two long faces and ink inside their thickness (solid or hatched).
// Thin furniture outlines and dimension leaders do not satisfy this test.
export function architecturalStructure(rgba,width,height,{outline=false}={}){
 const n=width*height,ink=new Uint8Array(n),stride=width+1,integral=new Uint32Array((width+1)*(height+1)),span=Math.max(width,height);
 for(let y=0;y<height;y++){let sum=0;for(let x=0;x<width;x++){const i=y*width+x;ink[i]=rgba[i*4]*.2126+rgba[i*4+1]*.7152+rgba[i*4+2]*.0722<190?1:0;sum+=ink[i];integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+sum;}}
 const count=(x0,y0,x1,y1)=>{x0=Math.max(0,Math.floor(x0));y0=Math.max(0,Math.floor(y0));x1=Math.min(width,Math.ceil(x1));y1=Math.min(height,Math.ceil(y1));return integral[y1*stride+x1]-integral[y0*stride+x1]-integral[y1*stride+x0]+integral[y0*stride+x0];};
 const bands=[];
 for(const axis of [0,1]){
  const length=axis?height:width,cross=axis?width:height,edges=[];
  for(let v=0;v<cross;v++){
   let start=-1,gap=0;
   for(let u=0;u<=length;u++){
    let hit=false;
    if(u<length)for(let dv=-2;dv<=2;dv++){const vv=v+dv;if(vv>=0&&vv<cross&&ink[axis?u*width+vv:vv*width+u]){hit=true;break;}}
    if(hit){if(start<0)start=u;gap=0;}
    else if(start>=0){gap++;if(gap>3||u===length){const end=u-gap+1;if(end-start>span*.085)edges.push({lo:v,hi:v,u0:start,u1:end});start=-1;}}
   }
  }
  const groups=[];
  for(const edge of edges){const group=groups.find(g=>edge.lo-g.hi<=1&&edge.lo>=g.hi&&Math.min(g.u1,edge.u1)-Math.max(g.u0,edge.u0)>Math.max(g.u1-g.u0,edge.u1-edge.u0)*.7);if(group){group.hi=edge.hi;group.u0=Math.min(group.u0,edge.u0);group.u1=Math.max(group.u1,edge.u1);}else groups.push({...edge});}
  for(const group of groups)group.center=(group.lo+group.hi)/2;
  for(const group of groups){const lo=group.lo+2,hi=group.hi-2,thickness=hi-lo,u0=group.u0,u1=group.u1;
   if(thickness<span*(outline?.0025:.009)||thickness>span*(outline?.025:.055))continue;
   const density=axis?count(lo+2,u0,hi-2,u1)/Math.max(1,(thickness-4)*(u1-u0)):count(u0,lo+2,u1,hi-2)/Math.max(1,(thickness-4)*(u1-u0));
   if(density<.16)continue;const middle=(lo+hi)/2;
   bands.push({axis,a:axis?[middle,u0]:[u0,middle],b:axis?[middle,u1]:[u1,middle],thickness,lo,hi,start:u0,end:u1,score:(u1-u0)/thickness,direct:true});
  }
  const pairs=[];
  for(const first of groups)for(const second of groups){
   const thick=second.center-first.center,u0=Math.max(first.u0,second.u0),u1=Math.min(first.u1,second.u1);
   if(thick<span*(outline?.0025:.009)||thick>span*(outline?.025:.055)||u1-u0<span*(outline?.12:.085))continue;
   const lo=first.center+3,hi=second.center-3,density=axis?count(lo,u0,hi,u1)/Math.max(1,(hi-lo)*(u1-u0)):count(u0,lo,u1,hi)/Math.max(1,(hi-lo)*(u1-u0));
   if(!outline&&density<.035)continue;
   pairs.push({axis,a:axis?[(first.center+second.center)/2,u0]:[u0,(first.center+second.center)/2],b:axis?[(first.center+second.center)/2,u1]:[u1,(first.center+second.center)/2],thickness:thick,lo:first.center,hi:second.center,start:u0,end:u1,score:(u1-u0)/thick});
  }
  for(const pair of pairs.sort((a,b)=>b.score-a.score)){
   if(bands.some(b=>b.direct&&b.axis===pair.axis&&Math.min(b.hi,pair.hi)-Math.max(b.lo,pair.lo)>Math.min(b.thickness,pair.thickness)*.3&&Math.min(b.end,pair.end)-Math.max(b.start,pair.start)>Math.min(b.end-b.start,pair.end-pair.start)*.5))continue;
   if(bands.some(b=>b.axis===pair.axis&&Math.abs(b.lo-pair.lo)<5&&Math.abs(b.hi-pair.hi)<5&&Math.min(b.end,pair.end)-Math.max(b.start,pair.start)>Math.min(b.end-b.start,pair.end-pair.start)*.6))continue;
   bands.push(pair);
  }
 }
 // Merge collinear parts separated by a door. This closes the envelope only; no furniture is copied.
 const coherent=bands.filter(b=>{
  if(outline&&!b.direct)return true;
  let positive=0,total=0,hatched=0;const size=Math.max(24,b.thickness*2),lo=b.lo+4,hi=b.hi-4;
  for(let u=b.start;u<b.end;u+=size){const end=Math.min(b.end,u+size),density=b.axis?count(lo,u,hi,end)/Math.max(1,(hi-lo)*(end-u)):count(u,lo,end,hi)/Math.max(1,(hi-lo)*(end-u));positive+=density>.035?1:0;total++;let found=density>.55;
   if(!found&&hi-lo>=8)for(let start=u;start<end&&!found;start+=3)for(const slope of [-1,1]){let hits=0,samples=0;for(let v=lo;v<=hi;v+=1){const along=start+slope*(v-lo),x=b.axis?v:along,y=b.axis?along:v;if(x<0||x>=width||y<0||y>=height)continue;samples++;hits+=count(x-1,y-1,x+2,y+2)>0?1:0;}if(samples>=8&&hits/samples>.82){found=true;break;}}
   if(found)hatched++;
  }
  b.coverage=positive/total;b.hatching=hatched/total;return b.coverage>=.65&&(b.hatching>=.65||b.end-b.start>span*.35);
 });
 const merged=[];
 for(const band of coherent.sort((a,b)=>b.score-a.score)){
  const previous=merged.find(x=>x.axis===band.axis&&Math.abs((x.lo+x.hi-band.lo-band.hi)/2)<Math.min(x.thickness,band.thickness)*.45&&Math.max(0,Math.max(x.start,band.start)-Math.min(x.end,band.end))<span*.5);
  if(previous){previous.start=Math.min(previous.start,band.start);previous.end=Math.max(previous.end,band.end);previous.a[previous.axis]=previous.start;previous.b[previous.axis]=previous.end;}else merged.push({...band,a:[...band.a],b:[...band.b]});
 }
 const vertical=merged.filter(b=>b.axis===1),horizontal=merged.filter(b=>b.axis===0);let frame=null;
 for(const left of vertical)for(const right of vertical){
  if(right.lo-left.hi<width*.3)continue;
  if(Math.max(left.thickness,right.thickness)>Math.min(left.thickness,right.thickness)*2.5)continue;
  const commonTop=Math.max(left.start,right.start),commonBottom=Math.min(left.end,right.end);if(commonBottom-commonTop<height*.25)continue;
  const candidates=horizontal.filter(h=>h.start<=left.hi+span*.03&&h.end>=right.lo-span*.03);
  const tops=candidates.filter(h=>Math.abs(h.hi-commonTop)<span*.065),bottoms=candidates.filter(h=>Math.abs(h.lo-commonBottom)<span*.065);
  for(const top of tops)for(const bottom of bottoms){if(bottom.lo-top.hi<height*.25)continue;const box={minX:left.hi,maxX:right.lo,minY:top.hi,maxY:bottom.lo},score=(box.maxX-box.minX)*(box.maxY-box.minY);if(!frame||score>frame.score)frame={...box,score,sides:[left,right,top,bottom]};}
 }
 if(!frame)return {bands:merged,shapes:[]};
 const points=[[frame.minX,frame.minY],[frame.maxX,frame.minY],[frame.maxX,frame.maxY],[frame.minX,frame.maxY]],shape=orthogonalContour(points),partitions=[];
 if(!shape)return {bands:merged,shapes:[]};
 for(const band of merged){
  const typical=(frame.sides[0].thickness+frame.sides[1].thickness)/2;
  if(outline||frame.sides.includes(band)||band.hatching<.65||band.thickness<typical*.6||band.thickness>typical*1.5)continue;const center=(band.lo+band.hi)/2;
  if(band.axis===0&&(center<=frame.minY+band.thickness||center>=frame.maxY-band.thickness)||band.axis===1&&(center<=frame.minX+band.thickness||center>=frame.maxX-band.thickness))continue;
  const lo=band.axis?frame.minY:frame.minX,hi=band.axis?frame.maxY:frame.maxX,start=Math.max(lo,band.start),end=Math.min(hi,band.end);
  if(end-start<span*.06)continue;
  const a=band.axis?[center,start]:[start,center],b=band.axis?[center,end]:[end,center];
  if(a[0]<frame.minX||a[0]>frame.maxX||a[1]<frame.minY||a[1]>frame.maxY||b[0]<frame.minX||b[0]>frame.maxX||b[1]<frame.minY||b[1]>frame.maxY)continue;
  partitions.push({a,b,thickness:band.thickness});
 }
 const accepted=[],pending=partitions.slice();
 const segmentDistance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return distance(p,[a[0]+dx*t,a[1]+dy*t]);};
 const boundary=points.map((p,i)=>({a:p,b:points[(i+1)%points.length],thickness:0}));
 for(let round=0;round<partitions.length;round++)for(let i=pending.length-1;i>=0;i--){const p=pending[i],touch=[...boundary,...accepted].some(q=>[p.a,p.b].some(v=>segmentDistance(v,q.a,q.b)<(p.thickness+q.thickness)/2+3));if(touch){accepted.push(p);pending.splice(i,1);}}
 shape.partitions=cleanPartitionJunctions(accepted);shape.kind='architecture';return {bands:merged,shapes:[shape],frame};
}

export function cleanPartitionJunctions(partitions){
 const list=partitions.map(p=>({...p,a:[...p.a],b:[...p.b]}));
 for(let i=0;i<list.length;i++)for(let j=0;j<list.length;j++)if(i!==j){const p=list[i],q=list[j],pa=Math.abs(p.a[0]-p.b[0])>Math.abs(p.a[1]-p.b[1])?0:1,qa=Math.abs(q.a[0]-q.b[0])>Math.abs(q.a[1]-q.b[1])?0:1;if(pa===qa)continue;
  const qi=(q.a[pa]+q.b[pa])/2,pv=(p.a[qa]+p.b[qa])/2,qmin=Math.min(q.a[qa],q.b[qa])-q.thickness/2,qmax=Math.max(q.a[qa],q.b[qa])+q.thickness/2;
  if(pv<qmin||pv>qmax)continue;
  for(const end of ['a','b']){const other=end==='a'?'b':'a',sign=Math.sign(p[other][pa]-p[end][pa]);if(Math.abs(p[end][pa]-qi)<=q.thickness*.9)p[end][pa]=qi+sign*(q.thickness/2+.02);}
 }
 return list.filter(p=>distance(p.a,p.b)>1);
}
