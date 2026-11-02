import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// A small adjoining hall, modeled in metres behind the doorway. It is scenery,
// never another editable room or part of the opening's commercial dimensions.
// No image plane, remote image or camera-dependent perspective is involved.
function microTexture(kind){
 const size=128,data=new Uint8Array(size*size);let seed=1769;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  seed=(seed*1664525+1013904223)>>>0;
  const noise=((seed>>>24)-128)*.18,grain=kind==='wood'?Math.sin(x*.65+Math.sin(y*.045)*2.4)*16+Math.sin(x*1.82+y*.007)*5:Math.sin(x*.13+y*.23)*3;
  data[y*size+x]=Math.max(0,Math.min(255,128+grain+noise));
 }
 const texture=new T.DataTexture(data,size,size,T.RedFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(kind==='wood'?3:2,kind==='wood'?1:2);texture.anisotropy=4;texture.needsUpdate=true;return texture;
}

export function makeDoorInterior({width=.83,height=2.04}={}){
 if(![width,height].every(Number.isFinite)||width<.6||width>1.4||height<1.8||height>2.6)throw Error('Dimensions de passage intérieur invalides.');
 const root=new T.Group();root.name='Espace_interieur_maison';root.userData={visualOnly:true,excludeFromProductBounds:true,openingBackdrop:true};
 const clearWidth=width-.10,hallWidth=Math.max(1.75,width+.85),hallHeight=Math.max(2.5,height+.12),front=-.53,back=-3.45,depth=front-back;
 const mineral=microTexture('mineral'),wood=microTexture('wood');
 const wall=new T.MeshStandardMaterial({color:'#d6cebf',roughness:.87,bumpMap:mineral,bumpScale:.00035,emissive:'#c6b799',emissiveIntensity:.025});
 const plaster=new T.MeshStandardMaterial({color:'#e8e2d8',roughness:.83,bumpMap:mineral,bumpScale:.0003});
 const stone=new T.MeshStandardMaterial({color:'#b9ac95',roughness:.55,bumpMap:mineral,bumpScale:.0003});
 const oak=new T.MeshStandardMaterial({color:'#8c7052',roughness:.43,bumpMap:wood,bumpScale:.0004});
 const metal=new T.MeshStandardMaterial({color:'#8a857b',metalness:.88,roughness:.30});
 const dark=new T.MeshStandardMaterial({color:'#383a35',roughness:.55});
 const ceramic=new T.MeshPhysicalMaterial({color:'#cfc4ac',roughness:.29,clearcoat:.24});
 const light=new T.MeshBasicMaterial({color:'#fff0d3',toneMapped:false});
 // These textures belong to this backdrop only. Disposing a door releases its
 // small microfinish maps without invalidating another hall or room material.
 wall.addEventListener('dispose',()=>mineral.dispose());oak.addEventListener('dispose',()=>wood.dispose());
 const add=(geometry,material,x,y,z,name,parent=root)=>{
  const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;mesh.raycast=()=>{};mesh.userData.visualOnly=true;parent.add(mesh);return mesh;
 };
 const box=(w,h,d,x,y,z,material,name,radius=.002,parent=root)=>add(new RoundedBoxGeometry(w,h,d,2,Math.min(radius,w/5,h/5,d/5)),material,x,y,z,name,parent);
 // The short reveal fits inside the doorway's own width. The wider hall begins
 // beyond the wall, so it does not cover neighboring window view planes.
 const revealDepth=.26,shoulderWidth=(hallWidth-clearWidth)/2;
 for(const sign of [-1,1]){
  box(.045,height-.05,revealDepth,sign*(clearWidth/2+.0225),(height-.05)/2,-.40,plaster,'Retour_passage_hall');
  box(shoulderWidth,hallHeight,.07,sign*(clearWidth/2+shoulderWidth/2),hallHeight/2,front-.035,wall,'Retour_mur_entree_hall');
  box(.09,hallHeight,depth,sign*(hallWidth/2+.045),hallHeight/2,(front+back)/2,wall,'Mur_lateral_hall');
  box(.015,.075,depth,sign*(hallWidth/2-.0075),.0375,(front+back)/2,plaster,'Plinthe_hall');
 }
 box(hallWidth+.18,hallHeight,.09,0,hallHeight/2,back-.045,wall,'Mur_fond_hall');
 box(hallWidth,hallHeight-(height-.05),.26,0,(hallHeight+height-.05)/2,-.40,plaster,'Linteau_interieur_hall');
 box(hallWidth+.16,.08,depth+.09,0,hallHeight+.04,(front+back)/2,plaster,'Plafond_hall');
 box(hallWidth,.075,.015,0,.0375,back+.0075,plaster,'Plinthe_fond_hall');
 // Real 60x120cm mineral slabs with narrow joints and clipped perimeter cuts.
 box(hallWidth,.018,depth,0,-.010,(front+back)/2,dark,'Support_sol_hall');
 const tiles=[];for(let x=-hallWidth/2;x<hallWidth/2-1e-6;x+=.60)for(let z=back;z<front-1e-6;z+=1.20){const w=Math.min(.60,hallWidth/2-x),d=Math.min(1.20,front-z);tiles.push({x:x+w/2,z:z+d/2,w:w-.0015,d:d-.0015});}
 const floor=new T.InstancedMesh(new RoundedBoxGeometry(1,1,1,1,.0015),stone,tiles.length),matrix=new T.Matrix4(),quaternion=new T.Quaternion();
 tiles.forEach((tile,index)=>{matrix.compose(new T.Vector3(tile.x,-.003,tile.z),quaternion,new T.Vector3(tile.w,.008,tile.d));floor.setMatrixAt(index,matrix);floor.setColorAt(index,new T.Color().setScalar(.97+(index*17%7)*.008));});
 floor.name='Dalles_minerales_hall_60x120';floor.castShadow=false;floor.receiveShadow=true;floor.raycast=()=>{};floor.userData.visualOnly=true;root.add(floor);
 // Meet the hall boundary rather than overlapping the first slab. Its half
 // 1.5mm joint remains a narrow grout line, with no coplanar surface band.
 const passageFront=-.22,passageBack=front;
 box(clearWidth,.010,passageFront-passageBack,0,-.004,(passageFront+passageBack)/2,stone,'Sol_continu_passage');
 box(clearWidth+.010,.003,.035,0,.0015,-.23,metal,'Seuil_transition_interieur',.0005);
 // A closed inner door establishes a believable house interior and scale.
 const innerDoorWidth=.73,innerDoorHeight=Math.min(2.08,hallHeight-.25),doorX=hallWidth*.19,doorZ=back+.035;
 for(const sign of [-1,1])box(.043,innerDoorHeight,.055,doorX+sign*(innerDoorWidth/2+.0215),innerDoorHeight/2,doorZ,plaster,'Huisserie_porte_hall');
 box(innerDoorWidth+.086,.043,.055,doorX,innerDoorHeight+.0215,doorZ,plaster,'Traverse_porte_hall');
 box(innerDoorWidth-.008,innerDoorHeight-.006,.040,doorX,innerDoorHeight/2,doorZ+.004,oak,'Porte_interieure_hall',.003);
 box(.020,.115,.008,doorX+innerDoorWidth/2-.075,1.03,doorZ+.029,metal,'Rosace_poignee_hall');
 box(.085,.012,.018,doorX+innerDoorWidth/2-.104,1.04,doorZ+.046,metal,'Poignee_porte_hall');
 // A narrow, grounded console and a tactile plaster relief remain well beyond
 // the passage. Every object has a physical support; there are no floating props.
 const consoleWidth=.54,consoleX=-hallWidth*.30,consoleZ=back+.19,top=.79;
 box(consoleWidth,.032,.28,consoleX,top-.016,consoleZ,oak,'Plateau_console_hall',.004);
 for(const x of [-consoleWidth/2+.035,consoleWidth/2-.035])for(const z of [-.09,.09])box(.022,top-.032,.022,consoleX+x,(top-.032)/2,consoleZ+z,metal,'Pied_console_hall',.0015);
 box(consoleWidth-.04,.022,.23,consoleX,.15,consoleZ,oak,'Tablette_console_hall',.003);
 box(.19,.018,.135,consoleX-.10,top+.009,consoleZ+.025,plaster,'Livre_console_hall',.001);
 box(.15,.014,.11,consoleX-.09,top+.025,consoleZ+.026,dark,'Livre_console_hall',.001);
 const bowlPoints=[[0,0],[.038,0],[.066,.015],[.075,.045],[.070,.049],[.061,.020],[.035,.008],[0,.008]].map(p=>new T.Vector2(...p));
 add(new T.LatheGeometry(bowlPoints,48),ceramic,consoleX+.13,top,consoleZ+.01,'Coupe_ceramique_hall');
 const artW=.42,artH=.55,artY=1.49,artZ=back+.026;
 box(artW+.018,artH+.018,.024,consoleX,artY,artZ,oak,'Cadre_relief_hall',.002);
 box(artW,artH,.008,consoleX,artY,artZ+.016,plaster,'Relief_mural_hall',.001);
 const relief=add(new T.CircleGeometry(.105,48),ceramic,consoleX-.045,artY+.060,artZ+.022,'Disque_relief_hall');relief.castShadow=false;
 box(.10,.19,.012,consoleX+.09,artY-.09,artZ+.027,wall,'Volume_relief_hall',.014);
 // Shallow recessed luminaires have real trim and a lit diffuser. The single
 // short-range point source cannot leak through the doorway into the bathroom.
 for(const z of [-1.15,-2.45]){
  const trim=add(new T.CylinderGeometry(.037,.037,.007,48),metal,0,hallHeight-.004,z,'Spot_encastre_hall');
  const diffuser=add(new T.CylinderGeometry(.028,.028,.002,40),light,0,hallHeight-.009,z,'Diffuseur_spot_hall');diffuser.castShadow=false;
 }
 const fill=new T.PointLight('#ffecd1',4,1.55,2);fill.position.set(-.20,hallHeight-.25,-2.35);fill.name='Lumiere_interieure_hall';fill.castShadow=false;root.add(fill);
 root.visible=false;
 return {root,dimensions:{width:hallWidth,height:hallHeight,depth:Math.abs(back+.23)},setVisible:value=>{root.visible=!!value;}};
}
