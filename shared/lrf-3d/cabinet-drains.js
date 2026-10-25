import {metalMaterial} from './taps.js';
import {matchingDrain} from './plumbing-catalog.js';

// Each asset owns its drain material. Never tint the original chrome material,
// shared with screws, handles and the illustrative mixer.
export function applyCabinetDrainFinish(asset,finish){
 const drain=matchingDrain(finish);
 if(asset.drainMaterial?.userData?.drainFinish!==drain.finish){
  const previous=asset.drainMaterial;asset.drainMaterial=metalMaterial(drain.finish);
  asset.drainMaterial.userData.drainFinish=drain.finish;previous?.dispose();
 }
 asset.root.traverse(object=>{
  if(!object.isMesh||!/^Bonde_|^Couvercle_bonde/.test(object.name))return;
  object.material=asset.drainMaterial;object.userData.drainReference=drain.reference;
  object.userData.drainFinish=drain.finish;object.userData.editTarget='basin';
 });
 return drain;
}
export function syncCabinetDrain(item,finish){
 if(item?.type!=='cabinet')return null;
 const drain=applyCabinetDrainFinish(item.asset,finish);
 if(['sella','tampa','neris','torne','compact'].includes(item.settings.top)){
  item.settings.drainFinish=drain.finish;item.settings.drainReference=drain.reference;
 }else{delete item.settings.drainFinish;delete item.settings.drainReference;}
 return drain;
}
