import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {metalMaterial} from './taps.js';
import {PLUMBING} from './plumbing-catalog.js';

// Visible nominal G1 1/4 / D32 assembly, reconstructed from AQUA HOME 2026.
// The catalogue references and the installed wall plane are kept explicit.
export function addWashstandPlumbing(parent,{x=0,z=0,drainY=.025,wallZ=-.23,finish='Chrome brillant',trap='round',drain='round',coverGeometry=null}={}){
 const pairing=PLUMBING.find(item=>item.id===finish)||PLUMBING[0],square=trap==='square',drainReference=drain==='square'?'000560':pairing.drain,trapReference=square?'31141112702':pairing.trap;
 const group=new T.Group();group.name='Vidage_et_siphon';group.userData={drainReference,trapReference,nominalOutletDiameter:.032,nominalThread:'G1 1/4',wallPlane:wallZ};parent.add(group);
 const metal=metalMaterial(finish),seal=new T.MeshStandardMaterial({color:'#25292b',roughness:.82});
 const add=(geometry,material,name,px,py,pz)=>{const object=new T.Mesh(geometry,material);object.name=name;object.position.set(px,py,pz);object.castShadow=object.receiveShadow=true;group.add(object);return object;};
 const lathe=(points,name,px,py,pz,material=metal)=>add(new T.LatheGeometry(points.map(([r,y])=>new T.Vector2(r,y)),64),material,name,px,py,pz);
 const cylinder=(r,length,name,px,py,pz,segments=64,material=metal)=>add(new T.CylinderGeometry(r,r,length,segments),material,name,px,py,pz);
 const ring=(r,thickness,name,px,py,pz)=>{const object=add(new T.TorusGeometry(r,thickness,8,64),metal,name,px,py,pz);object.rotation.x=Math.PI/2;return object;};
 // The cover sits over an actual annular evacuation gap. Its stem reaches the
 // underside of the ceramic, rather than a floating disk above an empty bowl.
 if(coverGeometry&&drain!=='square')add(coverGeometry,metal,'Bonde_'+drainReference,0,0,0);
 else if(drain==='square')add(new RoundedBoxGeometry(.070,.0045,.070,3,.002),metal,'Bonde_'+drainReference,x,drainY+.006,z);
 else lathe([[0,-.0015],[.026,-.0015],[.031,-.0006],[.0315,.001],[.0308,.0028],[.024,.0037],[0,.004]],'Bonde_'+drainReference,x,drainY,z);
 if(!coverGeometry){cylinder(drain==='square'?.028:.0285,.0015,'Fente_peripherique_vidage',x,drainY-.0025,z,64,seal);lathe([[.017,-.003],[.030,-.003],[.032,-.0015],[.032,.0001],[.0305,.0008],[.017,.0008],[.017,-.003]],'Collerette_vidage',x,drainY-.0038,z);}
 const top=square?-.182:-.145,stemTop=drainY-.004,stemLength=stemTop-top;
 cylinder(.016,stemLength,'Tube_vertical_G1_1_4',x,(stemTop+top)/2,z);
 cylinder(.0205,.013,'Ecrou_sous_vasque_G1_1_4',x,Math.min(.001,drainY-.020),z,6);
 ring(.0182,.0012,'Joint_ecrou_sous_vasque',x,-.007,z);
 if(square){
  add(new RoundedBoxGeometry(.050,.128,.050,4,.003),metal,'Siphon_'+trapReference,x,-.235,z);
  add(new RoundedBoxGeometry(.0504,.010,.0504,3,.002),metal,'Bouchon_visite_siphon',x,-.294,z);
  cylinder(.0205,.014,'Ecrou_entree_siphon',x,-.171,z,6);
 }else{
  lathe([[0,-.090],[.019,-.090],[.022,-.088],[.0225,-.084],[.0225,.083],[.022,.088],[.019,.090],[0,.090]],'Siphon_'+trapReference,x,-.220,z);
  ring(.0218,.0008,'Joint_bouchon_visite',x,-.302,z);
  lathe([[0,-.004],[.019,-.004],[.022,-.002],[.022,.003],[.019,.005],[0,.005]],'Bouchon_visite_siphon',x,-.306,z);
  cylinder(.022,.014,'Ecrou_entree_siphon',x,-.133,z,6);
 }
 const exitY=square?-.230:-.208,bodyRear=z-(square?.025:.0225),pipeStart=bodyRear+.006,wallEnd=wallZ+.003,length=Math.max(.006,pipeStart-wallEnd),middle=(pipeStart+wallEnd)/2;
 // Real through-tube with an inner surface. Its wall end is exactly at the
 // installed wall; it is not scaled from the bowl depth or left disconnected.
 const outlet=add(new T.CylinderGeometry(.016,.016,length,64,1,true),metal,'Sortie_D32',x,exitY,middle);outlet.rotation.x=Math.PI/2;
 const inner=add(new T.CylinderGeometry(.0145,.0145,length,64,1,true),metal.clone(),'Interieur_sortie_D32',x,exitY,middle);inner.material.side=T.BackSide;inner.material.roughness=.42;inner.rotation.x=Math.PI/2;
 const collar=cylinder(.022,.017,'Ecrou_sortie_D32',x,exitY,bodyRear+.004,6);collar.rotation.x=Math.PI/2;
 const connector=cylinder(.018,.022,'Manchon_sortie_siphon',x,exitY,bodyRear+.001);connector.rotation.x=Math.PI/2;
 const rosette=lathe([[.0158,-.003],[.028,-.003],[.032,-.001],[.032,.001],[.029,.003],[.0158,.003],[.0158,-.003]],'Rosace_murale_D32',x,exitY,wallZ+.003);rosette.rotation.x=Math.PI/2;
 // Axis endpoints are also used by CPU acceptance tests. They do not contain
 // purchasing data and do not alter SKU selection or quotation calculations.
 group.userData.continuity={drain:[x,drainY,z],stemTop:[x,stemTop,z],stemBottom:[x,top,z],trapCentre:[x,-.220,z],outletStart:[x,exitY,pipeStart],outletEnd:[x,exitY,wallEnd]};
 return group;
}
