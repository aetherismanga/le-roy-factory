import * as T from 'three';

const area=p=>p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a[0]*b[1]-b[0]*a[1];},0)/2;
export const normalizeTileLayout=(l={})=>({direction:l.direction==='vertical'?'vertical':'horizontal',pattern:['straight','offset','opus'].includes(l.pattern)?l.pattern:'straight',x:Math.max(-1000,Math.min(1000,Number(l.x)||0)),y:Math.max(-1000,Math.min(1000,Number(l.y)||0)),width:Math.max(.025,Math.min(3,Number(l.width)||1.2)),height:Math.max(.025,Math.min(3,Number(l.height)||.6)),shape:l.shape==='hexagon'?'hexagon':'rectangle',groutWidth:Math.max(1,Math.min(10,Number(l.groutWidth)||2)),...(l.opus?{opus:l.opus}: {})});

// Clip each triangulated room fragment against a convex, physical tile face.
// The same polygons drive the visible cuts and the order quantities.
function exposedEdges(edges){
 const lines=new Map();for(const [a,b]of edges){const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<1e-8)continue;const sign=dx>1e-8||Math.abs(dx)<=1e-8&&dy>0?1:-1,ux=sign*dx/length,uy=sign*dy/length,nx=-uy,ny=ux,offset=nx*a[0]+ny*a[1],key=[ux,uy,offset].map(v=>Math.round(v*1e6)).join(',');let line=lines.get(key);if(!line){line={ux,uy,nx,ny,offset,parts:[]};lines.set(key,line);}const ta=ux*a[0]+uy*a[1],tb=ux*b[0]+uy*b[1];line.parts.push({lo:Math.min(ta,tb),hi:Math.max(ta,tb),sign});}
 const result=[];for(const l of lines.values()){const marks=[...new Set(l.parts.flatMap(p=>[p.lo,p.hi]).map(v=>Math.round(v*1e7)/1e7))].sort((a,b)=>a-b);for(let i=1;i<marks.length;i++){const lo=marks[i-1],hi=marks[i];if(hi-lo<1e-7)continue;const middle=(lo+hi)/2,coverage=l.parts.reduce((n,p)=>n+(middle>p.lo-1e-8&&middle<p.hi+1e-8?p.sign:0),0);if(!coverage)continue;const point=t=>[l.ux*t+l.nx*l.offset,l.uy*t+l.ny*l.offset],a=point(lo),b=point(hi);result.push(coverage>0?[a,b]:[b,a]);}}
 return result;
}

