import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {flutedFront,arubaPull,borealPull} from './general-fronts.js';
import {HANDLE_FINISHES,handleFinish,handleChoices} from './general-specs.js';
// Refine the reused chassis with each collection's actual front and hardware.
export function adaptGeneralModel(asset,{form,W,H,B,topY,layout}){
 const {root,cabinet,wood,frontWood,drawers,frontMeshes,insets,tops,faucet}=asset;
 const metal=new T.MeshPhysicalMaterial({color:'#b8bdc0',metalness:.9,roughness:.32}),hardware=metal.clone(),dark=new T.MeshStandardMaterial({color:'#272a2c',roughness:.62});
 const box=(parent,w,h,d,m,x,y,z,name)=>{const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(.0008,w/5,h/5)),m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const handles=[],doors=[];
 function pull(mesh,parent,x,y,z,name){mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.editTarget='handle';parent.add(mesh);handles.push(mesh);return mesh;}
 function amatPull(parent,w,x,y,z,name){
  // The catalogue grip is furniture-coloured, with angled ends and a rounded
  // leading edge. Share the actual front material, including its HD wood map.
  const s=new T.Shape(),h=.015,d=.021,a=w/2;
  s.moveTo(-a+.014,-h/2);s.lineTo(a-.014,-h/2);s.lineTo(a,h/2);s.lineTo(-a,h/2);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.0012,bevelThickness:.0012,bevelSegments:3,curveSegments:8});g.translate(0,0,-d/2);
  const o=pull(new T.Mesh(g,frontWood),parent,x,y,z,name),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+x)/.8+.5,(p.getY(i)+y)/.7);uv.needsUpdate=true;o.userData.editTarget='furniture';return o;
 }
 function door(x,y,w,h,side='left'){
  const pivot=new T.Group(),sign=side==='left'?1:-1;pivot.position.set(x-sign*w/2,y,.230-layout.panel/2);pivot.userData.side=side;cabinet.add(pivot);
  const face=box(pivot,w-.004,h,layout.panel,frontWood,sign*w/2,0,0,'Porte_RANDAL');
  const p=face.geometry.attributes.position,uv=face.geometry.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+x)/.8+.5,(p.getY(i)+y)/.7);
  if(form.collection==='less'){
   const knob=new T.Group();knob.position.set(sign*.045,h/2-.055,layout.panel/2+.002);knob.name='Bouton_LESS';pivot.add(knob);
   const stem=new T.Mesh(new T.CylinderGeometry(.006,.006,.008,24),hardware);stem.rotation.x=Math.PI/2;pull(stem,knob,0,0,.003,'Poignee_LESS_tige');
   const head=new T.Mesh(new T.CylinderGeometry(.011,.0105,.005,48),hardware);head.rotation.x=Math.PI/2;pull(head,knob,0,0,.009,'Poignee_LESS_bouton');
   const dome=new T.Mesh(new T.SphereGeometry(.0108,32,12,0,Math.PI*2,0,Math.PI/2),hardware);dome.rotation.x=Math.PI/2;dome.scale.y=.22;pull(dome,knob,0,0,.011,'Poignee_LESS_arrondi');
  }else if(form.collection==='amat'){
   amatPull(pivot,w-.035,sign*w/2,h/2-.010,.018,'Poignee_AMAT_porte_assortie');
  }
  doors.push(pivot);return pivot;
 }
 for(const front of frontMeshes){
  const row=front.parent,{width:w,height:h,top}=front.userData.joinery,x=front.position.x,z=front.position.z;
  if(form.collection==='aruba-rainure'){
   front.geometry.dispose();front.geometry=flutedFront(w,h,layout.panel,front.position);front.material=[frontWood,dark];front.name='Facade_ARUBA_rainuree_19mm';
  }
  if(['aruba','aruba-rainure'].includes(form.collection))pull(new T.Mesh(arubaPull(w),hardware),row,x,top-.001,z+layout.panel/2-.001,'Poignee_ARUBA_courbe');
  else if(form.collection==='boreal')pull(new T.Mesh(borealPull(w-.002),hardware),row,x,top+.023,z-.002,'Poignee_BOREAL_profil_U');
  else if(form.collection==='brent'){
   const edge=.023;for(const sign of [-1,1])box(row,edge,h,.010,frontWood,x+sign*(w/2-edge/2),front.position.y,z+.013,'Montant_cadre');
   for(const sign of [-1,1])box(row,w,edge,.010,frontWood,x,front.position.y+sign*(h/2-edge/2),z+.013,'Traverse_cadre');
   const curve=new T.CatmullRomCurve3([new T.Vector3(-.056,0,0),new T.Vector3(-.045,-.003,.019),new T.Vector3(0,-.006,.024),new T.Vector3(.045,-.003,.019),new T.Vector3(.056,0,0)]);
   pull(new T.Mesh(new T.TubeGeometry(curve,32,.0037,12,false),hardware),row,x,top-.05,z+.017,'Poignee_BRENT_cintree');
   for(const sign of [-1,1]){const cap=new T.Mesh(new T.CylinderGeometry(.007,.007,.003,32),hardware);cap.rotation.x=Math.PI/2;pull(cap,row,x+sign*.056,top-.05,z+.016,'Rosace_BRENT');}
  }else if(form.collection==='luce')pull(new T.Mesh(new RoundedBoxGeometry(w-.055,.010,.023,3,.0015),hardware),row,x,top-.040,z+.019,'Poignee_LUCE_doree');
  else if(form.collection==='amat')amatPull(row,w-.035,x,top-.010,z+.017,'Poignee_AMAT_assortie');
  else if(form.collection==='aras')pull(new T.Mesh(new RoundedBoxGeometry(w-.035,.008,.021,3,.001),hardware),row,x,top-.008,z+.017,'Poignee_ARAS_aluminium');
 }
 // Generous invisible picking surfaces make the real handles usable by touch.
 for(const front of frontMeshes){if(!handles.some(o=>o.parent===front.parent&&Math.abs(o.position.x-front.position.x)<.01))continue;
  const w=form.collection==='brent'?.15:form.collection==='aruba'||form.collection==='aruba-rainure'?Math.min(.4,front.userData.joinery.width*.6):front.userData.joinery.width;
  const zone=new T.Mesh(new T.BoxGeometry(w,.043,.022),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));zone.name='Zone_tactile_poignee';zone.position.set(front.position.x,front.userData.joinery.top-(form.collection==='brent'?.05:form.collection==='luce'?.04:.006),.257);zone.userData.editTarget=form.collection==='amat'?'furniture':'handle';front.parent.add(zone);
 }
 if(form.collection==='brunei'){
  // Wide, genuinely recessed finger channels, framed by the 19 mm side panels.
  for(const row of layout.rows)box(cabinet,W-2*layout.panel,.026,.026,dark,0,row.top+.013,.175,'Gorge_BRUNEI_reculée');
 }
 if(form.niche)box(cabinet,W-2*layout.panel,layout.panel,.42,wood,0,B+H/3,-.009,'Tablette_niche');
 if(form.collection==='amat'){
  const side=form.doorSide||'right',x=(side==='left'?-1:1)*(W/2-layout.doorWidth/2);
  door(x,B+H/2,layout.doorWidth,H-.006,side==='left'?'left':'right');
 }
 if(form.collection==='less'){door(0,B+H/2,W-2*layout.panel-.004,H-layout.panel-.008);asset.spec.series='LESS · 1 porte avec vasque';}
 if(form.legHeight){
  for(const x of [-1,1])for(const z of [-1,1])box(root,.022,form.legHeight,.022,metal,x*(W/2-.03),form.base+form.legHeight/2,z*(form.depth/2-.035),'Pied_RANDAL');
  if(form.collection==='brent')for(const x of [-1,1])box(root,.018,.018,form.depth-.05,frontWood,x*(W/2-.03),form.base+.1,0,'Entretoise_Brent');
 }
 if(form.counter){cabinet.clear();box(cabinet,W,H,.46,wood,0,B+H/2,0,'Plateau_SIMA_100mm');}
 const depth=form.depth,zShift=(depth-.46)/2;
 for(const part of [cabinet,tops.root]){part.scale.z=depth/.46;part.position.z+=zShift;}
 for(const part of [...Object.values(insets),...(asset.faucets||[faucet])]){if(form.collection==='less')part.scale.z=depth/.46;part.position.z+=zShift;}
 if(form.counter)tops.root.position.y-=.02;
 const baseSet=asset.setTop;let mode=asset.getTop();
 asset.setTop=next=>{
  if(next==='none'){for(const g of Object.values(insets))g.visible=false;tops.root.visible=false;faucet.visible=false;mode=next;return true;}
  if(next==='compact'&&form.collection==='less'){for(const [key,g]of Object.entries(insets))g.visible=key==='sella';tops.root.visible=false;faucet.visible=false;mode=next;return true;}
  const result=baseSet(next);if(result){mode=next;if(form.counter){tops.solid.visible=false;tops.drilled.visible=false;}}
  return result;
 };
 asset.getTop=()=>mode;asset.handles=handles;asset.handleMaterial=hardware;asset.getHandleChoices=()=>handleChoices(form);
 asset.doors=doors;asset.setDoorProgress=value=>doors.forEach(p=>p.rotation.y=(p.userData.side==='right'?1:-1)*value*Math.PI*.52);
 asset.setMetalFinish=finish=>{const c=HANDLE_FINISHES[handleFinish(form,finish)];if(c){hardware.color.set(c.hex);hardware.metalness=c.metalness;hardware.roughness=c.roughness;}return c?.id||null;};
 asset.setMetalFinish(form.finishes[0]);asset.setTop(form.collection==='less'?'compact':form.counter?'neris':form.collection==='luce'||form.collection==='brent'?'tampa':'sella');
 root.name='RANDAL_'+form.collection+'_'+Math.round(W*100);return asset;
}
