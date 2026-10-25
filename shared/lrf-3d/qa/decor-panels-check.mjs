import assert from 'node:assert/strict';
import * as T from 'three';
import {COLLECTIONS} from '../surface-catalog.js';
import {createSurface} from '../room.js';
import {applyTileColors} from '../tile-colors.js';

// Use real geometry and real material grouping, independently of catalogue
// availability while new manufacturer references are being prepared.
const name='QA manufacturer decor panels';
const panel={id:'panel',continuousDecor:true,decorRepeat:{columns:2,rows:2},faces:['panel.webp']};
COLLECTIONS[name]={brand:'ELIOS',colors:[panel,{id:'plain',faces:['plain.webp']}],formats:[{id:'30x30',width:.3,height:.3}]};
const apply=(surface,finish)=>applyTileColors(surface,finish,()=>new T.MeshPhysicalMaterial());
const periodicDistance=(a,b)=>Math.abs(a-b-Math.round(a-b));
let checked=0;
function verify(surface){
 const {position:p,normal:n,uv}=surface.tiles.geometry.attributes,l=surface.layout;
 for(let i=0;i<p.count;i++){
  if(n.getZ(i)<.99)continue;
  const x=p.getX(i),y=l.planAxes?-p.getY(i):p.getY(i),local=l.direction==='vertical'?[y-l.y/100,-x+l.x/100]:[x-l.x/100,y-l.y/100];
  assert(periodicDistance(uv.getX(i),local[0]/l.width/2)<2e-6,'Panel horizontal phase across physical 30 cm cells');
  assert(periodicDistance(uv.getY(i),local[1]/l.height/2)<2e-6,'Panel vertical phase across physical 30 cm cells');
  checked++;
 }
}
try{
 for(const direction of ['horizontal','vertical'])for(const planAxes of [false,true])for(const [x,y]of [[0,0],[-23,17],[37,-11]]){
  const surface=createSurface([[-.48,-.37],[1.71,-.37],[1.71,1.42],[.83,1.42],[.83,1.1],[-.48,1.1]],'Manufacturer panel',[[[.12,.14],[.12,.61],[.58,.61],[.58,.14]]]);
  surface.setLayout({width:.3,height:.3,direction,planAxes,pattern:'straight',x,y,groutWidth:3});
  const geometry=surface.tiles.geometry,original=Array.from(geometry.attributes.uv.array),cells=JSON.stringify(geometry.userData.cells),finish={collection:name,color:'panel',format:'30x30'};
  apply(surface,finish);verify(surface);apply(surface,finish);verify(surface);
  assert.equal(surface.tiles.geometry,geometry,'Material application does not replace cut geometry');
  assert.equal(JSON.stringify(geometry.userData.cells),cells,'Physical 30 cm tiles and counted areas remain intact');
  const key=geometry.userData.cells.find(c=>c.key==='-1:-1')?.key||geometry.userData.cells[2].key;
  apply(surface,{collection:name,color:'plain',tiles:{[key]:'panel'}});
  assert(geometry.groups.length>1,'Per-cell colours really reorder triangle groups');
  apply(surface,finish);verify(surface);
  apply(surface,{collection:name,color:'plain'});
  assert.deepEqual(Array.from(geometry.attributes.uv.array),original,'Plain surfaces recover every original UV after regrouping');
  apply(surface,finish);surface.setExtraHoles([[[.9,.05],[.9,.4],[1.2,.4],[1.2,.05]]]);apply(surface,finish);verify(surface);
  // Restoring to another collection must also remove the panel subdivision.
  const raw=Array.from(surface.tiles.geometry.userData.originalTileUV);
  apply(surface,{collection:'Creta',color:'avena'});
  assert.deepEqual(Array.from(surface.tiles.geometry.attributes.uv.array),raw);
 }
 const old=createSurface([[0,0],[1.5,0],[1.5,1.2],[0,1.2]],'Legacy staggered panel');
 old.setLayout({width:.3,height:.3,pattern:'third',direction:'vertical',x:-13,y:21});
 apply(old,{collection:name,color:'panel'});
 assert.equal(old.layout.pattern,'straight');assert.equal(old.layout.x,-13);assert.equal(old.layout.y,21);assert.equal(old.layout.direction,'vertical');verify(old);
 // Metadata changes invalidate the UV signature even when colour is unchanged.
 const before=Array.from(old.tiles.geometry.attributes.uv.array);panel.decorRepeat={columns:1,rows:1};apply(old,{collection:name,color:'panel'});assert.notDeepEqual(Array.from(old.tiles.geometry.attributes.uv.array),before);
 panel.decorRepeat={columns:2,rows:2};apply(old,{collection:name,color:'panel'});verify(old);
 console.log(JSON.stringify({passed:true,checkedVertices:checked,checks:['manufacturer 2x2 panel covers four physical tiles','positive and negative grid phase','horizontal, vertical and plan axes','clipped openings and concave outlines','repeated material application and triangle regrouping','plain material UV restoration','legacy stagger repaired without losing placement','repeat metadata invalidates cached UVs']}));
}finally{delete COLLECTIONS[name];}
