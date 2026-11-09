import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeShowroomHall} from '../shared/lrf-3d/showroom-hall.js';
import {makeDoorInterior} from '../shared/lrf-3d/door-interior.js';
import {SHOWROOM_MANUFACTURERS} from '../shared/lrf-3d/showroom-catalog.js';
import {createShowroomVisit,showroomMoveAllowed} from '../shared/lrf-3d/showroom-visit.js';
import {disposeObject} from '../studio-one/src/composition.js';

function nativeHits(root,origin,direction,far=100){
 root.updateMatrixWorld(true);const ray=new T.Raycaster(origin,direction,0,far),hits=[];
 root.traverseVisible(object=>{if(object.isMesh)(object.isInstancedMesh?T.InstancedMesh.prototype:T.Mesh.prototype).raycast.call(object,ray,hits);});
 return hits.sort((a,b)=>a.distance-b.distance);
}
function spaceFixture(angle=0){
 const space=makeDoorInterior();space.root.position.set(8.2,0,-5.4);space.root.rotation.y=angle;space.setVisible(true);space.setInnerOpen(true);space.root.updateMatrixWorld(true);
 const hall=space.showroom,item={id:'garden-door',type:'door',root:space.root,asset:{visitInterior:space},settings:{doorOpen:true},dimensions:{width:.83}};
 const world=(x,z,y=1.58)=>hall.root.localToWorld(new T.Vector3(x,y,z));
 return {space,hall,item,world,close(){space.endVisit();disposeObject(space.root);}};
}
function floodFill(hall){
 const b=hall.navigableBounds,step=.25,minX=b.minX+.25,minZ=b.minZ+.25,cols=Math.floor((b.maxX-.25-minX)/step)+1,rows=Math.floor((b.maxZ-.25-minZ)/step)+1,open=new Uint8Array(cols*rows),seen=new Uint8Array(cols*rows);
 const index=(x,z)=>z*cols+x;
 for(let z=0;z<rows;z++)for(let x=0;x<cols;x++)open[index(x,z)]=hall.canWalk({x:minX+x*step,z:minZ+z*step},.2);
 const nearby=point=>{let result=-1,dist=Infinity;for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){const x=Math.round((point.x-minX)/step)+dx,z=Math.round((point.z-minZ)/step)+dz;if(x<0||x>=cols||z<0||z>=rows)continue;const n=index(x,z),d=Math.hypot(minX+x*step-point.x,minZ+z*step-point.z);if(open[n]&&d<dist){result=n;dist=d;}}return {index:result,distance:dist};};
 const start=nearby(hall.layout.arrival);assert(start.index>=0&&start.distance<.3);const queue=[start.index];seen[start.index]=1;
 for(let head=0;head<queue.length;head++){const n=queue[head],x=n%cols,z=Math.floor(n/cols);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||xx>=cols||zz<0||zz>=rows)continue;const next=index(xx,zz);if(open[next]&&!seen[next]){seen[next]=1;queue.push(next);}}}
 return point=>{const p=nearby(point);return p.index>=0&&p.distance<.3&&seen[p.index]===1;};
}

