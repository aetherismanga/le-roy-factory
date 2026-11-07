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

export function createPresentationEditing({scene,camera,controls,canvas,getItems,getProject,invalidate}){
 if(controls)configurePresentationCamera(controls);
 let selectedId=null,moving=false,drag=null,tap=null,listener=()=>{},helper=null,disposed=false;
 const raycaster=new T.Raycaster(),pointer=new T.Vector2();
 const items=()=>getItems()||[];
 const selected=()=>items().find(i=>i.id===selectedId)||items().find(i=>i.type==='cabinet')||items()[0]||null;
 function refresh(){if(helper){helper.visible=moving&&!!selected();if(helper.visible)helper.setFromObject(selected().wrapper);}}
 function notify(event={}){refresh();listener({...event,state:state()});invalidate();}
 function state(){const item=selected();return {selected:item?.id||null,moving,canMove:!!item,vertical:!!item&&!presentationItemSize(item).floorStanding,canReverse:!!item?.asset.setHingeSide&&item.asset.canReverseHinge!==false,hingeSide:item?.settings.hingeSide||item?.asset.getHingeSide?.()||'left',items:items().map((i,index)=>({id:i.id,label:(i.type==='cabinet'?'Meuble':i.type==='column'?'Colonne':'Miroir')+' '+(index+1)}))};}
 function selectItem(id){if(!items().some(i=>i.id===id))return false;selectedId=id;notify({kind:'selection'});return true;}
 function setMoving(value){moving=!!value;if(canvas)canvas.style.cursor=moving?'grab':'';if(moving&&!helper){helper=new T.BoxHelper(selected()?.wrapper,0xa78a55);helper.raycast=()=>{};scene.add(helper);}notify({kind:'mode'});}
 function moveItem(item,proposal,{commit=true}={}){
  const room=getProject()?.room;if(!room||!item||disposed)return false;
  const next=boundedPresentationPlacement(room,item,proposal);if(!next||!Number.isFinite(next.u)||!Number.isFinite(next.height)||!presentationPlacementAllowed(item,next,items())){notify({kind:'invalid',message:'Les éléments doivent rester dans le mur sans se superposer.'});return false;}
  const frame=presentationWall(room,item.placement.wall),du=(next.u-item.placement.u)/100,dy=(next.height-item.placement.height)/100;
  item.wrapper.position.addScaledVector(frame.tangent,du);item.wrapper.position.y+=dy;item.placement=next;item.wrapper.updateMatrixWorld(true);
  notify({kind:commit?'placement':'preview',itemId:item.id,placement:{...next}});return true;
 }
 function nudge(du=0,dh=0){const item=selected();return !!item&&moveItem(item,{...item.placement,u:item.placement.u+du,height:item.placement.height+dh});}
 function reverseHinge(){const item=selected();if(!item?.asset.setHingeSide||item.asset.canReverseHinge===false)return false;const side=(item.settings.hingeSide||item.asset.getHingeSide?.()||'left')==='left'?'right':'left',angle=Math.abs(item.asset.door?.rotation.y||0);if(item.asset.setHingeSide(side)===false)return false;if(item.asset.door)item.asset.door.rotation.y=angle*(side==='right'?1:-1);item.settings={...item.settings,hingeSide:side};notify({kind:'hinge',itemId:item.id,hingeSide:side});return true;}
 function ray(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.ray;}
 function hit(event){if(!camera||!canvas)return null;ray(event);const list=items();for(const h of raycaster.intersectObjects(list.map(i=>i.wrapper),true)){for(let o=h.object;o;o=o.parent){const item=list.find(i=>i.wrapper===o);if(item)return {item,point:h.point};}}return null;}
 function down(event){
  if(event.button!==undefined&&event.button!==0)return;
  if(drag){finish(event,true);return;}tap={id:event.pointerId,x:event.clientX,y:event.clientY};
  if(!moving)return;const result=hit(event);if(!result)return;selectItem(result.item.id);
  const frame=presentationWall(getProject().room,result.item.placement.wall);drag={id:event.pointerId,item:result.item,start:result.point.clone(),placement:{...result.item.placement},plane:new T.Plane().setFromNormalAndCoplanarPoint(frame.normal,result.point),tangent:frame.tangent,enabled:controls.enabled};
  controls.enabled=false;canvas.style.cursor='grabbing';canvas.setPointerCapture?.(event.pointerId);event.preventDefault();event.stopImmediatePropagation();
 }
 function move(event){if(!drag||event.pointerId!==drag.id)return;const point=ray(event).intersectPlane(drag.plane,new T.Vector3());if(point){const delta=point.sub(drag.start);moveItem(drag.item,{...drag.placement,u:drag.placement.u+delta.dot(drag.tangent)*100,height:drag.placement.height+delta.y*100},{commit:false});}event.preventDefault();event.stopImmediatePropagation();}
 function finish(event,cancel=false){
  if(drag){if(event.pointerId!==drag.id&&!cancel)return;const previous=drag;drag=null;controls.enabled=previous.enabled;canvas.style.cursor=moving?'grab':'';if(canvas.hasPointerCapture?.(previous.id))canvas.releasePointerCapture(previous.id);
   if(cancel){const frame=presentationWall(getProject().room,previous.item.placement.wall);previous.item.wrapper.position.addScaledVector(frame.tangent,(previous.placement.u-previous.item.placement.u)/100);previous.item.wrapper.position.y+=(previous.placement.height-previous.item.placement.height)/100;previous.item.placement=previous.placement;notify({kind:'selection'});}
   else notify({kind:'placement',itemId:previous.item.id,placement:{...previous.item.placement}});
   tap=null;event.preventDefault?.();event.stopImmediatePropagation?.();return;
  }
  if(!cancel&&tap?.id===event.pointerId&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<7){const result=hit(event);if(result)selectItem(result.item.id);}tap=null;
 }
 function key(event){if(!moving)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[event.key];if(delta){event.preventDefault();event.stopImmediatePropagation();nudge(...delta);}else if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();setMoving(false);}}
 const listeners=[['pointerdown',down],['pointermove',move],['pointerup',e=>finish(e)],['pointercancel',e=>finish(e,true)],['lostpointercapture',e=>finish(e,true)],['keydown',key]];
 for(const [name,handler]of listeners)canvas?.addEventListener(name,handler,{capture:true});
 return {state,selectItem,setMoving,nudge,reverseHinge,refresh,setListener(fn){listener=typeof fn==='function'?fn:()=>{};},dispose(){disposed=true;if(drag)finish({pointerId:drag.id},true);for(const [name,handler]of listeners)canvas?.removeEventListener(name,handler,{capture:true});if(helper){scene.remove(helper);helper.geometry.dispose();helper.material.dispose();}listener=()=>{};}};
}
