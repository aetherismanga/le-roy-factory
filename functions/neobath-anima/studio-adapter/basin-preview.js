import * as T from 'three';
import {topSelection} from './anima-data.js';
import {buildAnimaTop} from './tops.js';

export function createAnimaBasinPreview(product){
 const s=product.sourceSettings||{},selection=topSelection(s.top,s.width,s.format,s.basinLayout,s.topSpan||s.width,s.topPlanId,s.topLength,s);
 if(!selection)throw Error('Le visuel de cette vasque n’est pas disponible.');
 const fill=new T.MeshBasicMaterial({color:0x448f73,transparent:true,opacity:.38,depthWrite:false,depthTest:false,side:T.DoubleSide}),line=new T.LineBasicMaterial({color:0x286f53,transparent:true,opacity:.95,depthWrite:false,depthTest:false});
 const model=buildAnimaTop({selection,ceramic:fill,wood:fill,chrome:fill,planMaterial:fill,bowlMaterial:fill,surfaceY:0}),root=new T.Group();root.name='Apercu_vasque_catalogue_Anima';root.add(model.root);
 const geometries=[],ownedMaterials=new Set([fill,line]);
 if(product.sourceBasin.category!=='worktop'){
  for(const mesh of model.surfaceMeshes)mesh.removeFromParent();
  const wells=model.root.userData.animaTop.wells,mean=key=>wells.reduce((sum,well)=>sum+well[key],0)/wells.length;
  model.root.position.set(-mean('x'),-(selection.top.height||0)/100,-mean('z'));
 }
 model.root.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material])if(material)ownedMaterials.add(material);object.material=fill;object.renderOrder=1000;object.raycast=()=>{};geometries.push(object.geometry);const edges=new T.EdgesGeometry(object.geometry,25),wire=new T.LineSegments(edges,line);wire.renderOrder=1001;wire.raycast=()=>{};object.add(wire);geometries.push(edges);});
 for(const mesh of model.surfaceMeshes)if(!mesh.parent)geometries.push(mesh.geometry);
 return {root,materials:[...ownedMaterials],geometries:[...new Set(geometries)]};
}