test('solid walls and a mostly opaque lowered roof retain two genuine skylights and the garden opening',()=>{
 const hall=makeShowroomHall({manufacturers:SHOWROOM_MANUFACTURERS});hall.root.visible=true;
 try{
  assert.equal(hall.dimensions.height,3.6);const roofObjects=[],skylights=[];
  hall.root.traverse(object=>{if(!object.isMesh)return;if(object.name==='Lanterneau_atrium'){skylights.push(object);roofObjects.push(object);}if(object.userData.architecturalParts?.includes('Plafond_opaque_atrium')){roofObjects.push(object);assert.equal(object.castShadow,true,'merged ceiling keeps the opaque shadow caster');}});
  assert.equal(skylights.length,2);let opaque=0,glass=0;
  const roof=new T.Group();for(const object of roofObjects){const copy=object.clone();copy.matrix.copy(object.matrix);roof.add(copy);}roof.updateMatrixWorld(true);
  for(let z=-32.75;z<-.25;z+=.5)for(let x=-13.75;x<13.75;x+=.5){const hit=nativeHits(roof,new T.Vector3(x,3.3,z),new T.Vector3(0,1,0),.8)[0];assert(hit,'the ceiling has no unintended opening');if(hit.object.material.transparent)glass++;else opaque++;}
  assert(opaque/(opaque+glass)>.9,'more than90% of the actual roof is solid');assert(glass>0);
  let solid=0,total=0;for(const side of [-1,1])for(let z=-32.4;z<-.5;z+=1){const hit=nativeHits(hall.root,new T.Vector3(side*13.7,1.8,z),new T.Vector3(side,0,0),.7)[0];total++;if(hit&&hit.object.material.transparent!==true&&hit.object.userData.showroomRecipe)solid++;}
  assert(solid/total>.75,'native collection cladding covers most of both side façades');
  assert.equal(nativeHits(hall.root,new T.Vector3(13.7,1.58,-10.7),new T.Vector3(1,0,0),.6).length,0,'the3.2m garden entrance has no hidden wall, pane or backing');
 }finally{hall.dispose();}
});

test('a human-width route connects the hall, garden passage and every side of the pool without leaving the L-shaped site',()=>{
 const f=spaceFixture();try{
  const reaches=floodFill(f.hall);
  for(const point of [{x:14,z:-10.7},{x:21,z:-16},{x:30.65,z:-16},{x:26,z:-9.5},{x:26,z:-22.5}]){assert(f.hall.canWalk(point,.2),'clear poolside or doorway position '+JSON.stringify(point));assert(reaches(point),'connected route from the arrival to '+JSON.stringify(point));}
  for(const point of [{x:26,z:-16},{x:22.05,z:-16},{x:29.95,z:-16},{x:26,z:-11.05},{x:26,z:-20.95},{x:20,z:-1},{x:20,z:-31},{x:35.1,z:-16}])assert.equal(f.hall.canWalk(point,.2),false,'pool water and outside L-shaped regions are not walkable');
 }finally{f.close();}
});

test('the actual door navigation crosses the right-hand passage and blocks the pool at every door rotation',()=>{
 for(const angle of [0,Math.PI/2,.43]){
  const f=spaceFixture(angle);try{
   let previous=f.world(13,-10.7);
   for(let x=13.05;x<15.4;x+=.05){const next=f.world(x,-10.7);assert.equal(showroomMoveAllowed([f.item],previous,next,.2),true,'connected transformed garden portal at '+angle);previous=next;}
   for(const [from,to]of [[[21.5,-16],[22.05,-16]],[[30.5,-16],[29.95,-16]],[[26,-10.5],[26,-11.05]],[[26,-21.5],[26,-20.95]]])assert.equal(showroomMoveAllowed([f.item],f.world(...from),f.world(...to),.2),false,'the pool footprint blocks entering the water');
  }finally{f.close();}
 }
});

test('changing a pool collection replaces the actual basin surfaces and releases the previous geometry exactly once',()=>{
 const hall=makeShowroomHall({manufacturers:SHOWROOM_MANUFACTURERS}),garden=hall.garden;
 try{
  const original=garden.poolSurface,oldId=garden.selectedCollectionId,next=garden.choices.find(choice=>choice.id!==oldId),geometry=new Map();original.traverse(object=>{if(object.isMesh&&!geometry.has(object.geometry))geometry.set(object.geometry,0);});for(const g of geometry.keys())g.addEventListener('dispose',()=>geometry.set(g,geometry.get(g)+1));
  assert.equal(garden.setPoolCollection('nonexistent-product'),false);assert.equal(garden.poolSurface,original);
  assert.equal(garden.setPoolCollection(next.id),true);assert.equal(garden.selectedCollectionId,next.id);assert.notEqual(garden.poolSurface,original);assert.equal(original.parent,null);
  assert.equal(garden.poolSurface.children.length,5,'the actual floor and four basin walls receive the selected collection');
  for(const patch of garden.poolSurface.children){assert.equal(patch.userData.showroomRecipe.id,next.id);for(const mesh of patch.children.filter(object=>object.name.startsWith('Surface_')))assert.equal(mesh.material.userData.showroomRecipe.id,next.id);}
  for(const count of geometry.values())assert.equal(count,1);hall.dispose();for(const count of geometry.values())assert.equal(count,1);
 }finally{hall.dispose();}
});

