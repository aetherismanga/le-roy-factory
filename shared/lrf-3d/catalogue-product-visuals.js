// Product cards prefer manufacturer photographs when catalogue originals exist.
// Other generic room objects retain clearly identified views of their editable
// 3D models. These images never create additional items or change references.
import {aquahomeProductVisual,defaultAquahomeProductVisual} from './aquahome-product-visuals.js';
import {mirrorThumbnail} from './mirror-thumbnail.js';
const base='assets/product-visuals/v2/';
const descriptor=(file,alt)=>Object.freeze({src:base+file+'.webp',alt,kind:'model-render',provenance:'Vue du modèle 3D proposé dans le configurateur · éclairage studio'});
const mirrorDescriptor=(id,alt)=>Object.freeze({src:mirrorThumbnail(id),alt,kind:'catalogue-drawing',provenance:'Forme et proportions du modèle proposé · verre sur fond neutre'});
export const PRODUCT_VISUALS=Object.freeze({
 cabinet:descriptor('cabinet','Meuble de salle de bains deux tiroirs, finition Serenade Alba, sans plan'),
 column:descriptor('column','Colonne de salle de bains une porte, finition Serenade Alba'),
 mirror:mirrorDescriptor('capsule','Miroir capsule à éclairage LED'),
 'mirror-round':mirrorDescriptor('round','Miroir rond à cadre métallique noir'),
 'mirror-metal-rect':mirrorDescriptor('metal-rect','Miroir rectangulaire à angles arrondis, cadre métallique noir'),
 'mirror-basic':mirrorDescriptor('basic','Miroir Basic rectangulaire'),
 'mirror-zen':mirrorDescriptor('zen','Miroir Zen à bandeau LED horizontal'),
 'mirror-ilse':mirrorDescriptor('ilse','Miroir Ilse à deux bandeaux LED verticaux'),
 'mirror-capsule':mirrorDescriptor('capsule','Miroir capsule à éclairage LED'),
 leg:descriptor('leg-black','Pied ALBUFERA en métal noir, hauteur 10 cm'),
 window:descriptor('window','Fenêtre blanche à deux vantaux et double vitrage'),
 door:descriptor('door','Porte intérieure blanche avec poignée métallique'),
 'bath-round':descriptor('bath-round','Baignoire encastrée arrondie avec tablier blanc'),
 'bath-rect':descriptor('bath-rect','Baignoire encastrée rectangulaire avec tablier blanc'),
 'bath-island':descriptor('bath-island','Baignoire îlot ovale blanche'),
 shower:descriptor('shower','Receveur de douche blanc avec caniveau encastré'),
 'shower-tile':Object.freeze({src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#f4f2eb"/><path d="M120 350L480 210L690 325L330 465Z" fill="#ded4bf" stroke="#b5ac99" stroke-width="3"/><path d="M120 350V382L330 497V465M330 497L690 357V325" fill="#c3b79f" stroke="#a59b88" stroke-width="3"/><g fill="none" stroke="#fbf8ef" stroke-width="3"><path d="M240 303L450 418M360 257L570 372M225 408L585 268"/></g><path d="M575 294L615 315L495 362L455 340Z" fill="#59645f"/><path d="M582 305L595 312L491 352L478 345Z" fill="#b8c1bb"/></svg>'),alt:'Schéma d’un receveur à carreler avec joints et caniveau, sur fond neutre',kind:'catalogue-drawing',provenance:'Schéma du receveur à carreler personnalisable, sans référence fabricant imposée'}),
 'screen-fixed':descriptor('screen-fixed','Paroi de douche fixe droite en verre, profilés noirs'),
 'screen-return':descriptor('screen-return','Paroi de douche en verre avec retour de 40 cm, profilés noirs'),
 'towel-round':descriptor('towel-round','Sèche-serviettes chromé à tubes ronds'),
 'towel-flat':descriptor('towel-flat','Sèche-serviettes chromé à lames plates'),
 'tap-shower':Object.freeze(defaultAquahomeProductVisual('shower')),
 'tap-bath':Object.freeze(defaultAquahomeProductVisual('bath')),
 'tap-island':Object.freeze(defaultAquahomeProductVisual('island')),
 'toilet-tr2217r':descriptor('toilet-tr2217r','WC suspendu AMARO VORTEX blanc, référence TR2217R'),
 'toilet-tr2217r-u18':descriptor('toilet-tr2217r-u18','WC suspendu AMARO BLACK VORTEX noir, référence TR2217R-U18'),
 'toilet-tr2224':descriptor('toilet-tr2224','WC sur pied KRAL blanc avec réservoir, référence TR2224'),
 'toilet-support':descriptor('toilet-support','WC suspendu AMARO VORTEX avec bâti-support habillé et plaque de chasse'),
 'washstand-str4335':descriptor('washstand-str4335','Lave-mains DALIA avec robinetterie et siphon chromés, référence STR4335'),
 'washstand-tr443':descriptor('washstand-tr443','Lave-mains TRIXIE avec tablette, robinetterie et siphon chromés, référence TR443')
});
export function productVisual(type,options={}){
 if(type==='tap'){const reference=options.tap||options.reference;return reference?aquahomeProductVisual(reference):defaultAquahomeProductVisual(options.use||'shower');}
 const key=type==='shower'&&options.trayType==='tile'?'shower-tile':type==='mirror'&&options.mirrorModel?'mirror-'+options.mirrorModel:type==='bath'?'bath-'+(options.kind||'island'):type==='screen'?'screen-'+(options.screen||'fixed'):type==='tap'?'tap-'+(options.use||'shower'):type==='towel'?'towel-'+(options.model||'round'):type==='toilet'?options.support?'toilet-support':'toilet-'+String(options.reference||'TR2217R').toLowerCase():type==='washstand'?'washstand-'+String(options.reference||'TR443').toLowerCase():type;
 return PRODUCT_VISUALS[key]||null;
}
