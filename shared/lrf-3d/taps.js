import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {AQUAHOME} from './aquahome-catalog.js';
import {aquahomeProfile} from './aquahome-profiles.js';
import {diamondKnurlGeometry} from './aquahome-knurl.js';
export {AQUAHOME};
export const METAL_FINISHES=[
 {id:'Chrome brillant',name:'Chrome',hex:'#e5e9ed',metalness:1,roughness:.10},
 {id:'Noir mat',name:'Noir mat',hex:'#252829',metalness:0,roughness:.39},
 {id:'Or brossé',name:'Or brossé',hex:'#c4a264',metalness:1,roughness:.26},
 {id:'Cuivre',name:'Cuivre',hex:'#b97b60',metalness:1,roughness:.27},
 {id:'Inox brossé',name:'Inox',hex:'#b5bdc1',metalness:1,roughness:.29},
 {id:'Gris canon',name:'Gris canon',hex:'#657075',metalness:1,roughness:.27},
 {id:'Blanc mat',name:'Blanc mat',hex:'#f1eee7',metalness:0,roughness:.43},
 {id:'Latón Envejecido',name:'Laiton vieilli',hex:'#95703e',metalness:.92,roughness:.35}
];
// A small real-scale microfinish survives close views without a large download.
// Each material owns its texture: deleting a tap cannot dispose another tap's map.
function brushedTexture(){
 const width=128,height=32,data=new Uint8Array(width*height);let seed=8137;
 for(let y=0;y<height;y++){seed=(seed*1664525+1013904223)>>>0;const stripe=118+(seed%29);for(let x=0;x<width;x++)data[y*width+x]=stripe+((x*13+y*7)%5);}
 const texture=new T.DataTexture(data,width,height,T.RedFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(2,5);texture.needsUpdate=true;return texture;
}
export function metalMaterial(finish){
 const normalized=finish==='Cr Apertura Frío'?'Chrome brillant':finish;
 const f=METAL_FINISHES.find(item=>item.id===normalized)||METAL_FINISHES[0],brushed=/brossé|Cuivre|Gris canon|Envejecido/.test(f.id);
 const material=new T.MeshPhysicalMaterial({color:f.hex,metalness:f.metalness,roughness:f.roughness,clearcoat:f.metalness===1?.12:.08,clearcoatRoughness:.22,envMapIntensity:1,anisotropy:brushed?.28:0});
 if(brushed){material.bumpMap=brushedTexture();material.bumpScale=.000035;material.addEventListener('dispose',()=>material.bumpMap?.dispose());}
 material.name='AQUAHOME_'+f.id;return material;
}
export function tapsFor(use){return AQUAHOME.filter(p=>p.use===use);}
export function tapProduct(reference,use){return tapsFor(use).find(p=>p.reference===reference)||tapsFor(use)[0];}

// Photo-based reconstructions of catalogue silhouettes, not manufacturer CAD.
// Metre units and existing origins/direction are retained for saved projects.
export function makeTap(product){
 if(!product)throw new Error('Référence AQUA HOME indisponible.');
 if(!['basin','basin-xl','bath','island','shower','basin-wall','basin-floor','bidet','shower-mixer','shower-concealed','shower-kit'].includes(product.use))throw new Error('Pose AQUA HOME sans modèle 3D validé : '+product.use);
 const profile=aquahomeProfile(product),root=new T.Group();root.name='AQUAHOME_'+product.reference;
 root.userData={reference:product.reference,model:profile.key,geometryVersion:'2026-detail-3',provenance:'Reconstitution 3D des photographies AQUAHOME 2026 — pas un fichier CAO fabricant'};
 const metal=metalMaterial(product.finish),dark=new T.MeshStandardMaterial({color:'#24292a',roughness:.72}),rubber=new T.MeshStandardMaterial({color:'#969a98',roughness:.84});
 const mesh=(geometry,material,x,y,z,name,parent=root)=>{const object=new T.Mesh(geometry,material);object.position.set(x,y,z);object.name=name;object.castShadow=object.receiveShadow=true;parent.add(object);return object;};
 const box=(w,h,d,x,y,z,name,parent=root,r=.0015)=>mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/3,h/3,d/3)),metal,x,y,z,name,parent);
 const round=(r,h,x,y,z,name,parent=root,material=metal,top=r)=>{
  const b=Math.min(.0012,h*.16,r*.12),points=[new T.Vector2(0,-h/2),new T.Vector2(r-b,-h/2),new T.Vector2(r,-h/2+b),new T.Vector2(top,h/2-b),new T.Vector2(top-b,h/2),new T.Vector2(0,h/2)];
  return mesh(new T.LatheGeometry(points,64),material,x,y,z,name,parent);
 };
 const tube=(points,r,name,parent=root,material=metal,segments=48)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,16,false),material,0,0,0,name,parent);
 const rod=(a,b,r,name,parent=root,material=metal)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),direction=end.clone().sub(start),object=round(r,direction.length(),0,0,0,name,parent,material);object.position.copy(start.add(end).multiplyScalar(.5));object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());return object;};
 const sphere=(r,x,y,z,name,parent=root)=>mesh(new T.SphereGeometry(r,24,12),metal,x,y,z,name,parent);
 const joint=(x,y,z,r=.021,parent=root)=>round(r,.003,x,y,z,'Joint_cartouche',parent,dark);
 const instances=(geometry,material,positions,name,parent=root)=>{const object=new T.InstancedMesh(geometry,material,positions.length),matrix=new T.Matrix4();positions.forEach((p,i)=>object.setMatrixAt(i,matrix.makeTranslation(...p)));object.name=name;object.castShadow=object.receiveShadow=true;parent.add(object);return object;};
 const aerator=(x,y,z,r=.009,parent=root)=>{
  round(r+.0016,.004,x,y,z,'Bague_mousseur',parent);round(r,.0014,x,y-.0024,z,'Mousseur',parent,dark);
  const holes=[];for(let row=-3;row<=3;row++)for(let col=-3;col<=3;col++)if(row*row+col*col<11)holes.push([x+col*r*.23,y-.0032,z+row*r*.23]);
  instances(new T.CylinderGeometry(.00048,.00048,.0005,6),rubber,holes,'Grille_mousseur',parent);
 };
 const lever=(x,y,z,width=.029,length=.071,parent=root,open=false)=>{
  if(open){box(width,.006,.010,x,y,z+length*.75,'Levier_extremite',parent,.002);box(width,.006,.009,x,y,z-length*.1,'Levier_ajoure_arriere',parent,.0015);for(const side of [-1,1])box(.006,.006,length,x+side*(width-.006)/2,y,z+length*.30,'Levier_ajoure',parent,.002);}
  else box(width,.006,length,x,y,z+length*.30,'Levier',parent,.0025);
  round(.003,.001,x,y-.004,z+.016,'Repere_eau',parent,dark);
 };
 const crossHandle=(x,y,z,parent=root)=>{
  round(.009,.019,x,y,z,'Commande_croisillon',parent);rod([x-.026,y+.003,z],[x+.026,y+.003,z],.0038,'Croisillon_horizontal',parent);rod([x,y+.003,z-.025],[x,y+.003,z+.025],.0038,'Croisillon_profondeur',parent);
  for(const [dx,dz]of [[-.026,0],[.026,0],[0,-.025],[0,.025]])sphere(.0058,x+dx,y+.003,z+dz,'Bouton_croisillon',parent);
 };
 const handset=(x,y,z,slim,parent=root)=>{
  const group=new T.Group();group.name='Douchette';group.position.set(x,y,z);group.rotation.x=-.16;parent.add(group);
  round(slim?.010:.013,.17,0,0,0,'Manche_douchette',group);
  if(slim){round(.011,.060,0,.107,0,'Tete_douchette',group);box(.014,.044,.002,0,.109,.010,'Diffuseur_douchette',group,.0005);}
  else{const head=round(.040,.013,0,.112,.013,'Tete_douchette',group);head.rotation.x=Math.PI/2;const face=round(.035,.002,0,.112,.021,'Diffuseur_douchette',group,rubber);face.rotation.x=Math.PI/2;}
  round(.014,.009,0,-.089,0,'Raccord_douchette',group);return group;
 };
 const hose=(points,parent=root)=>{
  const object=tube(points,.0058,'Flexible',parent,metal,64),material=metal.clone();material.bumpMap=brushedTexture();material.bumpMap.repeat.set(1,100);material.bumpScale=.00018;material.roughness=Math.max(.24,metal.roughness);material.addEventListener('dispose',()=>material.bumpMap?.dispose());object.material=material;
  for(const p of [points[0],points.at(-1)])round(.008,.023,...p,'Ecrou_flexible',parent);return object;
 };
 const rosette=(x,y,z,square=false,parent=root)=>{const object=square?box(.06,.06,.008,x,y,z,'Rosace_murale',parent,.003):round(.030,.008,x,y,z,'Rosace_murale',parent);if(!square)object.rotation.x=Math.PI/2;rod([x,y,z],[x,y,z+.031],.014,'Raccord_mural',parent);};
 const rain=(x,y,z,square,size=.25,parent=root)=>{
  if(square)box(size,.008,size,x,y,z,'Pomme_pluie',parent,.003);else round(size/2,.008,x,y,z,'Pomme_pluie',parent);
  const face=square?new RoundedBoxGeometry(size-.012,.0015,size-.012,2,.001):new T.CylinderGeometry(size/2-.006,size/2-.006,.0015,64);
  mesh(face,dark,x,y-.0047,z,'Face_pomme_pluie',parent);
  const nozzles=[];for(let i=-4;i<=4;i++)for(let j=-4;j<=4;j++)if(square||i*i+j*j<=18)nozzles.push([x+i*size/11,y-.006,z+j*size/11]);
  instances(new T.CylinderGeometry(.00135,.00165,.0026,8),rubber,nozzles,'Picots_silicone',parent);round(.012,.019,x,y+.013,z,'Rotule_pomme_pluie',parent);
 };
 if(product.use==='basin-wall'){
  const square=profile.shape==='square',belAir=profile.shape==='round-tube',x=belAir?-.0965:-.060,reach=belAir?.186:.194;
  if(square)box(.240,.085,.007,0,0,.003,'Platine_murale',root,.008);
  else{rosette(x,0,0,!belAir);rosette(-x,0,0,!belAir);}
  if(square)box(.032,.021,reach,x,0,reach/2,'Bec',root,.0025);
  else if(belAir)tube([[x,0,.020],[x,0,.105],[x,-.005,.160],[x,-.023,reach]],.0125,'Bec');
  else box(.036,.015,reach,x,0,reach/2,'Bec',root,.003);
  aerator(x,square?-.016:belAir?-.029:-.013,reach-.006,.009);
  const command=round(.022,.031,-x,0,.031,'Mitigeur_lavabo');command.rotation.x=Math.PI/2;
  if(belAir)rod([-x,0,.047],[-x,-.057,.047],.0035,'Levier');
  else{const handle=box(.018,.060,.008,-x,-.014,.051,'Levier');handle.rotation.z=-.15;}
 }else if(product.use==='basin-floor'){
  const star=/STAR/.test(product.sourceName),h=star?1.013:1.20;
  round(.075,.010,0,.005,0,'Socle');round(.020,star?h-.030:h-.20,0,(star?h-.030:h-.20)/2+.010,0,'Corps_sur_pied');
  if(star)tube([[0,.84,.004],[0,.84,.11],[0,.838,.21],[0,.81,.25]],.0125,'Bec');
  else tube([[0,h-.22,0],[0,h-.045,.012],[0,h-.010,.075],[0,h-.05,.17],[0,h-.20,.20]],.018,'Bec_col_de_cygne');
  if(star){round(.023,.040,0,h-.035,0,'Mitigeur_lavabo');rod([0,h-.035,.022],[0,h-.035,.065],.0035,'Levier');}
  else{const command=round(.023,.040,.026,.85,0,'Mitigeur_lavabo');command.rotation.z=Math.PI/2;rod([.050,.841,0],[.050,.901,0],.0035,'Levier');}
  aerator(0,star?.805:.994,star?.25:.20,.009);
 }else if(product.use==='shower-concealed'){
  const square=profile.shape==='square',thermostatic=/TERMOSTÁTICO/.test(product.sourceName),plate=box(square?.105:.090,thermostatic?.210:.145,.007,0,1.05,.004,'Mitigeur_douche',root,.008);
  const command=round(.021,.035,0,1.04,.025,'Commande');command.rotation.x=Math.PI/2;
  if(thermostatic){const selector=round(.018,.027,0,1.115,.024,'Selecteur_thermostatique');selector.rotation.x=Math.PI/2;}else{const handle=box(.015,.065,.007,0,1.020,.047,'Levier',root,.002);handle.rotation.z=-.1;}
  tube([[0,2.05,.007],[0,2.05,.18],[0,2.045,.29]],.011,'Bras_pomme_pluie');rain(0,2.028,.29,square,.25);
  rosette(.21,1.12,.003,square);handset(.21,1.23,.045,!square);hose([[.21,1.13,.045],[.28,.75,.06],[.20,.62,.08],[.12,.77,.05],[.12,1.08,.027]]);
 }else if(product.use==='shower-kit'){
  rosette(-.075,1.05,.004);rosette(.075,1.05,.004);const mixer=round(.025,.27,0,1.05,.045,'Mitigeur_douche');mixer.rotation.z=Math.PI/2;
  for(const x of [-.145,.145]){const command=round(.027,.038,x,1.05,.045,'Commande_thermostatique');command.rotation.z=Math.PI/2;}
  round(.011,.67,.10,1.58,.035,'Barre_douchette');for(const y of [1.27,1.89]){rosette(.10,y,.005);rod([.10,y,.005],[.10,y,.035],.010,'Fixation_barre');}handset(.10,1.58,.070,false);hose([[.10,1.49,.070],[.16,.82,.10],[.04,.72,.12],[0,.85,.09],[0,1.025,.065]]);
  if(profile.bathSpout){tube([[0,1.05,.07],[0,1.04,.13],[0,1.01,.19]],.014,'Bec_bain');aerator(0,1.004,.19,.011);}
 }else if(product.use==='basin'||product.use==='basin-xl'||product.use==='bidet'){
  const xl=product.use==='basin-xl',h=xl?profile.xlHeight:profile.height,reach=xl?profile.xlReach:profile.reach,spout=xl?(profile.xlOutlet||h-profile.headGap):(profile.outlet||h-profile.headGap),headHeight=(xl?profile.xlHeadHeight:profile.headHeight)||.023,headCenter=profile.headHeight?h-headHeight/2:h-.015,bodyHeight=profile.headHeight?h-headHeight-.004:h-.024;
  if(profile.shape==='classic'){
   round(.031,.009,0,.0045,0,'Embase');round(.025,.040,0,.029,0,'Pied_evase',root,metal,.017);
   tube([[0,.038,0],[0,h-.035,.012],[0,h-.005,.075],[0,h-.052,reach]],.014,'Bec_col_de_cygne');
   for(const x of [-.052,.052]){rod([0,.048,0],[x,.059,0],.009,'Branche_commande');crossHandle(x,.071,0);}aerator(0,h-.057,reach,.010);
  }else{
   const square=profile.shape==='square'||profile.shape==='swept',radius=profile.radius||.021;
   if(square){box(.047,.005,.047,0,.0025,0,'Embase');const body=box(profile.width||.034,bodyHeight,.033,0,bodyHeight/2+.004,0,'Corps',root,.003);
    if(profile.shape==='swept'){const attr=body.geometry.attributes.position;for(let i=0;i<attr.count;i++)attr.setZ(i,attr.getZ(i)+((attr.getY(i)+bodyHeight/2)/bodyHeight)*.020);body.geometry.computeVertexNormals();}
   }else{round(radius+.004,.005,0,.0025,0,'Embase');round(radius,bodyHeight,0,bodyHeight/2+.004,0,'Corps',root,metal,profile.shape==='organic'?radius*.83:radius);}
   if(profile.shape==='round-tube'||profile.shape==='knurled'){
    tube([[0,spout+.028,.005],[0,spout+.028,.033],[0,spout+.023,reach-.025],[0,spout+.005,reach]],.0125,'Bec');aerator(0,spout,reach);
   }else{
    const width=profile.spoutWidth||.034,geometry=new RoundedBoxGeometry(width,.014,reach+.008,4,.003),attributes=geometry.attributes.position;
    for(let i=0;i<attributes.count;i++){const forward=attributes.getZ(i)/(reach+.008)+.5;attributes.setY(i,attributes.getY(i)-Math.pow(forward,2)*(profile.shape==='swept'?.014:.005));}geometry.computeVertexNormals();
    mesh(geometry,metal,0,spout,reach/2,'Bec');aerator(0,spout-.015,reach-.010,width*.22);
   }
   const headZ=profile.shape==='swept'?.020:0;
   joint(0,h-headHeight-.001,headZ,profile.openLever?.012:square?.014:radius*.99);
   if(profile.openLever)round(.0085,.026,0,h-.012,headZ,'Commande');
   else if(square)box(profile.leverWidth||profile.width||.034,profile.shape==='swept'?.009:headHeight,.034,0,profile.shape==='swept'?h-.012:headCenter,headZ,'Commande',root,.0015);
   else round(radius*1.01,headHeight,0,headCenter,0,'Commande');
   if(square&&!profile.openLever)round(.006,.009,0,h-.004,headZ,'Axe_levier');
   if(profile.shape==='round-tube'||profile.shape==='knurled'){
    const leverY=headCenter+.003;
    // Both rods leave the same front side as the spout in the catalogue's
    // neutral position. +X made the lever incorrectly point sideways.
    rod([0,leverY,radius*.55],[0,leverY,radius+.061],.0032,'Levier');
    if(profile.shape==='knurled'){
     const grip=metalMaterial(product.finish);grip.roughness=Math.max(.20,grip.roughness);grip.clearcoat=.04;
     const geometry=diamondKnurlGeometry(radius*1.01+.00006,headHeight-.0012);
     mesh(geometry,grip,0,headCenter,0,'Moletage_Flip');
    }
   }else lever(0,h+.001,headZ+.006,profile.leverWidth||.029,profile.leverLength||.068,root,profile.openLever);
  }
  if(product.use==='bidet'){
   const nozzle=root.getObjectByName('Bague_mousseur');if(nozzle){
    const swivel=new T.Group();swivel.name='Rotule_mousseur_bidet';swivel.position.copy(nozzle.position);root.add(swivel);
    for(const name of ['Bague_mousseur','Mousseur','Grille_mousseur']){const part=root.getObjectByName(name);if(part)swivel.attach(part);}
    swivel.rotation.x=.22;
   }
   root.scale.y=.76;
  }
 }else if(product.use==='island'){
  const square=profile.shape==='square',curve=profile.shape==='curve',h=curve?1.07:square?.84:1.20;
  if(square||curve)box(.125,.010,.125,0,.005,0,'Socle',root,.008);else round(.062,.010,0,.005,0,'Socle');
  if(square)box(.035,h-.045,.035,0,(h-.045)/2+.010,0,'Corps_sur_pied',root,.003);
  else if(curve)tube([[0,.013,0],[0,h-.17,0],[0,h-.035,.010],[0,h,.040],[0,h-.12,.185]],.020,'Corps_sur_pied');
  else{round(.021,h-.16,0,(h-.16)/2+.010,0,'Corps_sur_pied');tube([[0,h-.18,0],[0,h-.035,.013],[0,h,.080],[0,h-.19,.20]],.018,'Bec');}
  if(square)box(.035,.024,.247,0,h-.025,.108,'Bec',root,.003);
  aerator(0,curve?h-.125:square?h-.039:h-.197,curve?.185:square?.219:.20,.012);
  if(curve){
   box(.040,.026,.040,.025,.72,.005,'Commande',root,.003);
   const handle=new T.Group();handle.name='Levier_cadre_vertical';root.add(handle);
   for(const z of [-.009,.019])box(.006,.058,.005,.047,.751,z,'Levier_cadre_montant',handle,.001);
   for(const y of [.724,.778])box(.006,.005,.033,.047,y,.005,'Levier_cadre_traverse',handle,.001);
  }else{
   const command=round(.027,.060,.025,.72,.005,'Commande');command.rotation.z=Math.PI/2;
   rod([.055,square?.723:.717,.005],[.055,square?.780:.660,.005],.0032,'Levier');
  }
  box(.06,.015,.026,.042,.80,0,'Support_douchette');handset(.08,.80,0,true);hose([[.08,.70,0],[.15,.52,.04],[.10,.40,.08],[.02,.48,.05],[.01,.70,.02]]);
 }else if(product.use==='shower'){
  const h=2.06,square=profile.squareRain,thermostatic=profile.thermostatic;
  rosette(-.075,1.05,.004,profile.squareBody);rosette(.075,1.05,.004,profile.squareBody);
  if(profile.squareBody)box(.26,.047,.057,0,1.05,.045,'Mitigeur_douche',root,.003);else{const mixer=round(.025,.26,0,1.05,.045,'Mitigeur_douche');mixer.rotation.z=Math.PI/2;}
  if(thermostatic){for(const x of [-.145,.145]){const grip=round(.027,.040,x,1.05,.045,'Commande_thermostatique');grip.rotation.z=Math.PI/2;}round(.003,.002,-.137,1.078,.045,'Securite_38',root,dark);}
  else{round(.022,.030,0,1.080,.045,'Commande');lever(0,1.099,.045,.023,.057);}
  if(profile.hydromassage){
   box(.065,.93,.045,0,1.59,.04,'Panneau_hydromassage',root,.006);box(.26,.032,.10,0,1.09,.065,'Tablette_hydromassage',root,.004);
   for(const y of [1.30,1.42,1.54,1.66,1.78]){const jet=round(.014,.009,0,y,.068,'Buse_hydromassage');jet.rotation.x=Math.PI/2;}
   box(.25,.025,.32,0,h,.17,'Plateau_pluie',root,.004);rain(0,h-.009,.23,true,.22);
  }else{
   if(profile.squareBody)box(.022,1.00,.022,0,1.565,.045,'Colonne',root,.002);else round(.011,1.00,0,1.565,.045,'Colonne');round(.014,.045,0,1.76,.045,'Bague_telescopique');
   tube([[0,1.91,.045],[0,h-.015,.045],[0,h,.082],[0,h,.31]],.0105,'Bras_pomme_pluie');rain(0,h-.024,.31,square,.25);
   round(.021,.026,0,1.78,.029,'Support_colonne');rod([0,1.78,.029],[0,1.78,.004],.010,'Fixation_murale');
  }
  round(.018,.037,0,1.43,.045,'Coulisseau_douchette');rod([0,1.43,.045],[.10,1.43,.071],.008,'Support_douchette');handset(.12,1.39,.075,profile.slimHandset);
  const flexible=hose([[.12,1.30,.075],[.14,.79,.10],[.09,.64,.12],[-.02,.76,.11],[0,1.026,.078]]);
  if(profile.hydromassage){flexible.material.color.set('#202324');flexible.material.metalness=0;flexible.material.roughness=.62;tube([[.13,1.78,.070],[.18,1.64,.09],[.18,1.21,.09],[.13,1.12,.070]],.005,'Flexible_secondaire',root,dark,40);}
  if(profile.bathSpout){tube([[0,1.05,.068],[0,1.045,.13],[0,1.01,.20]],.014,'Bec_bain');aerator(0,1.004,.20,.011);}
 }else if(product.use==='bath'||product.use==='shower-mixer'){
  const square=profile.shape==='square'||profile.shape==='swept',classic=profile.shape==='classic';
  rosette(-.075,.060,-.030,square);rosette(.075,.060,-.030,square);
  if(square)box(.20,.042,.055,0,.060,.020,'Mitigeur_bain',root,.003);else{const mixer=round(.027,.23,0,.060,.020,'Mitigeur_bain');mixer.rotation.z=Math.PI/2;}
  if(classic){crossHandle(-.118,.078,.020);crossHandle(.118,.078,.020);if(product.use==='bath'){tube([[0,.065,.030],[0,.15,.07],[0,.17,.15],[0,.04,.20]],.013,'Bec_bain');aerator(0,.034,.20,.010);}}
  else{round(.024,.028,0,.102,.025,'Commande');if(profile.shape==='round-tube')rod([-.038,.060,.055],[-.080,.020,.10],.0035,'Levier');else lever(0,.119,.032);if(product.use==='bath'){if(square)box(.041,.020,.16,0,.058,.098,'Bec_bain');else tube([[0,.062,.028],[0,.059,.080],[0,.052,.14],[0,.026,.18]],.014,'Bec_bain');aerator(0,square?.043:.021,square?.168:.18,.010);round(.007,.019,.047,.096,.083,'Inverseur');}}
  if(product.use==='shower-mixer'){
   const mixer=root.getObjectByName('Mitigeur_bain');mixer.name='Mitigeur_douche';for(const child of root.children)child.position.y-=.060;round(.009,.018,0,-.040,.035,'Sortie_flexible');
  }else{
   // Existing equipment projects are anchored to the model's lower bound.
   // Retain the original bath hose loop and its extent while refining its finish.
   handset(.14,.13,.02,profile.shape==='round-tube');
   hose([[.14,.08,.02],[.16,.20,.11],[.23,.18,.27],[.27,-.16,.34],[.02,-.14,.33],[0,.02,.11]]);
  }
 }
 root.updateMatrixWorld(true);return root;
}
