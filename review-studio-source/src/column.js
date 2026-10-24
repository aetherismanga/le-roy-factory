import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export const COLUMN_SPEC=Object.freeze({width:.38,height:1.32,depth:.27,bottom:.28,panel:.019,reference:'14177'});
export function makeColumn(){
 const root=new T.Group();root.name='STUDIO_ONE_Colonne_380x1320x270';root.userData.editTarget='column';
 const wood=new T.MeshPhysicalMaterial({color:'#bda084',roughness:.43,clearcoat:.12}),frontWood=wood.clone(),metal=new T.MeshStandardMaterial({color:'#b9bdbe',metalness:1,roughness:.28}),dark=new T.MeshStandardMaterial({color:'#353939',roughness:.6});
 const add=(g,m,name,parent=root,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,m,n,parent,x,y,z)=>add(new RoundedBoxGeometry(w,h,d,2,.0005),m,n,parent,x,y,z);
 const panels=[];for(const side of [-1,1])panels.push(box(.019,1.32,.251,wood,'Joue_colonne_19mm',root,side*.1805,.94,-.1045));
 for(const y of [.2895,1.5905])panels.push(box(.342,.019,.251,wood,'Dessus_dessous_colonne_19mm',root,0,y,-.1045));
 box(.342,1.282,.008,wood,'Fond_colonne_8mm',root,0,.94,-.226);
 const shelves=[.728,1.152].map(y=>box(.342,.019,.236,wood,'Etagere_assortie_19mm',root,0,y,-.108));
 for(const y of [.715,1.139])for(const x of [-.166,.166])for(const z of [-.18,-.04])box(.007,.008,.009,metal,'Taquet_etablette',root,x,y,z);
 const sideParts=[];
 const door=new T.Group();door.name='Porte_colonne_onglet_45';door.position.set(-.188,.282,.0305);root.add(door);
 // Vertical grip on the free right edge, with full-height outer face.
 const w=.376,h=1.316,p=new T.Shape();p.moveTo(-w/2,-.0095);p.lineTo(w/2,-.0095);p.lineTo(w/2-.019,.0095);p.lineTo(-w/2,.0095);p.closePath();
 const g=new T.ExtrudeGeometry(p,{depth:h,steps:1,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(w/2,0,0);
 const front=add(g,frontWood,'Facade_colonne_19mm_biseau_45',door);
 for(const y of [.19,1.06]){sideParts.push(box(.026,.065,.027,metal,'Charniere_fixe',root,-.162,.282+y,.005));box(.044,.024,.016,metal,'Bras_charniere',door,.027,y,-.016);const cup=add(new T.CylinderGeometry(.0175,.0175,.012,28),metal,'Boitier_charniere',door,.037,y,-.009);cup.rotation.x=Math.PI/2;sideParts.push(box(.012,.008,.025,dark,'Butée_porte',root,.16,.282+y,.008));}
 // Same metre-based UV convention as the cabinet, with vertical grain on panels.
 for(const o of [...panels,...shelves]){const a=o.geometry.attributes.position,n=o.geometry.attributes.normal,uv=o.geometry.attributes.uv;for(let i=0;i<a.count;i++){const x=a.getX(i)+o.position.x,y=a.getY(i)+o.position.y,z=a.getZ(i)+o.position.z;uv.setXY(i,Math.abs(n.getX(i))>.6?z/.7+.4:x/.8+.5,y/.7);}uv.needsUpdate=true;}
 const a=front.geometry.attributes.position,uv=front.geometry.attributes.uv;for(let i=0;i<a.count;i++)uv.setXY(i,(a.getX(i)-w/2)/.8+.5,(a.getY(i)+.282)/.7);uv.needsUpdate=true;
 let hingeSide='left';const sideX=sideParts.map(o=>o.position.x);
 function setHingeSide(side){if(side!=='left'&&side!=='right')return false;const angle=-door.rotation.y/(hingeSide==='left'?1:-1);hingeSide=side;const sign=side==='left'?1:-1;door.position.x=-.188*sign;door.scale.x=sign;door.rotation.y=-angle*sign;sideParts.forEach((o,i)=>o.position.x=sideX[i]*sign);root.updateMatrixWorld(true);return true;}
 return {root,wood,frontWood,door,shelves,panels,spec:COLUMN_SPEC,setHingeSide,getHingeSide:()=>hingeSide,getHingeSign:()=>hingeSide==='left'?1:-1};
}
