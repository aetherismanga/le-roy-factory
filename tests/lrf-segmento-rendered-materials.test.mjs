import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createContext,runInContext} from 'node:vm';
import {parse} from 'acorn';
import * as T from 'three';
import {COLLECTIONS} from '../shared/lrf-3d/surface-catalog.js';
import {createSurface} from '../shared/lrf-3d/room.js';
import {applyTileColors} from '../shared/lrf-3d/tile-colors.js';
import {quantityForSurface,summarizeQuantities} from '../shared/lrf-3d/quantities.js';
import {SEGMENTO,segmentoLayout} from '../shared/lrf-3d/segmento.js';
import {finishForSurface,resolveSurfaceTexture} from '../shared/lrf-3d/surface-texture-selection.js';
import {applySurfaceTextureMapping,disposeSurfaceTextureClones,selectedCommercialSurface,surfaceFinishAppearance} from '../shared/lrf-3d/surface-appearance.js';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';

// Independently reviewed against flyer page7: the blue S01-C diamond contains
// 20 DuplexC and 16 Coelestis tiles. Lapis/green never belongs to this drawing.
// These rows follow the printed document from top to bottom; turns are bitmap
// clockwise degrees. This fixture deliberately does not derive from the JSON.
const reviewed={
 'S01-C':[
  'D270 C270 D90 D180 C0 D0',
  'C270 D90 C270 C0 D180 C180',
  'D90 C270 D90 D180 C180 D180',
  'D0 C180 D0 D270 C90 D270',
  'C180 D0 C180 C270 D270 C90',
  'D180 C0 D0 D270 C270 D90'
 ].map(row=>row.split(' ').map(value=>({color:value[0]==='D'?'duplex-c':'coelestis',rotation:Number(value.slice(1))}))),
 'S05-C':[
  [90,0,180,90,270,180],[180,180,270,0,90,90],
  [0,270,90,180,0,270],[90,180,0,270,90,180],
  [270,90,180,90,180,0],[0,90,270,0,180,270]
 ].map(row=>row.map(rotation=>({color:'duplex-e',rotation})))
};
const modulo=(n,p)=>((n%p)+p)%p;
const close=(actual,expected,label)=>assert(Math.abs(actual-expected)<4e-6,`${label}: ${actual} != ${expected}`);
const noop=()=>{};

function atelier(name,profile='balanced'){
 const app=name==='general'?'randal-general':'studio-one';
 let source=readFileSync(new URL('../'+app+'/src/app.js',import.meta.url),'utf8');
 if(name==='anima')source=transformCommonStudioSource(source,'app.js');
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),functions=new Map(ast.body.filter(node=>node.type==='FunctionDeclaration').map(node=>[node.id.name,source.slice(node.start,node.end)]));
 const files=new Map(),waiting=[],keys=new Set(),sources=new Map(),requests=[];
 const colorTexture=url=>{
  const entry=files.get(url);assert(entry,'The loader requests an actual selected reference image: '+url);
  const texture=new T.Texture({width:529,height:529,qaColor:entry.color,qaFile:entry.file});
  texture.userData.qaColor=entry.color;texture.userData.qaFile=entry.file;return texture;
 };
 const load=url=>new Promise(resolve=>waiting.push(()=>resolve(colorTexture(url))));
 const context={T,COLLECTIONS,resolveSurfaceTexture,finishForSurface,applyTileColors,applySurfaceTextureMapping,disposeSurfaceTextureClones,selectedCommercialSurface,surfaceFinishAppearance,
  quality:{profile:{id:profile},mobile:false},surfaceTextures:{},textureFlights:new Map(),tileFlights:new Map(),textureCache:new Map(),captureBusy:false,
  AbortController,textureProfile:()=>profile,renderer:{},textureLimit:()=>4096,fitTexture:noop,
  tileAssetURL:url=>url,loadTexture:load,loadQueuedTexture:load,
  pruneTextures:noop,pruneUnusedTextures:noop,cancelStaleSurfaceFlights:noop,
  activeTextureKeys:()=>({keys}),activeMaterialRequests:()=>({surfaces:sources}),
  sceneUpdates:{schedule:noop},applyAllRoomMaterials:noop,refreshLayouts:noop,invalidate:noop,placementStatus:noop,
  disposeTextures:noop,disposeTextureSet:noop,commercialOptions:()=>[],paintTexture:new T.Texture()};
 createContext(context);
 const needed=['cacheTextures','requestSurfaceAssets','updateSurfaceMaterial','applySurfaceTileColors'].filter(id=>functions.has(id));
 runInContext(needed.map(id=>functions.get(id)).join('\n'),context);
 const add=color=>{
  const selection=resolveSurfaceTexture('Segmento',color,profile,{format:'15x15'});
  keys.add(selection.cacheKey);sources.set(selection.sourceKey,['Segmento',color,{format:'15x15'}]);
  for(const file of selection.files)files.set(file,{color,file});
 };
 for(const color of SEGMENTO.colors)add(color.id);
 return {
  context,
  request(colors){for(const color of colors)requests.push(context.requestSurfaceAssets('Segmento',color,profile,{format:'15x15'}));},
  async flush(){for(const resolve of waiting.splice(0))resolve();await Promise.all([...requests.splice(0),...context.textureFlights.values(),...context.tileFlights.values()]);await Promise.resolve();},
  apply(surface,finish){context.applySurfaceTileColors(surface,finish);}
 };
}

