import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {AQUAHOME} from './aquahome-catalog.js';
export {AQUAHOME};
export const METAL_FINISHES=[{id:'Chrome brillant',name:'Chrome',hex:'#d4dce0',metalness:1,roughness:.12},{id:'Noir mat',name:'Noir mat',hex:'#252829',metalness:.15,roughness:.43},{id:'Or brossé',name:'Or brossé',hex:'#c4a264',metalness:1,roughness:.3},{id:'Cuivre',name:'Cuivre',hex:'#ae7559',metalness:1,roughness:.31},{id:'Inox brossé',name:'Inox',hex:'#aeb8b9',metalness:1,roughness:.35},{id:'Gris canon',name:'Gris canon',hex:'#626a6c',metalness:1,roughness:.3},{id:'Blanc mat',name:'Blanc mat',hex:'#f1eee7',metalness:0,roughness:.5}];
export function metalMaterial(finish){const f=METAL_FINISHES.find(f=>f.id===finish)||METAL_FINISHES[0];return new T.MeshPhysicalMaterial({color:f.hex,metalness:f.metalness,roughness:f.roughness,clearcoat:.14});}
export function tapsFor(use){return AQUAHOME.filter(p=>p.use===use);}
export function tapProduct(reference,use){return tapsFor(use).find(p=>p.reference===reference)||tapsFor(use)[0];}
// Volume reconstructions from AQUAHOME catalog photos and technical drawings.
// Reference/finish are catalog data; these are not manufacturer CAD meshes.
export function makeTap(product){
 if(!product)throw new Error('Référence AQUA HOME indisponible.');const root=new T.Group();root.name='AQUAHOME_'+product.reference;root.userData.reference=product.reference;const metal=metalMaterial(product.finish),dark=new T.MeshStandardMaterial({color:'#24292a',roughness:.65});
 const mesh=(g,m,x,y,z,n,parent=root)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.name=n;o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const cyl=(r,h,x,y,z,n,parent=root)=>mesh(new T.CylinderGeometry(r,r,h,32),metal,x,y,z,n,parent);
 const box=(w,h,d,x,y,z,n,parent=root)=>mesh(new RoundedBoxGeometry(w,h,d,2,.0015),metal,x,y,z,n,parent);
 const tube=(points,r=.012,parent=root)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),28,r,12,false),metal,0,0,0,'Bec_ou_flexible',parent);
 const square=/Malib|Flip|Manila|SQUARE|TWIST|SUPREMA/i.test(product.collection+' '+product.sourceName);
 if(product.use==='basin'||product.use==='basin-xl'){
  const xl=product.use==='basin-xl',height=product.collection==='Bel Air'?(xl?.274:.165):(xl?.29:.18),reach=xl?.138:.110,bodyH=height-.035;
  if(square){box(.048,.006,.048,0,.003,0,'Embase');box(.035,bodyH,.035,0,bodyH/2,0,'Corps');box(.032,.018,reach,0,height-.055,reach/2,'Bec');box(.018,.007,.065,0,height-.004,-.014,'Levier');}
  else{cyl(.024,.006,0,.003,0,'Embase');cyl(.020,bodyH,0,bodyH/2,0,'Corps');tube([[0,height-.055,0],[0,height-.05,.035],[0,height-.065,reach-.015],[0,height-.09,reach]],.0125);cyl(.021,.022,0,height-.017,0,'Commande');const lever=cyl(.0035,.065,.033,height-.017,0,'Levier');lever.rotation.z=Math.PI/2;}
  mesh(new T.CylinderGeometry(.009,.009,.002,24),dark,0,height-.09,reach,'Mousseur');
 }else if(product.use==='island'){
  const curve=/CURVE/.test(product.sourceName),squared=/SQUARE/.test(product.sourceName),height=curve?1.07:squared?.84:1.20;box(.15,.01,.15,0,.005,0,'Socle');if(squared||curve)box(.038,height-.02,.038,0,height/2,0,'Corps_sur_pied');else cyl(.021,height-.02,0,height/2,0,'Corps_sur_pied');
  if(squared)box(.035,.025,.247,0,height-.02,.105,'Bec');else tube([[0,height-.25,0],[0,height-.015,.02],[0,height,.08],[0,height-.22,.20]],.018);
  cyl(.028,.07,0,.72,0,'Commande');const hand=cyl(.013,.22,.08,.83,-.01,'Douchette');hand.rotation.z=-.12;tube([[.07,.77,0],[.13,.87,.12],[.19,.80,.25],[.15,.47,.30],[.02,.48,.25],[.02,.72,.04]],.006);
 }else if(product.use==='shower'){
  const h=2.06;const mixer=cyl(.025,.26,0,1.05,.035,'Mitigeur_douche');mixer.rotation.z=Math.PI/2;cyl(.011,1.05,0,1.56,.035,'Colonne');tube([[0,1.95,.035],[0,h,.06],[0,h,.31]],.011);
  if(square)box(.24,.012,.24,0,h-.015,.31,'Pomme_pluie');else cyl(.12,.012,0,h-.015,.31,'Pomme_pluie');const hand=cyl(.013,.20,.13,1.38,.08,'Douchette');hand.rotation.z=-.2;tube([[.12,1.3,.08],[.18,.60,.12],[-.07,.7,.08],[0,1.04,.08]],.006);
 }else{
  const mixer=cyl(.028,.26,0,.06,0,'Mitigeur_bain');mixer.rotation.z=Math.PI/2;tube([[0,.06,0],[0,.07,.06],[0,.02,.17]],.015);cyl(.018,.16,.14,.13,.02,'Douchette');tube([[.14,.08,.02],[.16,.20,.11],[.23,.18,.27],[.27,-.16,.34],[.02,-.14,.33],[0,.02,.11]],.006);
 }return root;
}
