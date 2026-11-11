import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {COLLECTIONS} from './surface-catalog.js';
import {buildTileGeometry} from './tile-layout.js';
import {loadQueuedTexture,surfaceAssetURL} from './texture-loader.js';
import {makeShowroomHall} from './showroom-hall.js';
import {SHOWROOM_MANUFACTURERS} from './showroom-catalog.js';
import {makeShowroomDoorSign} from './showroom-door-sign.js';

// A small adjoining hall, modeled in metres behind the doorway. It is scenery,
// never another editable room or part of the opening's commercial dimensions.
// The flooring uses true chevron geometry and the original manufacturer sample;
// its bitmap is a material map, never a billboard or camera-dependent view.
function microTexture(kind){
 const size=128,data=new Uint8Array(size*size);let seed=1769;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  seed=(seed*1664525+1013904223)>>>0;
  const noise=((seed>>>24)-128)*.18,grain=kind==='wood'?Math.sin(x*.65+Math.sin(y*.045)*2.4)*16+Math.sin(x*1.82+y*.007)*5:Math.sin(x*.13+y*.23)*3;
  data[y*size+x]=Math.max(0,Math.min(255,128+grain+noise));
 }
 const texture=new T.DataTexture(data,size,size,T.RedFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(kind==='wood'?3:2,kind==='wood'?1:2);texture.anisotropy=4;texture.needsUpdate=true;return texture;
}

export const DOOR_INTERIOR_FLOOR=Object.freeze({collection:'Yosemite',color:'honey',format:'15x85',reference:'03H1840',pattern:'chevron'});

function floorDefinition(){
 const collection=COLLECTIONS[DOOR_INTERIOR_FLOOR.collection],colour=collection?.colors.find(c=>c.id===DOOR_INTERIOR_FLOOR.color),format=collection?.formats.find(f=>f.id===DOOR_INTERIOR_FLOOR.format);
 if(!colour||!format||format.shape!=='chevron'||!colour.formats.includes(format.id))throw Error('La référence Yosemite Honey du couloir est indisponible.');
 // Native plank photographs already ship with both ateliers. Opening a door
 // must not depend on a live manufacturer proxy before its grain appears.
 // Keep the original website sample as a final, observed-source fallback.
 const original=colour.nativeFaces===true||colour.textureProvenance?.manufacturerOriginal===true
  ?colour.textureVariants?.balanced?.[0]||colour.faces?.[0]||colour.file
  :colour.manufacturerSample;
 if(!original)throw Error('Le visuel fabricant Yosemite Honey est indisponible.');
 const sources=['assets/showroom/yosemite-honey-03h2d40-02.jpg','assets/showroom/yosemite-honey-03h2d40-05.jpg',surfaceAssetURL(original)];
 return {source:sources[0],sources,roughness:collection.roughness,layout:{direction:'horizontal',pattern:'chevron',shape:'chevron',width:format.width,height:format.height,chevronAngle:format.chevronAngle,groutWidth:2}};
}

