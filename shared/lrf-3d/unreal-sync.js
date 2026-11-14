import * as T from 'three';
import {keepInUnreal,physicalLighting,unrealSurfaceParams,configureUnrealRoom} from './unreal-photoreal.js';

const matrix=new T.Matrix4(),world=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();
const rounded=a=>a.map(n=>Math.round(n*1e7)/1e7);
function visible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
export function architectural(o){if(o.name==='Plafond_occlusion_lumiere')return true;for(let p=o;p;p=p.parent){const t=p.userData.editTarget;if(t==='window'||t==='door'||String(t||'').startsWith('wall:')||p.userData.wallIndex!==undefined)return true;}return false;}
export function excluded(o){for(let p=o;p;p=p.parent)if(p.userData.editorGuide||p.userData.presentationRasterOnly||p.name==='Occlusion_contact_caisson')return true;return false;}
export function visitUnrealMeshes(source,visit){
 source.traverse(o=>{
  if(!o.isMesh||excluded(o)||!keepInUnreal(o)||!o.geometry?.attributes.position)return;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  if(!o.isReflector&&mats.every(m=>!m||!m.visible||m.isShaderMaterial))return;
  const parts=Array.isArray(o.material)?o.geometry.groups.map(g=>({group:g,material:mats[g.materialIndex]})):[{group:null,material:mats[0]}];
  for(const part of parts){const m=part.material;if(m&&m.visible!==false&&!(m.transparent&&m.opacity<=0))visit(o,part.material,part.group);}
 });
}
export function unrealLights(source){
 const lights=[];source.traverse(o=>{
  if(excluded(o)||!visible(o)||!(o.isRectAreaLight||o.isDirectionalLight||o.isPointLight||o.isSpotLight))return;
  const p=o.getWorldPosition(new T.Vector3()),d=new T.Vector3();if(o.target)d.subVectors(o.target.getWorldPosition(new T.Vector3()),p).normalize();else o.getWorldDirection(d).negate();
  lights.push({id:o.uuid,name:o.name,up:new T.Vector3(0,1,0).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())).toArray(),kind:o.isRectAreaLight?'rect':o.isDirectionalLight?'directional':o.isSpotLight?'spot':'point',position:p.toArray(),direction:d.toArray(),color:o.color.toArray(),intensity:o.intensity,width:o.width||.5,height:o.height||.5,angle:o.angle||Math.PI/4,penumbra:o.penumbra||0,distance:o.distance||0});
  if(o.name==='Retro_eclairage'&&o.parent?.parent?.getObjectByName('Cadre_metal_noir')?.geometry?.type==='CircleGeometry')lights.at(-1).sourceShape='round';
 });return lights;
}
export function materialState(m){
 const result={lrfFurnitureKind:m.userData?.lrfFurnitureKind||null};for(const [k,v] of Object.entries(m)){
  if(['uuid','id','version','userData','needsUpdate'].includes(k))continue;
  if(v?.isTexture)result[k]=[v.source.uuid,v.image?.width||v.image?.naturalWidth,v.image?.height||v.image?.naturalHeight,v.offset.toArray(),v.repeat.toArray(),v.center.toArray(),v.rotation,v.channel,v.flipY,v.version];
  else if(typeof v==='number'||typeof v==='string'||typeof v==='boolean')result[k]=v;
  else if(v?.isColor||v?.isVector2||v?.isVector3)result[k]=v.toArray();
 }return result;
}
// A camera change does not change this signature. Geometry/material changes do;
// transforms have their own small patches and never re-import the scene.
export function captureUnrealState(source,lightingSettings){
 configureUnrealRoom(lightingSettings?.room);
 source.updateMatrixWorld(true);const structure=[],transforms=new Map(),materials=new Map(),entries=new Map();
 visitUnrealMeshes(source,(o,m,group)=>{
  if(!materials.has(m.uuid))materials.set(m.uuid,materialState(m));
  const g=o.geometry,attributes=Object.entries(g.attributes).map(([k,a])=>[k,a.count,a.version]);
  const count=o.isInstancedMesh?o.count:1;
  const shape=[g.uuid,attributes,g.index?.version,group?.start,group?.count,!!o.isReflector,o.instanceColor?.version];
  const state=materials.get(m.uuid),structural=JSON.stringify([shape,state]);structure.push([o.uuid,count,structural]);
  const layout={...state};for(const k of ['color','roughness','metalness','clearcoat','clearcoatRoughness'])delete layout[k];
  const paintable=!o.isReflector&&!o.isInstancedMesh&&(m.isMeshStandardMaterial||m.isMeshPhysicalMaterial);
  const layoutKey=paintable?JSON.stringify([shape,layout]):structural;
  for(let i=0;i<count;i++){
   if(o.isInstancedMesh){o.getMatrixAt(i,matrix);world.multiplyMatrices(o.matrixWorld,matrix);}else world.copy(o.matrixWorld);
   world.decompose(position,rotation,scale);const name='LRF_'+o.uuid.replaceAll('-','')+'_'+i+'_'+(group?.start||0);
   transforms.set(name,{name,position:rounded(position.toArray()),rotation:rounded(rotation.toArray()),scale:rounded(scale.toArray())});
   entries.set(name,{structural,layoutKey,paintable,params:unrealSurfaceParams(m,o)});
  }
 });
 return{signature:JSON.stringify(structure),transforms,...physicalLighting(unrealLights(source),lightingSettings),entries};
}
export function sceneChanges(previous,next){
 const replace=new Set(),remove=[],materials=[];
 for(const [name,e] of next.entries){const before=previous?.entries.get(name);if(before?.structural===e.structural)continue;
  if(before&&e.paintable&&before.layoutKey===e.layoutKey)materials.push({name,...e.params});else replace.add(name);
 }
 for(const name of previous?.entries.keys()||[])if(!next.entries.has(name))remove.push(name);
 return{replace,remove,materials};
}
export function changedTransforms(previous,next){
 const changed=[];for(const [name,t] of next.transforms)if(JSON.stringify(previous?.transforms.get(name))!==JSON.stringify(t))changed.push(t);return changed;
}
