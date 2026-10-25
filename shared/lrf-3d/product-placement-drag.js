import * as T from 'three';
import {inside} from './room.js';
import {normalizeSanitaryPlacement,isFloorAnchoredSanitary} from './sanitary-mount.js';
import {nearestScreenMount} from './screen-mount.js';

const tangent=wall=>new T.Vector3(Math.cos(wall.group.rotation.y),0,-Math.sin(wall.group.rotation.y));
const asRay=ray=>ray?.ray||ray;
const clamp=T.MathUtils.clamp;
export const PRODUCT_DRAG_THRESHOLD=6;
const invalid=error=>({placement:null,error});

// Products are descriptors only. No item, project, opening or material is
// created until a valid pointer-up commits the exact previewed placement.
export function resolveProductPlacement({ray,composition,product,preferredWall=0}){
 const room=composition?.room,r=asRay(ray),d=product?.dimensions;
 if(!room||!r||!d||![d.width,d.height,d.depth].every(v=>Number.isFinite(v)&&v>0))return invalid('Dimensions du produit indisponibles.');
 const item={id:'product-drag-preview',type:product.type,settings:{...(product.settings||{})},dimensions:d},floor=!!product.isFloor;
 let p;
 if(floor){
  const point=r.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());if(!point)return invalid('Visez le sol de la pièce.');
  const boundary=(room.points||[]).map(([x,z])=>[x,z-.23]);
  let nearest=null;
  room.walls.forEach((wall,index)=>{if(wall.partition!==undefined)return;const delta=point.clone().sub(wall.start),along=delta.dot(tangent(wall)),u=clamp(along,0,wall.length),distance=point.distanceTo(wall.start.clone().addScaledVector(tangent(wall),u));if(!nearest||distance<nearest.distance-.015||Math.abs(distance-nearest.distance)<=.015&&index===preferredWall)nearest={wall,index,distance};});
  if(!nearest)return invalid('Aucune paroi disponible.');
  if(!inside([point.x,point.z],boundary)&&nearest.distance>.20)return invalid('Déposez le produit à l’intérieur de la pièce.');
  const {wall,index}=nearest,delta=point.clone().sub(wall.start);
  p={wall:index,u:delta.dot(tangent(wall))*100,height:product.placement?.height||0,offset:(delta.dot(wall.normal)-d.depth/2)*100,rotation:product.placement?.rotation||0};
  if(item.type==='screen'){
   const mount=nearestScreenMount(composition.items.filter(i=>i.type==='shower'),item,p);
   if(!mount)return invalid('Ajoutez un receveur adapté avant sa paroi.');
   p=mount.placement;Object.assign(item.settings,{trayId:mount.trayId,edge:mount.edge,edgeShift:mount.edgeShift});
  }else{p.height=0;p=composition.clampFloorPlacement?composition.clampFloorPlacement(item,p):p;}
 }else{
  const faces=[];
  room.walls.forEach((wall,index)=>{
   if(r.direction.dot(wall.normal)>=-.00001)return;
   const point=r.intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(wall.normal,wall.start),new T.Vector3());if(!point)return;
   const u=point.clone().sub(wall.start).dot(tangent(wall))*100,h=point.y*100;
   if(u<-.5||u>wall.length*100+.5||h<-.5||h>(wall.height||room.height)*100+.5)return;
   faces.push({wall,index,point,u,h,distance:point.distanceTo(r.origin)});
  });
  faces.sort((a,b)=>a.distance-b.distance);const face=faces[0];if(!face)return invalid('Visez un mur de la pièce.');
  const {wall,index,u,h}=face,opening=['door','window'].includes(item.type),edge=opening?2:0,half=d.width*50,minU=half+edge,maxU=wall.length*100-half-edge;
  const mirror=item.type==='mirror',minimum=mirror?d.height*50:0,maximum=(wall.height||room.height)*100-d.height*100+(mirror?d.height*50:0)-edge;
  if(maxU<minU||maximum<minimum)return invalid('Le produit est trop grand pour cette paroi.');
  const floorAnchored=item.type==='door'||isFloorAnchoredSanitary(item);
  p={wall:index,u:clamp(u,minU,maxU),height:floorAnchored?0:clamp(h-(mirror?0:d.height*50),minimum,maximum),offset:0,rotation:0};
  p=normalizeSanitaryPlacement(item,p,room);
 }
 p={...p,u:Math.round(p.u*10)/10,height:Math.round(p.height*10)/10,offset:Math.round((p.offset||0)*10)/10};
 const error=composition.validate(item,p,d);
 return {placement:p,error:error||'',item,options:floor&&item.type==='screen'?{trayId:item.settings.trayId,edge:item.settings.edge,edgeShift:item.settings.edgeShift}:null};
}