export function makeDoorInterior({width=.83,height=2.04,loadTexture=null,onReady=()=>{}}={}){
 if(![width,height].every(Number.isFinite)||width<.6||width>1.4||height<1.8||height>2.6)throw Error('Dimensions de passage intérieur invalides.');
 const root=new T.Group();root.name='Espace_interieur_maison';root.userData={visualOnly:true,excludeFromProductBounds:true,openingBackdrop:true};
 const clearWidth=width-.10,hallWidth=Math.max(1.75,width+.85),hallHeight=Math.max(2.5,height+.12),front=-.53,back=-3.45,depth=front-back;
 const mineral=microTexture('mineral'),wood=microTexture('wood');
 const wall=new T.MeshStandardMaterial({color:'#d6cebf',roughness:.87,bumpMap:mineral,bumpScale:.00035,emissive:'#c6b799',emissiveIntensity:.025});
 const plaster=new T.MeshStandardMaterial({color:'#e8e2d8',roughness:.83,bumpMap:mineral,bumpScale:.0003});
 const floorSpec=floorDefinition(),honey=new T.MeshStandardMaterial({color:'#a57d51',roughness:floorSpec.roughness??.82});
 const floorState={...DOOR_INTERIOR_FLOOR,source:floorSpec.source,fidelity:'manufacturer-native-tile',textureState:'pending'};root.userData.hallFloor=floorState;
 let disposed=false,textureTask=null,ownedFloorTexture=null;const textureAbort=new AbortController();
 const prepareFloor=()=>{
  if(disposed)return Promise.resolve(false);
  if(textureTask)return textureTask;
  // Node geometry checks and closed doors do not require a network/browser.
  if(!loadTexture&&typeof Image==='undefined')return Promise.resolve(false);
  floorState.textureState='loading';
  textureTask=Promise.resolve().then(async()=>{
   let failure;
   for(const source of floorSpec.sources){
    if(disposed||textureAbort.signal.aborted)return null;
    try{const texture=await (loadTexture||loadQueuedTexture)(source,{signal:textureAbort.signal,maxDimension:2048,timeout:12000});return {texture,source};}
    catch(error){failure=error;if(disposed||textureAbort.signal.aborted)throw error;}
   }
   throw failure||Error('Le veinage Yosemite est indisponible.');
  }).then(result=>{
   if(!result)return false;const {texture,source}=result;
   if(disposed){texture.dispose();return false;}
   ownedFloorTexture=texture;texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.anisotropy=8;texture.needsUpdate=true;
   // Crop the original plank to the chevron's real aspect, preserving its
   // grain proportions rather than stretching the photo to fill each piece.
   const image=texture.image,aspect=(image?.naturalWidth||image?.width||floorSpec.layout.width)/(image?.naturalHeight||image?.height||floorSpec.layout.height),target=floorSpec.layout.width/floorSpec.layout.height;
   texture.repeat.set(Math.min(1,target/aspect),Math.min(1,aspect/target));texture.offset.set((1-texture.repeat.x)/2,(1-texture.repeat.y)/2);
   honey.map=texture;honey.bumpMap=texture;honey.bumpScale=.00022;honey.color.set('#ffffff');honey.needsUpdate=true;floorState.source=source;floorState.textureState='ready';delete floorState.error;onReady();
   if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof Event!=='undefined')window.dispatchEvent(new Event('lrf-door-interior-ready'));
   return true;
  }).catch(error=>{if(!disposed){floorState.textureState='error';floorState.error=String(error?.message||error);textureTask=null;}return false;});
  return textureTask;
 };
 honey.addEventListener('dispose',()=>{disposed=true;textureAbort.abort();ownedFloorTexture?.dispose();});
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
 // The second doorway is a real cut in the wall, allowing a continuous visit
 // from the bathroom, through this vestibule, into the exhibition hall.
 const innerDoorWidth=.73,innerDoorHeight=Math.min(2.08,hallHeight-.25),doorX=hallWidth*.19,doorZ=back+.035;
 const leftEdge=-hallWidth/2-.09,rightEdge=hallWidth/2+.09;
 box(doorX-innerDoorWidth/2-leftEdge,hallHeight,.09,(leftEdge+doorX-innerDoorWidth/2)/2,hallHeight/2,back-.045,wall,'Mur_fond_hall');
 box(rightEdge-doorX-innerDoorWidth/2,hallHeight,.09,(rightEdge+doorX+innerDoorWidth/2)/2,hallHeight/2,back-.045,wall,'Mur_fond_hall');
 box(innerDoorWidth,hallHeight-innerDoorHeight,.09,doorX,(hallHeight+innerDoorHeight)/2,back-.045,wall,'Linteau_porte_exposition');
 box(hallWidth,hallHeight-(height-.05),.26,0,(hallHeight+height-.05)/2,-.40,plaster,'Linteau_interieur_hall');
 box(hallWidth+.16,.08,depth+.09,0,hallHeight+.04,(front+back)/2,plaster,'Plafond_hall');
 for(const [a,b]of [[-hallWidth/2,doorX-innerDoorWidth/2],[doorX+innerDoorWidth/2,hallWidth/2]])box(b-a,.075,.015,(a+b)/2,.0375,back+.0075,plaster,'Plinthe_fond_hall');
 // Manufacturer-sized, mitred chevrons share one material and only two
 // batched geometries. Both parts use the same world grid across the passage.
 box(hallWidth,.018,depth,0,-.010,(front+back)/2,dark,'Support_sol_hall');
 const chevrons=(polygon,name)=>{
  const geometry=buildTileGeometry(polygon,floorSpec.layout);geometry.rotateX(-Math.PI/2);
  const mesh=add(geometry,honey,0,.001,0,name);mesh.castShadow=false;
  mesh.userData={visualOnly:true,hallFloor:{...DOOR_INTERIOR_FLOOR},textureSource:floorSpec.source};return mesh;
 };
 const floor=chevrons([[-hallWidth/2,-front],[hallWidth/2,-front],[hallWidth/2,-back],[-hallWidth/2,-back]],'Yosemite_Honey_chevron_hall');
 const passageFront=-.22,passageBack=front;
 chevrons([[-clearWidth/2,-passageFront],[clearWidth/2,-passageFront],[clearWidth/2,-passageBack],[-clearWidth/2,-passageBack]],'Sol_continu_passage');
 box(clearWidth+.010,.003,.035,0,.0015,-.23,metal,'Seuil_transition_interieur',.0005);
 // Opening this leaf constructs the showroom once. Closed doors keep the
 // original small scenery and do not allocate exhibition geometry or images.
 for(const sign of [-1,1])box(.043,innerDoorHeight,.055,doorX+sign*(innerDoorWidth/2+.0215),innerDoorHeight/2,doorZ,plaster,'Huisserie_porte_hall');
 box(innerDoorWidth+.086,.043,.055,doorX,innerDoorHeight+.0215,doorZ,plaster,'Traverse_porte_hall');
 const innerLeaf=new T.Group();innerLeaf.name='Porte_vers_exposition';innerLeaf.position.set(doorX-innerDoorWidth/2,0,doorZ+.004);root.add(innerLeaf);
 box(innerDoorWidth-.008,innerDoorHeight-.006,.040,innerDoorWidth/2,innerDoorHeight/2,0,oak,'Porte_interieure_hall',.003,innerLeaf);
 box(.020,.115,.008,innerDoorWidth-.075,1.03,.025,metal,'Rosace_poignee_hall',.002,innerLeaf);
 box(.085,.012,.018,innerDoorWidth-.104,1.04,.042,metal,'Poignee_porte_hall',.002,innerLeaf);
 innerLeaf.userData.showroomAction={kind:'inner-door'};
 const showroomSign=makeShowroomDoorSign({width:innerDoorWidth,onReady});innerLeaf.add(showroomSign.root);
 box(innerDoorWidth,.018,.15,doorX,-.010,back-.06,honey,'Seuil_sas_exposition');
 let showroom=null,innerOpen=false,occupied=false;
 const wake=()=>{onReady();if(typeof window!=='undefined')window.dispatchEvent(new Event('lrf-door-interior-ready'));};
 const ensureShowroom=()=>{
  if(disposed)return null;
  if(!showroom){showroom=makeShowroomHall({manufacturers:SHOWROOM_MANUFACTURERS,onReady:wake,loadTexture:loadTexture||undefined});showroom.root.position.set(doorX,0,back-.09);root.add(showroom.root);}
  return showroom;
 };
 const setInnerOpen=value=>{innerOpen=!!value;if(innerOpen)ensureShowroom();innerLeaf.rotation.y=innerOpen?Math.PI/2:0;if(showroom)showroom.root.visible=innerOpen;root.updateMatrixWorld(true);wake();return true;};
 // Local, metre-based navigation excludes the console and both solid walls.
 const canWalk=(point,radius=.20)=>{
  const {x,z}=point,margin=Math.max(0,radius);
  if(z>-.20)return null;
  if(z>=front-margin){return Math.abs(x)<=clearWidth/2-margin*.65&&z>=front-margin;}
  if(z>back+margin){
   if(Math.abs(x)>hallWidth/2-margin)return false;
   if(x>-hallWidth*.30-.27-margin&&x<-hallWidth*.30+.27+margin&&z<back+.33+margin)return false;
   return true;
  }
  if(!innerOpen)return false;
  const hallStart=back-.09;
  if(z>hallStart-margin)return Math.abs(x-doorX)<innerDoorWidth/2-margin;
  const local={x:x-doorX,z:z-hallStart},bounds=showroom?.navigableBounds;
  if(!bounds||local.x<bounds.minX+margin||local.x>bounds.maxX-margin||local.z<bounds.minZ+margin||local.z>bounds.maxZ)return false;
  if(showroom.canWalk)return showroom.canWalk(local,margin);
  return !showroom.colliders.some(box=>local.x>box.minX-margin&&local.x<box.maxX+margin&&local.z>box.minZ-margin&&local.z<box.maxZ+margin);
 };
 const visit={root,canWalk,get innerOpen(){return innerOpen},get occupied(){return occupied},setOccupied:value=>{occupied=!!value;},setInnerOpen,toggleInner:()=>setInnerOpen(!innerOpen),get showroom(){return showroom},prepareNear:point=>{if(showroom&&innerOpen)showroom.prepareNear(new T.Vector3(point.x-doorX,1.58,point.z-back+.09));},endVisit(){occupied=false;innerOpen=false;innerLeaf.rotation.y=0;showroom?.dispose();showroom=null;root.updateMatrixWorld(true);}};
 honey.addEventListener('dispose',()=>showroom?.dispose());
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
 return {...visit,root,canWalk,get innerOpen(){return innerOpen},get occupied(){return occupied},get showroom(){return showroom},dimensions:{width:hallWidth,height:hallHeight,depth:Math.abs(back+.23)},prepareFloor,setVisible:value=>{root.visible=!!value||occupied;if(root.visible){prepareFloor();showroomSign.prepare();}}};
}
