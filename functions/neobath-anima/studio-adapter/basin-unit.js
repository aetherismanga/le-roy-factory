import * as T from 'three';
import {makeStandaloneWorktop} from './standalone-worktop.js';
import {normalizeBasinUnitSettings,basinUnitDimensions,basinUnitConstructionSettings} from './basin-unit-data.js';

/** Real catalogue shell and waste; the construction slab is removed, not
 * hidden. Its materials remain owned by the existing deterministic disposer. */
export function makeBasinUnit(input={}){
 let settings=normalizeBasinUnitSettings(input);const asset=makeStandaloneWorktop(basinUnitConstructionSettings(settings)),setPlanSettings=asset.setSettings;
 asset.root.name='NEOBATH_ANIMA_VASQUE_INDEPENDANTE';asset.root.userData.animaStandalonePlan=false;asset.root.userData.animaBasinUnit=true;
 asset.setSettings=(patch={})=>{
  let next;try{next=normalizeBasinUnitSettings({...settings,...patch});}catch{return false;}
  if(!setPlanSettings(basinUnitConstructionSettings(next)))return false;
  const model=asset.tops,dimensions=basinUnitDimensions(next);
  for(const mesh of model.surfaceMeshes)mesh.removeFromParent();
  // Plumbing belongs to an installed support. A separately placed vessel
  // keeps its actual shell bottom as the vertical placement anchor.
  model.root.getObjectByName('Siphons_Anima')?.removeFromParent();
  model.root.position.set(0,0,0);model.root.updateWorldMatrix(true,true);
  const inverse=model.root.matrixWorld.clone().invert(),bounds=new T.Box3();model.root.traverse(object=>{if(!object.isMesh||!object.geometry?.attributes.position)return;object.geometry.computeBoundingBox();bounds.union(object.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,object.matrixWorld)));});const centre=bounds.getCenter(new T.Vector3());
  model.root.position.set(-centre.x,-bounds.min.y,-.23+dimensions.depth/2-centre.z);
  model.root.traverse(object=>{object.userData.editTarget='basin';if(object.isMesh){object.userData.animaStandalonePlan=false;object.userData.animaBasinUnit=true;}});
  settings=next;asset.settings=next;asset.spec={...asset.spec,width:dimensions.width,depth:dimensions.depth,height:dimensions.height,bottom:0,base:0,sourceProductId:next.basinProductId,basinRef:asset.selection.basin.ref,cabinetRef:null,topHeight:0,standaloneBasin:true,fixingsIncluded:false};
  asset.root.userData.animaStandalonePlan=false;return true;
 };
 // A free vessel has no supporting deck for a mixer. Assign it to a real
 // plan before allowing the existing mixer compatibility controls.
 asset.wood.addEventListener('dispose',()=>asset.tops?.dispose());
 asset.getTapPositions=()=>[];asset.getBasinCenters=()=>[0];asset.getBasinPositions=()=>[{x:0,z:-.23+basinUnitDimensions(settings).depth/2}];
 if(!asset.setSettings(settings))throw Error('Cette vasque Anima ne peut pas être construite.');return asset;
}
export function createBasinUnitGhost(settings){
 const asset=makeBasinUnit(settings),root=new T.Group(),bounds=new T.Box3().setFromObject(asset.root),centre=bounds.getCenter(new T.Vector3());asset.root.position.sub(centre);root.add(asset.root);
 const fill=new T.MeshBasicMaterial({color:0x448f73,transparent:true,opacity:.38,depthWrite:false,depthTest:false,side:T.DoubleSide}),line=new T.LineBasicMaterial({color:0x286f53,transparent:true,opacity:.95,depthWrite:false,depthTest:false}),materials=[fill,line],geometries=[];
 asset.root.traverse(object=>{if(!object.isMesh||!object.geometry?.attributes.position)return;object.material=fill;object.renderOrder=1000;object.raycast=()=>{};const edges=new T.EdgesGeometry(object.geometry,25),wire=new T.LineSegments(edges,line);wire.renderOrder=1001;wire.raycast=()=>{};object.add(wire);geometries.push(edges);});
 // The placement engine releases this material after the drag finishes.
 fill.addEventListener('dispose',()=>asset.dispose());return {root,materials,geometries};
}
