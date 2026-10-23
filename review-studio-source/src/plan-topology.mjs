import clipping from './polygon-clipping.mjs';
// All coordinates remain in plan units. Boolean operations keep joins and
// disconnected floor regions exact instead of subtracting rectangles twice.
export const ringArea=ring=>Math.abs(ring.reduce((n,a,i)=>{const b=ring[(i+1)%ring.length];return n+a[0]*b[1]-b[0]*a[1];},0)/2);
export const geometryArea=multi=>multi.reduce((n,rings)=>n+ringArea(rings[0]||[])-rings.slice(1).reduce((s,r)=>s+ringArea(r),0),0);
export function containsPoint(p,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
const contains=(p,rings)=>containsPoint(p,rings[0])&&!rings.slice(1).some(r=>containsPoint(p,r));
export function partitionFootprint(p,scale=1){const dx=p.b[0]-p.a[0],dy=p.b[1]-p.a[1],len=Math.hypot(dx,dy),nx=-dy/len*p.thickness/scale/2,ny=dx/len*p.thickness/scale/2;return [[p.a[0]+nx,p.a[1]+ny],[p.b[0]+nx,p.b[1]+ny],[p.b[0]-nx,p.b[1]-ny],[p.a[0]-nx,p.a[1]-ny]];}
const memo=new WeakMap();
export function floorTopology(room,scale=1){
 const key=JSON.stringify([room.points,room.holes,room.partitions,room.openings,scale]);if(memo.get(room)?.key===key)return memo.get(room).value;
 const footprints=(room.partitions||[]).map(p=>partitionFootprint(p,scale)),obstacles=[...(room.holes||[]),...footprints],blocked=obstacles.length?clipping.union(...obstacles.map(r=>[r])):[],regions=blocked.length?clipping.difference([room.points],blocked):[[room.points]],largest=regions.reduce((best,r)=>geometryArea([r])>geometryArea([best||[]])?r:best,null);
 // A doorway provides access only to the region immediately behind it. With
 // no doorway drawn yet, the largest region is the main usable floor.
 const access=(room.openings||[]).filter(o=>o.sill===0&&(o.type!=='window'||['bay','french'].includes(o.kind))).flatMap(o=>{const a=room.points[o.wall],b=room.points[(o.wall+1)%room.points.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=(o.start+o.width/2)/scale/len,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,nx=-(b[1]-a[1])/len*.2/scale,ny=(b[0]-a[0])/len*.2/scale;return [[x+nx,y+ny],[x-nx,y-ny]];});
 const hasAccess=regions.some(r=>access.some(p=>contains(p,r))),usable=regions.filter(r=>hasAccess?access.some(p=>contains(p,r)):r===largest),sealed=regions.filter(r=>!usable.includes(r)),exclusions=sealed.map(r=>r[0].slice(0,-1));
 const removed=usable.length?clipping.difference([room.points],usable):[[room.points]];
 const value={usable,sealed,blocked,removed,exclusions,area:geometryArea(usable),excludedArea:geometryArea(sealed),contains:p=>usable.some(r=>contains(p,r))};memo.set(room,{key,value});return value;
}
export function clippedFloorArea(topology,rectangle){return geometryArea(clipping.intersection(topology.usable,[rectangle]));}
export const overlapArea=(a,b)=>geometryArea(clipping.intersection([a],[b]));
export const multiPath=multi=>multi.map(rings=>rings.map(r=>'M'+r.map(p=>p.join(',')).join('L')+'Z').join('')).join('');

export function trimWallsToFloor(walls,topology,scale=1){const rings=topology.usable.flat(),eps=.05;for(const w of walls){const len=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]),ux=(w.b[0]-w.a[0])/len,uy=(w.b[1]-w.a[1])/len,ts=[0,len];for(const ring of rings)for(const p of ring){const x=p[0]*scale-w.a[0],y=p[1]*scale-w.a[1];if(Math.abs(x*uy-y*ux)<.1)ts.push(Math.max(0,Math.min(len,x*ux+y*uy)));}ts.sort((a,b)=>a-b);for(let i=1;i<ts.length;i++){const a=ts[i-1],b=ts[i];if(b-a<1e-7)continue;const mid=(a+b)/2,x=w.a[0]+ux*mid,y=w.a[1]+uy*mid;if(![-1,1].some(sign=>topology.contains([(x-uy*eps*sign)/scale,(y+ux*eps*sign)/scale])))w.cuts.push([a,b]);}}return walls;}
export const floorContains=(usable,p)=>usable.some(rings=>contains(p,rings));
