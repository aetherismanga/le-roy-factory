import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeRoom,cloneRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';
import {buildProfiles} from '../../shared/lrf-3d/profiles.js';
import {overlapArea} from '../../shared/lrf-3d/plan-topology.mjs';
import {withDefaultNicheProfiles} from '../../shared/lrf-3d/niche-profile-options.js';

const create=(size={})=>{const niche={id:'niche-hd-mouth',wallKey:'boundary-0',u:160,bottom:100,width:100,height:40,depth:8,...size};return {niche,room:makeRoom({...cloneRoom(DEFAULT_ROOM),niches:[niche]},0)};};
const area=points=>Math.abs(points.reduce((sum,p,i)=>sum+p[0]*points[(i+1)%points.length][1]-points[(i+1)%points.length][0]*p[1],0))/2;

test('the four niche returns end behind the actual 8 mm front tile edge, with no coplanar extruded fringe outside the opening',()=>{
 for(const size of [{},{width:10,height:10,depth:2},{width:200,height:100,depth:8}]){
  const {room,niche}=create(size),wall=room.walls[0];
  for(const layout of [wall.layout,{...wall.layout,x:13,y:7,groutWidth:3}]){
   wall.setLayout(layout);room.root.updateMatrixWorld(true);assert.equal(wall.nicheSurfaces.length,5);
   for(const face of wall.nicheSurfaces){
    if(face.nichePart==='back')continue;
    assert(face.length>0&&face.height>0);
    for(const mesh of [face.tiles,face.grout]){
     const positions=mesh.geometry.attributes.position;
     for(let i=0;i<positions.count;i++){
      const point=new T.Vector3().fromBufferAttribute(positions,i);mesh.localToWorld(point);wall.group.worldToLocal(point);
      assert(point.z<=-.00819,face.nichePart+' has no front-plane fringe that can overlap the wall tile');
      assert(point.z>=-niche.depth/100-.00001,face.nichePart+' stays within the specified recess');
     }
    }
   }
  }
  room.dispose();
 }
});

test('the four metal trims meet at mitred corners without overlapping coplanar faces or thin-strip shadow acne',()=>{
 const {room,niche}=create();Object.assign(room.walls[0].niches[0],withDefaultNicheProfiles(niche,'Chrome brillant'));
 const profiles=buildProfiles(room,{enabled:false},room.walls.map(()=>({collection:'Peinture'})));profiles.group.updateMatrixWorld(true);
 const meshes=[];profiles.group.traverse(object=>{if(object.isMesh&&object.parent?.name.startsWith('Profile_niche_'))meshes.push(object);});assert.equal(meshes.length,4);
 const triangles=meshes.map(mesh=>{assert.equal(mesh.castShadow,false);const geometry=mesh.geometry,p=geometry.attributes.position,n=geometry.attributes.normal,front=[];for(let i=0;i<p.count;i+=3){if(n.getZ(i)<.99)continue;const points=[];for(let j=0;j<3;j++){const point=new T.Vector3().fromBufferAttribute(p,i+j);mesh.localToWorld(point);profiles.group.worldToLocal(point);points.push([point.x,point.y]);}front.push(points);}assert(front.length);return front;});
 for(let i=0;i<triangles.length;i++)for(let j=i+1;j<triangles.length;j++)for(const a of triangles[i])for(const b of triangles[j])assert(overlapArea(a,b)<1e-9,'Neighbouring front caps share only their mitre line');
 const frontArea=triangles.flat().reduce((sum,t)=>sum+area(t),0),perimeter=2*(niche.width+niche.height)/100;
 assert(Math.abs(frontArea-perimeter*.008)<1e-7,'The complete 8 mm frame has no gaps or double-covered corners');assert(Math.abs(profiles.metres-perimeter)<1e-9);
 profiles.group.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});room.dispose();
});
