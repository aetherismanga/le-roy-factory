// Catalogue views rendered from the existing, editable 3D models. They are
// illustrative model renders, not manufacturer photographs or additional items.
// Paths are shared by STUDIO ONE and RANDAL General so each only loads images
// visible in its product chooser. Existing manufacturer cabinet/mirror photos
// remain the first choice for collection-specific catalogue cards.
const base='assets/product-visuals/v2/';
const descriptor=(file,alt)=>Object.freeze({src:base+file+'.webp',alt,kind:'model-render',provenance:'Vue du modèle 3D proposé dans le configurateur · éclairage studio'});
export const PRODUCT_VISUALS=Object.freeze({
 cabinet:descriptor('cabinet','Meuble de salle de bains deux tiroirs, finition Serenade Alba, sans plan'),
 column:descriptor('column','Colonne de salle de bains une porte, finition Serenade Alba'),
 mirror:descriptor('mirror-capsule','Miroir capsule à éclairage LED'),
 'mirror-round':descriptor('mirror-round','Miroir rond à cadre métallique noir'),
 'mirror-metal-rect':descriptor('mirror-metal-rect','Miroir rectangulaire à angles arrondis, cadre métallique noir'),
 'mirror-basic':descriptor('mirror-basic','Miroir Basic rectangulaire'),
 'mirror-zen':descriptor('mirror-zen','Miroir Zen à bandeau LED horizontal'),
 'mirror-ilse':descriptor('mirror-ilse','Miroir Ilse à deux bandeaux LED verticaux'),
 'mirror-capsule':descriptor('mirror-capsule','Miroir capsule à éclairage LED'),
 leg:descriptor('leg-black','Pied ALBUFERA en métal noir, hauteur 10 cm'),
 window:descriptor('window','Fenêtre blanche à deux vantaux et double vitrage'),
 door:descriptor('door','Porte intérieure blanche avec poignée métallique'),
 'bath-round':descriptor('bath-round','Baignoire encastrée arrondie avec tablier blanc'),
 'bath-rect':descriptor('bath-rect','Baignoire encastrée rectangulaire avec tablier blanc'),
 'bath-island':descriptor('bath-island','Baignoire îlot ovale blanche'),
 shower:descriptor('shower','Receveur de douche blanc avec caniveau encastré'),
 'screen-fixed':descriptor('screen-fixed','Paroi de douche fixe droite en verre, profilés noirs'),
 'screen-return':descriptor('screen-return','Paroi de douche en verre avec retour de 40 cm, profilés noirs'),
 'towel-round':descriptor('towel-round','Sèche-serviettes chromé à tubes ronds'),
 'towel-flat':descriptor('towel-flat','Sèche-serviettes chromé à lames plates'),
 'tap-shower':descriptor('tap-shower','Colonne de douche AQUA HOME chromée avec douche de tête'),
 'tap-bath':descriptor('tap-bath','Robinetterie de bain murale AQUA HOME chromée'),
 'tap-island':descriptor('tap-island','Robinetterie de bain sur pied AQUA HOME chromée'),
 'toilet-tr2217r':descriptor('toilet-tr2217r','WC suspendu AMARO VORTEX blanc, référence TR2217R'),
 'toilet-tr2217r-u18':descriptor('toilet-tr2217r-u18','WC suspendu AMARO BLACK VORTEX noir, référence TR2217R-U18'),
 'toilet-tr2224':descriptor('toilet-tr2224','WC sur pied KRAL blanc avec réservoir, référence TR2224'),
 'toilet-support':descriptor('toilet-support','WC suspendu AMARO VORTEX avec bâti-support habillé et plaque de chasse'),
 'washstand-str4335':descriptor('washstand-str4335','Lave-mains DALIA avec robinetterie et siphon chromés, référence STR4335'),
 'washstand-tr443':descriptor('washstand-tr443','Lave-mains TRIXIE avec tablette, robinetterie et siphon chromés, référence TR443')
});
export function productVisual(type,options={}){
 const key=type==='mirror'&&options.mirrorModel?'mirror-'+options.mirrorModel:type==='bath'?'bath-'+(options.kind||'island'):type==='screen'?'screen-'+(options.screen||'fixed'):type==='tap'?'tap-'+(options.use||'shower'):type==='towel'?'towel-'+(options.model||'round'):type==='toilet'?options.support?'toilet-support':'toilet-'+String(options.reference||'TR2217R').toLowerCase():type==='washstand'?'washstand-'+String(options.reference||'TR443').toLowerCase():type;
 return PRODUCT_VISUALS[key]||null;
}
