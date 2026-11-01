// Installation choices shared by both bathroom ateliers. Dimensions remain in
// the product mesh; these are placement defaults, not manufacturer dimensions.
export const AQUAHOME_INSTALLATIONS=Object.freeze([
 {id:'shower',name:'Colonne de douche',icon:'shower'},
 {id:'bath',name:'Robinet bain mural',icon:'bath'},
 {id:'island',name:'Robinet bain sur pied',icon:'bath'},
 {id:'basin-wall',name:'Lavabo mural encastré',icon:'washstand'},
 {id:'basin-floor',name:'Lavabo sur pied',icon:'washstand'},
 {id:'bidet',name:'Mitigeur de bidet',icon:'washstand'},
 {id:'shower-mixer',name:'Mitigeur de douche mural',icon:'shower'},
 {id:'shower-concealed',name:'Ensemble de douche encastré',icon:'shower'},
 {id:'shower-kit',name:'Kit de douche thermostatique',icon:'shower'}
].map(Object.freeze));
export const isFloorTapUse=use=>use==='island'||use==='basin-floor';
export const isShowerTapUse=use=>['shower','shower-mixer','shower-concealed','shower-kit'].includes(use);
export const tapModelKey=product=>product.modelKey||(['shower','island'].includes(product.use)?product.sourceName:product.collection);
export function tapModelLabel(product){
 if(product.modelKey)return product.collection+' · '+product.name;
 return tapModelKey(product).replace('COLUMNA TERMOSTÁTICA DE DUCHA ','Colonne thermostatique ').replace('COLUMNA DE DUCHA ','Colonne ').replace('COLUMNA DE BAÑO ','Colonne bain ').replace('BAÑERA EXENTA ','Sur pied ');
}
export function tapMixerObject(root,use){
 const names=isShowerTapUse(use)?['Mitigeur_douche']:use==='bath'?['Mitigeur_bain']:['Mitigeur_lavabo','Commande','Corps'];
 for(const name of names){const object=root?.getObjectByName(name);if(object)return object;}
 return null;
}
export function tapDefaultPlacementHeight(use,asset){
 if(isFloorTapUse(use))return 0;
 // Preserve the existing installation heights of saved/legacy categories.
 if(use==='shower')return 55;
 if(use==='bath')return 40;
 if(use==='bidet')return 40;
 const root=asset?.root,mixer=tapMixerObject(root,use);
 // An equipment mesh is normalized to its lowest point. Derive the real
 // command height after that transform rather than assuming an old offset.
 let offset=0;
 if(root&&mixer){root.updateMatrixWorld(true);const point=mixer.getWorldPosition(mixer.position.clone());root.worldToLocal(point);offset=point.y*100;}
 return (use==='basin-wall'?100:105)-offset;
}