function actualTriangles(surface){
 const geometry=surface.tiles.geometry,index=geometry.index.array,materials=Array.isArray(surface.tiles.material)?surface.tiles.material:[surface.tiles.material];
 const triangles=[];
 for(const group of geometry.groups){
  const material=materials[group.materialIndex];assert(material,'Every draw group has its assigned material');
  for(let at=group.start;at<group.start+group.count;at+=3){
   const vertices=[index[at],index[at+1],index[at+2]],face=Math.floor(vertices[0]/3);
   assert(vertices.every(vertex=>Math.floor(vertex/3)===face),'Indexed grouping retains an intact source triangle');
   const key=(geometry.userData.sourceFaceCells||geometry.userData.faceCells)[face];
   assert.equal(geometry.userData.faceCells[at/3],key,'Draw-order face keys agree with the indexed triangle');
   triangles.push({vertices,key,material});
  }
 }
 assert(triangles.length>72,'Actual tile faces and cut edges, rather than only declarations, were inspected');
 return triangles;
}

function verify(surface,id,{pending=false}={}){
 const geometry=surface.tiles.geometry,{position,normal,uv}=geometry.attributes,l=surface.layout,oracle=reviewed[id],counts=new Map();
 const sourceCells=new Set();let frontVertices=0;
 for(const {vertices,key,material} of actualTriangles(surface)){
  const [col,row]=key.split(':').map(Number),expected=oracle[5-modulo(row,6)][modulo(col,6)],map=material.map;
  if(map)assert.equal(map.image.qaColor,expected.color,`${id} ${key}: the actual sampled texture belongs to the reviewed colour`);
  else assert(pending,`${id} ${key}: a complete reference texture is loaded`);
  if(!sourceCells.has(key)){sourceCells.add(key);counts.set(expected.color,(counts.get(expected.color)||0)+1);}
  for(const vertex of vertices){
   if(normal.getZ(vertex)<.99)continue;
   let x=position.getX(vertex),y=position.getY(vertex);if(l.planAxes)y=-y;
   const [px,py]=l.direction==='vertical'?[y-l.y/100,-x+l.x/100]:[x-l.x/100,y-l.y/100];
   const u=px/l.width-col,v=py/l.height-row,angle=expected.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
   close(uv.getX(vertex),.5+c*(u-.5)-s*(v-.5),`${id} ${key} bitmap-clockwise U`);
   close(uv.getY(vertex),.5+s*(u-.5)+c*(v-.5),`${id} ${key} bitmap-clockwise V`);
   frontVertices++;
  }
 }
 assert(frontVertices>150,'The rendered front UV coordinates were checked');
 return counts;
}

function dump(surface,name){
 const directory=process.env.LRF_SEGMENTO_CPU_OUTPUT;if(!directory)return;
 mkdirSync(directory,{recursive:true});
 const {position,normal,uv}=surface.tiles.geometry.attributes,triangles=[];
 for(const triangle of actualTriangles(surface)){
  if(!triangle.vertices.every(vertex=>normal.getZ(vertex)>.99)||!triangle.material.map)continue;
  const map=triangle.material.map;map.updateMatrix();
  triangles.push({file:map.image.qaFile,color:map.image.qaColor,vertices:triangle.vertices.map(vertex=>{const sample=map.transformUv(new T.Vector2(uv.getX(vertex),uv.getY(vertex)));return {position:[position.getX(vertex),position.getY(vertex)],sample:sample.toArray()};})});
 }
 writeFileSync(join(directory,name+'.json'),JSON.stringify({layout:surface.layout,polygon:surface.polygon,triangles}));
}

