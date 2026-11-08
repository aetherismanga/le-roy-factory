import * as T from 'three';
import {canonicalPoints,partitionGeometry} from './room.js';
import {mirrorSpec} from './mirrors.js';

export const PRESENTATION_MAX_POLAR=Math.PI/2-.08;
export function configurePresentationCamera(controls){
 controls.minPolarAngle=.12;controls.maxPolarAngle=PRESENTATION_MAX_POLAR;
 controls.minAzimuthAngle=-Math.PI*.46;controls.maxAzimuthAngle=Math.PI*.46;
 controls.enablePan=false;
}
export function presentationWall(room,index){
 const points=canonicalPoints(room.points),walls=points.map((a,i)=>({a,b:points[(i+1)%points.length]}));
 for(const part of partitionGeometry(room))for(const side of [0,1]){const a=side?part.b:part.a,b=side?part.a:part.b,n=side?part.normal.clone().negate():part.normal;walls.push({a:[a[0]+n.x*part.thickness/2,a[1]+n.z*part.thickness/2],b:[b[0]+n.x*part.thickness/2,b[1]+n.z*part.thickness/2]});}
 const wall=walls[index];if(!wall)return null;const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz);
 return {length:length*100,tangent:new T.Vector3(dx/length,0,dz/length),normal:new T.Vector3(-dz/length,0,dx/length)};
}
export function presentationItemSize(item){
 const spec=item.type==='mirror'?mirrorSpec(item.settings):item.asset.spec||{},height=(spec.totalHeight||spec.height||.54)*100;
 return {width:(spec.width||Number(item.settings.width)/100||.38)*100,height,centre:item.type==='mirror',floorStanding:item.type!=='mirror'&&(!!spec.legHeight||item.type==='cabinet'&&Number(spec.bottom)===0)};
}
export function boundedPresentationPlacement(room,item,proposal){
 const frame=presentationWall(room,item.placement.wall);if(!frame)return null;const size=presentationItemSize(item),margin=2;
 if(frame.length<size.width+margin*2||room.height<size.height+margin*2)return null;
 const minHeight=size.centre?size.height/2+margin:0,maxHeight=room.height-(size.centre?size.height/2:size.height)-margin;
 return {...item.placement,u:Math.round(T.MathUtils.clamp(Number(proposal.u),size.width/2+margin,frame.length-size.width/2-margin)),height:size.floorStanding?item.placement.height:Math.round(T.MathUtils.clamp(Number(proposal.height),minHeight,maxHeight))};
}
export function presentationPlacementAllowed(item,placement,items){
 const s=presentationItemSize(item),left=placement.u-s.width/2,right=left+s.width,bottom=placement.height-(s.centre?s.height/2:0),top=bottom+s.height;
 return !items.some(other=>{if(other.id===item.id||other.placement.wall!==placement.wall)return false;const b=presentationItemSize(other),ol=other.placement.u-b.width/2,ob=other.placement.height-(b.centre?b.height/2:0);return Math.min(right,ol+b.width)-Math.max(left,ol)>.5&&Math.min(top,ob+b.height)-Math.max(bottom,ob)>.5;});
}

