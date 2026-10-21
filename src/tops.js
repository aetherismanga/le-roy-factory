import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const TOP_OPTIONS=Object.freeze([
 {id:'bare',name:'Meuble seul — sans plan',description:'Caisson seul, sans plan ni vasque',reference:null},
 {id:'sella',name:'Sella encastrée',description:'Céramique blanc brillant · 80 cm',reference:'2171'},
 {id:'tampa',name:'Tampa encastrée',description:'Blanc brillant, blanc mat ou noir mat',reference:'6228'},
 {id:'plain',name:'Plan assorti seul',description:'Même finition que le meuble · ép. 2 cm',reference:'14215 80@FINITION'},
 {id:'neris',name:'Plan + Neris',description:'Vasque à poser · 46 × 33 × 14 cm',reference:'9567'},
 {id:'torne',name:'Plan + Torne',description:'Vasque à poser · Ø 37 × 12 cm',reference:'9559'}
]);

// Closed ceramic shells with a real waste opening. Profile dimensions come from
// the STUDIO ONE / RANDAL catalogue; detailed curvature is reconstructed.
export function vesselGeometry(kind){
 const profiles=kind==='neris'?[
 [.145,.085,0,3.2],[.185,.125,.018,3.6],[.217,.151,.065,4.2],[.230,.165,.128,4.5],[.230,.165,.138,4.5],[.228,.163,.140,4.5],
 [.223,.158,.139,4.5],[.220,.155,.120,4.5],[.207,.142,.074,4],[.170,.100,.035,3.5],[.100,.060,.021,2.5],[.021,.021,.018,2],[.021,.021,0,2],[.145,.085,0,3.2]
 ]:[
 [.165,.165,0,2],[.174,.174,.008,2],[.180,.180,.040,2],[.185,.185,.108,2],[.185,.185,.117,2],[.183,.183,.120,2],
 [.177,.177,.120,2],[.176,.176,.111,2],[.170,.170,.050,2],[.145,.145,.027,2],[.100,.100,.021,2],[.021,.021,.018,2],[.021,.021,0,2],[.165,.165,0,2]
 ];
 const N=128,positions=[],uv=[],indices=[];
 for(let j=0;j<profiles.length;j++){
  const [rx,rz,y,p]=profiles[j];
  for(let i=0;i<=N;i++){
   const a=i/N*2*Math.PI,c=Math.cos(a),s=Math.sin(a);
   positions.push(rx*Math.sign(c)*Math.abs(c)**(2/p),y,rz*Math.sign(s)*Math.abs(s)**(2/p));uv.push(i/N,j/(profiles.length-1));
   if(j<profiles.length-1&&i<N){const a=j*(N+1)+i,b=a+N+1;indices.push(a,b,a+1,b,b+1,a+1);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function createTopSet({wood,ceramic,chrome,roundedRect,woodUV,width=.8}){
 const root=new T.Group();root.name='Plans_et_vasques_a_poser';
 const add=(geometry,material,name,parent=root,x=0,y=0,z=0)=>{const m=new T.Mesh(geometry,material);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const solid=woodUV(add(new RoundedBoxGeometry(width,.02,.46,3,.0008),wood,'Plan_assorti_'+Math.round(width*1000)+'x460x20',root,0,.83,0));
 const shape=roundedRect(width-.0016,.4584,.006);
 const waste=new T.Path();waste.absarc(0,-.020,.024,0,Math.PI*2,true);shape.holes.push(waste);
 const tap=new T.Path();tap.absarc(0,.190,.017,0,Math.PI*2,true);shape.holes.push(tap);
 const geometry=new T.ExtrudeGeometry(shape,{depth:.0184,steps:1,bevelEnabled:true,bevelSize:.0008,bevelThickness:.0008,bevelSegments:3,curveSegments:48});geometry.rotateX(-Math.PI/2);
 const drilled=woodUV(add(geometry,wood,'Plan_assorti_perce',root,0,.8208,0));
 const vessels={};
 for(const kind of ['neris','torne']){
  const group=new T.Group();group.name=kind==='neris'?'Vasque_a_poser_Neris_460x330x140':'Vasque_a_poser_Torne_D370x120';group.position.set(0,.84,.020);root.add(group);
  const bowl=add(vesselGeometry(kind),ceramic,'Coque_ceramique_'+kind,group);
  add(new T.CylinderGeometry(.022,.021,.006,64),chrome,'Bonde_'+kind,group,0,.019,0);
  add(new T.CylinderGeometry(.019,.019,.0018,64),chrome,'Couvercle_bonde_'+kind,group,0,.023,0);
  vessels[kind]={group,bowl};group.visible=false;
 }
 root.visible=false;solid.visible=false;drilled.visible=false;
 return {root,solid,drilled,vessels};
}
