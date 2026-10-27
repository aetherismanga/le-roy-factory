import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';

// The ordinary physical glazing stays in place. A separately captured, weak
// Fresnel reflection is added only while the Ultra visitor is enabled.
const Z=new T.Vector3(0,0,1);
const NO_CAPTURE=()=>{};

export function glassPlaneSpec(geometry){
 if(!geometry)return null;
 if(!geometry.boundingBox)geometry.computeBoundingBox();
 const box=geometry.boundingBox;if(!box||box.isEmpty())return null;
 const size=box.getSize(new T.Vector3()),axes=['x','y','z'].sort((a,b)=>size[a]-size[b]),axis=axes[0];
 const thickness=size[axis],width=axis==='x'?size.z:size.x,height=axis==='y'?size.z:size.y;
 if(![thickness,width,height].every(Number.isFinite)||width<=.01||height<=.01||thickness>.06||thickness>Math.min(width,height)*.12)return null;
 const normal=new T.Vector3();normal[axis]=1;
 return {axis,width,height,thickness,center:box.getCenter(new T.Vector3()),normal};
}

function reflectiveGlass(geometry,size){
 const overlay=new Reflector(geometry,{clipBias:.0001,textureWidth:size,textureHeight:size,multisample:0});
 overlay.name='Reflet_vitrage_visite_Ultra';overlay.userData.glassReflection=true;
 overlay.castShadow=overlay.receiveShadow=false;overlay.raycast=NO_CAPTURE;overlay.renderOrder=3;
 const material=overlay.material;
 material.transparent=true;material.depthWrite=false;material.polygonOffset=true;material.polygonOffsetFactor=-1;
 material.vertexShader=material.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv;\nvarying vec3 vGlassPosition;\nvarying vec3 vGlassNormal;').replace('vUv = textureMatrix * vec4( position, 1.0 );','vUv = textureMatrix * vec4( position, 1.0 );\nvGlassPosition = (modelMatrix * vec4(position, 1.0)).xyz;\nvGlassNormal = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));');
 material.fragmentShader=material.fragmentShader.replace('varying vec4 vUv;','varying vec4 vUv;\nvarying vec3 vGlassPosition;\nvarying vec3 vGlassNormal;').replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','vec3 glassView = normalize(cameraPosition - vGlassPosition);\nfloat glassCosine = clamp(abs(dot(normalize(vGlassNormal), glassView)), 0.0, 1.0);\nfloat glassFresnel = 0.04 + 0.96 * pow(1.0 - glassCosine, 5.0);\ngl_FragColor = vec4(base.rgb, glassFresnel);');
 overlay.visible=false;
 const capture=overlay.onBeforeRender;
 // Captures are explicitly scheduled below; transparent render passes and
 // captures of other reflectors must never recursively render another scene.
 overlay.onBeforeRender=NO_CAPTURE;
 return {overlay,capture,size,ready:false,lastKey:null,lastCapture:-Infinity};
}

function visibleInScene(object,scene){
 for(let current=object;current;current=current.parent){if(!current.visible)return false;if(current===scene)return true;}
 return false;
}

