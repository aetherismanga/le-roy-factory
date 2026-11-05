import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import {COLLECTIONS} from '../shared/lrf-3d/surface-catalog.js';
import {createSurface} from '../shared/lrf-3d/room.js';
import {applyTileColors} from '../shared/lrf-3d/tile-colors.js';

const collection='QA four-tile quarter motifs';
// Physical rows increase upward. These four samples join the source face's
// upper-right corner at the shared centre, using one whole face per tile.
const turns=[0,3,1,2];
const decor={id:'quarter',continuousDecor:true,decorRotations:{columns:2,rows:2,quarterTurns:turns},faces:['quarter.webp']};
const plain={id:'plain',faces:['plain.webp']};
const atlas={id:'atlas',continuousDecor:true,decorRepeat:{columns:2,rows:2},faces:['atlas.webp']};
const apply=(surface,finish)=>applyTileColors(surface,{collection,...finish},()=>new T.MeshPhysicalMaterial());
const close=(actual,expected,message)=>assert(Math.abs(actual-expected)<3e-6,`${message}: ${actual} ≠ ${expected}`);
const modulo=(value,period)=>value-period*Math.floor(value/period);

function verify(surface,finish={color:'quarter'}){
 const g=surface.tiles.geometry,{position,normal,uv}=g.attributes,l=surface.layout,source=g.userData.sourceFaceCells;
 let vertices=0;
 for(let face=0;face<source.length;face++){
  const key=source[face],[col,row]=key.split(':').map(Number),id=finish.tiles?.[key]||finish.color;
  for(let vertex=face*3;vertex<face*3+3;vertex++){
   if(normal.getZ(vertex)<.99)continue;
   const x=position.getX(vertex),y=l.planAxes?-position.getY(vertex):position.getY(vertex),[px,py]=l.direction==='vertical'?[y-l.y/100,-x+l.x/100]:[x-l.x/100,y-l.y/100];
   const u=px/l.width-col,v=py/l.height-row;
   if(id==='quarter'){
    const turn=decor.decorRotations.quarterTurns[modulo(row,2)*2+modulo(col,2)],angle=turn*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle);
    // Independently rotate coordinates around the full physical tile centre.
    close(uv.getX(vertex),.5+c*(u-.5)-s*(v-.5),'Quarter-motif horizontal sample');
    close(uv.getY(vertex),.5+s*(u-.5)+c*(v-.5),'Quarter-motif vertical sample');
   }else if(id==='atlas'){
    close(uv.getX(vertex),(modulo(col,2)+u)/2,'Full-panel atlas horizontal sample');
    close(uv.getY(vertex),(modulo(row,2)+v)/2,'Full-panel atlas vertical sample');
   }else{
    close(uv.getX(vertex),g.userData.originalTileUV[vertex*2],'Plain horizontal sample');
    close(uv.getY(vertex),g.userData.originalTileUV[vertex*2+1],'Plain vertical sample');
   }
   vertices++;
  }
 }
 assert(vertices>30,'Real cut tile geometry was checked');
}

test('quarter motifs join at one centre across four distinct physical tiles',()=>{
 COLLECTIONS[collection]={brand:'ELIOS',colors:[decor,plain,atlas],formats:[{id:'20x20',width:.2,height:.2}]};
 try{
  const surface=createSurface([[0,0],[.4,0],[.4,.4],[0,.4]],'Four-tile motif');
  surface.setLayout({width:.2,height:.2,groutWidth:2});
  const geometry=surface.tiles.geometry,cells=JSON.stringify(geometry.userData.cells);
  apply(surface,{color:'quarter'});
  assert.equal(geometry.userData.cells.length,4);
  const {position,normal,uv}=geometry.attributes,source=geometry.userData.sourceFaceCells;
  const samples=new Map();
  for(let face=0;face<source.length;face++)for(let i=face*3;i<face*3+3;i++){
   if(normal.getZ(i)<.99)continue;
   const key=source[face],distance=Math.hypot(position.getX(i)-.2,position.getY(i)-.2);
   if(distance<(samples.get(key)?.distance??Infinity))samples.set(key,{distance,u:uv.getX(i),v:uv.getY(i)});
  }
  assert.equal(samples.size,4);
  for(const sample of samples.values()){
   close(sample.u,.995,'Every tile presents the same source corner at the join');
   close(sample.v,.995,'Every tile presents the same source corner at the join');
  }
  verify(surface);apply(surface,{color:'quarter'});verify(surface);
  assert.equal(surface.tiles.geometry,geometry);
  assert.equal(JSON.stringify(geometry.userData.cells),cells,'Rotation preserves quantities and real 20 cm cell dimensions');
 }finally{delete COLLECTIONS[collection];}
});

