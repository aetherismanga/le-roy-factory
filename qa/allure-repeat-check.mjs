import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {COLLECTIONS} from '../src/surface-catalog.js';
import {createSurface,makeRoom,DEFAULT_ROOM} from '../src/room.js';
import {applyTileColors} from '../src/tile-colors.js';
import {resolveSurfaceTexture} from '../src/surface-texture-selection.js';
import {disposeObject} from '../src/composition.js';

const decors=['fenix-juniper','fenix-blueberry','safari','eden'];
const apply=(surface,finish)=>applyTileColors(surface,finish,()=>new T.MeshPhysicalMaterial());
const periodicDistance=(a,b)=>Math.abs(a-b-Math.round(a-b));
let vertices=0;
function checkDrawing(surface,finish){
 const g=surface.tiles.geometry,{position:p,normal:n,uv}=g.attributes,l=surface.layout,rotation=resolveSurfaceTexture('Allure',finish.color,'max').rotation;
 const map=new T.Texture();map.center.set(.5,.5);map.rotation=rotation*Math.PI/180;map.updateMatrix();
 // Compare every visible vertex with one uninterrupted drawing in physical
 // wall coordinates, across positive/negative tile numbers and cut edges.
 for(let i=0;i<p.count;i++){
  if(n.getZ(i)<.99)continue;
  const x=p.getX(i)-l.x/100,y=p.getY(i)-l.y/100,v=new T.Vector2(uv.getX(i),uv.getY(i)).applyMatrix3(map.matrix);
  const expected=l.direction==='vertical'?[x/l.height,y/l.width]:[1-y/l.height,x/l.width];
  assert(periodicDistance(v.x,expected[0])<2e-6,`Horizontal graphic phase at vertex ${i}`);
  assert(periodicDistance(v.y,expected[1])<2e-6,`Vertical graphic phase at vertex ${i}`);vertices++;
 }
 map.dispose();
}

const provenance=JSON.parse(readFileSync('reports/allure-panels-sources-20261023.json'));
for(const id of decors){
 const color=COLLECTIONS.Allure.colors.find(c=>c.id===id),source=provenance.panels.find(p=>p.id===id);
 assert(color.continuousDecor);assert.equal(color.textureRotation,-90);assert.equal(color.resolution[1],color.resolution[0]*2);
 for(const profile of ['fluid','balanced','max']){
  const selected=resolveSurfaceTexture('Allure',id,profile);
  assert.equal(selected.rotation,-90);assert.equal(selected.files.length,1);assert(selected.files[0].includes('-panel-'));
  assert.equal(createHash('sha256').update(readFileSync(source.assets[profile].path)).digest('hex'),source.assets[profile].sha256);
 }
 for(const direction of ['horizontal','vertical'])for(const [x,y]of [[0,0],[-23,17],[37,-11]]){
  const surface=createSurface([[0,0],[3.65,0],[3.65,2.6],[0,2.6]],'Continuous drawing',[[[1.31,.8],[1.31,1.7],[2.19,1.7],[2.19,.8]]]);
  surface.setLayout({width:1.2,height:.6,direction,pattern:'straight',x,y,groutWidth:2});
  const geometry=surface.tiles.geometry,cells=JSON.stringify(geometry.userData.cells),original=Array.from(geometry.attributes.uv.array),finish={collection:'Allure',color:id};
  apply(surface,finish);checkDrawing(surface,finish);
  apply(surface,finish);checkDrawing(surface,finish);
  assert.equal(surface.tiles.geometry,geometry,'Material changes do not rebuild the cuts');
  assert.equal(JSON.stringify(geometry.userData.cells),cells,'Counted physical tiles and areas stay identical');
  apply(surface,{collection:'Allure',color:'snow'});
  assert.deepEqual(Array.from(geometry.attributes.uv.array),original,'Changing back to a plain material restores its original orientation');
  // Regroup triangles using a different material, then restore the full decor.
  const key=geometry.userData.cells.find(c=>c.key==='1:1')?.key||geometry.userData.cells[2].key;
  apply(surface,{collection:'Allure',color:'snow',tiles:{[key]:id}});
  apply(surface,finish);checkDrawing(surface,finish);
  surface.setExtraHoles([[[.2,.2],[.2,.6],[.7,.6],[.7,.2]]]);
  apply(surface,finish);checkDrawing(surface,finish);
  disposeObject(surface.group);
 }
}
// A legacy staggered project is repaired once, even with the normal rebuild
// callback installed. Direction and the user's grid origin are retained.
const room=makeRoom(DEFAULT_ROOM,0),wall=room.walls[0],finish={collection:'Allure',color:'fenix-juniper'};
wall.setLayout({width:1.2,height:.6,direction:'vertical',pattern:'offset',x:-13,y:21});
let refreshes=0;wall.refreshTileColors=()=>{refreshes++;apply(wall,finish);};
apply(wall,finish);assert.equal(wall.layout.pattern,'straight');assert.equal(wall.layout.direction,'vertical');assert.equal(wall.layout.x,-13);assert.equal(refreshes,1);checkDrawing(wall,finish);
room.dispose();
console.log(JSON.stringify({passed:true,decors,checkedVertices:vertices,checks:['Full manufacturer panels in all three quality profiles','Continuous graphic phase across horizontal/vertical joints and cut openings','Negative offsets, repeated material refresh and triangle regrouping','Plain finishes recover their original UVs','Legacy staggered layout repaired without losing direction or origin']}));
