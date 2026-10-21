import {resolveBasinLayout,basinReference} from './basins.js';
import {basinCenters} from './integrated-basins.js';
import {createIntegratedBasin} from './ceramic-basins.js';
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createTopSet, TOP_OPTIONS } from './tops.js';
import { validWidth, topAvailable, SELLA_REFS, cabinetFormat } from './configuration.js';
export const SPEC={series:'STUDIO ONE · 2 tiroirs',width:.80,height:.54,depth:.46,bottom:.28,panel:.019,mirrorDiameter:.60,basin:'Sella 80 · blanc brillant',cabinetRef:'13692',basinRef:'2171',mirrorRef:'3717'};
export {FINISHES} from './finishes.js';
export function roundedRect(w,h,r){const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
export function makeModel({width=.80,includeMirror=true,basinLayout,basinTop='sella',format='two'}={}){
 const widthCm=Math.round(width*100);if(!validWidth(widthCm)||Math.abs(width*100-widthCm)>.00001)throw new Error('Largeur invalide');
 const form=cabinetFormat(format),legHeight=form.legHeight||0,H=form.height-legHeight,B=form.base+legHeight,topY=B+H;const W=widthCm/100,innerWidth=W-.038,drawerWidth=W-.096;
 const chosenLayout=resolveBasinLayout(basinTop,widthCm,format,basinLayout)||'center',plumbing=basinCenters(chosenLayout,W);
 const spec={...SPEC,series:'STUDIO ONE · '+form.name,height:H,bottom:B,legHeight,totalHeight:form.height,cabinetRef:form.reference,width:W,basin:`Sella ${widthCm} · blanc brillant`,basinRef:basinReference('sella','gloss',widthCm,format,basinLayout)||null};
 const root=new T.Group();root.name=`STUDIO_ONE_${form.id}_${widthCm}`;const cabinet=new T.Group();cabinet.name=`Caisson_${widthCm*10}x${Math.round(H*1000)}x460`;root.add(cabinet);
 const wood=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.43,clearcoat:.12,clearcoatRoughness:.40});
 const frontWood=wood.clone();const inner=new T.MeshStandardMaterial({color:'#3e4141',roughness:.54});const baseMat=new T.MeshStandardMaterial({color:'#a9aca9',roughness:.58});
 const dark=new T.MeshStandardMaterial({color:'#222526',roughness:.57});const steel=new T.MeshStandardMaterial({color:'#b7bdc1',metalness:1,roughness:.26});
 const chrome=new T.MeshPhysicalMaterial({color:'#e3e8ea',metalness:1,roughness:.10,clearcoat:1,clearcoatRoughness:.08});
 const ceramic=new T.MeshPhysicalMaterial({color:'#f6f6f3',roughness:.14,metalness:0,ior:1.52,clearcoat:.8,clearcoatRoughness:.1,side:T.DoubleSide});
 const fasteners=[];const frontMeshes=[];const panels=[];
 function mesh(g,m,name,parent=root,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,m,name,parent,x,y,z,r=.00065){return mesh(new RoundedBoxGeometry(w,h,d,2,r),m,name,parent,x,y,z);}
 function woodUV(o){const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,uv=o.geometry.attributes.uv;for(let i=0;i<p.count;i++){let x=p.getX(i)+o.position.x,y=p.getY(i)+o.position.y,z=p.getZ(i)+o.position.z;if(Math.abs(n.getX(i))>.6)uv.setXY(i,z/.7+.4,y/.7);else if(Math.abs(n.getY(i))>.6)uv.setXY(i,x/.8+.5,z/.7+.4);else uv.setXY(i,x/.8+.5,y/.7);}uv.needsUpdate=true;return o;}
 function panel(w,h,d,name,x,y,z){const o=woodUV(box(w,h,d,wood,name,cabinet,x,y,z));panels.push(o);return o;}
 const legs=new T.Group();legs.name='Pieds_10cm';legs.userData.editTarget='furniture';
 if(legHeight){
  root.add(legs);
  // Four real metal supports, inset beneath the carcass. The foot, upright
  // and mounting plate together span exactly 10 cm, from the finished floor.
  for(const side of [-1,1])for(const front of [-1,1]){
   const leg=new T.Group();leg.name='Pied_'+(side<0?'gauche':'droit')+'_'+(front<0?'arriere':'avant');legs.add(leg);
   leg.position.set(side*(W/2-.042),form.base,front*.177);
   box(.038,.004,.038,dark,'Patin_de_protection',leg,0,.002,0,.0009);
   box(.026,legHeight-.008,.026,chrome,'Pied_chrome_10cm',leg,0,legHeight/2,0,.0012);
   box(.046,.004,.046,steel,'Platine_sous_caisson',leg,0,legHeight-.002,0,.0007);
  }
 }
 panel(.019,H,.440,'Joue_gauche_19mm',-(W/2-.0095),B+H/2,-.010);
 panel(.019,H,.440,'Joue_droite_19mm',W/2-.0095,B+H/2,-.010);
 panel(innerWidth,.019,.424,'Plancher_19mm',0,B+.0095,-.009);
 panel(innerWidth,H-.036,.008,'Fond_rainure_8mm',0,B+H/2,-.222);
 panel(innerWidth,.065,.018,'Traverse_haute_avant',0,topY-.036,.170);
 panel(innerWidth,.07,.018,'Traverse_haute_arriere',0,topY-.038,-.202);
 // Corrected direction: full-height front lip; the 45-degree cut slopes
 // down towards the drawer interior over the 19mm panel thickness.
 function facade(w,h){
  const corners=[[-.0095,-h/2],[.0095,-h/2],[.0095,h/2],[-.0095,h/2-.019]],shape=new T.Shape();
  // Round the cross-section itself, so the large grip plane stays exactly 45°.
  // Generic Extrude bevels skewed that plane slightly at the acute front corner.
  corners.forEach((p,i)=>{const a=new T.Vector2(...corners[(i+3)%4]).sub(new T.Vector2(...p)).normalize(),b=new T.Vector2(...corners[(i+1)%4]).sub(new T.Vector2(...p)).normalize(),d=.00045/Math.tan(Math.acos(a.dot(b))/2),start=new T.Vector2(...p).addScaledVector(a,d),end=new T.Vector2(...p).addScaledVector(b,d);if(i===0)shape.moveTo(start.x,start.y);else shape.lineTo(start.x,start.y);shape.quadraticCurveTo(p[0],p[1],end.x,end.y);});shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:w,steps:1,bevelEnabled:false,curveSegments:6});g.rotateY(-Math.PI/2);g.translate(w/2,0,0);return g;
 }

 function screw(parent,x,y,z,axis='z'){const g=new T.CylinderGeometry(.0031,.0031,.0016,16);if(axis==='z')g.rotateX(Math.PI/2);else if(axis==='x')g.rotateZ(Math.PI/2);const o=mesh(g,steel,'Vis_assemblage',parent,x,y,z);fasteners.push(o);const slot=box(.004,.0006,.0018,dark,'Empreinte_vis',parent,x,y,z+.001);if(axis==='x')slot.rotation.y=Math.PI/2;return o;}
 const drawers=[];
 for(let i=0;i<form.drawers;i++){
  const group=new T.Group();group.name=i===0?'Tiroir_superieur_avec_passage_siphon':'Tiroir_inferieur';cabinet.add(group);drawers.push(group);
  const cell=H/form.drawers,cy=B+H-(i+.5)*cell-(i===0?0:.001),h=cell-.008;
  const front=mesh(facade(W-.004,h),frontWood,'Facade_onglet_45deg_19mm',group,0,cy,.2205);woodUV(front);frontMeshes.push(front);
  const bottom=B+H-(i+1)*cell+(i===0?.031:.035);const dh=form.id==='two'?(i===0?.107:.148):Math.min(.23,cell*.55);
  // Drawer floor is a solid shaped panel with a rear U cut, not a decal.
  const floor=roundedRect(drawerWidth,.352,.006);
  if(i===0){
   const path=new T.Shape();path.moveTo(-drawerWidth/2,-.176);
   for(const x of plumbing){path.lineTo(x-.09,-.176);path.lineTo(x-.09,.015);path.quadraticCurveTo(x-.09,.038,x-.066,.038);path.lineTo(x+.066,.038);path.quadraticCurveTo(x+.09,.038,x+.09,.015);path.lineTo(x+.09,-.176);}
   path.lineTo(drawerWidth/2,-.176);path.lineTo(drawerWidth/2,.176);path.lineTo(-drawerWidth/2,.176);path.closePath();floor.copy(path);
  }
  const fg=new T.ExtrudeGeometry(floor,{depth:.008,bevelEnabled:true,bevelSize:.0005,bevelThickness:.0005,bevelSegments:1,curveSegments:16});fg.rotateX(Math.PI/2);
  mesh(fg,baseMat,'Fond_tiroir_8mm',group,0,bottom+.008,-.001);
  for(const side of [-1,1]){
   box(.008,dh,.350,inner,'Flanc_anthracite_8mm',group,side*(W/2-.042),bottom+dh/2,-.001,.002);
   box(.012,.008,.347,steel,'Chant_coulisse',group,side*(W/2-.043),bottom+.016,-.001);
   // Fixed, intermediate and moving telescopic rails.
   box(.008,.025,.355,steel,'Coulisse_fixe',cabinet,side*(W/2-.025),bottom-.008,-.004);
   box(.007,.018,.335,dark,'Rail_mobile',group,side*(W/2-.033),bottom-.003,.002);
   for(const z of [-.11,.07])screw(group,side*(W/2-.037),bottom+.038,z,'x');
  }
  if(i===0){
   let left=-drawerWidth/2;
   for(const x of plumbing){const span=x-.09-left;if(span>.001)box(span,.095,.012,inner,'Dos_tiroir_segment',group,left+span/2,bottom+.0475,-.171);for(const sign of [-1,1])box(.008,.072,.205,inner,'Passage_siphon_flanc',group,x+sign*.086,bottom+.036,-.08);box(.172,.072,.008,inner,'Passage_siphon_face',group,x,bottom+.036,.021);left=x+.09;}
   if(drawerWidth/2-left>.001)box(drawerWidth/2-left,.095,.012,inner,'Dos_tiroir_segment',group,(left+drawerWidth/2)/2,bottom+.0475,-.171);
  }
  else box(drawerWidth,dh,.012,inner,'Dos_tiroir',group,0,bottom+dh/2,-.171);
  box(drawerWidth,dh,.010,inner,'Contre_facade',group,0,bottom+dh/2,.174);
  for(const s of [-1,1]){box(.042,.028,.015,dark,'Reglage_facade',group,s*(W/2-.085),bottom+.027,.183);screw(group,s*(W/2-.085),bottom+.027,.192);}
 }
 for(const s of [-1,1]){
  box(.05,.044,.025,steel,'Fixation_murale_reglable',cabinet,s*(W/2-.058),topY-.044,-.2);
  screw(cabinet,s*(W/2-.058),topY-.044,-.183);
 }
 const insets={};for(const kind of ['sella','tampa'])insets[kind]=createIntegratedBasin({parent:root,W,kind,layout:resolveBasinLayout(kind,widthCm,format,basinLayout)||chosenLayout,ceramic,chrome,dark,roundedRect,mesh,box});
 const insetGroup=insets.sella;
 // Generic demonstration mixer. Not asserted to be a RANDAL catalogue reference.
 const faucet=new T.Group();faucet.name='Mitigeur_illustratif';root.add(faucet);
 mesh(new T.CylinderGeometry(.022,.024,.006,48),chrome,'Embase',faucet,0,.844,-.173);
 mesh(new T.CylinderGeometry(.018,.021,.131,48),chrome,'Corps',faucet,0,.911,-.173);
 const points=[new T.Vector3(0,.951,-.173),new T.Vector3(0,.982,-.17),new T.Vector3(0,.987,-.112),new T.Vector3(0,.979,-.043)];
 mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),48,.0125,20,false),chrome,'Bec_courbe',faucet);
 const outlet=mesh(new T.CylinderGeometry(.01,.01,.004,32),dark,'Mousseur',faucet,0,.972,-.041);outlet.rotation.x=.3;
 box(.018,.006,.071,chrome,'Levier_mitigeur',faucet,0,.985,-.182,.002);
 const secondFaucet=faucet.clone(true);secondFaucet.name='Mitigeur_illustratif_double';root.add(secondFaucet);
 const getBasinCenters=mode=>insets[mode]?.userData.basinCenters||[0];
 const mirror=includeMirror?makeMirrorFrame():null;if(mirror)root.add(mirror);
 const tops=createTopSet({wood:frontWood,ceramic,chrome,roundedRect,woodUV,width:W});root.add(tops.root);
 cabinet.userData.editTarget='furniture';faucet.userData.editTarget='basin';
 tops.root.userData.editTarget='basin';tops.solid.userData.editTarget='basin';tops.drilled.userData.editTarget='basin';
 for(const v of Object.values(tops.vessels))v.group.userData.editTarget='basin';
 const body=faucet.getObjectByName('Corps');
 const heads=['Bec_courbe','Mousseur','Levier_mitigeur'].map(name=>faucet.getObjectByName(name));
 const headY=heads.map(o=>o.position.y);
 let topMode='sella';
 function setTop(mode){
  if(!TOP_OPTIONS.some(o=>o.id===mode)||!topAvailable(mode,widthCm))return false;
  topMode=mode;const centers=getBasinCenters(mode);faucet.position.x=centers[0];secondFaucet.position.x=centers[1]||0;secondFaucet.visible=centers.length===2;for(const [id,group] of Object.entries(insets))group.visible=mode===id;tops.root.visible=mode==='plain'||mode==='neris'||mode==='torne';
  tops.solid.visible=mode==='plain';tops.drilled.visible=mode==='neris'||mode==='torne';
  for(const [kind,vessel] of Object.entries(tops.vessels))vessel.group.visible=mode===kind;
  faucet.visible=mode!=='plain'&&mode!=='bare';faucet.position.z=mode==='neris'||mode==='torne'?-.017:0;
  const extra=mode==='neris'?.150:mode==='torne'?.130:0;
  body.scale.y=(.131+extra)/.131;body.position.y=.911+extra/2;
  heads.forEach((o,i)=>o.position.y=headY[i]+extra);
  return true;
 }
 setTop(topAvailable('sella',widthCm)?'sella':'plain');for(const group of [...Object.values(insets),tops.root,faucet,secondFaucet])group.position.y+=topY-.82;
 // The live Reflector disk is supplied by the renderer, keeping the model testable without WebGL.
 return {root,cabinet,legs,drawers,mirror,format:form,wood,frontWood,ceramic,frontMeshes,panels,fasteners,spec,tops,insetGroup,insets,faucet,faucets:[faucet,secondFaucet],getBasinCenters,basinLayout:chosenLayout,setTop,getTop:()=>topMode};
}

export function makeMirrorFrame(){
 const root=new T.Group();root.name='Miroir_rond_D600';root.position.set(0,1.4,-.202);root.userData.editTarget='mirror';
 const back=new T.Mesh(new T.CylinderGeometry(.299,.299,.012,128),new T.MeshStandardMaterial({color:'#222526',roughness:.57}));back.name='Dos_miroir';back.rotation.x=Math.PI/2;root.add(back);
 const frame=new T.Mesh(new T.TorusGeometry(.296,.004,12,160),new T.MeshPhysicalMaterial({color:'#212426',metalness:.85,roughness:.23}));frame.name='Cadre_metal_noir';frame.position.z=.008;frame.castShadow=true;root.add(frame);return root;
}
