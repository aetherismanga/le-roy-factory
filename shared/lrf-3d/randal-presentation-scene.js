import * as T from 'three';
import {createSurface} from './room.js';
import {COLLECTIONS,paintBump} from './surface-catalog.js';
import {applyTileColors} from './tile-colors.js';
import {resolveSurfaceTexture} from './surface-texture-selection.js';
import {applySurfaceTextureMapping} from './surface-appearance.js';
import {surfaceAssetURL,loadQueuedTexture} from './texture-loader.js';
import {applyPresentationMirrorLighting} from './randal-presentation-lighting.js';
import {mirrorSpec} from './mirrors.js';
import {presentationChoice} from './randal-presentation-catalog.js';
import {createPresentationEditing} from './randal-presentation-editing.js';
import {createPresentationMotion,presentationDrawerTravel} from './randal-presentation-motion.js';
import {createPresentationReflectionRoom} from './randal-presentation-reflection-room.js';

// Adds presentation controls to the genuine, existing furniture preview.
// Furniture movement stays on its existing wall, with bounded positions.
export function createRandalPresentationScene({scene,renderer,floor,wall,getItems,getProject=()=>null,camera,controls,canvas,invalidate,loadTexture=loadQueuedTexture,loadExteriorTexture=loadQueuedTexture,quality={},drawerTravel=presentationDrawerTravel}){
 let disposed=false;const faces={},revisions={floor:0,wall:0},resources=new Map(),selected={},selectedResources={},pendingResources=new Map(),ledMirrors=new Map();
 const paintTexture=paintBump();
 const reflectionRoom=createPresentationReflectionRoom({loadTexture:loadExteriorTexture,invalidate,maxAnisotropy:renderer.capabilities.getMaxAnisotropy()||8});scene.add(reflectionRoom.root);void reflectionRoom.ready();
 const editing=createPresentationEditing({scene,camera,controls,canvas,getItems,getProject,invalidate});
 const motion=createPresentationMotion({getItems,invalidate,refresh:()=>editing.refresh(),drawerTravel});
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
  const resolved=choice.collection==='Peinture'?null:choice.texture?{files:[choice.texture.file],mapped:false,rotation:0}:resolveSurfaceTexture(choice.collection,choice.color,quality.textureProfile||'max',choice);
  const files=resolved?.files.slice(0,quality.maxSurfaceFaces||4)||[],keys=files.map(file=>surfaceAssetURL(file)+'|'+(resolved.rotation||0)+'|'+(quality.maxTextureDimension||2048)),pendingKey=kind+':'+revision;
  if(resolved&&!files.length)throw Error('Texture indisponible pour '+choice.name);
  pendingResources.set(pendingKey,keys);
  try{
   const maps=await Promise.all(files.map((file,index)=>{const key=keys[index];
    if(!resources.has(key)){const promise=loadTexture(surfaceAssetURL(file),{maxDimension:quality.maxTextureDimension||2048}).then(t=>{t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.center.set(.5,.5);t.rotation=(Number(resolved.rotation)||0)*Math.PI/180;t.anisotropy=Math.min(quality.anisotropy||8,renderer.capabilities.getMaxAnisotropy());return t;}).catch(e=>{if(resources.get(key)===promise)resources.delete(key);throw e;});resources.set(key,promise);}return resources.get(key);
   }));
   if(disposed||revision!==revisions[kind])return false;
   const surfaces=kind==='wall'?[face(kind),...reflectionRoom.wallSurfaces]:[face(kind)];
   function materialFor(material,map){
    material.color.set(resolved?'#ffffff':color.hex);material.roughness=definition.roughness??.85;material.clearcoat=0;material.metalness=0;
    // Manufacturer colour photos are not measured height fields. Only paint
    // receives a generic submillimetre microstructure; never fake tile relief.
    applySurfaceTextureMapping(material,{map,bumpMap:resolved?null:paintTexture,choice:color,layout,mapped:resolved?.mapped,rotation:resolved?.rotation});
    material.bumpScale=resolved?0:.00015;material.needsUpdate=true;return material;
   }
   for(const s of surfaces){s.setLayout(layout);s.setPaint(!resolved);materialFor(s.material,maps[0]||null);s.material.userData.lrfTextureFaceCount=maps.length||1;applyTileColors(s,choice,(_color,index)=>materialFor(s.material.clone(),maps[index%maps.length]||null));}
   selected[kind]=id;selectedResources[kind]=keys;invalidate();return true;
  }finally{pendingResources.delete(pendingKey);releaseUnused();}
 }
 function releaseUnused(){const used=new Set([...Object.values(selectedResources).flat(),...Array.from(pendingResources.values()).flat()]);for(const [key,promise]of resources)if(!used.has(key)){resources.delete(key);promise.then(t=>t.dispose()).catch(()=>{});}}
 function hasLED(item){if(item.type!=='mirror')return false;const spec=mirrorSpec(item.settings),eligible=spec.led||spec.metal&&(item.settings.led||ledMirrors.get(item.id)===spec.id);if(eligible)ledMirrors.set(item.id,spec.id);else ledMirrors.delete(item.id);return !!eligible;}
 function capabilities(){const items=getItems()||[],led=items.filter(hasLED);return {...motion.capabilities(),led:led.length>0,ledOn:led.length>0&&led.every(i=>!!i.settings.led)};}
 function setLED(enabled){for(const item of getItems()||[])if(hasLED(item)){item.settings={...item.settings,led:!!enabled};applyPresentationMirrorLighting(item);}invalidate();}
 return {editing,setSurface,setLED,setOpened:motion.setOpened,setItemOpened:motion.setItemOpened,itemCapabilities:motion.itemCapabilities,isItemOpened:motion.isItemOpened,refreshOpening:motion.refresh,capabilities,diagnostics:()=>({selected:{...selected},...capabilities(),editing:editing.state(),reflection:reflectionRoom.diagnostics(),textureCount:resources.size,layouts:Object.fromEntries(Object.entries(faces).map(([kind,s])=>[kind,{...s.layout}]))}),dispose(){if(disposed)return;disposed=true;editing.dispose();motion.dispose();for(const s of Object.values(faces)){scene.remove(s.group);const materials=new Set();s.group.traverse(o=>{o.geometry?.dispose();for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[])materials.add(m);});for(const m of materials)m.dispose();}reflectionRoom.dispose();paintTexture.dispose();for(const p of resources.values())p.then(t=>t.dispose()).catch(()=>{});resources.clear();floor.visible=wall.visible=true;}};
}
