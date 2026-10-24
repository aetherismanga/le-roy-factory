import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
let exteriorTexture=null;export function setExteriorTexture(texture){exteriorTexture=texture;}
export const isOpening=type=>type==='window'||type==='door';
export const OPENING_LIMITS={window:{minWidth:40,maxWidth:240,minHeight:40,maxHeight:220},door:{minWidth:60,maxWidth:140,minHeight:180,maxHeight:260}};
export function openingError(type,width,height){const l=OPENING_LIMITS[type];if(!l||![width,height].every(Number.isInteger))return 'Saisissez des dimensions entières en centimètres.';if(width<l.minWidth||width>l.maxWidth||height<l.minHeight||height>l.maxHeight)return `Dimensions : largeur ${l.minWidth}–${l.maxWidth} cm, hauteur ${l.minHeight}–${l.maxHeight} cm.`;return '';}
export function makeOpening(type,settings={}){
 const width=settings.width??(type==='window'?120:83),height=settings.height??(type==='window'?100:204),error=openingError(type,width,height);if(error)throw new Error(error);
 const w=width/100,h=height/100,root=new T.Group();root.name=type==='window'?'Fenetre_double_vitrage':'Porte_interieure';root.userData.editTarget=type;
 const frame=new T.MeshPhysicalMaterial({color:settings.color==='black'?'#202526':'#f1f0eb',roughness:.34,metalness:.08,clearcoat:.16});
 const metal=new T.MeshStandardMaterial({color:'#b5bfc1',metalness:1,roughness:.24});
 const box=(parent,x,y,z,ww,hh,dd,mat,name)=>{const o=new T.Mesh(new RoundedBoxGeometry(ww,hh,dd,2,Math.min(.002,ww/5,hh/5,dd/5)),mat);o.position.set(x,y,z);o.name=name;o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const f=type==='window'?.055:.05,z=-.24,d=.12;
 for(const x of [-w/2+f/2,w/2-f/2])box(root,x,h/2,z,f,h,d,frame,'Dormant_vertical');
 box(root,0,h-f/2,z,w-2*f,f,d,frame,'Traverse_haute');
 if(type==='window'){
  box(root,0,f/2,z,w-2*f,f,d,frame,'Traverse_basse');
  const gardenGeometry=new T.PlaneGeometry(w-2*f,h-2*f),uv=gardenGeometry.attributes.uv,aspect=(w-2*f)/(h-2*f),imageAspect=1.5;
  for(let i=0;i<uv.count;i++){if(aspect<imageAspect)uv.setX(i,.5+(uv.getX(i)-.5)*aspect/imageAspect);else uv.setY(i,.5+(uv.getY(i)-.5)*imageAspect/aspect);}
  const garden=new T.Mesh(gardenGeometry,new T.MeshBasicMaterial({map:exteriorTexture,color:exteriorTexture?'#ffffff':'#b5c5b7',toneMapped:false}));garden.name='Vue_exterieure_jardin';garden.position.set(0,h/2,-.37);garden.raycast=()=>{};root.add(garden);
  const seal=new T.MeshStandardMaterial({color:'#303b38',roughness:.85});for(const sign of [-1,1]){box(root,sign*(w/2-f-.003),h/2,z+.007,.006,h-2*f,.016,seal,'Joint_EPDM');box(root,sign*(w/2-f/2),h*.72,z+.064,.016,.055,.017,metal,'Paumelle_fenetre');}
  for(const y of [f+.003,h-f-.003])box(root,0,y,z+.007,w-2*f,.006,.016,seal,'Joint_EPDM');
  box(root,0,h/2,z,.044,h-2*f,.07,frame,'Montant_central');
  const glass=new T.MeshPhysicalMaterial({color:'#f1f9f8',metalness:0,roughness:.045,transmission:.82,thickness:.012,ior:1.5,transparent:true,opacity:1,envMapIntensity:1.4});
  glass.userData.architecturalGlass=true;for(const sign of [-1,1])box(root,sign*(w/4-f/2+.011),h/2,z,(w-2*f-.044)/2,h-2*f,.012,glass,'Double_vitrage');
  box(root,.041,h/2,z+.061,.012,.105,.018,metal,'Poignee_fenetre');
  box(root,0,.008,z+.025,w+.025,.016,.17,frame,'Appui_fenetre');
 }else{
  const door=new T.Group();root.add(door);door.name='Ouvrant_porte';
  box(door,(w-2*f)/2,(h-f-.008)/2+.004,0,w-2*f-.006,h-f-.008,.04,frame,'Vantail_40mm');
  for(const zz of [-.031,.031]){box(door,w-2*f-.075,h*.49,zz,.025,.16,.015,metal,'Plaque_poignee');box(door,w-2*f-.105,h*.49,zz+Math.sign(zz)*.012,.10,.018,.020,metal,'Bequille');}
  for(const y of [.22,h/2,h-.22])box(door,.003,y,-.023,.018,.07,.022,metal,'Paumelle');
  let side='left',progress=0;
  const pose=()=>{const sign=side==='left'?1:-1;door.scale.x=sign;door.position.set((-w/2+f)*sign,0,z+.013);door.rotation.y=-progress*Math.PI/2*sign;root.updateMatrixWorld(true);};
  const setHingeSide=value=>{if(!['left','right'].includes(value))return false;side=value;pose();return true;};
  const setOpenProgress=value=>{progress=T.MathUtils.clamp(value,0,1);pose();};setHingeSide(settings.hingeSide||'left');
  return {root,frame,door,setHingeSide,getHingeSide:()=>side,setOpenProgress,setColor:value=>frame.color.set(value==='black'?'#202526':'#f1f0eb')};
 }
 return {root,frame,setColor:value=>frame.color.set(value==='black'?'#202526':'#f1f0eb')};
}
