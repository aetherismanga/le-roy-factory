import * as T from 'three';
import {isFloorItem} from './composition.js';
import {pickSelection,tapGesture} from './picking.js';
export function setupObjectDragging({canvas,scene,camera,controls,getComposition,onSelect,onTap,onChange,onStatus,onStart,onEnd,setTimer=setTimeout,clearTimer=clearTimeout}){
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 const tap=tapGesture(),pointers=new Set();let active=null;
 const ndc=e=>{const r=canvas.getBoundingClientRect();return new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);};
 const ray=e=>{const r=new T.Raycaster();r.setFromCamera(ndc(e),camera);return r;};
 function coordinates(e,wallIndex){const room=getComposition().room,w=room.walls[wallIndex],r=ray(e),plane=new T.Plane().setFromNormalAndCoplanarPoint(w.normal,w.start),p=r.ray.intersectPlane(plane,new T.Vector3());if(!p)return null;const tangent=new T.Vector3(Math.cos(w.group.rotation.y),0,-Math.sin(w.group.rotation.y));return {wall:wallIndex,u:p.clone().sub(w.start).dot(tangent)*100,height:p.y*100};}
 function begin(a){if(!active||active!==a)return;a.dragging=true;controls.enabled=false;onSelect(a.item.id);onStart?.();canvas.classList.add('moving-object');onStatus('Déplacez l’élément sur le mur. Glissez vers un autre mur pour le changer.');}
 function finish(cancel=false){const a=active;active=null;if(!a)return;clearTimer(a.timer);if(a.dragging){const comp=getComposition();if(cancel){comp?.move(a.item.id,a.origin);onStatus('Déplacement annulé.');}else{const result=comp?.settle(a.item.id,a.origin);onStatus(result?.error||(result?.adjusted?'Position ajustée automatiquement à un emplacement libre.':'Élément positionné.'));}}controls.enabled=a.wasEnabled;canvas.classList.remove('moving-object');if(a.type!=='touch'&&canvas.hasPointerCapture?.(a.id))canvas.releasePointerCapture(a.id);onEnd?.();onChange();}
 canvas.addEventListener('pointerdown',e=>{
  pointers.add(e.pointerId);tap.down(e);if(pointers.size>1){finish(true);return;}
  if(e.button!==0)return;const comp=getComposition();if(!comp)return;const hit=pickSelection(scene,camera,ndc(e)),item=comp.items.find(i=>i.id===hit?.itemId);if(!item)return;
  const position=coordinates(e,item.placement.wall);if(!position)return;
  active={id:e.pointerId,item,origin:{...item.placement},x:e.clientX,y:e.clientY,type:e.pointerType,hit,dragging:false,moved:false,wasEnabled:controls.enabled,offsetU:item.placement.u-position.u,offsetH:item.placement.height-position.height};const a=active;
  if(e.pointerType==='touch')a.timer=setTimer(()=>begin(a),340);else{controls.enabled=false;canvas.setPointerCapture(e.pointerId);onSelect(item.id);}
 },true);
 canvas.addEventListener('pointermove',e=>{
  tap.move(e);const a=active;if(!a||a.id!==e.pointerId)return;const distance=Math.hypot(e.clientX-a.x,e.clientY-a.y);
  if(!a.dragging){if(a.type==='touch'){if(distance>8)finish(false);return;}if(distance<5)return;begin(a);}
  a.moved=true;e.preventDefault();const comp=getComposition(),r=ray(e);let wallIndex=a.item.placement.wall;
  if(isFloorItem(a.item)){const point=r.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());if(!point)return;const w=comp.room.walls[a.item.placement.wall],t=new T.Vector3(Math.cos(w.group.rotation.y),0,-Math.sin(w.group.rotation.y));if(!a.floorOffset){const initial=ray({clientX:a.x,clientY:a.y}).ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());a.floorOffset=initial?initial.sub(a.item.root.position):new T.Vector3();}point.sub(a.floorOffset);const delta=point.sub(w.start),p={wall:a.item.placement.wall,u:Math.round(delta.dot(t)*100),offset:Math.round((delta.dot(w.normal)-a.item.dimensions.depth/2)*100),height:a.item.type==='screen'?a.origin.height:0};const result=comp.previewMove(a.item.id,p);onStatus(result.error||'Glissez au sol · le placement se corrige au relâchement.');onChange();return;}

  // Intersect every finite wall plane, independently of cutaway state,
  // furniture occlusion and window holes. Select the first wall facing the ray.
  const candidates=[];
  comp.room.walls.forEach((w,index)=>{if(r.ray.direction.dot(w.normal)>=-.00001)return;const plane=new T.Plane().setFromNormalAndCoplanarPoint(w.normal,w.start),point=r.ray.intersectPlane(plane,new T.Vector3());if(!point)return;const p=coordinates(e,index);if(p&&p.u>=0&&p.u<=w.length*100&&p.height>=0&&p.height<=comp.room.height*100)candidates.push({index,distance:point.distanceTo(r.ray.origin)});});
  candidates.sort((a,b)=>a.distance-b.distance);if(candidates.length)wallIndex=candidates[0].index;
  const p=coordinates(e,wallIndex);if(!p)return;const d=a.item.dimensions,w=comp.room.walls[wallIndex];p.u=Math.round(T.MathUtils.clamp(p.u+a.offsetU,d.width*50+(a.item.type==='window'||a.item.type==='door'?2:1),w.length*100-d.width*50-(a.item.type==='window'||a.item.type==='door'?2:1)));p.height=a.item.type==='door'?0:Math.round(T.MathUtils.clamp(p.height+a.offsetH,a.item.type==='mirror'?d.height*50:0,(w.height||comp.room.height)*100-d.height*100+(a.item.type==='mirror'?d.height*50:0)));
  const targets=[w.length*50];for(const other of comp.items){if(other.id===a.item.id||other.placement.wall!==wallIndex)continue;targets.push(other.placement.u,other.placement.u+(other.dimensions.width+d.width)*50+2,other.placement.u-(other.dimensions.width+d.width)*50-2);}const snap=targets.sort((x,y)=>Math.abs(x-p.u)-Math.abs(y-p.u))[0];const snapped=Math.abs(snap-p.u)<=3;if(snapped)p.u=snap;const result=comp.previewMove(a.item.id,p);onStatus(result.error||(snapped?'Alignement magnétique · relâchez pour placer.':result.overlap?'Chevauchement temporaire · placement automatique au relâchement.':'Position : '+Math.round(a.item.placement.u)+' cm · hauteur '+Math.round(a.item.placement.height)+' cm'));onChange();
 },true);
 canvas.addEventListener('pointerup',e=>{const clicked=tap.up(e),a=active;pointers.delete(e.pointerId);if(a?.id===e.pointerId){const show=clicked&&!a.dragging;const hit=a.hit;finish(false);if(show)onTap(hit);}else if(clicked&&pointers.size===0)onTap(pickSelection(scene,camera,ndc(e)));},true);
 canvas.addEventListener('pointercancel',e=>{tap.cancel(e);pointers.delete(e.pointerId);if(active?.id===e.pointerId)finish(true);},true);
 return {cancel:()=>finish(true),getActive:()=>active};
}
