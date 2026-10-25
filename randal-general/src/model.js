import {normalizeTopDrawer} from '../../shared/lrf-3d/drawer-options.js';
import {resolveBasinLayout,basinReference} from './basins.js';
import {basinCenters} from './integrated-basins.js';
import {createIntegratedBasin} from './ceramic-basins.js';
import {panelThickness,joineryLayout} from './general-specs.js';
import {adaptGeneralModel} from './general-details.js';
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createTopSet, TOP_OPTIONS } from './tops.js';
import { validWidth, topAvailable, SELLA_REFS, cabinetFormat } from './configuration.js';
export const SPEC={series:'RANDAL GÉNÉRAL · 2 tiroirs',width:.80,height:.54,depth:.46,bottom:.28,panel:.019,mirrorDiameter:.60,basin:'Sella 80 · blanc brillant',cabinetRef:'13692',basinRef:'2171',mirrorRef:'3717'};
export {FINISHES} from './finishes.js';
export function roundedRect(w,h,r){const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
export function makeModel({width=.80,includeMirror=true,basinLayout,basinTop='sella',topDrawer='siphon',format='harmony-two'}={}){
 const widthCm=Math.round(width*100);if(!validWidth(widthCm,format)||Math.abs(width*100-widthCm)>.00001)throw new Error('Largeur invalide');
 const form=cabinetFormat(format),H=form.height-form.legHeight,B=form.base+form.legHeight,topY=B+H;const W=(form.collection==='harmony'&&widthCm===120?119:widthCm)/100,layout=joineryLayout(form,W,H,B),panelSize=layout.panel,innerWidth=W-2*panelSize;
 const chosenLayout=resolveBasinLayout(basinTop,widthCm,format,basinLayout)||'center',plumbing=basinCenters(chosenLayout,W);
 const spec={...SPEC,series:'RANDAL GÉNÉRAL · '+form.name,height:H,bottom:B,cabinetRef:form.reference,width:W,panel:panelSize,basin:`Sella ${widthCm} · blanc brillant`,basinRef:basinReference('sella','gloss',widthCm,format,basinLayout)||null};
 const root=new T.Group();root.name=`STUDIO_ONE_${form.id}_${widthCm}`;const cabinet=new T.Group();cabinet.name=`Caisson_${widthCm*10}x${Math.round(H*1000)}x460`;root.add(cabinet);
 const wood=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.43,clearcoat:.12,clearcoatRoughness:.40});
 const frontWood=wood.clone();const inner=new T.MeshStandardMaterial({color:'#34383b',metalness:.65,roughness:.44});inner.name='Metal_anthracite_tiroirs';const baseMat=inner,sideMat=inner;
 const dark=new T.MeshStandardMaterial({color:'#222526',roughness:.57});const steel=new T.MeshStandardMaterial({color:'#b7bdc1',metalness:1,roughness:.26});
 const chrome=new T.MeshPhysicalMaterial({color:'#e3e8ea',metalness:1,roughness:.10,clearcoat:1,clearcoatRoughness:.08});
 const ceramic=new T.MeshPhysicalMaterial({color:'#f6f6f3',roughness:.14,metalness:0,ior:1.52,clearcoat:.8,clearcoatRoughness:.1,side:T.DoubleSide});
 const fasteners=[];const frontMeshes=[];const panels=[];
 function mesh(g,m,name,parent=root,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,m,name,parent,x,y,z,r=.00065){return mesh(new RoundedBoxGeometry(w,h,d,2,r),m,name,parent,x,y,z);}
 function woodUV(o){const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,uv=o.geometry.attributes.uv;for(let i=0;i<p.count;i++){let x=p.getX(i)+o.position.x,y=p.getY(i)+o.position.y,z=p.getZ(i)+o.position.z;if(Math.abs(n.getX(i))>.6)uv.setXY(i,z/.7+.4,y/.7);else if(Math.abs(n.getY(i))>.6)uv.setXY(i,x/.8+.5,z/.7+.4);else uv.setXY(i,x/.8+.5,y/.7);}uv.needsUpdate=true;return o;}
 function panel(w,h,d,name,x,y,z){const o=woodUV(box(w,h,d,wood,name,cabinet,x,y,z));panels.push(o);return o;}
 panel(panelSize,H,.440,'Joue_gauche_'+panelSize*1000+'mm',-(W/2-panelSize/2),B+H/2,-.010);
 panel(panelSize,H,.440,'Joue_droite_'+panelSize*1000+'mm',W/2-panelSize/2,B+H/2,-.010);
 panel(innerWidth,panelSize,.424,'Plancher_'+panelSize*1000+'mm',0,B+panelSize/2,-.009);
 panel(innerWidth,H-.036,.008,'Fond_rainure_8mm',0,B+H/2,-.222);
 panel(innerWidth,.065,.018,'Traverse_haute_avant',0,topY-.036,.170);
 panel(innerWidth,.07,.018,'Traverse_haute_arriere',0,topY-.038,-.202);
 function screw(parent,x,y,z,axis='z'){const g=new T.CylinderGeometry(.0031,.0031,.0016,16);if(axis==='z')g.rotateX(Math.PI/2);else if(axis==='x')g.rotateZ(Math.PI/2);const o=mesh(g,steel,'Vis_assemblage',parent,x,y,z);fasteners.push(o);const slot=box(.004,.0006,.0018,dark,'Empreinte_vis',parent,x,y,z+.001);if(axis==='x')slot.rotation.y=Math.PI/2;return o;}
 const drawers=[],upperInteriors=[];let drawerMode=normalizeTopDrawer(topDrawer,basinTop);
 function setTopDrawer(value,force=false){const next=normalizeTopDrawer(form.drawers?value:'siphon',topMode);if(next!==drawerMode||force){drawerMode=next;for(const rebuild of upperInteriors)rebuild();}if(drawers[0])drawers[0].name=drawerMode==='full'?'Tiroir_superieur_plein':'Tiroir_superieur_avec_passage_siphon';return drawerMode;}
 if(layout.double)panel(panelSize,H-.02,.418,'Separation_centrale',0,B+H/2,-.01);
 if(form.collection==='amat')panel(panelSize,H-.02,.418,'Separation_porte', (form.doorSide==='left'?-1:1)*(W/2-layout.doorWidth),B+H/2,-.01);
 for(let i=0;i<form.drawers;i++){
  const group=new T.Group();group.name=i===0?'Tiroir_superieur_avec_passage_siphon':'Tiroir_inferieur';cabinet.add(group);drawers.push(group);
  const row=layout.rows[i];
  for(const bay of layout.bays){
   const bayWidth=bay.width,drawerWidth=bayWidth-2*panelSize-.044,x=bay.x;
   const frontWidth=bayWidth-(form.collection==='brunei'?2*panelSize+.004:.004);
   const front=mesh(new RoundedBoxGeometry(frontWidth,row.height,panelSize,3,.0006),frontWood,form.collection==='harmony'?'Facade_droite_16mm':'Facade_'+form.collection,group,x,row.y,row.z);woodUV(front);front.userData.joinery={width:frontWidth,height:row.height,top:row.y+row.height/2,bayWidth};frontMeshes.push(front);
   const bottom=row.bottom+.031,dh=Math.min(form.collection==='amat'&&i===0?.08:.15,row.height-.044);
   // Rebuild only the floor and rear walls; fronts, sides and slides stay in place.
   const interior=new T.Group();interior.name='Interieur_tiroir';group.add(interior);
   const rebuildInterior=()=>{
    interior.traverse(o=>{if(o.isMesh)o.geometry.dispose();});interior.clear();
   // One shared anthracite metal drawer system: a real rear U cut in
   // the top drawer and a rounded dark organiser, as in the catalogue photos.
   const floor=roundedRect(drawerWidth,.352,.004);
   const cutWidth=Math.min(.15,drawerWidth*.38),cut=cutWidth/2,cutX=T.MathUtils.clamp(plumbing.reduce((a,b)=>Math.abs(b-x)<Math.abs(a-x)?b:a)-x,-drawerWidth/2+cut+.016,drawerWidth/2-cut-.016);
   if(i===0&&drawerMode!=='full'&&plumbing.some(cx=>Math.abs(cx-x)<bayWidth/2)){const path=new T.Shape();path.moveTo(-drawerWidth/2,-.176);path.lineTo(cutX-cut,-.176);path.lineTo(cutX-cut,-.018);path.quadraticCurveTo(cutX-cut,.006,cutX-cut+.024,.006);path.lineTo(cutX+cut-.024,.006);path.quadraticCurveTo(cutX+cut,.006,cutX+cut,-.018);path.lineTo(cutX+cut,-.176);path.lineTo(drawerWidth/2,-.176);path.lineTo(drawerWidth/2,.176);path.lineTo(-drawerWidth/2,.176);path.closePath();floor.copy(path);}
   const fg=new T.ExtrudeGeometry(floor,{depth:.008,bevelEnabled:true,bevelSize:.0005,bevelThickness:.0005,bevelSegments:1,curveSegments:12});fg.rotateX(Math.PI/2);
   woodUV(mesh(fg,baseMat,'Fond_tiroir_8mm',interior,x,bottom+.008,-.001));
   if(i===0&&drawerMode!=='full'&&plumbing.some(cx=>Math.abs(cx-x)<bayWidth/2)){
    const siphonHeight=Math.max(.012,Math.min(.072,topY-.151-bottom));
    for(const sign of [-1,1]){
     box(drawerWidth/2-sign*cutX-cut,Math.min(dh,.095),.010,sideMat,'Dos_tiroir_segment',interior,x+cutX+sign*(cut+(drawerWidth/2-sign*cutX-cut)/2),bottom+Math.min(dh,.095)/2,-.171);
     box(.008,siphonHeight,.182,inner,'Passage_siphon_flanc',interior,x+cutX+sign*(cut+.004),bottom+siphonHeight/2,-.087,.002);
    }
    box(cutWidth+.016,siphonHeight,.008,inner,'Passage_siphon_face',interior,x+cutX,bottom+siphonHeight/2,.006,.003);
    // Shallow organiser partitions stay below the basin when closed.
    const oh=Math.max(.008,Math.min(.045,siphonHeight-.01));
    for(const sign of [-1,1]){const wing=drawerWidth/2-sign*cutX-cut-.016;if(wing>.055){
     const center=x+cutX+sign*(cut+.012+wing/2);
     box(wing,oh,.005,inner,'Organiseur_traverse',interior,center,bottom+.010+oh/2,-.055,.0015);
     box(.005,oh,.135,inner,'Organiseur_cloison',interior,center,bottom+.010+oh/2,.096,.0015);
    }}
   }else box(drawerWidth,dh,.010,sideMat,'Dos_tiroir',interior,x,bottom+dh/2,-.171);
   };rebuildInterior();if(i===0)upperInteriors.push(rebuildInterior);
   for(const side of [-1,1]){
    const sx=x+side*(bayWidth/2-panelSize-.014);
    box(.008,dh,.350,sideMat,'Flanc_aluminium_8mm',group,sx,bottom+dh/2,-.001,.002);
    box(.009,.003,.350,sideMat,'Chant_arrondi_flanc',group,sx,bottom+dh,-.001,.001);
    box(.010,.007,.347,steel,'Chant_coulisse',group,sx,bottom+.016,-.001);
    box(.008,.025,.355,steel,'Coulisse_fixe',cabinet,x+side*(bayWidth/2-panelSize-.006),bottom-.008,-.004);
    box(.007,.018,.335,dark,'Rail_mobile',group,sx,bottom-.003,.002);
    for(const z of [-.11,.07])screw(group,sx-side*.004,bottom+.038,z,'x');
   }
   box(drawerWidth,dh,.010,inner,'Contre_facade',group,x,bottom+dh/2,.174);
   for(const sign of [-1,1]){box(.042,.028,.015,dark,'Reglage_facade',group,x+sign*(drawerWidth/2-.025),bottom+.027,.183);screw(group,x+sign*(drawerWidth/2-.025),bottom+.027,.192);}
  }
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
 const topWood=frontWood.clone();const tops=createTopSet({wood:topWood,ceramic,chrome,roundedRect,woodUV,width:W});root.add(tops.root);
 cabinet.userData.editTarget='furniture';faucet.userData.editTarget='basin';
 tops.root.userData.editTarget='basin';tops.solid.userData.editTarget='basin';tops.drilled.userData.editTarget='basin';
 for(const v of Object.values(tops.vessels))v.group.userData.editTarget='basin';
 const body=faucet.getObjectByName('Corps');
 const heads=['Bec_courbe','Mousseur','Levier_mitigeur'].map(name=>faucet.getObjectByName(name));
 const headY=heads.map(o=>o.position.y);
 let topMode=basinTop;
 function setTop(mode){
  if(!TOP_OPTIONS.some(o=>o.id===mode)||!topAvailable(mode,widthCm,format))return false;
  topMode=mode;const centers=getBasinCenters(mode),plumbingChanged=['sella','tampa'].includes(mode)&&JSON.stringify(centers)!==JSON.stringify(plumbing);if(plumbingChanged)plumbing.splice(0,plumbing.length,...centers);setTopDrawer(drawerMode,plumbingChanged);faucet.position.x=centers[0];secondFaucet.position.x=centers[1]||0;secondFaucet.visible=centers.length===2;for(const [id,group] of Object.entries(insets))group.visible=mode===id;tops.root.visible=mode!=='sella'&&mode!=='tampa';
  tops.solid.visible=mode==='plain';tops.drilled.visible=mode==='neris'||mode==='torne';
  for(const [kind,vessel] of Object.entries(tops.vessels))vessel.group.visible=mode===kind;
  faucet.visible=mode!=='plain';faucet.position.z=mode==='neris'||mode==='torne'?-.017:0;
  const extra=mode==='neris'?.150:mode==='torne'?.130:0;
  body.scale.y=(.131+extra)/.131;body.position.y=.911+extra/2;
  heads.forEach((o,i)=>o.position.y=headY[i]+extra);
  return true;
 }
 setTop(topAvailable('sella',widthCm,format)?'sella':'plain');for(const group of [...Object.values(insets),tops.root,faucet,secondFaucet])group.position.y+=topY-.82;
 // The live Reflector disk is supplied by the renderer, keeping the model testable without WebGL.
 const asset=adaptGeneralModel({root,cabinet,drawers,mirror,format:form,wood,frontWood,topWood,drawerMetal:inner,ceramic,frontMeshes,panels,fasteners,spec,tops,insetGroup,insets,faucet,faucets:[faucet,secondFaucet],getBasinCenters,basinLayout:chosenLayout,setTop,setTopDrawer,getTopDrawer:()=>drawerMode,getTop:()=>topMode},{form,W,H,B,topY,layout});asset.setTop(basinTop);asset.setTopDrawer(form.drawers?topDrawer:'siphon');return asset;
}

export function makeMirrorFrame(){
 const root=new T.Group();root.name='Miroir_rond_D600';root.position.set(0,1.4,-.202);root.userData.editTarget='mirror';
 const back=new T.Mesh(new T.CylinderGeometry(.299,.299,.012,128),new T.MeshStandardMaterial({color:'#222526',roughness:.57}));back.name='Dos_miroir';back.rotation.x=Math.PI/2;root.add(back);
 const frame=new T.Mesh(new T.TorusGeometry(.296,.004,12,160),new T.MeshPhysicalMaterial({color:'#212426',metalness:.85,roughness:.23}));frame.name='Cadre_metal_noir';frame.position.z=.008;frame.castShadow=true;root.add(frame);return root;
}