// Follow the real model's edit targets so the clicked basin/plan opens its
// own controls instead of always editing the first cabinet in the project.
export function presentationHitPart(object,item){
 if(item.type!=='cabinet')return item.type;
 let target=null;
 for(let o=object;o&&o!==item.wrapper;o=o.parent){
  const name=o.name||'';
  if(/Mitigeur/i.test(name))return 'tap';
  if(/Vasque|Coque_ceramique|Bonde|Trop_plein/i.test(name))return 'basin';
  if(/^Plan_/i.test(name))return 'top';
  if(o.userData?.editTarget==='basin')target='basin';
 }
 return target||'cabinet';
}
export function createPresentationEditing({scene,camera,controls,canvas,getItems,getProject,invalidate}){
 if(controls)configurePresentationCamera(controls);
 let selectedId=null,selectedPart=null,gesture=null,listener=()=>{},disposed=false,enabled=true,multitouch=false,handingOver=false,releasing=false;
 const raycaster=new T.Raycaster(),pointer=new T.Vector2(),pointers=new Map();
 const items=()=>getItems()||[];
 const selected=()=>items().find(i=>i.id===selectedId)||items().find(i=>i.type==='cabinet')||items()[0]||null;
 // Selection is logical only: keep the product context and direct gestures
 // without drawing a bounding frame over the client's composition.
 function refresh(){}
 function notify(event={}){refresh();listener({...event,state:state()});invalidate();}
 function state(){const item=selected();return {selected:selectedId||null,part:selectedPart||item?.type||null,moving:!!gesture?.dragged,canMove:!!item,vertical:!!item&&!presentationItemSize(item).floorStanding,canReverse:!!item?.asset.setHingeSide&&item.asset.canReverseHinge!==false,hingeSide:item?.settings.hingeSide||item?.asset.getHingeSide?.()||'left',items:items().map((i,index)=>({id:i.id,label:(i.type==='cabinet'?'Meuble':i.type==='column'?'Colonne':'Miroir')+' '+(index+1)}))};}
 function selectItem(id,part){const item=items().find(i=>i.id===id);if(!item)return false;selectedId=id;selectedPart=part||item.type;notify({kind:'selection',itemId:id,part:selectedPart});return true;}
 function clearSelection(){selectedId=selectedPart=null;notify({kind:'selection',itemId:null,part:null});}
 function moveItem(item,proposal,{commit=true}={}){
  const room=getProject()?.room;if(!room||!item||disposed)return false;
  const next=boundedPresentationPlacement(room,item,proposal);if(!next||!Number.isFinite(next.u)||!Number.isFinite(next.height)||!presentationPlacementAllowed(item,next,items())){notify({kind:'invalid',message:'Les éléments doivent rester dans le mur sans se superposer.'});return false;}
  const frame=presentationWall(room,item.placement.wall),du=(next.u-item.placement.u)/100,dy=(next.height-item.placement.height)/100;
  item.wrapper.position.addScaledVector(frame.tangent,du);item.wrapper.position.y+=dy;item.placement=next;item.wrapper.updateMatrixWorld(true);
  notify({kind:commit?'placement':'preview',itemId:item.id,part:selectedPart,placement:{...next}});return true;
 }
 function nudge(du=0,dh=0){const item=selected();return !!item&&moveItem(item,{...item.placement,u:item.placement.u+du,height:item.placement.height+dh});}
 function reverseHinge(){const item=selected();if(!item?.asset.setHingeSide||item.asset.canReverseHinge===false)return false;const side=(item.settings.hingeSide||item.asset.getHingeSide?.()||'left')==='left'?'right':'left',angle=Math.abs(item.asset.door?.rotation.y||0);if(item.asset.setHingeSide(side)===false)return false;if(item.asset.door)item.asset.door.rotation.y=angle*(side==='right'?1:-1);item.settings={...item.settings,hingeSide:side};notify({kind:'hinge',itemId:item.id,part:selectedPart,hingeSide:side});return true;}
 function ray(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);return raycaster.ray;}
 function hit(event){if(!camera||!canvas)return null;scene.updateMatrixWorld(true);ray(event);const list=items();for(const h of raycaster.intersectObjects(list.map(i=>i.wrapper),true)){
   let visible=true;for(let o=h.object;o;o=o.parent)if(!o.visible){visible=false;break;}if(!visible)continue;
   for(let o=h.object;o;o=o.parent){const item=list.find(i=>i.wrapper===o);if(item)return {item,point:h.point,part:presentationHitPart(h.object,item)};}
  }return null;
 }
 const stop=event=>{event.preventDefault?.();event.stopImmediatePropagation?.();};
 function release(previous){controls.enabled=previous.enabled;canvas.style.cursor='';if(canvas.hasPointerCapture?.(previous.id)){releasing=true;try{canvas.releasePointerCapture(previous.id);}finally{releasing=false;}}}
 function restore(previous){const frame=presentationWall(getProject().room,previous.item.placement.wall);previous.item.wrapper.position.addScaledVector(frame.tangent,(previous.placement.u-previous.item.placement.u)/100);previous.item.wrapper.position.y+=(previous.placement.height-previous.item.placement.height)/100;previous.item.placement={...previous.placement};previous.item.wrapper.updateMatrixWorld(true);}
 function cancelGesture(){if(!gesture)return;const previous=gesture;gesture=null;if(previous.dragged)restore(previous);release(previous);notify({kind:'gesture-cancel',itemId:previous.item.id,part:previous.part});}
 function handToOrbit(event){
  // OrbitControls did not receive the first down while an object was held.
  // Replay only that down when a second finger arrives, then let the genuine
  // second down and subsequent native events perform the normal pinch gesture.
  const first=[...pointers.values()].find(p=>p.pointerId!==event.pointerId);
  if(!first||typeof PointerEvent==='undefined'||!canvas.dispatchEvent)return;
  handingOver=true;try{canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:first.pointerId,pointerType:first.pointerType||'touch',clientX:first.clientX,clientY:first.clientY,button:0,buttons:1,isPrimary:true}));}finally{handingOver=false;}
 }
 function down(event){
  if(handingOver||disposed||!enabled||event.button!==undefined&&event.button!==0)return;
  pointers.set(event.pointerId,{pointerId:event.pointerId,pointerType:event.pointerType,clientX:event.clientX,clientY:event.clientY});
  if(pointers.size>1){const held=!!gesture;cancelGesture();multitouch=true;if(held)handToOrbit(event);return;}
  if(multitouch)return;const result=hit(event);if(!result)return;
  const frame=presentationWall(getProject()?.room,result.item.placement.wall);if(!frame)return;
  selectedId=result.item.id;selectedPart=result.part;
  gesture={id:event.pointerId,item:result.item,part:result.part,x:event.clientX,y:event.clientY,start:result.point.clone(),placement:{...result.item.placement},plane:new T.Plane().setFromNormalAndCoplanarPoint(frame.normal,result.point),tangent:frame.tangent,enabled:controls.enabled,dragged:false};
  controls.enabled=false;canvas.style.cursor='grab';canvas.setPointerCapture?.(event.pointerId);stop(event);
 }
 function move(event){
  const entry=pointers.get(event.pointerId);if(entry){entry.clientX=event.clientX;entry.clientY=event.clientY;}
  if(disposed||!enabled||multitouch)return;
  if(!gesture){if(event.pointerType!=='touch'&&canvas)canvas.style.cursor=hit(event)?'grab':'';return;}
  if(event.pointerId!==gesture.id)return;const current=gesture;
  if(!current.dragged&&Math.hypot(event.clientX-current.x,event.clientY-current.y)>6){current.dragged=true;notify({kind:'dragstart',itemId:current.item.id,part:current.part});canvas.style.cursor='grabbing';}
  if(current.dragged){const point=ray(event).intersectPlane(current.plane,new T.Vector3());if(point){const delta=point.sub(current.start);moveItem(current.item,{...current.placement,u:current.placement.u+delta.dot(current.tangent)*100,height:current.placement.height+delta.y*100},{commit:false});}}
  stop(event);
 }
 function finish(event,cancel=false){
  if(releasing)return;pointers.delete(event.pointerId);
  if(multitouch){if(!pointers.size)multitouch=false;return;}
  if(!gesture||event.pointerId!==gesture.id)return;const previous=gesture;gesture=null;release(previous);
  if(cancel){if(previous.dragged)restore(previous);notify({kind:'gesture-cancel',itemId:previous.item.id,part:previous.part});}
  else if(previous.dragged)notify({kind:'placement',itemId:previous.item.id,part:previous.part,placement:{...previous.item.placement}});
  else selectItem(previous.item.id,previous.part);
  stop(event);
 }
 function key(event){if(!enabled||!selectedId)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[event.key];if(delta){stop(event);nudge(...delta);}else if(event.key==='Escape'){stop(event);cancelGesture();clearSelection();}}
 const listeners=[['pointerdown',down],['pointermove',move],['pointerup',e=>finish(e)],['pointercancel',e=>finish(e,true)],['lostpointercapture',e=>{if(gesture?.id===e.pointerId)finish(e,true);}],['keydown',key]];
 for(const [name,handler]of listeners)canvas?.addEventListener(name,handler,{capture:true});
 // setMoving remains a compatibility no-op for older embedded consumers.
 // Object dragging itself is always direct and needs no mode or extra button.
 return {state,selectItem,clearSelection,setMoving(){},setEnabled(value){enabled=!!value;if(!enabled)cancelGesture();refresh();},nudge,reverseHinge,refresh,setListener(fn){listener=typeof fn==='function'?fn:()=>{};},dispose(){cancelGesture();disposed=true;for(const [name,handler]of listeners)canvas?.removeEventListener(name,handler,{capture:true});pointers.clear();listener=()=>{};}};
}
