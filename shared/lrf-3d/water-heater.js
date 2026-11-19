import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import fontData from 'three/examples/fonts/helvetiker_regular.typeface.json' with {type:'json'};

// Linéo plat generation shown in Jérôme's supplied Atlantic dimension sheet.
// Do not replace these depths with the current 30/30.5 cm catalogue generation.
export const WATER_HEATER_MODEL='atlantic-lineo';
export const WATER_HEATER_CAPACITIES=Object.freeze([
 Object.freeze({capacity:40,height:765,width:490,depth:290,mountSpacing:500,mountTop:155}),
 Object.freeze({capacity:65,height:1090,width:490,depth:290,mountSpacing:700,mountTop:115}),
 Object.freeze({capacity:80,height:1300,width:490,depth:290,mountSpacing:800,mountTop:115}),
 Object.freeze({capacity:100,height:1240,width:550,depth:320,mountSpacing:800,mountTop:115}),
]);
export const isWaterHeater=settings=>settings?.model===WATER_HEATER_MODEL;
export function waterHeaterSpec(settings={}){return WATER_HEATER_CAPACITIES.find(p=>p.capacity===(settings.waterHeaterCapacity??80))||null;}
export function waterHeaterError(settings={}){return waterHeaterSpec(settings)?'':'Choisissez un chauffe-eau Linéo plat de 40, 65, 80 ou 100 litres.';}
export function waterHeaterLabel(settings={}){return 'Chauffe-eau Atlantic Linéo '+(waterHeaterSpec(settings)?.capacity||80)+' L';}
export function waterHeaterDimensionLabel(settings={}){const p=waterHeaterSpec(settings);return p?'H '+p.height/10+' × L '+p.width/10+' × P '+p.depth/10+' cm':'';}

function roundedSection(w,d,r){
 const x=-w/2,y=-d/2,shape=new T.Shape();
 shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+d-r);shape.quadraticCurveTo(x+w,y+d,x+w-r,y+d);shape.lineTo(x+r,y+d);shape.quadraticCurveTo(x,y+d,x,y+d-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);return shape;
}
function shellGeometry(w,h,d,r,bevel=.002){
 const geometry=new T.ExtrudeGeometry(roundedSection(w-2*bevel,d-2*bevel,r-bevel),{depth:h-2*bevel,steps:1,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:4,curveSegments:24});
 geometry.rotateX(-Math.PI/2);geometry.translate(0,bevel,0);geometry.computeVertexNormals();return geometry;
}
const font=new FontLoader().parse(fontData);
export function makeWaterHeater(settings={}){
 const spec=waterHeaterSpec(settings);if(!spec)throw Error(waterHeaterError(settings));
 const w=spec.width/1000,h=spec.height/1000,d=spec.depth/1000,root=new T.Group(),body=new T.Group();root.name='Chauffe_eau_Atlantic_Lineo_'+spec.capacity+'L';root.userData.editTarget='towel';root.userData.productKind='water-heater';root.userData.manufacturer='Atlantic';root.userData.capacity=spec.capacity;root.add(body);
 const enamel=new T.MeshPhysicalMaterial({name:'Atlantic_blanc_emaille',color:'#f7f7f4',metalness:.035,roughness:.25,clearcoat:.48,clearcoatRoughness:.22,ior:1.48});
 const silver=new T.MeshStandardMaterial({name:'Bandeaux_gris_satine',color:'#b7b9b8',metalness:.7,roughness:.3});
 const seam=new T.MeshStandardMaterial({name:'Joint_de_coque',color:'#d4d5d2',roughness:.6});
 const black=new T.MeshPhysicalMaterial({name:'Commande_verre_noir',color:'#111817',roughness:.12,metalness:.08,clearcoat:1,clearcoatRoughness:.12});
 const ink=new T.MeshStandardMaterial({name:'Serigraphie_Atlantic',color:'#646968',roughness:.55});
 const display=new T.MeshStandardMaterial({name:'Commande_voyant_eau',color:'#e3eee5',emissive:'#86b4a0',emissiveIntensity:.16,roughness:.5});
 const brass=new T.MeshStandardMaterial({name:'Raccords_laiton',color:'#b8a07b',metalness:.82,roughness:.3});
 const add=(name,geometry,material,x=0,y=0,z=0)=>{const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;body.add(mesh);return mesh;};
 const profileRadius=Math.min(.065,d/3);
 add('Habillage_blanc_arrondi',shellGeometry(w-.0008,h-.055,d-.006,profileRadius,.003),enamel,0,.040,-.002);
 add('Bandeau_superieur_satine',shellGeometry(w,.015,d,profileRadius,.0018),silver,0,h-.015,0);
 add('Bandeau_inferieur_satine',shellGeometry(w,.018,d,profileRadius,.0018),silver,0,.022,0);
 for(const y of [.040,h-.015])add('Joint_fin_de_capot',shellGeometry(w-.0004,.001,d-.001,profileRadius,.0002),seam,0,y,0);
 // Separate rear mounting brackets and fasteners, contained in the stated envelope.
 const top=h-spec.mountTop/1000;
 for(const y of [top,top-spec.mountSpacing/1000]){
  add('Platine_fixation_murale',new RoundedBoxGeometry(w-.08,.028,.013,3,.003),silver,0,y,-d/2+.0065);
  for(const x of [-.175,.175]){const screw=add('Vis_de_fixation',new T.CylinderGeometry(.004,.004,.014,16),ink,x,y,-d/2+.008);screw.rotation.x=Math.PI/2;}
 }
 // The physical front controls are raised only within the cap's depth envelope.
 const front=d/2-.005,panelY=Math.max(.14,h*.153);
 add('Cadre_commande_chrome',new RoundedBoxGeometry(.054,.088,.002,6,.011),silver,0,panelY,front+.001);
 add('Commande_Water_Drop',new RoundedBoxGeometry(.049,.082,.003,8,.010),black,0,panelY,front+.002);
 const drop=[];for(let i=0;i<=48;i++){const a=2*Math.PI*i/48,r=.009*(.73+.27*Math.cos(a));drop.push(new T.Vector3(Math.sin(a)*r,panelY+.012+Math.cos(a)*.014,front+.0037));}
 add('Symbole_goutte_eau',new T.TubeGeometry(new T.CatmullRomCurve3(drop,true),64,.00055,6,true),display);
 for(const [i,x]of [-.012,0,.012].entries()){
  const ring=add('Touche_tactile_'+i,new T.TorusGeometry(.0035,.0004,6,24),display,x,panelY-.024,front+.0038);
  if(i===1)add('Voyant_central',new T.CircleGeometry(.0011,16),display,x,panelY-.024,front+.0039);
 }
 const logoGeometry=new T.ShapeGeometry(font.generateShapes('atlantic',.013),8);logoGeometry.computeBoundingBox();const logo=add('Logo_Atlantic_vertical',logoGeometry,ink,w*.32,h-.145,front+.0004);logo.rotation.z=Math.PI/2;
 // Two 1/2-inch ports: brass threads, seals and hot/cold identification rings.
 for(const [x,color,label]of [[-.0765,'#bd5149','eau_chaude'],[.0765,'#477a9e','eau_froide']]){
  const collar=new T.MeshStandardMaterial({name:'Repere_'+label,color,roughness:.55});
  add('Raccord_'+label,new T.CylinderGeometry(.0105,.0105,.027,28),brass,x,.0135,-.015);
  add('Repere_'+label,new T.CylinderGeometry(.013,.013,.006,28),collar,x,.019,-.015);
  for(let i=0;i<5;i++){const thread=add('Filetage_'+label,new T.TorusGeometry(.0106,.0007,6,28),brass,x,.003+i*.0025,-.015);thread.rotation.x=Math.PI/2;}
 }
 // Standard equipment coordinates put the back plane at z=-23 cm.
 body.position.z=-.23+d/2;
 return {root,dimensions:{width:w,height:h,depth:d,base:0},spec};
}