export function createGlassReflections({scene,renderer,camera,captureScene=(_reflector,capture)=>capture(),maxPlanes=3}){
 const entries=new Map(),watched=new Set(),knownReflectors=new Set(),frustum=new T.Frustum(),projection=new T.Matrix4(),cameraPosition=new T.Vector3(),localCamera=new T.Vector3(),worldPosition=new T.Vector3(),direction=new T.Vector3();
 const limit=Math.max(1,Math.min(3,Math.floor(maxPlanes)||3));
 let enabled=false,disposed=false,captures=0,failure='',warned=false,graphDirty=false,scans=0;

 // Animating the visitor changes poses, not scene membership. Observe topology
 // once instead of walking every room, tile and bone on every animation frame.
 function watch(root){root.traverse(object=>{if(object.userData.glassReflection){knownReflectors.add(object);return;}if(watched.has(object))return;watched.add(object);if(object.isReflector)knownReflectors.add(object);object.addEventListener('childadded',onAdded);object.addEventListener('childremoved',onRemoved);});}
 function unwatch(root){root.traverse(object=>{knownReflectors.delete(object);if(!watched.delete(object))return;object.removeEventListener('childadded',onAdded);object.removeEventListener('childremoved',onRemoved);});}
 function onAdded(event){if(event.child.userData.glassReflection){knownReflectors.add(event.child);return;}watch(event.child);graphDirty=true;}
 function onRemoved(event){if(event.child.userData.glassReflection){knownReflectors.delete(event.child);return;}unwatch(event.child);graphDirty=true;}
 function stopWatching(){for(const object of watched){object.removeEventListener('childadded',onAdded);object.removeEventListener('childremoved',onRemoved);}watched.clear();knownReflectors.clear();}

 function release(entry){
  const state=entry.state;if(!state)return;
  state.overlay.removeFromParent();state.overlay.geometry.dispose();state.overlay.dispose();entry.state=null;
 }

 function sync(active){
  if(disposed)return;
  const wasEnabled=enabled;
  enabled=active===true;
  if(!enabled){if(wasEnabled){for(const entry of entries.values())release(entry);entries.clear();stopWatching();}failure='';return;}
  if(!wasEnabled){watch(scene);graphDirty=true;}
  if(!graphDirty)return;
  graphDirty=false;scans++;
  const meshes=[];
  for(const object of watched){if(!object.isMesh)continue;const materials=Array.isArray(object.material)?object.material:[object.material];if(materials.some(material=>material?.userData?.architecturalGlass))meshes.push(object);}
  const current=new Set(meshes);
  for(const [mesh,entry]of entries)if(!current.has(mesh)){release(entry);entries.delete(mesh);}
  for(const mesh of meshes)if(!entries.has(mesh)){const spec=glassPlaneSpec(mesh.geometry);if(spec)entries.set(mesh,{mesh,spec,state:null});}
 }

 function withHidden(capture){
  const previous=[];
  for(const entry of entries.values())if(entry.state){const object=entry.state.overlay;previous.push([object,object.visible]);object.visible=false;}
  try{return capture();}finally{for(const [object,visible]of previous)object.visible=visible;}
 }

 function update(now,key,profile={}){
  if(disposed||!enabled||scene.overrideMaterial)return 0;
  camera.updateMatrixWorld();scene.updateMatrixWorld();camera.getWorldPosition(cameraPosition);
  projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);
  const candidates=[];
  for(const entry of entries.values()){
   if(entry.state)entry.state.overlay.visible=false;
   if(!visibleInScene(entry.mesh,scene)||!frustum.intersectsObject(entry.mesh))continue;
   entry.mesh.getWorldPosition(worldPosition);const distance=worldPosition.distanceToSquared(cameraPosition);
   if(distance<.0004)continue;
   candidates.push({entry,score:entry.spec.width*entry.spec.height/Math.max(.04,distance)});
  }
  candidates.sort((a,b)=>b.score-a.score);
  const chosen=candidates.slice(0,limit).map(candidate=>candidate.entry),selected=new Set(chosen);
  for(const entry of entries.values())if(entry.state&&!selected.has(entry))release(entry);
  const requested=typeof profile==='number'?profile:profile.reflection||profile.size||512;
  const size=Math.max(128,Math.min(1024,renderer.capabilities?.maxTextureSize||1024,Number(requested)||512));
  const fps=Math.max(6,Math.min(24,typeof profile==='object'?profile.reflectionFps||24:24));
  let rendered=0;
  for(const entry of chosen){
   if(!entry.state)entry.state=reflectiveGlass(new T.PlaneGeometry(entry.spec.width,entry.spec.height),size);
   const state=entry.state,{overlay}=state;
   if(!overlay.parent)entry.mesh.add(overlay);
   if(state.size!==size){overlay.getRenderTarget().setSize(size,size);state.size=size;state.ready=false;state.lastKey=null;}
   localCamera.copy(cameraPosition);entry.mesh.worldToLocal(localCamera);localCamera.sub(entry.spec.center);
   const sign=localCamera.dot(entry.spec.normal)>=0?1:-1;
   direction.copy(entry.spec.normal).multiplyScalar(sign);
   overlay.position.copy(entry.spec.center).addScaledVector(direction,entry.spec.thickness/2+.0006);
   overlay.quaternion.setFromUnitVectors(Z,direction);overlay.updateWorldMatrix(true,false);
   const captureKey=String(key)+'|'+camera.matrixWorld.elements.join(',')+'|'+camera.projectionMatrix.elements.join(',')+'|'+overlay.matrixWorld.elements.join(',');
   if(captureKey!==state.lastKey&&now-state.lastCapture>=1000/fps){
    const reflectors=[...knownReflectors].map(object=>[object,object.visible]);
    const target=renderer.getRenderTarget?.(),xr=renderer.xr?.enabled,shadowAuto=renderer.shadowMap?.autoUpdate;
    state.lastCapture=now;
    try{
     // Hide every reflective overlay for this one-level capture, including the
     // original glass mesh so its back face cannot obscure the visitor.
     captureScene(overlay,()=>{
      const glassVisible=entry.mesh.visible;entry.mesh.visible=false;
      for(const [object]of reflectors)object.visible=false;
      try{return state.capture.call(overlay,renderer,scene,camera);}finally{entry.mesh.visible=glassVisible;for(const [object,visible]of reflectors)object.visible=visible;}
     });
     state.ready=true;state.lastKey=captureKey;state.lastCapture=now;captures++;rendered++;failure='';
    }catch(error){
     state.ready=false;state.lastCapture=now+500;failure=error?.message||String(error);
     if(!warned){warned=true;console.warn('Reflet de vitrage indisponible : le verre reste transparent.',error);}
    }finally{
     // Three's Reflector restores these after a successful render. Also restore
     // them on context loss/shader errors, so the editor remains usable.
     if(renderer.xr&&xr!==undefined)renderer.xr.enabled=xr;
     if(renderer.shadowMap&&shadowAuto!==undefined)renderer.shadowMap.autoUpdate=shadowAuto;
     if(renderer.setRenderTarget)renderer.setRenderTarget(target??null);
     if(camera.viewport&&renderer.state?.viewport)renderer.state.viewport(camera.viewport);
    }
   }
   overlay.visible=state.ready;
  }
  return rendered;
 }

 function dispose(){if(disposed)return;for(const entry of entries.values())release(entry);entries.clear();stopWatching();enabled=false;disposed=true;}
 return {sync,update,withHidden,dispose,diagnostics:()=>({enabled,panes:entries.size,targets:[...entries.values()].filter(entry=>entry.state).length,captures,scans,failure})};
}