test('quarter motif phase survives negative grids, cuts, regrouping and saved layout changes',()=>{
 COLLECTIONS[collection]={brand:'ELIOS',colors:[decor,plain,atlas],formats:[{id:'20x20',width:.2,height:.2}]};
 try{
  for(const direction of ['horizontal','vertical'])for(const planAxes of [false,true])for(const [x,y]of [[0,0],[-23,17],[37,-11]]){
   const surface=createSurface([[-.48,-.37],[1.71,-.37],[1.71,1.42],[.83,1.42],[.83,1.1],[-.48,1.1]],'Cut quarter motifs',[[[.12,.14],[.12,.61],[.58,.61],[.58,.14]]]);
   surface.setLayout({width:.2,height:.2,direction,planAxes,pattern:'straight',x,y,groutWidth:3});
   const original=Array.from(surface.tiles.geometry.attributes.uv.array);
   apply(surface,{color:'quarter'});verify(surface);
   assert(surface.tiles.geometry.userData.cells.some(c=>c.key.split(':').some(v=>Number(v)<0)),'The case actually contains negative grid cells');
   const key=surface.tiles.geometry.userData.cells[2].key,mixed={color:'plain',tiles:{[key]:'quarter'}};
   apply(surface,mixed);verify(surface,mixed);
   assert(surface.tiles.geometry.groups.length>1,'Material grouping really reorders the indexed faces');
   apply(surface,{color:'quarter'});verify(surface);
   apply(surface,{color:'plain'});
   assert.deepEqual(Array.from(surface.tiles.geometry.attributes.uv.array),original,'Plain finish restores all original UVs exactly');
   apply(surface,{color:'atlas'});verify(surface,{color:'atlas'});
   apply(surface,{color:'quarter'});verify(surface);
   surface.setExtraHoles([[[.9,.05],[.9,.4],[1.2,.4],[1.2,.05]]]);
   apply(surface,{color:'quarter'});verify(surface);
   const saved=JSON.parse(JSON.stringify(surface.layout));
   surface.setLayout({...saved,pattern:'third'});
   apply(surface,{color:'quarter'});verify(surface);
   assert.equal(surface.layout.pattern,'straight','A restored stagger cannot break the motif');
   assert.equal(surface.layout.x,x);assert.equal(surface.layout.y,y);assert.equal(surface.layout.direction,direction);
   const before=Array.from(surface.tiles.geometry.attributes.uv.array);
   decor.decorRotations={columns:2,rows:2,quarterTurns:turns.map(turn=>turn+1)};
   apply(surface,{color:'quarter'});verify(surface);
   assert.notDeepEqual(Array.from(surface.tiles.geometry.attributes.uv.array),before,'Updated orientation metadata invalidates cached UVs');
   decor.decorRotations={columns:2,rows:2,quarterTurns:turns};
   apply(surface,{color:'quarter'});verify(surface);
   const raw=Array.from(surface.tiles.geometry.userData.originalTileUV);
   applyTileColors(surface,{collection:'Creta',color:'avena'},()=>new T.MeshPhysicalMaterial());
   assert.deepEqual(Array.from(surface.tiles.geometry.attributes.uv.array),raw,'Changing collection clears quarter rotations');
  }
 }finally{decor.decorRotations={columns:2,rows:2,quarterTurns:turns};delete COLLECTIONS[collection];}
});

test('Elios stock variants use the exact manufacturer placement schemas',()=>{
 const expected={
  'original-c-grey':[0,3,1,2],'original-c-taupe':[0,3,1,2],
  'geo-a-light-blue':[1,0,2,3],'geo-b-bw':[1,0,2,3],'geo-c-taupe':[1,0,2,3]
 };
 for(const [id,quarterTurns]of Object.entries(expected)){
  const color=COLLECTIONS.Deco.colors.find(c=>c.id===id);
  assert.deepEqual(color.decorRotations,{columns:2,rows:2,quarterTurns});
  assert.equal(color.continuousDecor,true);
  assert.equal(color.decorRepeat,undefined,'A whole stock tile is rotated, never cropped into quarters');
  assert.equal(color.faces.length,1);
 }
 for(const id of ['original-b-bw','original-b-light-blue','original-d-grey','original-d-taupe']){
  const color=COLLECTIONS.Deco.colors.find(c=>c.id===id);
  assert.equal(color.decorRepeat,undefined,'Manufacturer full-tile motif remains a full20cm tile');
  assert.equal(color.decorRotations,undefined);
 }
 const surface=createSurface([[0,0],[.8,0],[.8,.8],[0,.8]],'Actual stock decorative wall');
 surface.setLayout({width:.2,height:.2,pattern:'straight'});
 for(const id of Object.keys(expected)){
  const finish={collection:'Deco',color:id,format:'20x20'};
  applyTileColors(surface,finish,()=>new T.MeshPhysicalMaterial());
  const {uv}=surface.tiles.geometry.attributes,source=surface.tiles.geometry.userData.sourceFaceCells;
  const centres=[];
  for(let face=0;face<source.length;face++){
   const [col,row]=source[face].split(':').map(Number);
   if(col>1||row>1||col<0||row<0)continue;
   const turn=expected[id][row*2+col],u=1-col,v=1-row,angle=turn*Math.PI/2;
   centres.push([.5+Math.cos(angle)*(u-.5)-Math.sin(angle)*(v-.5),.5+Math.sin(angle)*(u-.5)+Math.cos(angle)*(v-.5)]);
  }
  assert(uv.count>0);assert(centres.length>4);
  for(const [u,v]of centres){close(u,id.startsWith('geo')?0:1,'Correct stock source corner');close(v,1,'Source top corner');}
 }
});
