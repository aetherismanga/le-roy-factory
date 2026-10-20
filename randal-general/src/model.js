import {panelThickness,joineryLayout} from './general-specs.js';
import {adaptGeneralModel} from './general-details.js';
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createTopSet, TOP_OPTIONS } from './tops.js';
import { validWidth, topAvailable, SELLA_REFS, cabinetFormat } from './configuration.js';
export const SPEC={series:'RANDAL GÉNÉRAL · 2 tiroirs',width:.80,height:.54,depth:.46,bottom:.28,panel:.019,mirrorDiameter:.60,basin:'Sella 80 · blanc brillant',cabinetRef:'13692',basinRef:'2171',mirrorRef:'3717'};
export {FINISHES} from './finishes.js';
export function roundedRect(w,h,r){const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
export function makeModel({width=.80,includeMirror=true,format='harmony-two'}={}){
 const widthCm=Math.round(width*100);if(!validWidth(widthCm,format)||Math.abs(width*100-widthCm)>.00001)throw new Error('Largeur invalide');
 const form=cabinetFormat(format),H=form.height-form.legHeight,B=form.base+form.legHeight,topY=B+H;const W=(form.collection==='harmony'&&widthCm===120?119:widthCm)/100,layout=joineryLayout(form,W,H,B),panelSize=layout.panel,innerWidth=W-2*panelSize;
 const spec={...SPEC,series:'RANDAL GÉNÉRAL · '+form.name,height:H,bottom:B,cabinetRef:form.reference,width:W,panel:panelSize,basin:`Sella ${widthCm} · blanc brillant`,basinRef:SELLA_REFS[widthCm]||null};
 const root=new T.Group();root.name=`STUDIO_ONE_${form.id}_${widthCm}`;const cabinet=new T.Group();cabinet.name=`Caisson_${widthCm*10}x${Math.round(H*1000)}x460`;root.add(cabinet);
 const wood=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.43,clearcoat:.12,clearcoatRoughness:.40});
 const frontWood=wood.clone();const inner=new T.MeshStandardMaterial({color:'#373a3b',roughness:.54});const baseMat=wood;const sideMat=new T.MeshPhysicalMaterial({color:'#c1c5c6',metalness:.7,roughness:.42});
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
 const drawers=[];
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
   // One shared metal drawer system: thin silver sides, a real rear U cut in
   // the top drawer and a rounded dark organiser, as in the catalogue photos.
   const floor=roundedRect(drawerWidth,.352,.004);
   const cutWidth=Math.min(.15,drawerWidth*.38),cut=cutWidth/2,cutX=form.collection==='amat'?T.MathUtils.clamp(-x,-drawerWidth/2+cut+.016,drawerWidth/2-cut-.016):0;
   if(i===0){const path=new T.Shape();path.moveTo(-drawerWidth/2,-.176);path.lineTo(cutX-cut,-.176);path.lineTo(cutX-cut,-.018);path.quadraticCurveTo(cutX-cut,.006,cutX-cut+.024,.006);path.lineTo(cutX+cut-.024,.006);path.quadraticCurveTo(cutX+cut,.006,cutX+cut,-.018);path.lineTo(cutX+cut,-.176);path.lineTo(drawerWidth/2,-.176);path.lineTo(drawerWidth/2,.176);path.lineTo(-drawerWidth/2,.176);path.closePath();floor.copy(path);}
   const fg=new T.ExtrudeGeometry(floor,{depth:.008,bevelEnabled:true,bevelSize:.0005,bevelThickness:.0005,bevelSegments:1,curveSegments:12});fg.rotateX(Math.PI/2);
   woodUV(mesh(fg,baseMat,'Fond_tiroir_8mm',group,x,bottom+.008,-.001));
   for(const side of [-1,1]){
    const sx=x+side*(bayWidth/2-panelSize-.014);
    box(.008,dh,.350,sideMat,'Flanc_aluminium_8mm',group,sx,bottom+dh/2,-.001,.002);
    box(.009,.003,.350,sideMat,'Chant_arrondi_flanc',group,sx,bottom+dh,-.001,.001);
    box(.010,.007,.347,steel,'Chant_coulisse',group,sx,bottom+.016,-.001);
    box(.008,.025,.355,steel,'Coulisse_fixe',cabinet,x+side*(bayWidth/2-panelSize-.006),bottom-.008,-.004);
    box(.007,.018,.335,dark,'Rail_mobile',group,sx,bottom-.003,.002);
    for(const z of [-.11,.07])screw(group,sx-side*.004,bottom+.038,z,'x');
   }
   if(i===0){
    const siphonHeight=Math.max(.012,Math.min(.072,topY-.151-bottom));
    for(const sign of [-1,1]){
     box(drawerWidth/2-sign*cutX-cut,Math.min(dh,.095),.010,sideMat,'Dos_tiroir_segment',group,x+cutX+sign*(cut+(drawerWidth/2-sign*cutX-cut)/2),bottom+Math.min(dh,.095)/2,-.171);
     box(.008,siphonHeight,.182,inner,'Passage_siphon_flanc',group,x+cutX+sign*(cut+.004),bottom+siphonHeight/2,-.087,.002);
    }
    box(cutWidth+.016,siphonHeight,.008,inner,'Passage_siphon_face',group,x+cutX,bottom+siphonHeight/2,.006,.003);
    // Shallow organiser partitions stay below the basin when closed.
    const oh=Math.max(.008,Math.min(.045,siphonHeight-.01));
    for(const sign of [-1,1]){const wing=drawerWidth/2-sign*cutX-cut-.016;if(wing>.055){
     const center=x+cutX+sign*(cut+.012+wing/2);
     box(wing,oh,.005,inner,'Organiseur_traverse',group,center,bottom+.010+oh/2,-.055,.0015);
     box(.005,oh,.135,inner,'Organiseur_cloison',group,center,bottom+.010+oh/2,.096,.0015);
    }}
   }else box(drawerWidth,dh,.010,sideMat,'Dos_tiroir',group,x,bottom+dh/2,-.171);
   box(drawerWidth,dh,.010,inner,'Contre_facade',group,x,bottom+dh/2,.174);
   for(const sign of [-1,1]){box(.042,.028,.015,dark,'Reglage_facade',group,x+sign*(drawerWidth/2-.025),bottom+.027,.183);screw(group,x+sign*(drawerWidth/2-.025),bottom+.027,.192);}
  }
 }
 for(const s of [-1,1]){
  box(.05,.044,.025,steel,'Fixation_murale_reglable',cabinet,s*(W/2-.058),topY-.044,-.2);
  screw(cabinet,s*(W/2-.058),topY-.044,-.183);
 }
 const insets={};
 for(const kind of ['sella','tampa']){
 const isTampa=kind==='tampa';
 const insetGroup=new T.Group();insetGroup.name='Vasque_encastree_'+kind;insetGroup.userData.editTarget='basin';root.add(insetGroup);
 // Ceramic top, precision rounded opening and a closed ceramic shell.
 const topShape=roundedRect(W+.006,.466,.008);
 const double=W>=1.19&&form.collection!=='luce',offsets=double?[-W/4,W/4]:[0];
 const basinScale=Math.min(.281,(W/(double?2:1)-.12)/2)/.281;
 const ring=(rx,rz,p=4.2,n=128)=>Array.from({length:n},(_,i)=>{let a=i/n*Math.PI*2;return new T.Vector2(rx*Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**(2/p),rz*Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**(2/p)-.027);});
 for(const x of offsets){const hole=new T.Path(ring((isTampa?.25:.281)*basinScale,isTampa?.138:.15,isTampa?8:4.2).map(p=>new T.Vector2(p.x+x,p.y)).reverse());topShape.holes.push(hole);}
 const tapHole=new T.Path();tapHole.absarc(0,.173,.017,0,Math.PI*2,true);topShape.holes.push(tapHole);
 const topG=new T.ExtrudeGeometry(topShape,{depth:.018,bevelEnabled:true,bevelSize:.0012,bevelThickness:.0012,bevelSegments:3,curveSegments:32});topG.rotateX(-Math.PI/2);
 const top=mesh(topG,ceramic,'Plan_vasque_ceramique_'+Math.round((W+.006)*1000)+'x466',insetGroup,0,.820,0);
 const profiles=isTampa?[[.250,.138,.839,8],[.246,.134,.837,8],[.240,.128,.827,8],[.225,.115,.733,7],[.190,.090,.708,6],[.080,.045,.696,3],[.021,.021,.693,2],[.021,.021,.689,2],[.084,.048,.692,3],[.196,.094,.704,6],[.231,.121,.730,7],[.246,.134,.819,8],[.250,.138,.819,8]]:[ [.281,.150,.839,4.2],[.277,.146,.838,4.2],[.269,.139,.831,4.1],[.252,.126,.812,4],[.223,.102,.761,3.8],[.173,.076,.711,3.3],[.09,.046,.687,2.7],[.021,.021,.683,2], [.021,.021,.679,2],[.093,.049,.683,2.7],[.176,.080,.707,3.3],[.228,.106,.757,3.8],[.257,.131,.808,4],[.275,.144,.818,4.2],[.281,.150,.819,4.2] ];
 const ps=[],uv=[],ix=[],N=128;
 for(let j=0;j<profiles.length;j++){const [rx,rz,y,p]=profiles[j];for(let k=0;k<=N;k++){const a=k/N*Math.PI*2;ps.push((rx>.024?rx*basinScale:rx)*Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**(2/p),y,rz*Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**(2/p)+.027);uv.push(k/N,j/(profiles.length-1));if(j<profiles.length-1&&k<N){const a=j*(N+1)+k,b=a+N+1;ix.push(a,b,a+1,b,b+1,a+1);}}}
 const bowlG=new T.BufferGeometry();bowlG.setAttribute('position',new T.Float32BufferAttribute(ps,3));bowlG.setAttribute('uv',new T.Float32BufferAttribute(uv,2));bowlG.setIndex(ix);bowlG.computeVertexNormals();for(const x of offsets)mesh(bowlG.clone(),ceramic,'Vasque_'+kind.toUpperCase()+'_coque_3D',insetGroup,x);
 const drainG=new T.CylinderGeometry(.022,.02,.008,64);for(const x of offsets)mesh(drainG.clone(),chrome,'Bonde_chromee',insetGroup,x,isTampa?.695:.685,.027);
 for(const x of offsets)mesh(new T.CylinderGeometry(.019,.019,.0018,64),chrome,'Couvercle_bonde',insetGroup,x,isTampa?.701:.691,.027);
 if(isTampa)box(.036,.007,.0015,dark,'Trop_plein_Tampa',insetGroup,0,.801,-.097,.001);
 insets[kind]=insetGroup;
 }
 const insetGroup=insets.sella;
 // Generic demonstration mixer. Not asserted to be a RANDAL catalogue reference.
 const faucet=new T.Group();faucet.name='Mitigeur_illustratif';root.add(faucet);
 mesh(new T.CylinderGeometry(.022,.024,.006,48),chrome,'Embase',faucet,0,.844,-.173);
 mesh(new T.CylinderGeometry(.018,.021,.131,48),chrome,'Corps',faucet,0,.911,-.173);
 const points=[new T.Vector3(0,.951,-.173),new T.Vector3(0,.982,-.17),new T.Vector3(0,.987,-.112),new T.Vector3(0,.979,-.043)];
 mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),48,.0125,20,false),chrome,'Bec_courbe',faucet);
 const outlet=mesh(new T.CylinderGeometry(.01,.01,.004,32),dark,'Mousseur',faucet,0,.972,-.041);outlet.rotation.x=.3;
 box(.018,.006,.071,chrome,'Levier_mitigeur',faucet,0,.985,-.182,.002);
 const mirror=includeMirror?makeMirrorFrame():null;if(mirror)root.add(mirror);
 const topWood=frontWood.clone();const tops=createTopSet({wood:topWood,ceramic,chrome,roundedRect,woodUV,width:W});root.add(tops.root);
 cabinet.userData.editTarget='furniture';faucet.userData.editTarget='basin';
 tops.root.userData.editTarget='basin';tops.solid.userData.editTarget='basin';tops.drilled.userData.editTarget='basin';
 for(const v of Object.values(tops.vessels))v.group.userData.editTarget='basin';
 const body=faucet.getObjectByName('Corps');
 const heads=['Bec_courbe','Mousseur','Levier_mitigeur'].map(name=>faucet.getObjectByName(name));
 const headY=heads.map(o=>o.position.y);
 let topMode='sella';
 function setTop(mode){
  if(!TOP_OPTIONS.some(o=>o.id===mode)||!topAvailable(mode,widthCm,format))return false;
  topMode=mode;for(const [id,group] of Object.entries(insets))group.visible=mode===id;tops.root.visible=mode!=='sella'&&mode!=='tampa';
  tops.solid.visible=mode==='plain';tops.drilled.visible=mode==='neris'||mode==='torne';
  for(const [kind,vessel] of Object.entries(tops.vessels))vessel.group.visible=mode===kind;
  faucet.visible=mode!=='plain';faucet.position.z=mode==='neris'||mode==='torne'?-.017:0;
  const extra=mode==='neris'?.150:mode==='torne'?.130:0;
  body.scale.y=(.131+extra)/.131;body.position.y=.911+extra/2;
  heads.forEach((o,i)=>o.position.y=headY[i]+extra);
  return true;
 }
 setTop(topAvailable('sella',widthCm,format)?'sella':'plain');for(const group of [...Object.values(insets),tops.root,faucet])group.position.y+=topY-.82;
 // The live Reflector disk is supplied by the renderer, keeping the model testable without WebGL.
 return adaptGeneralModel({root,cabinet,drawers,mirror,format:form,wood,frontWood,topWood,ceramic,frontMeshes,panels,fasteners,spec,tops,insetGroup,insets,faucet,setTop,getTop:()=>topMode},{form,W,H,B,topY,layout});
}

export function makeMirrorFrame(){
 const root=new T.Group();root.name='Miroir_rond_D600';root.position.set(0,1.4,-.202);root.userData.editTarget='mirror';
 const back=new T.Mesh(new T.CylinderGeometry(.299,.299,.012,128),new T.MeshStandardMaterial({color:'#222526',roughness:.57}));back.name='Dos_miroir';back.rotation.x=Math.PI/2;root.add(back);
 const frame=new T.Mesh(new T.TorusGeometry(.296,.004,12,160),new T.MeshPhysicalMaterial({color:'#212426',metalness:.85,roughness:.23}));frame.name='Cadre_metal_noir';frame.position.z=.008;frame.castShadow=true;root.add(frame);return root;
}
