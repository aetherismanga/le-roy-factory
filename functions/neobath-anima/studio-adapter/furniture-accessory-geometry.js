import * as T from 'three';
import {cabinetFormat} from './configuration.js';
import {resolveFurnitureAccessories,TOWEL_FINISHES} from './furniture-accessories.js';

function disposeGroup(group){group?.removeFromParent();const geometries=new Set(),materials=new Set();group?.traverse(object=>{if(object.isMesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);}});geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());}
export function buildFurnitureAccessoryGeometry(settings={}){
 const selected=resolveFurnitureAccessories(settings),form=cabinetFormat(settings.format),root=new T.Group();root.name='Accessoires_meuble_Anima';
 const materials=[],geometries=[],meshes=[];
 const add=(parent,width,height,depth,x,y,z,material,name,kind)=>{const geometry=new T.BoxGeometry(width,height,depth),mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.editTarget='cabinet-accessories';mesh.userData.animaFurnitureAccessory=kind;mesh.userData.animaAccessoriesTarget=true;parent.add(mesh);geometries.push(geometry);meshes.push(mesh);return mesh;};
 let towelRoot=null,supportRoot=null;
 if(selected.towel){
  const color=TOWEL_FINISHES.find(option=>option.id===selected.towelFinish),material=new T.MeshStandardMaterial({color:color.hex,metalness:color.metalness,roughness:color.roughness});materials.push(material);
  const group=new T.Group();group.name='SideBar_'+selected.towelSide;group.userData.animaFurnitureAccessory='towel';group.userData.editTarget='cabinet-accessories';root.add(group);towelRoot=group;
  const sign=selected.towelSide==='left'?-1:1,width=settings.width/100,depth=form.depth,projection=.05,length=.40,height=.025,rail=.004;
  group.position.set(sign*(width/2+projection/2),form.base+form.height-.055,depth/2-.23);
  // PDF54 / printed106–107: one solid rear mounting block and a free,
  // capped cantilever rail. A second front return would turn it into a U.
  // Mirror X only: both left/right versions keep the fixing at the rear.
  add(group,rail,height,length,sign*(projection/2-rail/2),0,0,material,'SideBar_barre_40cm','towel');
  const mountingLength=.045;
  add(group,projection-rail,height,mountingLength,-sign*rail/2,0,-length/2+mountingLength/2,material,'SideBar_fixation_arriere','towel');
  group.userData.animaAccessory={ref:'SIDEBAR',sourcePdfPage:54,width:projection,height,length,mountingPositionApproximate:true,mountingBlockLengthApproximate:true,mounting:'single-rear-cantilever',side:selected.towelSide,finish:selected.towelFinish};
 }
 if(selected.support){
  const product=selected.support,W=product.width/100,D=product.depth/100,H=product.height/100,t=.02,material=new T.MeshStandardMaterial({color:'#252626',roughness:.55,metalness:.45});materials.push(material);
  const group=new T.Group();group.name='Structure_Bridge_'+product.width+'x'+product.height;group.position.set(0,form.base-H,form.depth/2-.23);group.userData.editTarget='cabinet-accessories';group.userData.animaFurnitureAccessory='support';root.add(group);supportRoot=group;
  for(const z of[-D/2+t/2,D/2-t/2])add(group,W,t,t,0,H-t/2,z,material,'Bridge_traverse_longue','support');
  for(const x of[-W/2+t/2,W/2-t/2])add(group,t,t,D-2*t,x,H-t/2,0,material,'Bridge_traverse_courte','support');
  for(const x of[-W/2+t/2,W/2-t/2])for(const z of[-D/2+t/2,D/2-t/2])add(group,t,H-t,t,x,(H-t)/2,z,material,'Bridge_pied','support');
  group.userData.animaAccessory={id:product.id,ref:product.ref,width:W,height:H,depth:D,sourcePdfPage:56,profileSectionApproximate:true,finish:'black-matte'};
 }
 return {root,towelRoot,supportRoot,meshes,materials,geometries,selection:selected,dispose(){disposeGroup(root);}};
}
export function updateFurnitureAccessoryGeometry(asset,settings={}){
 const selected=resolveFurnitureAccessories(settings),key=[settings.format,settings.width,selected.towelSide,selected.towelFinish,selected.supportId,selected.supportFinish].join('|');
 if(asset.animaFurnitureAccessories?.key===key)return asset.animaFurnitureAccessories;
 const next=buildFurnitureAccessoryGeometry(settings);next.key=key;
 asset.animaFurnitureAccessories?.dispose();asset.root.add(next.root);asset.animaFurnitureAccessories=next;return next;
}
