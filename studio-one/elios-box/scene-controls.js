import * as T from 'three';

// This controller is installed only in the Elios build. Native room geometry,
// materials and captures remain shared with Studio One.
export function createBoxSceneControls({getRoom,getFloor,camera,controls,resize,stop,selectWall,invalidate}){
 let focus={kind:'all',index:null};
 function sync(){const room=getRoom();if(!room)return;const enabled=getFloor()?.expoEnabled!==false;room.floor.group.visible=enabled;room.floor.expoEnabled=enabled;document.body.classList.toggle('elios-without-floor',!enabled);}
 function fit(bounds,direction,aspect){
  const target=bounds.getCenter(new T.Vector3()),dir=direction.clone().normalize(),right=new T.Vector3(0,1,0).cross(dir).normalize(),up=dir.clone().cross(right),tanV=Math.tan(T.MathUtils.degToRad(camera.fov/2)),tanH=tanV*aspect;let distance=.5;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const v=new T.Vector3(x,y,z).sub(target);distance=Math.max(distance,Math.abs(v.dot(right))/tanH+v.dot(dir),Math.abs(v.dot(up))/tanV+v.dot(dir));}
  distance*=1.15;controls.maxDistance=Math.max(controls.maxDistance,distance*1.3);camera.position.copy(target).addScaledVector(dir,distance);controls.target.copy(target);controls.update();
 }
 function frame(kind='all',index=null,{aspect}={}){
  const room=getRoom();if(!room)return;stop();resize();sync();const ratio=aspect||camera.aspect||1,bounds=new T.Box3();let direction=new T.Vector3(0,.38,1),label='Vue du box';
  if(kind==='wall'&&room.walls[index]?.expoEnabled!==false){const wall=room.walls[index];selectWall(index);wall.group.updateMatrixWorld(true);bounds.setFromObject(wall.group);direction=wall.normal.clone().add(new T.Vector3(0,.025,0));label=wall.expoLabel||'Mur '+(index+1);}
  else if(kind==='floor'&&room.floor.group.visible){room.floor.group.updateMatrixWorld(true);bounds.setFromObject(room.floor.group);direction=new T.Vector3(0,1,.34);label='Sol';}
  else{kind='all';index=null;const active=room.walls.filter(w=>w.expoEnabled!==false);for(const w of active){w.group.updateMatrixWorld(true);bounds.union(new T.Box3().setFromObject(w.group));}if(room.floor.group.visible){room.floor.group.updateMatrixWorld(true);bounds.union(new T.Box3().setFromObject(room.floor.group));}direction.x=active.length===2?-.32:active.length===1?.12:0;label=active.length+' pan'+(active.length>1?'s':'')+(room.floor.group.visible?' · avec sol':' · sans sol');}
  if(bounds.isEmpty())bounds.copy(room.bounds);fit(bounds,direction,ratio);room.updateCutaway(camera.position);focus={kind,index};document.dispatchEvent(new CustomEvent('elios-box-view',{detail:{...focus,label}}));invalidate(false,false);return diagnostics();
 }
 const snapshot=()=>({focus:{...focus},position:camera.position.toArray(),target:controls.target.toArray()});
 function restore(value){stop();resize();camera.position.fromArray(value.position);controls.target.fromArray(value.target);controls.update();focus={...value.focus};sync();invalidate(false,false);}
 function diagnostics(){const room=getRoom();return {...focus,camera:camera.position.toArray(),target:controls.target.toArray(),floorVisible:room?.floor.group.visible,visibleWalls:room?.walls.flatMap((w,i)=>w.group.visible?[i]:[]),selectedPans:room?.walls.flatMap((w,i)=>w.expoEnabled!==false?[i]:[])};}
 return {sync,frame,snapshot,restore,diagnostics};
}