class Node{
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attrs={};this.dataset={};this.events=new Map();this.style={};const names=new Set();this.classList={toggle:(key,next)=>{if(next===undefined)next=!names.has(key);if(next)names.add(key);else names.delete(key);return next;},contains:key=>names.has(key)};}
 setAttribute(name,value){this.attrs[name]=String(value);}
 append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(node=>node!==this);this.parentNode=null;}
 addEventListener(type,fn){const list=this.events.get(type)||[];list.push(fn);this.events.set(type,list);}
 async emit(type,extra={}){await Promise.all((this.events.get(type)||[]).map(fn=>fn({type,target:this,preventDefault(){},...extra})));}
 showModal(){this.open=true;}
 close(){this.open=false;}
 focus(){this.ownerDocument.activeElement=this;}
 getContext(){return null;}
 getBoundingClientRect(){return {left:0,top:0,width:100,height:100,right:100,bottom:100};}
}
function nodes(root,predicate){const result=[];function walk(node){if(predicate(node))result.push(node);for(const child of node.children||[])walk(child);}walk(root);return result;}

test('tapping real water opens the finish chooser and an actual finish selection updates the basin and resumes walking',async()=>{
 const prior=globalThis.document,doc={createElement:tag=>new Node(tag,doc),activeElement:null};globalThis.document=doc;
 const f=spaceFixture(.43),stage=new Node('main',doc),canvas=new Node('canvas',doc),camera=new T.PerspectiveCamera(50,1,.035,120),overlays=[];
 const visit=createShowroomVisit({stage,canvas,camera,getItems:()=>[f.item],onOverlay:value=>overlays.push(value)});
 try{
  const settings=JSON.stringify(f.item.settings);camera.position.copy(f.world(21,-16));camera.lookAt(f.world(26,-16,-.17));camera.updateMatrixWorld(true);visit.update(camera.position);
  assert.equal(visit.occupiedId,f.item.id);assert.equal(visit.tap({clientX:50,clientY:50}),true);assert.equal(visit.blocked,true);
  const before=f.hall.garden.poolSurface,next=f.hall.garden.choices.find(choice=>choice.id!==f.hall.garden.selectedCollectionId),apply=nodes(stage,node=>node.dataset?.poolFinish===next.id)[0];assert(apply,'a real pool finish can be applied');await apply.emit('click');
  assert.equal(f.hall.garden.selectedCollectionId,next.id);assert.notEqual(f.hall.garden.poolSurface,before);assert.equal(visit.blocked,false);assert.equal(stage.children.length,0);assert.equal(JSON.stringify(f.item.settings),settings,'garden experiments do not alter the bathroom project');
  camera.position.copy(f.world(21,-22.5));camera.lookAt(f.world(29.2,-11.8,-.17));camera.updateMatrixWorld(true);visit.update(camera.position);assert.equal(visit.tap({clientX:50,clientY:50}),true,'a visible far pool corner remains selectable beyond the indoor7m range');assert.equal(visit.blocked,true);visit.close();assert.equal(overlays.at(-1),false);
 }finally{visit.exit();f.close();globalThis.document=prior;}
});

test('water keeps moving near the garden, stays idle at the far side of the hall and stops after disposal',()=>{
 const hall=makeShowroomHall({manufacturers:SHOWROOM_MANUFACTURERS});try{
  const normal=hall.garden.water.material.normalMap,initial=normal.offset.clone();assert.equal(hall.animate({x:0,z:-1.4},5),false);assert(normal.offset.equals(initial));
  assert.equal(hall.animate({x:21,z:-16},5),true);assert(!normal.offset.equals(initial));const near=normal.offset.clone();assert.equal(hall.animate({x:12,z:-10.7},10),true,'the garden animates while approaching its open doorway');assert(!normal.offset.equals(near));
  hall.dispose();assert.equal(hall.animate({x:21,z:-16},15),false);
 }finally{hall.dispose();}
});
