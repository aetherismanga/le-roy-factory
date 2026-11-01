import * as T from 'three';
import {cabinetFormat} from './configuration.js';
import {createDecorMaterials,addDecorBottle,addFoldedTowels,addHangingTowel,addDecorPlant,addDecorSoap} from '../../shared/lrf-3d/basin-decor.js';
export const decorationVisible=(type,s={})=>s.decor!==false;
export function decorateAsset(asset,type,s={}){
 let group=asset.root.getObjectByName('Accessoires_decoratifs');if(group){group.visible=decorationVisible(type,s);return;}
 if(!['cabinet','towel','washstand'].includes(type))return;
 group=new T.Group();group.name='Accessoires_decoratifs';group.visible=decorationVisible(type,s);asset.root.add(group);
 const materials=createDecorMaterials();
 if(type==='cabinet'){
  const W=(s.width||80)/100,format=cabinetFormat(s.format),h=format.base+format.height+.023;
  if(W>=.7){addFoldedTowels(group,-W/2+.068,h,.02,materials);addDecorBottle(group,W/2-.055,h,-.04,materials);}
  if(W>=1)addDecorPlant(group,-W/2+.065,h,-.155,materials);
 }
 if(type==='towel')addHangingTowel(group,0,.64,-.23+.125,.21,.40,materials);
 if(type==='washstand'){
  const trixie=s.reference==='TR443',h=trixie?.15:.125;
  if(trixie){addHangingTowel(group,-.20,-.095,-.23+.295,.18,.28,materials);addDecorBottle(group,-.20,h,-.23+.095,materials);addDecorSoap(group,-.245,h+.012,-.23+.20,materials);}
  else addDecorBottle(group,-.20,h,-.23+.04,materials);
 }
}