export function productPreviewTransform(room,product,placement){
 const wall=room?.walls?.[placement?.wall];if(!wall)return null;
 const d=product.dimensions,floor=!!product.isFloor,rotation=wall.group.rotation.y+(floor?(placement.rotation||0)*Math.PI/180:0),position=wall.start.clone().addScaledVector(tangent(wall),placement.u/100).addScaledVector(wall.normal,(placement.offset||0)/100+d.depth/2);
 position.y=placement.height/100+(product.type==='mirror'?0:d.height/2-(d.clearanceBelow||0));
 return {position,rotation};
}

export function mountProductPlacementDrag({canvas,scene,camera,controls,getComposition,prepareProduct,commitProduct,readonly=()=>false,onStatus=()=>{},onStart=()=>{},onEnd=()=>{},invalidate=()=>{},document:doc=canvas.ownerDocument,setTimer=setTimeout,clearTimer=clearTimeout,now=()=>Date.now()}){
 let active=null,ghost=null,materials=[],geometries=[];const bindings=new WeakMap(),listeners=[];
 const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
 const rayFor=e=>{const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height||e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)return null;const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);return ray.ray;};
 const unlocked=()=>!readonly()&&!getComposition()?.locked;
 function disposePreview(){ghost?.removeFromParent();for(const material of materials)material.dispose();for(const geometry of geometries)geometry.dispose();ghost=null;materials=[];geometries=[];}
 function createPreview(product){
  const d=product.dimensions,g=new T.BoxGeometry(d.width,d.height,Math.max(.025,d.depth)),edges=new T.EdgesGeometry(g),fill=new T.MeshBasicMaterial({color:0x448f73,transparent:true,opacity:.20,depthWrite:false,depthTest:false}),line=new T.LineBasicMaterial({color:0x286f53,transparent:true,opacity:.95,depthTest:false});
  ghost=new T.Group();ghost.name='Apercu_depot_produit';const mesh=new T.Mesh(g,fill),wire=new T.LineSegments(edges,line);mesh.renderOrder=wire.renderOrder=1000;mesh.raycast=wire.raycast=()=>{};ghost.add(mesh,wire);scene.add(ghost);materials=[fill,line];geometries=[g,edges];
 }
 function update(e){
  const a=active;if(!a?.dragging)return;
  if(!unlocked()){finish(true,'La pièce est verrouillée.');return;}
  if(getComposition()!==a.composition||getComposition()?.room!==a.room){finish(true,'Le projet a changé : placement annulé.');return;}
  const composition=getComposition(),ray=rayFor(e);a.candidate=ray?resolveProductPlacement({ray,composition,product:a.product,preferredWall:a.candidate?.placement?.wall}):invalid('Glissez le produit dans la vue 3D.');
  const transform=a.candidate.placement&&productPreviewTransform(composition.room,a.product,a.candidate.placement);
  if(ghost){ghost.visible=!!transform;if(transform){ghost.position.copy(transform.position);ghost.rotation.y=transform.rotation;const valid=!a.candidate.error;materials[0].color.set(valid?0x448f73:0xc45142);materials[1].color.set(valid?0x286f53:0xa83426);}}
  onStatus(a.candidate.error||'Relâchez pour placer le produit ici.');invalidate(false,false);
 }
 function begin(a,e){
  if(active!==a||a.dragging)return;if(!unlocked()){finish(true,'Déverrouillez la pièce pour placer un produit.');return;}
  try{a.product=prepareProduct(a.descriptor.type,a.descriptor.options||{});}catch(error){finish(true,error.message);return;}
  if(!a.product?.dimensions){finish(true,'Ce choix se place avec un clic.');return;}
  a.dragging=true;a.composition=getComposition();a.room=a.composition?.room;a.wasEnabled=controls.enabled;controls.enabled=false;doc.body?.classList.add('placing-product');a.button.setPointerCapture?.(a.id);createPreview(a.product);onStart(a.descriptor);update(e);
 }
 function finish(cancel=false,message=''){
  const a=active;active=null;if(!a)return;clearTimer(a.timer);
  if(a.dragging){
   bindings.get(a.button).suppressUntil=now()+700;
   const valid=!cancel&&unlocked()&&a.candidate?.placement&&!a.candidate.error;
   if(valid){try{const added=commitProduct({type:a.descriptor.type,options:{...a.descriptor.options,...a.candidate.options},placement:{...a.candidate.placement},product:a.product});onStatus(added===false?'Le produit n’a pas pu être ajouté à cet emplacement.':'Produit placé.');}catch(error){onStatus(error.message);}}
   else onStatus(message||a.candidate?.error||'Placement annulé.');
   controls.enabled=a.wasEnabled;doc.body?.classList.remove('placing-product');if(a.button.hasPointerCapture?.(a.id))a.button.releasePointerCapture?.(a.id);disposePreview();onEnd({cancelled:!valid});invalidate();
  }
 }
 const move=e=>{const a=active;if(!a||a.id!==e.pointerId)return;const distance=Math.hypot(e.clientX-a.x,e.clientY-a.y);if(!a.dragging){if(a.touch&&distance>8){finish(true);return;}if(a.touch||distance<PRODUCT_DRAG_THRESHOLD)return;begin(a,e);}if(active?.dragging){e.preventDefault();e.stopImmediatePropagation();update(e);}};
 const up=e=>{if(active?.id!==e.pointerId)return;const dragged=active.dragging;if(dragged){e.preventDefault();e.stopImmediatePropagation();update(e);}finish(false);};
 listen(doc,'pointermove',move,{capture:true,passive:false});listen(doc,'pointerup',up,true);listen(doc,'pointercancel',e=>{if(active?.id===e.pointerId)finish(true);},true);listen(doc,'keydown',e=>{if(e.key==='Escape'&&active){if(active.dragging){e.preventDefault();e.stopImmediatePropagation();}finish(true);}},true);listen(doc.defaultView||doc,'blur',()=>finish(true));
 const boundButton=e=>{const path=e.composedPath?.()||[],inPath=path.find(node=>bindings.has(node));if(inPath)return inPath;const closest=e.target?.closest?.('[data-placement-drag]');return closest&&bindings.has(closest)?closest:null;};
 listen(doc,'pointerdown',e=>{if(active&&active.id!==e.pointerId)finish(true);const button=boundButton(e),binding=button&&bindings.get(button);if(!binding||e.button!==0||e.isPrimary===false||active||!unlocked())return;active={button,descriptor:binding.descriptor,id:e.pointerId,touch:e.pointerType==='touch',x:e.clientX,y:e.clientY,dragging:false};const a=active;if(a.touch)a.timer=setTimer(()=>begin(a,e),360);},true);
 listen(doc,'dragstart',e=>{if(boundButton(e))e.preventDefault();},true);
 listen(doc,'click',e=>{const button=boundButton(e),binding=button&&bindings.get(button);if(binding&&e.detail!==0&&now()<binding.suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 function bind(button,descriptor){bindings.set(button,{descriptor,suppressUntil:0});button.dataset.placementDrag='true';}
 return {bind,cancel:()=>finish(true),getActive:()=>active,destroy(){finish(true);listeners.forEach(remove=>remove());}};
}
