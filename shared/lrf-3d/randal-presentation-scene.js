import * as T from 'three';
import {createSurface} from './room.js';
import {COLLECTIONS} from './surface-catalog.js';
import {resolveSurfaceTexture} from './surface-texture-selection.js';
import {applySurfaceTextureMapping} from './surface-appearance.js';
import {surfaceAssetURL,loadQueuedTexture} from './texture-loader.js';
import {applyMirrorLighting} from './mirror-lighting.js';
import {mirrorSpec} from './mirrors.js';
import {presentationChoice} from './randal-presentation-catalog.js';
import {createPresentationEditing} from './randal-presentation-editing.js';

// Adds presentation controls to the genuine, existing furniture preview.
// Furniture movement stays on its existing wall, with bounded positions.
export function createRandalPresentationScene({scene,renderer,floor,wall,getItems,getProject=()=>null,camera,controls,canvas,invalidate,loadTexture=loadQueuedTexture}){
 let disposed=false,opened=false,animation=0;const faces={},revisions={floor:0,wall:0},resources=new Map(),selected={},selectedResources={},ledMirrors=new Set();
 const editing=createPresentationEditing({scene,camera,controls,canvas,getItems,getProject,invalidate});
 function face(kind){
  if(faces[kind])return faces[kind];
  const s=createSurface(kind==='floor'?[[-10,-10],[10,-10],[10,10],[-10,10]]:[[-7,0],[7,0],[7,6],[-7,6]],'Présentation_'+kind,[],{receiveTileShadows:true});
  if(kind==='floor'){s.group.rotation.x=-Math.PI/2;s.group.position.y=-.004;}else s.group.position.z=-.26;
  scene.add(s.group);(kind==='floor'?floor:wall).visible=false;faces[kind]=s;return s;
 }
 async function setSurface(kind,id){
  const choice=presentationChoice(kind,id);if(!choice||disposed)throw Error('Ce revêtement ne fait pas partie de la sélection RANDAL.');
  const revision=++revisions[kind],definition=COLLECTIONS[choice.collection],sourceColor=definition.colors.find(c=>c.id===choice.color),color=choice.texture?{...sourceColor,texturePhysicalSize:choice.texture.physicalSize}:sourceColor;
  const layout={width:choice.width||1.2,height:choice.height||.6,pattern:choice.pattern||'straight',direction:'horizontal',groutWidth:2};
  const resolved=choice.collection==='Peinture'?null:choice.texture?{files:[choice.texture.file],mapped:false,rotation:0}:resolveSurfaceTexture(choice.collection,choice.color,'balanced',choice);
  let map=null;
  let resourceKey=null;
  if(resolved){const file=resolved.files[0];if(!file)throw Error('Texture indisponible pour '+choice.name);const url=surfaceAssetURL(file);resourceKey=url+'|'+(resolved.rotation||0);
   if(!resources.has(resourceKey))resources.set(resourceKey,loadTexture(url,{maxDimension:1536}).then(t=>{t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.center.set(.5,.5);t.rotation=(Number(resolved.rotation)||0)*Math.PI/180;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(disposed)t.dispose();return t;}).catch(e=>{resources.delete(resourceKey);throw e;}));
   map=await resources.get(resourceKey);
  }
  if(disposed||revision!==revisions[kind])return false;
  const s=face(kind);s.setLayout(layout);s.setPaint(!resolved);s.material.color.set(resolved?'#ffffff':color.hex);s.material.roughness=definition.roughness??.85;
  applySurfaceTextureMapping(s.material,{map,choice:color,layout:s.layout,mapped:resolved?.mapped,rotation:resolved?.rotation});s.material.needsUpdate=true;selected[kind]=id;selectedResources[kind]=resourceKey;
  // Keep only the current floor and wall textures on mobile GPUs.
  for(const [key,promise]of resources)if(!Object.values(selectedResources).includes(key)){promise.then(texture=>{if(disposed||Object.values(selectedResources).includes(key))return;texture.dispose();resources.delete(key);}).catch(()=>{});}
  invalidate();return true;
 }
 function hasLED(item){if(item.type!=='mirror')return false;const spec=mirrorSpec(item.settings);if(spec.led||spec.metal&&item.settings.led)ledMirrors.add(item.id);return ledMirrors.has(item.id);}
 function capabilities(){const items=getItems()||[],led=items.filter(hasLED);return {openable:items.some(i=>i.asset.drawers?.length||i.asset.door||i.asset.doors?.length),led:led.length>0,ledOn:led.length>0&&led.every(i=>!!i.settings.led),opened};}
 function setLED(enabled){for(const item of getItems()||[])if(hasLED(item)){item.settings={...item.settings,led:!!enabled};applyMirrorLighting(item,innerWidth<700);}invalidate();}
 function setOpened(value){
  opened=!!value;cancelAnimationFrame(animation);const changes=[];
  for(const item of getItems()||[]){const asset=item.asset;
   for(const drawer of asset.drawers||[])changes.push({object:drawer.position,key:'z',from:drawer.position.z,to:opened ? .28 : 0});
   if(asset.door)changes.push({object:asset.door.rotation,key:'y',from:asset.door.rotation.y,to:opened?-Math.PI*.55*(asset.getHingeSign?.()||1):0});
   else if(asset.setDoorProgress){const from=asset.doors?.[0]?.rotation.y?1:0;changes.push({object:{set value(v){asset.setDoorProgress(v);}},key:'value',from,to:opened?1:0});}
   else for(const [index,door]of (asset.doors||[]).entries())changes.push({object:door.rotation,key:'y',from:door.rotation.y,to:opened?(index%2?1:-1)*Math.PI*.55:0});
  }
  const start=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick=time=>{if(disposed)return;const p=reduced?1:Math.min(1,(time-start)/260),ease=1-(1-p)**3;for(const c of changes)c.object[c.key]=c.from+(c.to-c.from)*ease;editing.refresh();invalidate();if(p<1)animation=requestAnimationFrame(tick);};animation=requestAnimationFrame(tick);
 }
 return {editing,setSurface,setLED,setOpened,capabilities,diagnostics:()=>({selected:{...selected},...capabilities(),editing:editing.state(),layouts:Object.fromEntries(Object.entries(faces).map(([kind,s])=>[kind,{...s.layout}]))}),dispose(){disposed=true;editing.dispose();cancelAnimationFrame(animation);for(const s of Object.values(faces)){scene.remove(s.group);s.group.traverse(o=>{o.geometry?.dispose();for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[])m.dispose();});}for(const p of resources.values())p.then(t=>t.dispose()).catch(()=>{});resources.clear();floor.visible=wall.visible=true;}};
}
