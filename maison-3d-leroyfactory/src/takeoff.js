// Quantities from the SAME clipped polygons and tile cells rendered in 3D.
import * as T from 'three';
import {ROOMS,WELL,SCALE,polygonArea,roomBounds,CLEAR_HEIGHT,ACTIVE_LEVELS} from './plan.js';
import {tiledPolygonGeometry} from '../../randal-general/src/room.js';
export const round=(n,d=2)=>Number(n.toFixed(d));
export const floorPolygon=room=>room.polygon.map(([x,z])=>[(x-5)*SCALE,-(z-4)*SCALE]);
export function floorHoles(room){return room.id==='gallery'?[[[WELL.x,WELL.z],[WELL.x+WELL.w,WELL.z],[WELL.x+WELL.w,WELL.z+WELL.d],[WELL.x,WELL.z+WELL.d]].map(([x,z])=>[(x-5)*SCALE,-(z-4)*SCALE])]:[];}
export function tileLayout(room,spec,format){
 const b=roomBounds(room);
 // Each room has its own setting-out origin, in centimetres from the SW corner.
 // Translate polygon rather than engine's +/-120 cm offset: room dimensions
 // can exceed that range while setting-out remains exact.
 return {width:format.width+(+spec.groutWidth||2)/1000,height:format.height+(+spec.groutWidth||2)/1000,pattern:spec.pattern||'straight',direction:spec.direction||'horizontal',groutWidth:+spec.groutWidth||2,x:+spec.x||0,y:+spec.y||0,origin:[(b.x-5)*SCALE,-(b.z+b.d-4)*SCALE]};
}
export function tileGeometry(poly,holes,layout){
 const [ox,oy]=layout.origin||[0,0];
 const angle=layout.direction==='diagonal'?Math.PI/4:0,c=Math.cos(angle),s=Math.sin(angle);
 const convert=p=>{const x=p[0]-ox,y=p[1]-oy;return [x*c+y*s,-x*s+y*c];};
 const g=tiledPolygonGeometry(poly.map(convert),angle?{...layout,direction:'horizontal'}:layout,holes.map(h=>h.map(convert)));
 // The shared engine turns alternate tile photographs by 180 degrees.
 // A material swatch can contain directional illumination: alternating it
 // creates a false checkerboard. In this workshop, keep the manufacturer's
 // face orientation consistent with the customer's selected laying direction.
 const uv=g.attributes.uv;
 for(let face=0;face<g.userData.faceCells.length;face++){
  const [col,row]=g.userData.faceCells[face].split(':').map(Number);
  if(Math.abs(col+row)%2===1)for(let j=face*3;j<face*3+3;j++)uv.setXY(j,1-uv.getX(j),1-uv.getY(j));
 }
 uv.needsUpdate=true;
 if(angle)g.rotateZ(angle);
 g.translate(ox,oy,0);g.userData.groutWidth=+layout.groutWidth||2;return g;
}
export function tileCounts(g,format,area,waste=10,pack){
 const cells=g.userData.cells||[],full=format.width*format.height;
 const whole=cells.filter(c=>c.area>=full-1e-5).length,cut=cells.length-whole,tileArea=format.width*format.height;
 const allowance=Math.max(0,Math.min(30,Number(waste)||0));
 // Count every occupied module once; no undocumented reuse of offcuts.
 const order=Math.ceil(cells.length*(1+allowance/100)),boxes=pack?.pcsBox?Math.ceil(order/pack.pcsBox):null;
 const supplied=boxes?boxes*pack.pcsBox:order;
 return {area,used:cells.length,whole,cut,faceArea:cells.reduce((n,c)=>n+c.area,0),waste:allowance,order,boxes,pcsBox:pack?.pcsBox||null,supplied,orderArea:supplied*tileArea,tileArea};
}
export function geometryArea(g){const p=g.attributes.position,idx=g.index;let a=0;const va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3();for(let i=0;i<(idx?idx.count:p.count);i+=3){va.fromBufferAttribute(p,idx?idx.getX(i):i);vb.fromBufferAttribute(p,idx?idx.getX(i+1):i+1);vc.fromBufferAttribute(p,idx?idx.getX(i+2):i+2);a+=vb.sub(va).cross(vc.sub(va)).length()/2;}return a;}
export function roomTakeoff(room,house){
 const floor=house.floorSurfaces.get(room.id),walls=house.wallSurfaces.filter(s=>s.room===room.id);
 return {id:room.id,name:room.name,floor:room.floor,width:roomBounds(room).w*SCALE,depth:roomBounds(room).d*SCALE,habitable:room.area,floorArea:polygonArea(floorPolygon(room))-floorHoles(room).reduce((n,h)=>n+polygonArea(h),0),perimeter:room.polygon.reduce((n,p,i)=>{const q=room.polygon[(i+1)%room.polygon.length];return n+Math.hypot(p[0]-q[0],p[1]-q[1])*SCALE;},0),wallGross:walls.reduce((n,w)=>n+w.length*CLEAR_HEIGHT,0),wallNet:walls.reduce((n,w)=>n+w.area,0),plinth:walls.reduce((n,w)=>n+w.plinth,0),ceiling:room.area,wallTiles:house.wallCoverings?.rooms.get(room.id)?.counts||null,tiles:floor?.counts||null,product:floor?.product?.name||'Parquet chêne · lames 120 × 18 cm'};
}
export function cutPlanSVG(room,floor){
 if(!floor)return '';
 const b=roomBounds(room),g=floor.mesh.geometry,p=g.attributes.position,n=g.attributes.normal;
 const ox=(b.x-5)*SCALE,oy=-(b.z+b.d-4)*SCALE,w=b.w*SCALE,h=b.d*SCALE;
 // Read the exposed top edges of the tile sides. The clipping engine already
 // cancels T-junctions, so a triangulation never appears
 // as a false diagonal joint in the professional setting-out plan.
 const edges=new Map();
 const add=(a,b)=>{const k=[a,b].map(v=>v.map(x=>Math.round(x*1e5)).join(',')).sort().join('/');if(edges.has(k))edges.delete(k);else edges.set(k,[a,b]);};
 for(let i=0;i<p.count;i+=3){if(Math.abs(n.getZ(i))>.5)continue;const top=[];for(let j=i;j<i+3;j++)if(Math.abs(p.getZ(j))<1e-6)top.push([p.getX(j)-ox,p.getY(j)-oy]);if(top.length===2)add(top[0],top[1]);}
 const stroke=Math.max(w,h)/900;
 const paths=[...edges.values()].map(([a,b])=>`M${a[0]} ${h-a[1]}L${b[0]} ${h-b[1]}`).join('');
 const outline=floor.poly.map(p=>[p[0]-ox,h-(p[1]-oy)].join(',')).join(' ');
 const hole=floor.holes.map(poly=>`<polygon points="${poly.map(p=>[p[0]-ox,h-(p[1]-oy)].join(',')).join(' ')}" fill="#faf9f4" stroke="#8d7960" stroke-width="${stroke*2}"/>`).join('');
 const fs=Math.max(w,h)/32,pad=fs*2;
 return `<svg viewBox="${-pad} ${-pad} ${w+2*pad} ${h+2*pad}" role="img" aria-label="Calepinage coté de ${String(room.name).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}"><polygon points="${outline}" fill="#ded5c2" stroke="#8c9a80" stroke-width="${stroke*2}"/><path d="${paths}" fill="none" stroke="#71806a" stroke-width="${stroke}"/>${hole}<path d="M0 ${-fs*.7}H${w} M${-fs*.7} 0V${h}" stroke="#303e33" stroke-width="${stroke*1.3}"/><text x="${w/2}" y="${-fs}" text-anchor="middle" font-size="${fs}" fill="#303e33">${w.toFixed(3).replace('.',',')} m</text><text x="${-fs}" y="${h/2}" transform="rotate(-90 ${-fs} ${h/2})" text-anchor="middle" font-size="${fs}" fill="#303e33">${h.toFixed(3).replace('.',',')} m</text><circle cx="0" cy="${h}" r="${stroke*4}" fill="#a47c3f"/></svg>`;
}
export function allTakeoffs(house){return ROOMS.filter(r=>r.floor<ACTIVE_LEVELS).map(r=>roomTakeoff(r,house));}