// An exact-proportion diagram for the chooser; the room itself uses the solid 3D model above.
export const WATER_HEATER_VISUAL=Object.freeze({kind:'catalogue-drawing',alt:'Atlantic Linéo plat blanc, bandeaux gris et commande noire',provenance:'Dessin du modèle Atlantic Linéo plat de la fiche fournie',src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700" viewBox="0 0 600 700"><defs><linearGradient id="face"><stop stop-color="#e3e4e1"/><stop offset=".24" stop-color="#fff"/><stop offset=".76" stop-color="#f7f7f4"/><stop offset="1" stop-color="#d0d2cf"/></linearGradient><linearGradient id="edge"><stop stop-color="#b8bab7"/><stop offset=".5" stop-color="#e1e3df"/><stop offset="1" stop-color="#a3a6a2"/></linearGradient></defs><rect width="600" height="700" fill="#fafbf7"/><ellipse cx="310" cy="638" rx="105" ry="12" fill="#243d2b" opacity=".08"/><path d="M214 83Q214 72 226 69L369 48Q386 47 399 58L410 67V606Q410 619 397 622L251 641Q235 642 223 633L214 627Z" fill="url(#edge)"/><path d="M217 88L357 68Q372 66 382 75V615L246 634Q230 636 217 626Z" fill="url(#face)"/><path d="M383 77L406 70V605Q406 614 395 617L383 619Z" fill="#d7d9d6"/><rect x="284" y="526" width="25" height="40" rx="9" fill="#1a211f"/><path d="M296 534Q309 551 296 553Q284 552 296 534Z" fill="none" stroke="#c1d5c9" stroke-width="1.5"/><g fill="none" stroke="#bccdc2"><circle cx="290" cy="560" r="1.5"/><circle cx="297" cy="559" r="1.5"/><circle cx="304" cy="558" r="1.5"/></g><text x="351" y="140" fill="#656b65" font-family="Arial,sans-serif" font-size="12" transform="rotate(-90 351 140)">atlantic</text></svg>')});
