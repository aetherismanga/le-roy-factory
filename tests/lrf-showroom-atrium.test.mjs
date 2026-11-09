import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeShowroomHall} from '../shared/lrf-3d/showroom-hall.js';
import {makeShowroomLayout} from '../shared/lrf-3d/showroom-layout.js';
import {SHOWROOM_MANUFACTURERS} from '../shared/lrf-3d/showroom-catalog.js';

const blocked=(hall,x,z,r=.2)=>hall.colliders.some(b=>x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ);
function nativeHits(root,origin,direction,far=100){
 root.updateMatrixWorld(true);const ray=new T.Raycaster(origin,direction,0,far),hits=[];
 root.traverseVisible(object=>{if(object.isMesh)(object.isInstancedMesh?T.InstancedMesh.prototype:T.Mesh.prototype).raycast.call(object,ray,hits);});
 return hits.sort((a,b)=>a.distance-b.distance);
}
function walkingGrid(hall,start){
 const b=hall.navigableBounds,step=.2,minX=b.minX+.22,minZ=b.minZ+.22,cols=Math.floor((b.maxX-.22-minX)/step)+1,rows=Math.floor((b.maxZ-.22-minZ)/step)+1;
 const open=new Uint8Array(cols*rows),reached=new Uint8Array(cols*rows),index=(x,z)=>z*cols+x;
 for(let z=0;z<rows;z++)for(let x=0;x<cols;x++)open[index(x,z)]=!blocked(hall,minX+x*step,minZ+z*step);
 function nearest(point){let result=-1,distance=Infinity;for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){const x=Math.round((point.x-minX)/step)+dx,z=Math.round((point.z-minZ)/step)+dz;if(x<0||x>=cols||z<0||z>=rows)continue;const n=index(x,z),d=Math.hypot(minX+x*step-point.x,minZ+z*step-point.z);if(open[n]&&d<distance){distance=d;result=n;}}return {index:result,distance};}
 const first=nearest(start);assert(first.index>=0&&first.distance<.3,'the arrival has a real human-width floor position');
 const queue=[first.index];reached[first.index]=1;
 for(let head=0;head<queue.length;head++){const n=queue[head],x=n%cols,z=Math.floor(n/cols);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||xx>=cols||zz<0||zz>=rows)continue;const next=index(xx,zz);if(open[next]&&!reached[next]){reached[next]=1;queue.push(next);}}}
 return {reaches(point){const goal=nearest(point);return goal.index>=0&&goal.distance<.3&&reached[goal.index]===1;},area:queue.length*step*step};
}

test('the complete supplier exhibition forms a wide atrium of open islands with accessible approaches',()=>{
 const hall=makeShowroomHall({manufacturers:SHOWROOM_MANUFACTURERS}),layout=makeShowroomLayout(SHOWROOM_MANUFACTURERS);
 try{
  assert.equal(hall.stands.length,17);assert.equal(hall.dimensions.width,28);assert.equal(hall.dimensions.height,4.4);assert(hall.dimensions.depth<=34);
  assert(hall.dimensions.width/hall.dimensions.depth>.8,'arrival opens into a wide room');
  for(const stand of hall.stands){assert(stand.walls.length>=1&&stand.walls.length<=2,'each island has a backdrop and at most one short return');for(const wall of stand.walls)assert(wall.userData.wallHeight<=2.25);}
  const grid=walkingGrid(hall,layout.arrival);assert(grid.area>450,'a broad connected floor loop surrounds the displays');
  for(const display of layout.displays)assert(grid.reaches(display.approach),'human-width route reaches '+display.manufacturer.name);
 }finally{hall.dispose();}
});

test('continuous mineral flooring and collection architecture stay visible across the entire visit',async()=>{
 const hall=makeShowroomHall({manufacturers:SHOWROOM_MANUFACTURERS});hall.root.visible=true;
 try{
  const base=hall.floorPatches[0],recipe=base.userData.showroomRecipe;assert.equal(recipe.collection,'Creta');assert.equal(recipe.colorId,'biscotto');
  const bounds=new T.Box3().setFromObject(base);assert(bounds.max.x-bounds.min.x>=hall.dimensions.width-.01);assert(bounds.max.z-bounds.min.z>=hall.dimensions.depth-.01);
  for(const position of [new T.Vector3(0,1.58,-1.4),new T.Vector3(8,1.58,-28)]){
   await hall.prepareNear(position);
   assert.equal(base.visible,true);assert(hall.stands.every(stand=>stand.group.visible),'distant collection backdrops stay in the architecture');
   for(let z=-1;z>-hall.dimensions.depth+1;z-=2.5)for(let x=-hall.dimensions.width/2+1;x<hall.dimensions.width/2-1;x+=2.5){
    const hits=nativeHits(base,new T.Vector3(x,.1,z),new T.Vector3(0,-1,0),.2);assert(hits.length,'permanent floor beneath '+x+','+z+' when viewing from '+position.z);
   }
  }
  const wood=hall.floorPatches.filter(p=>p.userData.showroomRecipe.collection==='Yosemite');assert.equal(wood.length,2,'wood appears in two contained room scenes');
 }finally{hall.dispose();}
});

test('actual native furniture is visible in the arrival sightline before the visitor enters a display',async()=>{
 const hall=makeShowroomHall({manufacturers:SHOWROOM_MANUFACTURERS}),layout=makeShowroomLayout(SHOWROOM_MANUFACTURERS);hall.root.visible=true;
 try{
  const origin=new T.Vector3(layout.arrival.x,1.58,layout.arrival.z);await hall.prepareNear(origin);await hall.fixtures.prepareNear(origin);
  const visibleFurniture=new Set();
  for(const y of [.75,1.2,1.65])for(let x=-5;x<=6;x+=.4){const target=new T.Vector3(x,y,-10.5),hit=nativeHits(hall.root,origin,target.sub(origin).normalize(),16)[0];if(hit?.object.userData.nativeGeometry)visibleFurniture.add(hit.object.uuid);}
  assert(visibleFurniture.size>0,'arrival rays reach furnished bathroom geometry instead of only longitudinal tile walls');
 }finally{hall.dispose();}
});
