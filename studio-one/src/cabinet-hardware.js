import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Manufacturer image ALBUFERA_CB_NG.jpg, received 22 October 2026.
// The reference shows chrome and black versions of the same square support.
// Only the black finish is offered. Overall height is the user's 10 cm;
// the remaining proportions follow the image (not an engineering drawing).
export const BLACK_LEG_SPEC=Object.freeze({id:'albufera-black',name:'ALBUFERA · noir',height:.10,finish:'black',source:'ALBUFERA_CB_NG.jpg'});
export const DRAWER_METAL=Object.freeze({color:'#34383b',metalness:.65,roughness:.44});

export function makeBlackLeg(){
 const root=new T.Group();root.name='ALBUFERA_noir_10cm';root.userData.hardware={...BLACK_LEG_SPEC};
 const metal=new T.MeshStandardMaterial({color:'#171d20',metalness:.65,roughness:.38});metal.name='Metal_noir_ALBUFERA';
 const protector=new T.MeshStandardMaterial({color:'#141719',roughness:.82});protector.name='Patin_noir';
 const add=(geometry,material,name,y)=>{const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.y=y;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;};
 add(new RoundedBoxGeometry(.032,.003,.032,2,.0004),protector,'Patin_protection_noir',.0015);
 add(new RoundedBoxGeometry(.032,.092,.032,2,.0005),metal,'Pied_ALBUFERA_metal_noir',.049);
 const shape=new T.Shape();shape.moveTo(-.022,-.022);shape.lineTo(.052,-.022);shape.lineTo(-.022,.052);shape.closePath();
 for(const [x,y]of [[-.012,-.010],[.010,-.012],[.038,-.012],[-.012,.012],[-.012,.038]]){const hole=new T.Path();hole.absarc(x,y,.003,0,Math.PI*2,true);shape.holes.push(hole);}
 const plate=new T.ExtrudeGeometry(shape,{depth:.005,bevelEnabled:false,curveSegments:16});plate.rotateX(-Math.PI/2);
 add(plate,metal,'Platine_triangulaire_percee_noire',.095);
 return root;
}