for(const name of ['studio','general','anima'])test(`${name}: the S01-C wall samples only the reviewed blue references after loading, regrouping and pattern changes`,async()=>{
 const h=atelier(name),surface=createSurface([[0,0],[.9,0],[.9,.9],[0,.9]],'Reviewed Segmento wall');
 surface.setLayout({width:.15,height:.15});
 h.request(['lapis','duplex-c']);await h.flush();
 h.apply(surface,{collection:'Segmento',color:'lapis',format:'15x15'});
 surface.setLayout(segmentoLayout(surface.layout,'S01-C'));
 const finish={collection:'Segmento',color:'duplex-c',format:'15x15',tiles:{}};
 h.apply(surface,finish);verify(surface,'S01-C',{pending:true});
 await h.flush();h.apply(surface,finish);
 assert.deepEqual(Object.fromEntries(verify(surface,'S01-C')),{'duplex-c':20,coelestis:16},'A full repeat matches the independent PDF count, with no green tile');
 dump(surface,name+'-s01-c');
 for(let repeat=0;repeat<3;repeat++){h.apply(surface,finish);verify(surface,'S01-C');}
 surface.setLayout(segmentoLayout(surface.layout,'S05-C'));h.request(['duplex-e']);await h.flush();h.apply(surface,{...finish,color:'duplex-e'});verify(surface,'S05-C');
 surface.setLayout(segmentoLayout(surface.layout,'S01-C'));h.apply(surface,finish);verify(surface,'S01-C');
 surface.setExtraHoles([[[.24,.23],[.24,.47],[.46,.47],[.46,.23]]]);h.apply(surface,finish);verify(surface,'S01-C');
 surface.tiles.geometry.dispose();surface.material.dispose();for(const material of surface.tileMaterials||[])material.dispose();
});

test('Segmento drawing phase, colours and UVs survive negative grids, vertical layouts and floor axes',async()=>{
 const h=atelier('studio');h.request(['duplex-c','coelestis','duplex-e']);await h.flush();
 for(const direction of ['horizontal','vertical'])for(const planAxes of [false,true]){
  const surface=createSurface([[-.21,-.18],[.73,-.18],[.73,.78],[-.21,.78]],'Cut Segmento phase',[[[.12,.13],[.12,.31],[.29,.31],[.29,.13]]]);
  surface.setLayout(segmentoLayout({direction,planAxes,x:17,y:-11},'S01-C'));
  const finish={collection:'Segmento',color:'duplex-c',format:'15x15',tiles:{}};
  h.apply(surface,finish);verify(surface,'S01-C');h.apply(surface,finish);verify(surface,'S01-C');
  assert(surface.tiles.geometry.userData.cells.some(cell=>cell.key.split(':').some(value=>Number(value)<0)));
  surface.tiles.geometry.dispose();surface.material.dispose();for(const material of surface.tileMaterials||[])material.dispose();
 }
});

test('the nine corrected manufacturer drawings produce independently reviewed per-reference purchase quantities',()=>{
 // Counts reviewed on the PDF images, not calculated from the JSON under test.
 const expectedSourceCounts={
  'S01-C':{'duplex-c':20,coelestis:16},'S02-B':{'duplex-f':36},
  'S05-D':{'duplex-c':32,caeruleus:4},'S08-A':{coelestis:36},
  'S09-A':{albus:24,caeruleus:12},'S10-B':{caeruleus:36},
  'S11-C':{albus:9,caeruleus:18,coelestis:9},
  'S11-E':{caeruleus:18,coelestis:18},'S11-F':{'duplex-f':36}
 };
 for(const [id,expected] of Object.entries(expectedSourceCounts)){
  const surface=createSurface([[0,0],[.9,0],[.9,.9],[0,.9]],'Reviewed purchase repeat');
  surface.setLayout(segmentoLayout({},id));
  const finish={collection:'Segmento',color:Object.keys(expected)[0],format:'15x15'},row=quantityForSurface(surface,finish,surface.layout,10,id);
  assert.deepEqual(Object.fromEntries(row.components.map(part=>[part.color,part.tileCount])),expected,id+' uses the printed reference counts');
  close(row.components.reduce((sum,part)=>sum+part.area,0),.81,id+' total tiled area');
  for(const part of summarizeQuantities([row,row])){
   const count=expected[part.color];assert.equal(part.tileCount,2*count,id+' aggregated pieces');
   close(part.area,2*count*.15*.15,id+' per-reference area');
   close(part.needed,part.area*1.1,id+' per-reference waste allowance');
   assert.equal(part.pcsBox,46);assert.equal(part.m2Box,1.04);
   assert.equal(part.boxes,Math.ceil((2*count*.15*.15*1.1-1e-8)/1.04),id+' boxes round after aggregation');
   assert.equal(part.orderPieces,part.boxes*46);assert(part.reference&&part.catalogueKey,id+' preserves commercial identity');
  }
  surface.tiles.geometry.dispose();surface.material.dispose();
 }
});
