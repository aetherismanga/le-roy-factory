import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeRoom,cloneRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';
import {makeEquipment,equipmentError} from '../../shared/lrf-3d/equipment.js';
import {isWallMountedSanitary,nicheFitsSanitary,sanitaryMountError} from '../../shared/lrf-3d/sanitary-mount.js';
import {ProjectJournal,encodeProject,decodeProject} from '../../studio-one/src/projects.js';

const applications=await Promise.all(['studio-one','randal-general'].map(async name=>({name,...await import('../../'+name+'/src/composition.js')})));
const support={reference:'TR2217R',support:true,supportCovering:{mode:'inherit'}};
function create(comp,settings=support,placement={wall:0,u:100,height:0}){
 const result=comp.add('toilet',makeEquipment('toilet',settings),settings,placement);assert.equal(result.error,undefined);return result.item;
}
function rearGap(item,wall){
 const back=item.asset.root.localToWorld(new T.Vector3(0,0,-.23));return back.sub(wall.start).dot(wall.normal);
}
for(const app of applications){
 test(app.name+': suspended WC frame is wall-attached, level and never reversed on all wall faces',()=>{
  const config={...cloneRoom(DEFAULT_ROOM),partitions:[{id:'wc-wall',a:[200,80],b:[200,350],thickness:20,height:260,fullHeight:true}]},room=makeRoom(config,0),comp=new app.Composition(room);
  const item=create(comp,support,{wall:0,u:100,height:65,offset:65,rotation:180});
  assert.equal(app.isFloorItem(item),false);assert.equal(isWallMountedSanitary(item),true);
  for(let wall=0;wall<room.walls.length;wall++){
   const result=comp.move(item.id,{wall,u:room.walls[wall].length*50,height:30,offset:80,rotation:270});assert.equal(result.error,undefined,'wall '+wall);
   assert.deepEqual(item.placement,{wall,u:room.walls[wall].length*50,height:0,offset:0,rotation:0});
   assert(Math.abs(rearGap(item,room.walls[wall]))<1e-8,'Back of frame must touch the selected wall or partition face');
   assert(Math.abs(item.root.rotation.y-room.walls[wall].group.rotation.y)<1e-8);
   const bowl=new T.Box3().setFromObject(item.root.getObjectByName('Cuvette_creuse'));
   assert(Math.abs(bowl.min.y-.12)<.002);assert(bowl.max.y>=.45&&bowl.max.y<=.49);
   const lid=new T.Box3().setFromObject(item.root.getObjectByName('Couvercle'));assert(Math.abs(lid.max.y-.48)<.002,'Suspended WC has a 48cm seat, not the old 76cm floating seat');
  }
  assert.match(comp.validate(item,{...item.placement,rotation:90}),/orienté/);
  assert.match(comp.validate(item,{...item.placement,offset:5}),/plaqué/);
  assert.match(comp.validate(item,{...item.placement,height:20}),/sol/);
  const ordinary=create(new app.Composition(room),{reference:'TR2224'},{wall:0,u:100,height:0,offset:50,rotation:90});
  assert.equal(app.isFloorItem(ordinary),true,'The existing floor WC retains free floor placement');room.dispose();
 });

 test(app.name+': wall drag crosses an obstacle then settles without reversing or moving the other WC',()=>{
  const room=makeRoom(DEFAULT_ROOM,0),comp=new app.Composition(room),first=create(comp,support,{wall:0,u:100,height:0}),other=create(comp,support,{wall:0,u:220,height:0}),origin={...first.placement};
  const otherBefore={...other.placement};const preview=comp.previewMove(first.id,{u:220,height:80,rotation:90,offset:50});
  assert.equal(preview.error,undefined);assert.equal(preview.overlap,true);assert.equal(first.placement.height,0);
  const settled=comp.settle(first.id,origin);assert.equal(settled.error,undefined);assert.equal(settled.adjusted,true);assert.equal(comp.validate(first),'');
  assert.deepEqual(other.placement,otherBefore);assert.equal(first.placement.rotation,0);assert.equal(first.placement.offset,0);
  comp.locked=true;const before={...first.placement};assert.match(comp.previewMove(first.id,{u:300}).error,/verrouillé/);assert.deepEqual(first.placement,before);room.dispose();
 });

 test(app.name+': large real niche receives the bowl and plate, follows edits and protects against deletion',()=>{
  const config={...cloneRoom(DEFAULT_ROOM),niches:[{id:'niche-wc',wallKey:'boundary-0',u:200,width:120,bottom:2,height:140,depth:5}]},room=makeRoom(config,0),comp=new app.Composition(room);
  const item=create(comp,{reference:'TR2217R',support:false},{wall:0,u:200,height:12});
  assert.equal(item.placement.nicheId,'niche-wc');assert.equal(item.placement.offset,-5);assert.equal(comp.validate(item),'');
  assert(Math.abs(rearGap(item,room.walls[0])+.05)<1e-8,'The bowl back attaches to the actual recessed back, not its front plane');
  const nextConfig=cloneRoom(config);Object.assign(nextConfig.niches[0],{u:230,bottom:10,depth:7});const next=makeRoom(nextConfig,0);
  assert.equal(comp.setRoom(next),'');assert.equal(item.placement.u,230);assert.equal(item.placement.height,20);assert.equal(item.placement.offset,-7);assert.equal(item.placement.nicheId,'niche-wc');
  const removed=makeRoom({...nextConfig,niches:[]},0);assert.match(comp.setRoom(removed),/niche/);assert.equal(comp.room,next);assert.equal(item.placement.nicheId,'niche-wc');
  const narrowConfig=cloneRoom(nextConfig);narrowConfig.niches[0].width=20;const narrow=makeRoom(narrowConfig,0);assert.match(comp.setRoom(narrow),/niche/);
  const tiny={...nextConfig.niches[0],height:30};assert.equal(nicheFitsSanitary(item,item.placement,tiny),false,'A small decorative niche cannot swallow an entire WC and flush plate');
  assert.equal(comp.move(item.id,{wall:1,u:150,height:12}).error,undefined);assert.equal(item.placement.nicheId,undefined);assert.equal(item.placement.offset,0);assert.equal(comp.validate(item),'');
  for(const value of [room,next,removed,narrow])value.dispose();
 });
}

