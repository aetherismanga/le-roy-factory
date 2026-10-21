import assert from 'node:assert/strict';
import {ROOMS,WALLS,DEFAULT_LAYOUT,SCALE,TOTAL_AREA,roomBounds,resizedLayout,applyLayout,validateLayout,polygonArea,WELL,stairHeight} from '../src/plan.js';
import {tileGeometry,tileCounts,floorPolygon,floorHoles,tileLayout,cutPlanSVG} from '../src/takeoff.js';
globalThis.window={};
const {SURFACES,defaultFloor,surfaceProduct,normalizeBathroom,defaultBathroom}=await import('../src/products.js');
const {newProject,validateProject}=await import('../src/workshop.js');
const original=structuredClone(ROOMS),doors=WALLS.flatMap(w=>w.openings).map(o=>[o.id,o.width,o.height]);
for(const r of ROOMS){
 applyLayout(DEFAULT_LAYOUT);const b=roomBounds(r),layout=resizedLayout(r.id,b.w*SCALE+.08,b.d*SCALE+.08);applyLayout(layout);
 const q=roomBounds(r);assert.ok(Math.abs(q.w*SCALE-b.w*SCALE-.08)<1e-9);assert.ok(Math.abs(q.d*SCALE-b.d*SCALE-.08)<1e-9);
 for(const room of ROOMS)assert.ok(room.area>1.6);
 for(const room of ROOMS)for(const other of ROOMS){if(room.id===other.id||room.floor!==other.floor)continue;const a=roomBounds(room),b=roomBounds(other);if(room.id==='gallery'||other.id==='gallery')continue;assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<1e-6||Math.min(a.z+a.d,b.z+b.d)-Math.max(a.z,b.z)<1e-6,'rooms overlap');}
 assert.deepEqual(WALLS.flatMap(w=>w.openings).map(o=>[o.id,o.width,o.height]),doors,'manufacturer opening dimensions changed');
 assert.equal(stairHeight(4.79,3.16),2.84);
}
applyLayout(DEFAULT_LAYOUT);assert.ok(Math.abs(TOTAL_AREA-140)<1e-8);
assert.throws(()=>resizedLayout('office',4,3.36),/escalier/);
assert.throws(()=>validateLayout({...DEFAULT_LAYOUT,width:NaN}),/numériques/);
assert.deepEqual(ROOMS.map(r=>r.polygon),original.map(r=>r.polygon));
// A 2 x 2 setting-out grid: four whole modules, known area and packaging.
const poly=[[0,0],[1.204,0],[1.204,1.204],[0,1.204]],format={width:.6,height:.6};
const geom=tileGeometry(poly,[],{width:.602,height:.602,pattern:'straight',direction:'horizontal',groutWidth:2,x:0,y:0});
const c=tileCounts(geom,format,1.44,10,{pcsBox:4});assert.equal(c.used,4);assert.equal(c.whole,4);assert.equal(c.cut,0);assert.equal(c.order,5);assert.equal(c.boxes,2);assert.equal(c.supplied,8);assert.ok(Math.abs(c.faceArea-4*.6*.6)<1e-8);
// All tile photographs follow the laying direction, without a fake alternating
// light gradient from turning a single manufacturer swatch 180 degrees.
for(let i=0;i<geom.attributes.position.count;i+=3)if(geom.attributes.normal.getZ(i)>.5){
 for(let j=i;j<i+3;j++)for(let k=j+1;k<i+3;k++){
  const dx=geom.attributes.position.getX(k)-geom.attributes.position.getX(j),du=geom.attributes.uv.getX(k)-geom.attributes.uv.getX(j);
  if(Math.abs(dx)>1e-5)assert.ok(dx*du>0,'alternating tile swatch orientation');
 }
}
geom.dispose();
// A non-modular room must produce real cuts; no unknown packaging is invented.
const cut=tileGeometry([[0,0],[1.1,0],[1.1,1.1],[0,1.1]],[],{width:.603,height:.603,groutWidth:3});const cc=tileCounts(cut,format,1.21,0);assert.equal(cc.used,4);assert.equal(cc.whole,1);assert.equal(cc.cut,3);assert.equal(cc.boxes,null);cut.dispose();
// Diagonal layout clips the rotated grid to the same room; no tile protrudes.
const dg=tileGeometry([[0,0],[2,0],[2,2],[0,2]],[],{width:.602,height:.602,direction:'diagonal',groutWidth:2});
const dc=tileCounts(dg,format,4,10);assert.ok(dc.cut>0);assert.ok(dc.faceArea<4&&dc.faceArea>3.9);
for(let i=0;i<dg.attributes.position.count;i++){const p=dg.attributes.position;assert.ok(p.getX(i)>-1e-5&&p.getX(i)<2.00001&&p.getY(i)>-1e-5&&p.getY(i)<2.00001);}dg.dispose();
const gallery=ROOMS.find(r=>r.id==='gallery'),living=ROOMS.find(r=>r.id==='living');
for(const r of [gallery,living]){const s=defaultFloor(r),f=s.kind==='parquet'?{width:1.2,height:.18}:surfaceProduct(s).format,p=floorPolygon(r),holes=floorHoles(r),l=tileLayout(r,s,f),g=tileGeometry(p,holes,l),counts=tileCounts(g,f,polygonArea(p)-holes.reduce((n,h)=>n+polygonArea(h),0),10);assert.ok(counts.faceArea<=counts.area+1e-5);assert.ok(counts.faceArea>counts.area*.97);const svg=cutPlanSVG(r,{mesh:{geometry:g},poly:p,holes});assert.ok(!svg.includes('NaN'));g.dispose();}
const available=SURFACES.reduce((n,c)=>n+c.colors.length,0);assert.ok(available>=79);for(const c of SURFACES)for(const color of c.colors)for(const f of c.formats.filter(f=>color.verifiedFormats.includes(f.id))){const p=surfaceProduct({collection:c.id,color:color.id,format:f.id});assert.ok(p.format.width>0&&p.format.height>0&&p.color.faces.length);}
assert.equal(surfaceProduct({collection:'view-golden-stone',color:'carbon',format:'60x60'}).pack.pcsBox,4);
assert.equal(surfaceProduct({collection:'view-corso',color:'beige',format:'60x90'}).pack.m2Box,1.08);
const project=newProject();validateProject(project);for(const id of ['shower','bathroom'])normalizeBathroom(defaultBathroom(id));
const invalid=structuredClone(project);invalid.bathrooms.shower.width=81;assert.throws(()=>validateProject(invalid),/Largeur/);
const wrongFloor=structuredClone(project);wrongFloor.rooms.living.floor={...wrongFloor.rooms.living.floor,collection:'elios-golden-hour',color:SURFACES.find(c=>c.id==='elios-golden-hour').colors[0].id,format:'4.8x20'};assert.throws(()=>validateProject(wrongFloor),/mural/);
console.log(JSON.stringify({result:'PASS',roomResizes:ROOMS.length,sharedPartitions:true,stairAndOpeningsFixed:true,exactTileGridAndCuts:true,stairwellAndLShape:true,manufacturerSurfaceColors:available,invalidProductsAndLayoutsRejected:true}));
