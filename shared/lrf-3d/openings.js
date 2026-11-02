import * as T from 'three';
import {OPENING_COLORS} from './ral-colors.js';
export {OPENING_COLORS};
const frameHex=value=>OPENING_COLORS.find(c=>c.id===value||c.code===String(value)||'ral-'+c.code===value)?.hex||OPENING_COLORS[0].hex;
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const exteriorTextures=new Map();
export function setExteriorTexture(texture,id='mediterranean'){exteriorTextures.set(id,texture);}
export const WINDOW_TYPES=Object.freeze([{id:'sliding',name:'Coulissante · 2 vantaux'},{id:'casement',name:'Ouvrante · 2 vantaux'}].map(Object.freeze));
export const windowType=settings=>settings?.windowType==='casement'?'casement':'sliding';
export const isOpening=type=>type==='window'||type==='door';
export const OPENING_LIMITS={window:{minWidth:40,maxWidth:240,minHeight:40,maxHeight:220},door:{minWidth:60,maxWidth:140,minHeight:180,maxHeight:260}};
export function openingError(type,width,height){const l=OPENING_LIMITS[type];if(!l||![width,height].every(Number.isInteger))return 'Saisissez des dimensions entières en centimètres.';if(width<l.minWidth||width>l.maxWidth||height<l.minHeight||height>l.maxHeight)return `Dimensions : largeur ${l.minWidth}–${l.maxWidth} cm, hauteur ${l.minHeight}–${l.maxHeight} cm.`;return '';}
export function makeOpening(type,settings={}){
 const width=settings.width??(type==='window'?120:83),height=settings.height??(type==='window'?100:204),error=openingError(type,width,height);if(error)throw new Error(error);
 const w=width/100,h=height/100,root=new T.Group();root.name=type==='window'?'Fenetre_double_vitrage':'Porte_interieure';root.userData.editTarget=type;
 const frame=new T.MeshPhysicalMaterial({color:frameHex(settings.color),roughness:.34,metalness:.08,clearcoat:.16});
 const metal=new T.MeshStandardMaterial({color:'#b5bfc1',metalness:1,roughness:.24});
 const box=(parent,x,y,z,ww,hh,dd,mat,name)=>{const o=new T.Mesh(new RoundedBoxGeometry(ww,hh,dd,2,Math.min(.002,ww/5,hh/5,dd/5)),mat);o.position.set(x,y,z);o.name=name;o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const f=type==='window'?.055:.05,z=-.24,d=.12;
 for(const x of [-w/2+f/2,w/2-f/2])box(root,x,h/2,z,f,h,d,frame,'Dormant_vertical');
 box(root,0,h-f/2,z,w-2*f,f,d,frame,'Traverse_haute');
 if(type==='window'){
  box(root,0,f/2,z,w-2*f,f,d,frame,'Traverse_basse');
  const style=windowType(settings),innerW=w-2*f,innerH=h-2*f;
  root.userData.windowType=style;
  const gardenGeometry=new T.PlaneGeometry(innerW,innerH),uv=gardenGeometry.attributes.uv,baseUV=Float32Array.from(uv.array),aspect=innerW/innerH;
  const gardenMaterial=new T.MeshBasicMaterial({color:'#b5c5b7',toneMapped:false}),garden=new T.Mesh(gardenGeometry,gardenMaterial);
  garden.name='Vue_exterieure_jardin';garden.position.set(0,h/2,-.37);garden.raycast=()=>{};root.add(garden);
  let ambience=settings.exteriorAmbience||'mediterranean';
  const setExteriorAmbience=id=>{
   if(typeof id!=='string'||!id)return false;
   ambience=id;const texture=exteriorTextures.get(id)||null,image=texture?.image,imageW=image?.naturalWidth||image?.width,imageH=image?.naturalHeight||image?.height,imageAspect=imageW>0&&imageH>0?imageW/imageH:1.5;
   for(let i=0;i<uv.count;i++){const x=baseUV[i*2],y=baseUV[i*2+1];uv.setXY(i,aspect<imageAspect?.5+(x-.5)*aspect/imageAspect:x,aspect>imageAspect?.5+(y-.5)*imageAspect/aspect:y);}
   uv.needsUpdate=true;gardenMaterial.map=texture;gardenMaterial.color.set(texture?'#ffffff':'#b5c5b7');gardenMaterial.needsUpdate=true;
   root.userData.exteriorAmbience=id;root.userData.exteriorTextureReady=!!texture;return !!texture;
  };
  setExteriorAmbience(ambience);
  const seal=new T.MeshStandardMaterial({color:'#303b38',roughness:.85});
  const spacer=new T.MeshStandardMaterial({color:'#6e7779',roughness:.44,metalness:.62});
  const glass=new T.MeshPhysicalMaterial({color:'#f1f9f8',metalness:0,roughness:.028,transmission:.86,thickness:.004,ior:1.5,transparent:true,opacity:1,envMapIntensity:1.4});
  glass.userData.architecturalGlass=true;
  const cylinder=(parent,radius,length,x,y,zz,name,mat=metal)=>{const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,length,48),mat);mesh.position.set(x,y,zz);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  // The frame and exterior view remain fixed. Every sash carries its own
  // glazing, seals, spacer and hardware so nothing is left floating when open.
  for(const x of [-innerW/2+.002,innerW/2-.002])box(root,x,h/2,z+.003,.004,innerH,.028,seal,'Joint_EPDM');
  for(const y of [f+.002,h-f-.002])box(root,0,y,z+.003,innerW,.004,.028,seal,'Joint_EPDM');
  const leaf=(parent,width,height,depth,centerX=0,handleSide=0)=>{
   const profile=Math.min(.036,width*.18,height*.12),clearW=width-2*profile-.006,clearH=height-2*profile-.006;
   for(const x of [-width/2+profile/2,width/2-profile/2])box(parent,centerX+x,height/2,0,profile,height,depth,frame,'Montant_ouvrant');
   for(const y of [profile/2,height-profile/2])box(parent,centerX,y,0,width-2*profile,profile,depth,frame,'Traverse_ouvrant');
   for(const x of [-clearW/2-.002,clearW/2+.002]){
    box(parent,centerX+x,height/2,.003,.004,clearH+.008,.022,seal,'Joint_vitrage_EPDM');
    box(parent,centerX+x,height/2,0,.002,clearH,.012,spacer,'Intercalaire_double_vitrage');
   }
   for(const y of [(height-clearH)/2-.002,(height+clearH)/2+.002]){
    box(parent,centerX,y,.003,clearW,.004,.022,seal,'Joint_vitrage_EPDM');
    box(parent,centerX,y,0,clearW,.002,.012,spacer,'Intercalaire_double_vitrage');
   }
   for(const paneZ of [-.008,.008]){const pane=box(parent,centerX,height/2,paneZ,clearW,clearH,.004,glass,'Double_vitrage');pane.castShadow=false;pane.userData.glassLeaf=parent.name;}
   if(handleSide){
    const x=centerX+handleSide*(width/2-profile*.52),y=height*.52;
    box(parent,x,y,depth/2+.003,.018,.055,.006,metal,'Rosace_poignee_fenetre');
    const pivot=cylinder(parent,.006,.014,x,y,depth/2+.012,'Axe_poignee_fenetre');pivot.rotation.x=Math.PI/2;
    box(parent,x,y-.029,depth/2+.021,.010,.077,.012,metal,'Poignee_fenetre');
   }
   return profile;
  };
  const sashes=[],closed=[];
  let progress=0,travel=0;
  if(style==='casement'){
   const leafW=(innerW-.006)/2,leafH=innerH-.006;
   for(const sign of [-1,1]){
    const sash=new T.Group();sash.name=sign<0?'Ouvrant_fenetre_gauche':'Ouvrant_fenetre_droit';sash.position.set(sign*(innerW/2-.002),f+.003,z+.036);root.add(sash);sashes.push(sash);
    const centerX=-sign*leafW/2;leaf(sash,leafW,leafH,.042,centerX,sign>0?-1:0);
    for(const y of [Math.min(.16,leafH*.20),leafH/2,leafH-Math.min(.16,leafH*.20)]){
     cylinder(sash,.007,.048,0,y,.007,'Paumelle_fenetre');
     box(root,sign*(innerW/2+.011),f+.003+y,z+.041,.027,.033,.012,metal,'Platine_paumelle_fenetre');
    }
    if(sign<0)for(const y of [.08,leafH-.08])box(sash,leafW-.018,y,.024,.009,.025,.006,metal,'Verrou_second_vantail');
   }
  }else{
   const overlap=.016,leafW=(innerW+overlap)/2,leafH=innerH-.014;
   travel=innerW-leafW-.006;
   for(const [index,sign]of [-1,1].entries()){
    const sash=new T.Group();sash.name=sign<0?'Ouvrant_coulissant_gauche':'Ouvrant_coulissant_droit';sash.position.set(sign*(innerW-leafW)/2,f+.007,z+(index===0?.028:-.022));root.add(sash);sashes.push(sash);closed.push(sash.position.x);
    leaf(sash,leafW,leafH,.036,0,-sign);
    for(const x of [-leafW/2+.026,leafW/2-.026]){const roller=cylinder(sash,.005,.009,x,.003,0,'Galet_coulissant',spacer);roller.rotation.x=Math.PI/2;}
    for(const y of [f+.002,h-f-.002])box(root,0,y,sash.position.z,innerW,.004,.008,metal,'Rail_coulissant');
   }
   for(const sign of [-1,1])for(const sash of sashes)box(root,sign*(innerW/2-.004),h/2,sash.position.z,.005,innerH-.016,.010,seal,'Joint_brosse_coulissant');
  }
  const setOpenProgress=value=>{
   if(!Number.isFinite(value))return false;progress=T.MathUtils.clamp(value,0,1);
   if(style==='casement')sashes.forEach((sash,index)=>sash.rotation.y=(index===0?-1:1)*progress*Math.PI/2);
   else{sashes[0].position.x=closed[0]+travel*progress;sashes[1].position.x=closed[1];}
   root.userData.openProgress=progress;root.updateMatrixWorld(true);return true;
  };
  setOpenProgress(settings.windowOpen===true?1:0);
  box(root,0,.008,z+.025,w+.025,.016,.17,frame,'Appui_fenetre');
  return {root,frame,sashes,windowType:style,setOpenProgress,getOpenProgress:()=>progress,setExteriorAmbience,getExteriorAmbience:()=>ambience,setColor:value=>frame.color.set(frameHex(value))};
 }else{
  const door=new T.Group();root.add(door);door.name='Ouvrant_porte';
  box(door,(w-2*f)/2,(h-f-.008)/2+.004,0,w-2*f-.006,h-f-.008,.04,frame,'Vantail_40mm');
  for(const zz of [-.031,.031]){box(door,w-2*f-.075,h*.49,zz,.025,.16,.015,metal,'Plaque_poignee');box(door,w-2*f-.105,h*.49,zz+Math.sign(zz)*.012,.10,.018,.020,metal,'Bequille');}
  for(const y of [.22,h/2,h-.22])box(door,.003,y,-.023,.018,.07,.022,metal,'Paumelle');
  let side='left',progress=0;
  const pose=()=>{const sign=side==='left'?1:-1;door.scale.x=sign;door.position.set((-w/2+f)*sign,0,z+.013);door.rotation.y=-progress*Math.PI/2*sign;root.updateMatrixWorld(true);};
  const setHingeSide=value=>{if(!['left','right'].includes(value))return false;side=value;pose();return true;};
  const setOpenProgress=value=>{progress=T.MathUtils.clamp(value,0,1);pose();};setHingeSide(settings.hingeSide||'left');
  return {root,frame,door,setHingeSide,getHingeSide:()=>side,setOpenProgress,setColor:value=>frame.color.set(frameHex(value))};
 }
 return {root,frame,setColor:value=>frame.color.set(frameHex(value))};
}
