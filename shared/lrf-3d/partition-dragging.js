import {Vector2,Vector3,Raycaster,Plane,Matrix4} from 'three';
import {isItemPositionLocked} from './position-lock.js';
import {worldDeltaToPlan} from './partition-editing.js';
import {snapPartitionDrag,partitionPreviewRoom} from './partition-snap.js';

// Preview every pointer position with rigid transforms. Room tessellation,
// materials, floor subtraction and quantities are committed only on release.
export function setupPartitionDragging({canvas,camera,controls,getRoom,getSceneRoom,getComposition,pick,enabled=()=>true,onTap,onUpdate,onStart,onEnd,onStatus}){
 let active=null;const pointers=new Set();
 const point=(e,plane)=>{const rect=canvas.getBoundingClientRect(),ray=new Raycaster();ray.setFromCamera(new Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);return ray.ray.intersectPlane(plane,new Vector3());};
 const stop=e=>{e.stopImmediatePropagation();if(e.cancelable)e.preventDefault();};
 const redraw=()=>controls.dispatchEvent?.({type:'change'});
 const resetPreview=a=>{for(const entry of a.preview||[]){entry.object.position.copy(entry.position);entry.object.quaternion.copy(entry.quaternion);entry.object.scale.copy(entry.scale);entry.object.updateMatrixWorld(true);}};
 const finish=(cancel=false)=>{
  const a=active;active=null;if(!a)return;pointers.delete(a.pointer);clearTimeout(a.timer);resetPreview(a);let committed=false;
  if(!cancel&&a.dragging&&a.pending){committed=onUpdate(a.pending,a.id)!==false;}
  controls.enabled=a.wasEnabled;canvas.classList.remove('moving-object');if(canvas.hasPointerCapture?.(a.pointer))canvas.releasePointerCapture(a.pointer);
  if(a.dragging)onStatus(cancel?'Déplacement de la cloison annulé.':committed?(a.snapped?'Cloison alignée et collée au mur.':'Cloison positionnée.'):'Emplacement occupé : la cloison conserve sa position.');
  redraw();onEnd?.();
 };
 const collectPreview=a=>{
  const room=getSceneRoom(),walls=room.walls.filter(w=>w.partition===a.index),indexes=new Set(walls.map(w=>room.walls.indexOf(w))),wallGroups=new Set(walls.map(w=>w.group)),objects=new Set(walls.map(w=>w.group));
  for(const face of room.partitionCaps||[])if(face.partition===a.index)objects.add(face.group);
  room.root.traverse(object=>{if(indexes.has(object.userData?.wallIndex)||wallGroups.has(object.userData?.sourceSurface))objects.add(object);});
  for(const item of getComposition()?.items||[])if(indexes.has(item.placement?.wall))objects.add(item.root);
  return [...objects].filter(object=>{for(let p=object.parent;p;p=p.parent)if(objects.has(p))return false;return true;}).map(object=>{object.updateWorldMatrix(true,false);return {object,world:object.matrixWorld.clone(),position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone()};});
 };
 const begin=a=>{if(active!==a)return;a.dragging=true;a.preview=collectPreview(a);onStart?.();canvas.classList.add('moving-object');onStatus('Glissez la cloison : elle s’aligne et se colle aux murs proches.');};
 const showPreview=(a,result)=>{
  const original=getSceneRoom().partitions[a.index],next=partitionPreviewRoom(result.config,getSceneRoom(),a.index).partitions[a.index],from=new Vector3(original.a[0],0,original.a[1]-.23),to=new Vector3(next.a[0],0,next.a[1]-.23),angle=Math.atan2(original.b[1]-original.a[1],original.b[0]-original.a[0])-Math.atan2(next.b[1]-next.a[1],next.b[0]-next.a[0]),transform=new Matrix4().makeTranslation(to.x,to.y,to.z).multiply(new Matrix4().makeRotationY(angle)).multiply(new Matrix4().makeTranslation(-from.x,-from.y,-from.z));
  for(const entry of a.preview){const object=entry.object;object.parent?.updateWorldMatrix(true,false);const local=new Matrix4().copy(object.parent?.matrixWorld||new Matrix4()).invert().multiply(transform).multiply(entry.world);local.decompose(object.position,object.quaternion,object.scale);object.updateMatrixWorld(true);}
  a.pending=result.config;a.snapped=result.snapped;a.snapWall=result.wall;redraw();
 };
 canvas.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);if(pointers.size>1){finish(true);return;}if(e.button!==0||!enabled())return;const hit=pick(e),match=/^wall:(\d+)$/.exec(hit?.editTarget||''),wall=match?getSceneRoom()?.walls[Number(match[1])]:null;if(wall?.partition===undefined||hit?.itemId)return;const config=getRoom(),p=config.partitions?.[wall.partition];if(!p)return;if(isItemPositionLocked(getComposition(),p))return;const plane=new Plane(new Vector3(0,1,0),-(hit.point?.y||0)),start=point(e,plane);if(!start)return;active={pointer:e.pointerId,id:p.id||'index-'+wall.partition,index:wall.partition,origin:JSON.parse(JSON.stringify(config)),motionOrigin:JSON.parse(JSON.stringify(config)),plane,start,x:e.clientX,y:e.clientY,hit,wasEnabled:controls.enabled,dragging:false,last:'0,0',type:e.pointerType,snapWall:null};controls.enabled=false;canvas.setPointerCapture(e.pointerId);if(e.pointerType==='touch'){const a=active;a.timer=setTimeout(()=>begin(a),340);}stop(e);},true);
 canvas.addEventListener('pointermove',e=>{const a=active;if(!a||a.pointer!==e.pointerId)return;const distance=Math.hypot(e.clientX-a.x,e.clientY-a.y);if(!a.dragging){if(a.type==='touch'){if(distance>8)finish(false);stop(e);return;}if(distance<5){stop(e);return;}begin(a);}const next=point(e,a.plane);if(!next)return;const pointerPoint=next.clone(),delta=worldDeltaToPlan(a.motionOrigin,next.sub(a.start)),signature=delta.join(',');if(signature!==a.last){a.last=signature;const composition=getComposition(),result=snapPartitionDrag(a.motionOrigin,a.index,delta,{wall:a.snapWall,validate:draft=>{const preview=partitionPreviewRoom(draft,getSceneRoom(),a.index);return (composition?.items||[]).every(item=>!composition.validate(item,item.placement,item.dimensions,composition.items,preview));}});if(result){const snapChanged=result.snapped!==a.snapped||result.wall!==a.snapWall;showPreview(a,result);if(snapChanged&&result.snapped){a.motionOrigin=result.config;a.start=pointerPoint;a.last='0,0';}if(snapChanged)onStatus(result.snapped?'Cloison collée au mur '+(result.wall+1)+' · orientation automatique.':'Placement libre dans la pièce.');}}stop(e);},true);
 canvas.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);const a=active;if(!a||a.pointer!==e.pointerId)return;const tap=!a.dragging&&Math.hypot(e.clientX-a.x,e.clientY-a.y)<8;finish();if(tap)onTap(a.hit);stop(e);},true);
 canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);if(active?.pointer===e.pointerId){finish(true);stop(e);}},true);
 return {cancel:()=>finish(true),getActive:()=>active};
}
