import * as T from 'three';
import {createSurface} from './room.js';
import {makeOpening} from './openings.js';
import {windowAmbience,windowAmbienceURL} from './window-ambiences.js';
import {loadQueuedTexture} from './texture-loader.js';

// This context belongs to the restricted furniture presentation only. The
// existing opening model supplies its real white frame, sashes and glazing;
// the existing configurator panorama is visible through an actual wall hole.
export function createPresentationReflectionRoom({loadTexture=loadQueuedTexture,invalidate=()=>{},maxAnisotropy=16,ambience='mediterranean'}={}){
 const choice=windowAmbience(ambience);if(!choice)throw Error('Ambiance de fenêtre inconnue.');
 const root=new T.Group();root.name='Présentation · environnement';
 const wallSurfaces=[],windowSpec={x:-2.5,sill:1,width:2.4,height:1.8,z:10};
 let disposed=false,texture=null,pending=null,exteriorReady=false,exteriorTexture=null,error=null;const abort=new AbortController();
 const makeWall=(polygon,name,holes=[])=>{const surface=createSurface(polygon,name,holes,{receiveTileShadows:true});surface.material.color.set('#eeeae2');surface.material.roughness=.92;surface.setPaint(true);root.add(surface.group);wallSurfaces.push(surface);return surface;};
 const localX=-windowSpec.x,left=localX-windowSpec.width/2,right=localX+windowSpec.width/2;
 const rear=makeWall([[-7,0],[7,0],[7,6],[-7,6]],'Présentation_mur_reflet',[[[left,windowSpec.sill],[right,windowSpec.sill],[right,windowSpec.sill+windowSpec.height],[left,windowSpec.sill+windowSpec.height]]]);
 rear.group.position.z=windowSpec.z;rear.group.rotation.y=Math.PI;
 const leftWall=makeWall([[0,0],[10.26,0],[10.26,6],[0,6]],'Présentation_retour_gauche');leftWall.group.position.set(-7,0,10);leftWall.group.rotation.y=Math.PI/2;
 const rightWall=makeWall([[0,0],[10.26,0],[10.26,6],[0,6]],'Présentation_retour_droit');rightWall.group.position.set(7,0,-.26);rightWall.group.rotation.y=-Math.PI/2;
 const ceilingMaterial=new T.MeshPhysicalMaterial({color:'#eeeae2',roughness:.92,metalness:0}),ceiling=new T.Mesh(new T.PlaneGeometry(14,10.26),ceilingMaterial);ceiling.name='Présentation_plafond_reflet';ceiling.position.set(0,6,4.87);ceiling.rotation.x=Math.PI/2;root.add(ceiling);
 const window=makeOpening('window',{width:240,height:180,color:'white',windowType:'casement',exteriorAmbience:choice.id});
 // The white PVC profile is dielectric. Keep the original white colour and
 // genuine glazing/hardware, without the metallic response of an aluminium
 // finish on its large painted faces.
 window.frame.metalness=0;window.frame.roughness=.42;window.frame.needsUpdate=true;
 // Opening models are authored for the furniture wall, with frame z=-.24.
 // Translate by +.24 before turning the whole window toward this room.
 const opening=new T.Group();opening.name='Présentation_fenêtre_blanche';opening.position.set(windowSpec.x,windowSpec.sill,windowSpec.z);opening.rotation.y=Math.PI;window.root.position.z=.24;opening.add(window.root);root.add(opening);
 const garden=window.root.getObjectByName('Vue_exterieure_jardin');
 // Retain the existing model's appearance while its selected panorama loads,
 // without registering/discarding a texture owned by another configurator.
 function applyExterior(map){
  const image=map.image,w=image?.naturalWidth||image?.width,h=image?.naturalHeight||image?.height,imageAspect=w>0&&h>0?w/h:1.5;
  const {width,height}=garden.geometry.parameters,aspect=width/height,uv=garden.geometry.attributes.uv;
  for(let i=0;i<uv.count;i++){const x=i%2,y=i<2?1:0;uv.setXY(i,aspect<imageAspect?.5+(x-.5)*aspect/imageAspect:x,aspect>imageAspect?.5+(y-.5)*imageAspect/aspect:y);}
  uv.needsUpdate=true;garden.material.map=map;garden.material.color.set('#ffffff');garden.material.needsUpdate=true;window.root.userData.exteriorAmbience=choice.id;window.root.userData.exteriorTextureReady=true;
 }
 function ready(){
  if(disposed)return Promise.resolve(false);if(pending)return pending;
  // Use the original asset at its native resolution. All current panoramas
  // are 1536×1024; a larger reflection target cannot invent more image detail.
  // Mipmaps plus anisotropic sampling keep its real detail stable at oblique
  // reflection angles, without a resize, sharpening pass or mirrored UVs.
  pending=Promise.resolve().then(()=>loadTexture(windowAmbienceURL(choice.id),{signal:abort.signal})).then(map=>{
   if(disposed){map.dispose();return false;}texture=map;map.colorSpace=T.SRGBColorSpace;map.generateMipmaps=true;map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;map.wrapS=map.wrapT=T.ClampToEdgeWrapping;map.anisotropy=Math.min(16,Math.max(1,Number(maxAnisotropy)||1));map.needsUpdate=true;
   const image=map.image,width=image?.naturalWidth||image?.width||0,height=image?.naturalHeight||image?.height||0,source=map.userData.sourceDimensions||[width,height];exteriorTexture={url:windowAmbienceURL(choice.id),width,height,sourceWidth:source[0],sourceHeight:source[1],anisotropy:map.anisotropy,mipmaps:map.generateMipmaps};
   applyExterior(map);exteriorReady=true;invalidate();return true;
  }).catch(reason=>{error=reason?.message||'Vue extérieure indisponible.';if(!disposed)invalidate();return false;});return pending;
 }
 // The broad raster light illuminates the room without replacing the garden
 // with an emissive white rectangle in the physical mirror's reflection.
 const daylight=new T.RectAreaLight('#fff4e4',6,windowSpec.width,windowSpec.height);daylight.name='Présentation_fenêtre_lumineuse';daylight.position.set(windowSpec.x,windowSpec.sill+windowSpec.height/2,windowSpec.z-.02);daylight.lookAt(windowSpec.x,daylight.position.y,0);root.add(daylight);
 return {root,wallSurfaces,window,ready,diagnostics:()=>({ambience:choice.id,exteriorReady,exteriorTexture:exteriorTexture?{...exteriorTexture}:null,error,window:{...windowSpec}}),dispose(){if(disposed)return;disposed=true;abort.abort();root.removeFromParent();const geometries=new Set(),materials=new Set();root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of object.material?Array.isArray(object.material)?object.material:[object.material]:[])materials.add(material);});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();texture?.dispose();texture=null;}};
}