test('WC support covering and mounting identity survive project save, reopen and undo/redo',()=>{
 const room=makeRoom(DEFAULT_ROOM,0),comp=new applications[0].Composition(room),finish={collection:'Creta',color:'caramello',format:'60x120',reference:'PUBLIC-TILE-REFERENCE'},item=create(comp,{...support,supportCovering:{mode:'split',back:finish,reveal:{...finish,color:'avena'}}});
 assert.equal(equipmentError('toilet',item.settings),'');
 const project=()=>({version:2,room:cloneRoom(DEFAULT_ROOM),items:comp.snapshot()}),journal=new ProjectJournal();journal.seed(project());
 comp.move(item.id,{wall:1,u:150,height:90,offset:100,rotation:180});journal.record(project());
 const reopened=decodeProject(encodeProject(project()));assert.deepEqual(reopened.items[0].settings.supportCovering,item.settings.supportCovering);assert.equal(reopened.items[0].placement.wall,1);assert.equal(reopened.items[0].placement.offset,0);assert.equal(reopened.items[0].placement.rotation,0);
 assert.equal(journal.undo().items[0].placement.wall,0);assert.equal(journal.redo().items[0].placement.wall,1);
 assert.match(equipmentError('toilet',{...item.settings,supportCovering:{mode:'all',back:{collection:'unknown',color:'unknown',format:'unknown'}}}),/carrelage/);
 assert.match(sanitaryMountError(item,{...item.placement,nicheId:'missing'},room),/niche/);room.dispose();
});