// Consolidate identical products before rounding to supplier boxes, so a small
// WC and a bathroom do not each force a separate half-empty box order.
export function orderTakeoffs(house){
 const groups=new Map();
 for(const r of ROOMS){const f=house.floorSurfaces.get(r.id),t=f.counts,key=f.spec.kind==='parquet'?'parquet':[f.spec.collection,f.spec.color,f.spec.format].join('/');
  if(!groups.has(key))groups.set(key,{key,name:f.product?.name||'Parquet chêne · lames 120 × 18 cm',area:0,used:0,order:0,pcsBox:t.pcsBox,tileArea:t.tileArea,rooms:[]});
  const g=groups.get(key);g.area+=t.area;g.used+=t.used;g.order+=t.order;g.rooms.push(r.name);
 }
 for(const r of ROOMS){const f=house.wallCoverings?.rooms.get(r.id);if(!f)continue;const t=f.counts,key=[f.spec.collection,f.spec.color,f.spec.format].join('/');
  if(!groups.has(key))groups.set(key,{key,name:f.product.name,area:0,used:0,order:0,pcsBox:t.pcsBox,tileArea:t.tileArea,rooms:[]});
  const g=groups.get(key);g.area+=t.area;g.used+=t.used;g.order+=t.order;g.rooms.push(r.name+' · murs');
 }
 return [...groups.values()].map(g=>({...g,boxes:g.pcsBox?Math.ceil(g.order/g.pcsBox):null,orderArea:(g.pcsBox?Math.ceil(g.order/g.pcsBox)*g.pcsBox:g.order)*g.tileArea}));
}
