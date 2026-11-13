import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {materialState} from './unreal-sync.js';

const generatedNormals=new WeakMap();

export function hiddenSceneMeshes(scene){const hidden=[];scene.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(!p.visible){hidden.push('LRF_'+o.uuid.replaceAll('-','')+'_');break;}});return hidden;}

// A separate export view: live Three objects, materials and legacy renderers
// are never mutated. Instanced tiles are expanded with their actual transforms.
export function createUnrealScene(source,{names=null}={}){
 source.updateMatrixWorld(true);
 const scene=new T.Scene(),materials=new Map(),owned=new Set(),geometries=new Map(),lights=[],noShadow=[],cutaway=[],normalMaps=new Map(),ownedTextures=new Set();
 const stats={meshes:0,triangles:0,instances:0,mirrors:0,materials:0,textures:0};
 const textures=new Set(),matrix=new T.Matrix4(),world=new T.Matrix4(),uvTransforms=new Map();
 function excluded(o){for(let p=o;p;p=p.parent)if(p.userData.editorGuide||p.userData.presentationRasterOnly||p.name==='Occlusion_contact_caisson')return true;return false;}
 function effectivelyVisible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
 function architectural(o){for(let p=o;p;p=p.parent){const target=p.userData.editTarget;if(target==='window'||target==='door'||String(target||'').startsWith('wall:')||p.userData.wallIndex!==undefined)return true;}return false;}
 function normalFromBump(texture,scale){
  const key=[texture.version,scale,...texture.repeat.toArray(),...texture.offset.toArray(),...texture.center.toArray(),texture.rotation,texture.flipY].join(':');let cached=generatedNormals.get(texture);if(!cached){cached=new Map();generatedNormals.set(texture,cached);}if(cached.has(key))return cached.get(key);
  const image=texture.image;if(!image)return null;
  const w=Math.min(1024,image.width||image.naturalWidth),h=Math.min(1024,image.height||image.naturalHeight);if(!w||!h)return null;
  let pixels,channels=4,divisor=255;
  if(image.data){pixels=image.data;channels=pixels.length/(image.width*image.height);if(pixels instanceof Float32Array)divisor=1;}
  else{const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,w,h);pixels=ctx.getImageData(0,0,w,h).data;}
  const data=new Uint8Array(w*h*4),at=(x,y)=>{x=(x+w)%w;y=(y+h)%h;const iw=image.data?image.width:w,ih=image.data?image.height:h;return pixels[(Math.floor(y*ih/h)*iw+Math.floor(x*iw/w))*channels]/divisor;};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(at(x+1,y)-at(x-1,y))*scale*w,dy=(at(x,y+1)-at(x,y-1))*scale*h,n=new T.Vector3(-dx,dy,1).normalize(),i=(y*w+x)*4;data[i]=Math.round((n.x*.5+.5)*255);data[i+1]=Math.round((n.y*.5+.5)*255);data[i+2]=Math.round((n.z*.5+.5)*255);data[i+3]=255;}
  const normal=new T.DataTexture(data,w,h);normal.wrapS=texture.wrapS;normal.wrapT=texture.wrapT;normal.repeat.copy(texture.repeat);normal.offset.copy(texture.offset);normal.center.copy(texture.center);normal.rotation=texture.rotation;normal.flipY=texture.flipY;normal.needsUpdate=true;
  cached.clear();cached.set(key,normal);return normal;
 }
 function materialFor(m,o){
  const key=m.uuid+(o.isReflector?'mirror':'');if(materials.has(key))return materials.get(key);
  let out;
  if(o.isReflector){out=new T.MeshPhysicalMaterial({color:0xffffff,metalness:1,roughness:.002,side:T.DoubleSide});stats.mirrors++;}
  else if(m.isMeshBasicMaterial){out=new T.MeshStandardMaterial({color:m.color,map:m.map,roughness:.8,transparent:m.transparent,opacity:m.opacity,side:m.side});let led=false;for(let p=o;p;p=p.parent)if(/LED|Lumiere|lumière/i.test(p.name))led=true;if(led){out.emissive.copy(m.color);out.emissiveIntensity=3;}}
  else out=m.clone();
  // A photograph beyond the glazing is already lit; treating it as a wall
  // darkens it twice. Keep its original texture, geometry and UV framing.
  if(o.name==='Vue_exterieure_jardin'){out.color.set(0);out.map=null;out.emissive.copy(m.color);out.emissiveMap=m.map;out.emissiveIntensity=1;}
  if(out.bumpMap&&!out.normalMap){const normal=normalFromBump(out.bumpMap,out.bumpScale??.001);if(normal){out.normalMap=normal;out.normalScale=new T.Vector2(1,1);}}
  // glTF's core normalTexture is supported by Interchange; EXT_materials_bump is not.
  out.bumpMap=null;out.bumpScale=1;
  // Carry the real PBR maps. Do not replace product finishes or their colours.
  out.name=m.name||'Materiau_'+materials.size;
  out.userData={};const transforms=[],keys=new Map();
  for(const [property,v] of Object.entries(out))if(v?.isTexture){
   textures.add(v.source.uuid);
   const matrix=v.matrixAutoUpdate?new T.Matrix3().setUvTransform(v.offset.x,v.offset.y,v.repeat.x,v.repeat.y,v.rotation,v.center.x,v.center.y):v.matrix.clone();
   const key=(v.channel||0)+':'+matrix.elements.join(',');if(!keys.has(key)){keys.set(key,transforms.length);transforms.push({source:v.channel||0,matrix});}
   const clone=v.clone();clone.offset.set(0,0);clone.repeat.set(1,1);clone.center.set(0,0);clone.rotation=0;clone.matrix.identity();clone.channel=keys.get(key);clone.needsUpdate=true;out[property]=clone;ownedTextures.add(clone);
  }
  uvTransforms.set(out,transforms);
  materials.set(key,out);owned.add(out);return out;
 }
 // Keep cutaway walls in the runtime scene; camera-dependent visibility is
 // synchronised separately so orbiting never waits for another GLB import.
 source.traverse(o=>{
  if(excluded(o))return;
  // Retain cutaway architecture, but don't import disabled product variants or
  // hidden lighting rigs. Those variants rebuild when the user selects them.
  if(!effectivelyVisible(o)&&!(o.isMesh&&architectural(o)))return;
  if(o.isMesh&&!o.isLine){
   const mats=(Array.isArray(o.material)?o.material:[o.material]);
   if(!o.geometry?.attributes.position||!mats.length||(!o.isReflector&&mats.every(m=>!m||!m.visible||m.isShaderMaterial)))return;
   const parts=Array.isArray(o.material)?o.geometry.groups.map(group=>({group,material:mats[group.materialIndex]})):[{group:null,material:mats[0]}];
   for(const {group,material} of parts){
   // Fully transparent picking volumes are editor controls, not glass objects.
   if(!material||material.visible===false||(material.transparent&&material.opacity<=0))continue;
   const count=o.isInstancedMesh?o.count:1,selected=[];
   for(let i=0;i<count;i++){const name='LRF_'+o.uuid.replaceAll('-','')+'_'+i+'_'+(group?.start||0);if(!names||names.has(name))selected.push({i,name});}
   if(!selected.length)continue;
   const out=materialFor(material,o),transforms=uvTransforms.get(out),key=o.geometry.uuid+':'+out.uuid+':'+(group?group.start+':'+group.count:'all');
   if(!geometries.has(key)){
    const g=o.geometry.clone();g.userData={};g.clearGroups();
    if(group){const indices=o.geometry.index?Array.from(o.geometry.index.array):Array.from({length:o.geometry.attributes.position.count},(_,i)=>i);g.setIndex(indices.slice(group.start,group.start+group.count));}
    for(let channel=0;channel<transforms.length;channel++){const t=transforms[channel],source=o.geometry.getAttribute(t.source?'uv'+t.source:'uv')||o.geometry.getAttribute('uv');if(!source)continue;const uv=new Float32Array(source.count*2),v=new T.Vector2();for(let i=0;i<source.count;i++){v.set(source.getX(i),source.getY(i)).applyMatrix3(t.matrix);uv[i*2]=v.x;uv[i*2+1]=v.y;}g.setAttribute(channel?'uv'+channel:'uv',new T.BufferAttribute(uv,2));}
    geometries.set(key,g);
   }
   const geometry=geometries.get(key);
   for(const {i,name} of selected){
    if(o.isInstancedMesh){o.getMatrixAt(i,matrix);world.multiplyMatrices(o.matrixWorld,matrix);stats.instances++;}else world.copy(o.matrixWorld);
    let assigned=out;
    if(o.isInstancedMesh&&o.instanceColor){const color=new T.Color();o.getColorAt(i,color);assigned=out.clone();assigned.color.multiply(color);owned.add(assigned);}
    const mesh=new T.Mesh(geometry,assigned);mesh.name=name;mesh.matrix.copy(world);mesh.matrixAutoUpdate=false;
    if(!o.castShadow||assigned.transmission>0||assigned.opacity<1)noShadow.push(mesh.name);
    if(architectural(o))cutaway.push(mesh.name);
    scene.add(mesh);stats.meshes++;stats.triangles+=(geometry.index?.count||geometry.attributes.position.count)/3;
   }}
  }else if(o.isRectAreaLight||o.isDirectionalLight||o.isPointLight||o.isSpotLight){
   const position=o.getWorldPosition(new T.Vector3()),direction=new T.Vector3();
   if(o.target)direction.subVectors(o.target.getWorldPosition(new T.Vector3()),position).normalize();else o.getWorldDirection(direction).negate();
   lights.push({kind:o.isRectAreaLight?'rect':o.isDirectionalLight?'directional':o.isSpotLight?'spot':'point',position:position.toArray(),direction:direction.toArray(),color:o.color.toArray(),intensity:o.visible?o.intensity:0,width:o.width||.5,height:o.height||.5,angle:o.angle||Math.PI/4,penumbra:o.penumbra||0,distance:o.distance||0});
  }
 });
 stats.materials=materials.size;stats.textures=textures.size;
 return{scene,lights,noShadow,cutaway,stats,dispose(){for(const g of geometries.values())g.dispose();for(const m of owned)m.dispose();for(const t of ownedTextures)t.dispose();scene.clear();}};
}
const encoder=new TextEncoder();
const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof data==='string'?encoder.encode(data):data))).map(v=>v.toString(16).padStart(2,'0')).join('');
const textureHashes=new WeakMap();
// Rebuilt catalogue materials may have new Texture/Source UUIDs for the same
// pixels. Fingerprint actual pixels, including generated ceramic/paint normals.
export async function unrealMaterialFingerprint(material){
 const state=materialState(material);delete state.name;
 for(const [key,texture] of Object.entries(material))if(texture?.isTexture){
  const source=texture.source,image=texture.image;let cached=textureHashes.get(source);
  if(!cached||cached.version!==source.version){
   const promise=(async()=>{const width=image?.width||image?.naturalWidth,height=image?.height||image?.naturalHeight;
    if(!width||!height)return source.uuid;
    let pixels=image.data;
    if(!pixels){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,width,height);pixels=context.getImageData(0,0,width,height).data;}
    return digest(JSON.stringify([width,height,pixels.constructor.name])+':'+await digest(pixels));
   })();cached={version:source.version,promise};textureHashes.set(source,cached);
  }
  state[key]=[await cached.promise,...state[key].slice(1,-1),texture.colorSpace,texture.format,texture.type,texture.wrapS,texture.wrapT,texture.magFilter,texture.minFilter];
 }
 return digest(JSON.stringify(state));
}
export async function prepareUnrealDelta(source,names,knownResources){
 const copy=createUnrealScene(source,{names}),geometryHashes=new Map(),materialHashes=new Map(),resources={},instances=[],exportScene=new T.Scene();
 const noShadow=new Set(copy.noShadow),cutaway=new Set(copy.cutaway),representatives=new Map();
 try{
  for(const mesh of [...copy.scene.children]){
   const g=mesh.geometry,m=mesh.material;
   if(!geometryHashes.has(g))geometryHashes.set(g,(async()=>{const attrs=[];for(const [name,a] of Object.entries(g.attributes))attrs.push([name,a.itemSize,a.normalized,await digest(a.array)]);return digest(JSON.stringify([attrs,g.index?await digest(g.index.array):null]));})());
   if(!materialHashes.has(m))materialHashes.set(m,unrealMaterialFingerprint(m));
   const resource=await digest((await geometryHashes.get(g))+':'+(await materialHashes.get(m)));
   const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();mesh.matrix.decompose(p,q,s);
   instances.push({name:mesh.name,resource,position:p.toArray(),rotation:q.toArray(),scale:s.toArray(),shadow:!noShadow.has(mesh.name),cutaway:cutaway.has(mesh.name)});
   if(!knownResources.has(resource)&&!representatives.has(resource)){representatives.set(resource,mesh);resources[mesh.name]=resource;exportScene.add(mesh);}
  }
  const glb=exportScene.children.length?await new GLTFExporter().parseAsync(exportScene,{binary:true,onlyVisible:true,maxTextureSize:2048,includeCustomExtensions:false}):null;
  return{glb,instances,resources,stats:{...copy.stats,importedMeshes:exportScene.children.length,reusedMeshes:instances.length-exportScene.children.length}};
 }finally{copy.dispose();exportScene.clear();}
}
export async function exportUnrealScene(source){
 const copy=createUnrealScene(source);
 try{const glb=await new GLTFExporter().parseAsync(copy.scene,{binary:true,onlyVisible:true,maxTextureSize:2048,includeCustomExtensions:false});return{glb,lights:copy.lights,noShadow:copy.noShadow,cutaway:copy.cutaway,stats:copy.stats};}
 finally{copy.dispose();}
}