function clip(subject,face){
 let p=subject;
 for(let i=0;i<face.length&&p.length;i++){
  const a=face[i],b=face[(i+1)%face.length],cross=v=>(b[0]-a[0])*(v[1]-a[1])-(b[1]-a[1])*(v[0]-a[0]);const out=[];
  for(let j=0;j<p.length;j++){const u=p[j],v=p[(j+1)%p.length],du=cross(u),dv=cross(v),inside=du>=-1e-10;if(inside)out.push(u);if(inside!==(dv>=-1e-10)){const t=du/(du-dv);out.push([u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t]);}}
  p=out;
 }
 return p;
}
function rectangle(x,y,w,h,g){return [[x+g,y+g],[x+w-g,y+g],[x+w-g,y+h-g],[x+g,y+h-g]];}
export function tileModules(bounds,layout={}){
 const l=normalizeTileLayout(layout),{width:w,height:h}=l,g=l.groutWidth/2000,modules=[];
 if(l.pattern==='opus'){
  // Repeating 2:1 / square module: four real, non-overlapping rectangles.
  // Product-specific format compatibility is checked before this is offered.
  const unit=l.opus?.unit||Math.min(w,h),mode=l.opus?.mode||'two',W=unit*(mode==='two'?2:6),H=unit*(mode==='roman4'?4:mode==='roman3'?3:2);
  const pieces=mode==='roman4'?[[0,0,4,2],[4,0,2,2],[0,2,2,2],[2,2,2,1],[4,3,2,1],[4,2,1,1],[5,2,1,1],[2,3,1,1],[3,3,1,1]]:mode==='roman3'?[[0,0,2,3],[2,0,2,2],[4,1,2,2],[4,0,2,1],[2,2,2,1]]:[[0,0,1,1],[1,0,1,1],[0,1,2,1]];
  for(let r=Math.floor(bounds.minY/H)-1;r<=Math.ceil(bounds.maxY/H);r++)for(let c=Math.floor(bounds.minX/W)-1;c<=Math.ceil(bounds.maxX/W);c++){
   const x=c*W,y=r*H;
   pieces.forEach(([dx,dy,aa,bb],k)=>{const a=aa*unit,b=bb*unit;modules.push({key:c+':'+r+':'+k,col:c,row:r,x:x+dx*unit,y:y+dy*unit,width:a,height:b,nominalArea:a*b,polygon:rectangle(x+dx*unit,y+dy*unit,a,b,g)});});
  }
 }else if(l.shape==='hexagon'){
  // Pointed horizontal vertices, centres offset on alternate columns.
  const stepX=w*.75,stepY=h;
  for(let c=Math.floor(bounds.minX/stepX)-2;c<=Math.ceil(bounds.maxX/stepX)+1;c++)for(let r=Math.floor(bounds.minY/stepY)-2;r<=Math.ceil(bounds.maxY/stepY)+1;r++){
   const x=c*stepX,y=(r+(Math.abs(c)%2)*.5)*stepY,rx=w/2-g,ry=h/2-g;
   const polygon=[[x+rx,y],[x+rx/2,y+ry],[x-rx/2,y+ry],[x-rx,y],[x-rx/2,y-ry],[x+rx/2,y-ry]];
   modules.push({key:c+':'+r,col:c,row:r,x:x-w/2,y:y-h/2,width:w,height:h,nominalArea:w*h*.75,polygon});
  }
 }else{
  for(let r=Math.floor(bounds.minY/h)-1;r<=Math.ceil(bounds.maxY/h);r++)for(let c=Math.floor(bounds.minX/w)-2;c<=Math.ceil(bounds.maxX/w)+1;c++){
   const x=c*w+(l.pattern==='offset'&&Math.abs(r)%2?w/2:0),y=r*h;
   modules.push({key:c+':'+r,col:c,row:r,x,y,width:w,height:h,nominalArea:w*h,polygon:rectangle(x,y,w,h,g)});
  }
 }
 return modules;
}
export function buildTileGeometry(polygon,layout={},holes=[],regions=null){
 const l=normalizeTileLayout(layout),vertical=l.direction==='vertical',ox=l.x/100,oy=l.y/100;
 const local=([x,y])=>vertical?[y-oy,-x+ox]:[x-ox,y-oy],world=([x,y])=>vertical?[-y+ox,x+oy]:[x+ox,y+oy];
 const p=polygon.map(local),hh=holes.map(h=>h.map(local)),all=p.concat(...hh),triangles=T.ShapeUtils.triangulateShape(p.map(v=>new T.Vector2(...v)),hh.map(h=>h.map(v=>new T.Vector2(...v))));
 const clippedTriangles=regions?regions.flatMap(region=>{const v=region.map(local);return T.ShapeUtils.triangulateShape(v.map(p=>new T.Vector2(...p)),[]).map(t=>t.map(i=>v[i]));}):triangles.map(tri=>tri.map(i=>all[i]));
 const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]),bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
 const positions=[],normals=[],uv=[],cells=[],faceCells=[];
 const vertex=(v,z,n,m)=>{const q=world(v),nn=vertical?[-n[1],n[0],n[2]]:n;positions.push(q[0],q[1],z);normals.push(...nn);let u=(v[0]-m.x)/m.width,t=(v[1]-m.y)/m.height;if((Math.abs(m.col*13+m.row*7)%2)===1){u=1-u;t=1-t;}uv.push(u,t);};
 const triangle=(vs,zs,ns,m)=>{faceCells.push(m.key);for(let j=0;j<3;j++)vertex(vs[j],zs[j],ns[j],m);};
 const key=v=>v.map(x=>Math.round(x*1e7)).join(',');
 const modules=tileModules(bounds,l);if(modules.length>60000)throw Error('Choisissez une zone plus petite pour ce petit format.');
 for(const m of modules){let usedArea=0;const edges=[];
  for(const tri of clippedTriangles){let fragment=clip(tri,m.polygon);if(fragment.length<3||Math.abs(area(fragment))<1e-10)continue;if(area(fragment)<0)fragment.reverse();usedArea+=Math.abs(area(fragment));
   for(let i=1;i<fragment.length-1;i++)triangle([fragment[0],fragment[i],fragment[i+1]],[0,0,0],[[0,0,1],[0,0,1],[0,0,1]],m);
   for(let i=0;i<fragment.length;i++){const a=fragment[i],b=fragment[(i+1)%fragment.length];edges.push([a,b]);}
  }
  if(!usedArea)continue;
  for(const [a,b] of exposedEdges(edges)){const length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<1e-8)continue;const n=[(b[1]-a[1])/length,-(b[0]-a[0])/length,0];triangle([a,a,b],[0,-.008,0],[n,n,n],m);triangle([b,a,b],[0,-.008,-.008],[n,n,n],m);}
  const center=world([m.x+m.width/2,m.y+m.height/2]);cells.push({key:m.key,area:usedArea,nominalArea:m.nominalArea,faceArea:Math.abs(area(m.polygon)),width:m.width,height:m.height,center,bounds:m.polygon.map(world)});
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData={cells,tileCount:cells.length,faceCells};return geometry;
}

const mod=(a,b)=>((a%b)+b)%b;
export function optimizeLayout(surface,layout={},anchors=[]){
 const l=normalizeTileLayout(layout),p=surface.polygon||[[0,0],[surface.length,0],[surface.length,surface.height],[0,surface.height]],xs=p.map(v=>v[0]),ys=p.map(v=>v[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),w=l.direction==='vertical'?l.height:l.width,h=l.direction==='vertical'?l.width:l.height;
 const best=(min,max,module,refs)=>{const span=max-min,rest=mod(span,module),balanced=rest?rest/2:0,candidates=[min,min-(module-balanced),min+balanced,...refs.flatMap(x=>[x-module/2,x])];let winner={offset:min,score:Infinity};for(const origin of candidates){const left=mod(origin-min,module)||module,right=mod(max-origin,module)||module,cuts=Number(left<module-.00001)+Number(right<module-.00001),thin=Math.max(0,module*.24-Math.min(left,right)),alignment=refs.length?Math.min(...refs.map(x=>Math.min(mod(x-origin,module),module-mod(x-origin,module)))):0;const score=thin*100+Math.abs(left-right)*.15+alignment*.6+cuts*.002;if(score<winner.score)winner={offset:origin,score};}return winner.offset;};
 return {...l,x:Math.round(best(minX,maxX,w,anchors.map(a=>a.u).filter(Number.isFinite))*10000)/100,y:Math.round(best(minY,maxY,h,anchors.map(a=>a.y).filter(Number.isFinite))*10000)/100};
}
