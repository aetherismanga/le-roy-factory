import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
// Adapt the existing Studio One chassis, drawer hardware and ceramic shells.
// All collection dimensions and layouts come from RANDAL V04 technical drawings.
export function adaptGeneralModel(asset,{form,W,H,B,topY}){
 const {root,cabinet,wood,frontWood,drawers,insets,tops,faucet}=asset;
 const metal=new T.MeshPhysicalMaterial({color:'#a9acad',metalness:.85,roughness:.3}),dark=new T.MeshStandardMaterial({color:'#282828',roughness:.5});
 const box=(parent,w,h,d,m,x,y,z,name)=>{const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.0008,w/5,h/5)),m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const doors=[];
 function door(x,y,w,h){const pivot=new T.Group();pivot.position.set(x-w/2,y,.2205);cabinet.add(pivot);box(pivot,w-.004,h,.019,frontWood,w/2,0,0,'Porte_RANDAL');box(pivot,.018,.018,.021,metal,w-.04,h/2-.04,.025,'Poignee_porte');doors.push(pivot);return pivot;}
 for(const [i,row] of drawers.entries()){
  const front=row.children.find(o=>o.name.startsWith('Facade_'));if(!front)continue;
  const cell=H/(form.niche?3:drawers.length),h=cell-.008;
  if(form.collection!=='aruba'&&form.collection!=='harmony'){
   front.geometry.dispose();front.geometry=new RoundedBoxGeometry(W-.004,h,.019,3,.001);front.name='Facade_'+form.collection;
  }
  if(form.collection==='aruba-rainure'){
   const count=Math.floor((W-.012)/.008);for(let j=0;j<count;j++)box(row,.0045,h-.002,.0028,frontWood,-W/2+.009+j*.008,front.position.y,.2312,'Rainure_verticale');
  }
  if(form.collection==='brent'){
   const edge=.023;for(const x of [-1,1])box(row,edge,h,.012,frontWood,x*(W/2-edge/2-.003),front.position.y,.234,'Montant_cadre');
   for(const sign of [-1,1])box(row,W-.004,edge,.012,frontWood,0,front.position.y+sign*(h/2-edge/2),.234,'Traverse_cadre');
   box(row,.105,.008,.024,metal,0,front.position.y+h/2-.05,.25,'Poignee_Brent');
  }else if(form.collection==='luce')box(row,W-.05,.012,.018,metal,0,front.position.y+h/2-.045,.24,'Poignee_Luce');
  else if(['aras','amat','brunei'].includes(form.collection))box(row,W-.03,.005,.017,form.collection==='brunei'?dark:metal,0,front.position.y+h/2-.008,.236,'Profil_poignee');
  if(form.collection==='boreal')box(row,W-.018,.021,.012,dark,0,front.position.y+h/2-.004,.219,'Gorge_Boreal');
  if(form.door){row.scale.x=(W-.26)/W;row.position.x=-.13;}
  if(form.collection==='brent'&&W>=1.19){
   const parts=[...row.children],left=new T.Group(),right=new T.Group();for(const p of parts){left.add(p);right.add(p.clone());}left.scale.x=right.scale.x=(W-.022)/W/2;left.position.x=-W/4;right.position.x=W/4;row.add(left,right);
  }
 }
 if(form.niche)box(cabinet,W-.038,.019,.42,wood,0,B+H/3,-.009,'Tablette_niche');
 if(form.door&&form.drawers)door(W/2-.13,B+H/2,.26,H-.006);
 if(form.collection==='less'){
  const pivot=door(0,B+H/2,W,H-.006);asset.spec.series='LESS · 1 porte avec vasque';
  for(const part of pivot.children)if(part.name==='Poignee_porte'){part.position.set(.045,H/2-.055,.021);part.geometry.dispose();part.geometry=new T.CylinderGeometry(.011,.011,.017,24);part.rotation.x=Math.PI/2;}
 }
 if(form.legHeight){
  for(const x of [-1,1])for(const z of [-1,1])box(root,.022,form.legHeight,.022,metal,x*(W/2-.03),form.base+form.legHeight/2,z*(form.depth/2-.035),'Pied_RANDAL');
  if(form.collection==='brent')for(const x of [-1,1])box(root,.018,.018,form.depth-.05,frontWood,x*(W/2-.03),form.base+.1,0,'Entretoise_Brent');
 }
 if(form.counter){cabinet.clear();box(cabinet,W,H,.46,wood,0,B+H/2,0,'Plateau_SIMA_100mm');}
 // Keep the back on the installation plane used by the original engine.
 const depth=form.depth,zShift=(depth-.46)/2;
 for(const part of [cabinet,...Object.values(insets),tops.root,faucet]){part.scale.z=depth/.46;part.position.z+=zShift;}
 if(form.counter)tops.root.position.y-=.02;
 const baseSet=asset.setTop;let mode=asset.getTop();
 asset.setTop=next=>{
  if(next==='none'){for(const g of Object.values(insets))g.visible=false;tops.root.visible=false;faucet.visible=false;mode=next;return true;}
  if(next==='compact'&&form.collection==='less'){for(const [key,g]of Object.entries(insets))g.visible=key==='sella';tops.root.visible=false;faucet.visible=false;mode=next;return true;}
  const result=baseSet(next);if(result){mode=next;if(form.counter){tops.solid.visible=false;tops.drilled.visible=false;}}
  return result;
 };
 asset.getTop=()=>mode;
 asset.doors=doors;asset.setDoorProgress=value=>doors.forEach(p=>p.rotation.y=-value*Math.PI*.52);
 asset.setMetalFinish=finish=>{metal.color.set(form.collection==='luce'||/or-vieilli/.test(finish)?'#b49a60':form.collection==='less'&&finish.includes('blanco')?'#f4f2ed':form.collection==='less'&&finish.includes('negro')?'#292b2c':'#afb2b3');};
 asset.setMetalFinish('');asset.setTop(form.collection==='less'?'compact':form.counter?'neris':form.collection==='luce'||form.collection==='brent'?'tampa':'sella');
 root.name='RANDAL_'+form.collection+'_'+Math.round(W*100);return asset;
}
