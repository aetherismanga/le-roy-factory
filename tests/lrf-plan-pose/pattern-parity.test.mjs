import {normalizeLayout} from '../../randal-general/src/surface-catalog.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {newProject,newRoom,tileLayout,nativeProject,area} from '../../assets/js/lrf-plan-pose/core.mjs';
import {plinthReport} from '../../randal-general/src/plinths.js';
import {makeRoom} from '../../randal-general/src/room.js';
import {quantity} from '../../assets/js/lrf-plan-pose/core.mjs';
import {dimensionScale,resizeWall} from '../../assets/js/lrf-plan-pose/dimensions.mjs';
import {buildTileGeometry} from '../../randal-general/src/tile-layout.js';
import {canonicalPoints,partitionGeometry} from '../../randal-general/src/room.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≠ ${b}`);
test('dimension size includes SVG letterboxing',()=>{near(dimensionScale({w:720,h:600},1400,400),1.5);near(dimensionScale({w:720,h:600},350,600),720/350);});
test('exact wall dimension preserves right angles and entered millimetres',()=>{const p=resizeWall([[0,0],[400,0],[400,300],[0,300]],0,425.7);assert.deepEqual(p,[[0,0],[425.7,0],[425.7,300],[0,300]]);near(area(p),425.7*300);assert.throws(()=>resizeWall([[0,0],[300,100],[0,300]],0,400),/oblique/);});
for(const shape of ['rectangle','L','clockwise','rotated'])for(const pattern of ['straight','offset','third','two-thirds','random','opus'])for(const rotation of [0,90])for(const centered of [false,true]){
 test(`${shape} · ${pattern} · ${rotation}° · centré ${centered}: same 2D/native cells and area`,()=>{
  const points=shape==='L'?[[20,30],[450,30],[450,230],[230,230],[230,380],[20,380]]:shape==='clockwise'?[[0,0],[0,350],[430,350],[430,0]]:shape==='rotated'?[[60,20],[404,278],[194,558],[-150,300]]:[[20,30],[450,30],[450,380],[20,380]],r=newRoom(points),p=newProject();p.rooms=[r];p.scale=1;r.confirmed=true;Object.assign(r.tile,{brand:'ELIOS',collection:pattern==='random'?'Quercia':'Roma',color:'aventino',width:pattern==='opus'?121.8:120,height:pattern==='opus'?60.9:24,format:pattern==='opus'?'Opus · module 4 formats':'24x120',allowOffset:true,opusModule:pattern==='opus'});Object.assign(r.layout,{pattern,rotation,centered,x:7.3,y:-12.7});const layout=tileLayout(r,1),n=nativeProject(p,r),polygon=canonicalPoints(n.room.points).map(([x,y])=>[x,-y]),g=buildTileGeometry(polygon,n.layouts.floor),cells=g.userData.cells;
  assert.equal(layout.error,'');assert.equal(cells.length,layout.count);near(cells.reduce((n,c)=>n+c.area,0),layout.covered);near(cells.reduce((n,c)=>n+c.nominalArea,0),layout.consumed);
  // Geometric bounds, beyond counts: mirroring or row phase errors must fail.
  const planar=layout.cells.map(c=>{const b=c.polygon;return [Math.min(...b.map(p=>p[0]))/100,Math.min(...b.map(p=>p[1]))/100,Math.max(...b.map(p=>p[0]))/100,Math.max(...b.map(p=>p[1]))/100];}).sort((a,b)=>Math.round(a[0]*1e7)-Math.round(b[0]*1e7)||Math.round(a[1]*1e7)-Math.round(b[1]*1e7)||Math.round(a[2]*1e7)-Math.round(b[2]*1e7));
  const natives=cells.map(c=>[Math.max(Math.min(...c.bounds.map(p=>p[0])),Math.min(...polygon.map(p=>p[0]))),Math.max(Math.min(...c.bounds.map(p=>-p[1])),Math.min(...polygon.map(p=>-p[1]))),Math.min(Math.max(...c.bounds.map(p=>p[0])),Math.max(...polygon.map(p=>p[0]))),Math.min(Math.max(...c.bounds.map(p=>-p[1])),Math.max(...polygon.map(p=>-p[1]))) ]).sort((a,b)=>Math.round(a[0]*1e7)-Math.round(b[0]*1e7)||Math.round(a[1]*1e7)-Math.round(b[1]*1e7)||Math.round(a[2]*1e7)-Math.round(b[2]*1e7));
  if(shape==='rectangle'||shape==='clockwise')for(let i=0;i<planar.length;i++)for(let k=0;k<4;k++)near(planar[i][k],natives[i][k]);g.dispose();
 });
}

for(const pattern of ['straight','offset','third','two-thirds','random','opus'])for(const rotation of [0,90])test(`aligned plinths ${pattern} ${rotation}: exact native parity`,()=>{const p=newProject(),r=newRoom([[0,0],[430,0],[430,350],[0,350]]);p.rooms=[r];p.scale=1;r.confirmed=true;Object.assign(r.tile,{brand:'ELIOS',collection:pattern==='random'?'Quercia':'Roma',color:'aventino',width:pattern==='opus'?121.8:120,height:pattern==='opus'?60.9:24,format:'24x120',allowOffset:true,opusModule:pattern==='opus'});Object.assign(r.layout,{pattern,rotation,x:7.3,y:-12.7});r.plinths={enabled:true,type:'tile',aligned:true,height:8};const data=nativeProject(p,r),room=makeRoom(data.room,0);room.floor.setLayout(data.layouts.floor);const a=quantity(r,1).plinths,b=plinthReport(room,r.plinths,data.walls);near(a.net,b.net);assert.equal(a.pieces,b.pieces);near(a.tileArea,b.tileArea);room.dispose();});

test('legacy Opus motif is preserved on import',()=>{const l=normalizeLayout({pattern:'opus',width:.609,height:.406,opus:{mode:'roman3',unit:.203}},'Roma');assert.deepEqual(l.opus,{mode:'roman3',unit:.203});});
