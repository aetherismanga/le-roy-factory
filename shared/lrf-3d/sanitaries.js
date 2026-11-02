import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {makeTap,tapProduct,metalMaterial} from './taps.js';
import {createSurface} from './room.js';
import {makeTrixieCeramicGeometry,makeTrixieHardwareGeometries,TRIXIE_CERAMIC_PROVENANCE,makeDaliaCeramicGeometry,DALIA_LAYOUT} from './sanitary-ceramics.js';
import {addWashstandPlumbing} from './sanitary-plumbing.js';
export const SANITARIES=[
 {id:'TR2217R',name:'AMARO VORTEX',type:'toilet',width:.36,depth:.48,height:.36,finish:'Blanc brillant',page:44},
 {id:'TR2217R-U18',name:'AMARO BLACK VORTEX',type:'toilet',width:.36,depth:.48,height:.36,finish:'Noir mat',page:44},
 {id:'TR2224',name:'KRAL',type:'toilet',width:.36,depth:.615,height:.745,floor:true,finish:'Blanc brillant',page:54},
 {id:'STR4335',name:'DALIA',type:'washstand',width:.55,depth:.31,height:.125,finish:'Blanc brillant',page:30},
 {id:'TR443',name:'TRIXIE',type:'washstand',width:.625,depth:.285,height:.15,finish:'Blanc brillant',page:29,note:'Céramique monobloc avec tablette latérale et porte-serviettes intégré.'}
];
// Flush plates are independent of the bowl finish and of the optional support.
export const FLUSH_PLATE_COLORS=[
 {id:'Blanc',name:'Blanc',hex:'#f1eee7',metalness:0,roughness:.5},
 {id:'Noir',name:'Noir',hex:'#212426',metalness:.15,roughness:.43},
 {id:'Argent',name:'Argent',hex:'#c4ced0',metalness:1,roughness:.28},
 {id:'Doré',name:'Doré',hex:'#bd9b60',metalness:1,roughness:.3},
 {id:'Bronze',name:'Bronze',hex:'#94735b',metalness:1,roughness:.3}
];
export function flushPlateMaterial(value='Blanc'){
 const finish=FLUSH_PLATE_COLORS.find(f=>f.id===value);
 return finish?new T.MeshPhysicalMaterial({color:finish.hex,metalness:finish.metalness,roughness:finish.roughness,clearcoat:.14}):metalMaterial(value);
}
export {PLUMBING} from './plumbing-catalog.js';
import {PLUMBING} from './plumbing-catalog.js';
export const sanitarySpec=s=>SANITARIES.find(p=>p.id===s.reference)||SANITARIES[0];
// The catalogue gives overall dimensions/photos, not manufacturer CAD. Closed
// multi-profile ceramic shells preserve the hollow interior and physical rims.
function shell(profiles,centreX,centreZ,power=2){const positions=[],indices=[],uv=[],n=96;for(let j=0;j<profiles.length;j++){const [rx,rz,y]=profiles[j];for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a);positions.push(centreX+rx*Math.sign(c)*Math.abs(c)**(2/power),y,centreZ+rz*Math.sign(s)*Math.abs(s)**(2/power));uv.push(i/n,j/profiles.length);if(j<profiles.length-1&&i<n){const k=j*(n+1)+i;indices.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;}
export function makeSanitary(type,s={}){const p=sanitarySpec(s),root=new T.Group();root.userData.editTarget=type;root.userData.reference=p.id;root.name=p.name+'_'+p.id;const ceramic=new T.MeshPhysicalMaterial({color:p.id.includes('U18')?'#292a2b':'#f1f0e9',roughness:p.id.includes('U18')?.65:.16,clearcoat:p.id.includes('U18')?.04:.75,ior:1.5}),metal=metalMaterial(s.metal||'Chrome brillant');
 const add=(g,m,name,x=0,y=0,z=0,parent=root)=>{const o=new T.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;},box=(w,h,d,x,y,z,name,m=ceramic,parent=root)=>add(new RoundedBoxGeometry(w,h,d,3,Math.min(.006,h/4,d/4)),m,name,x,y,z,parent),cyl=(r,h,x,y,z,name)=>add(new T.CylinderGeometry(r,r,h,48),metal,name,x,y,z);
 if(type==='toilet'){
  const floor=!!p.floor,z=-.23+(floor?.135:0)+.24,H=floor?.40:.36;
  const bowl=add(shell([[.11,.15,0],[.15,.205,.07],[.18,.24,H-.025],[.18,.24,H-.01],[.16,.215,H],[.145,.19,H-.025],[.12,.15,H-.09],[.05,.07,.10],[.035,.045,.08],[.035,.045,.02],[.11,.15,0]],0,z,2.6),ceramic,'Cuvette_creuse');
  const seatShape=new T.Shape().absellipse(0,0,.174,.23,0,Math.PI*2,false);seatShape.holes.push(new T.Path().absellipse(0,0,.137,.183,0,Math.PI*2,true));const seatG=new T.ExtrudeGeometry(seatShape,{depth:.012,bevelEnabled:true,bevelSize:.002,bevelThickness:.001,bevelSegments:2,curveSegments:64});seatG.rotateX(-Math.PI/2);add(seatG,ceramic,'Lunette',0,H-.007,z);
  const lid=new T.Group();lid.name='Abattant';lid.position.set(0,H+.006,z-.20);root.add(lid);const shape=new T.Shape().absellipse(0,0,.175,.231,0,Math.PI*2,false),g=new T.ExtrudeGeometry(shape,{depth:.009,bevelEnabled:true,bevelSize:.002,bevelThickness:.001,bevelSegments:2,curveSegments:64});g.rotateX(-Math.PI/2);add(g,ceramic,'Couvercle',0,0,.20,lid);lid.rotation.x=s.lidOpen?-Math.PI*.48:0;
  if(floor){box(.29,.40,.27,0,.20,-.23+.24,'Pied');box(.345,.345,.155,0,.5725,-.23+.0775,'Reservoir');box(.355,.016,.165,0,.737,-.23+.08,'Couvercle_reservoir');cyl(.022,.004,0,.747,-.23+.08,'Bouton_double_chasse');}
  else box(.32,.28,.035,0,.155,-.23+.02,'Dos_fixation');
  const addFlushPlate=(y,z)=>{const plate=flushPlateMaterial(s.plateColor||'Blanc');box(.24,.16,.009,0,y,z,'Plaque_double_chasse',plate);for(const [x,r]of [[-.049,.042],[.055,.028]]){const button=add(new T.CylinderGeometry(r,r,.004,48),plate,'Bouton_chasse',x,y,z+.008);button.rotation.x=Math.PI/2;}};
  const angle=lid.rotation.x;lid.rotation.x=0;const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),content=new T.Group();while(root.children.length)content.add(root.children[0]);content.scale.set(p.width/size.x,p.height/size.y,p.depth/size.z);content.position.set(-(bounds.min.x+bounds.max.x)/2*content.scale.x,-bounds.min.y*content.scale.y,-.23-bounds.min.z*content.scale.z);root.add(content);lid.rotation.x=angle;root.updateMatrixWorld(true);const actualHeight=new T.Box3().setFromObject(root).getSize(new T.Vector3()).y;
  if(!floor&&s.support){const width=Math.max(.5,Math.min(1.2,(Number(s.supportWidth)||60)/100)),height=Math.max(.85,Math.min(1.35,(Number(s.supportHeight)||112)/100)),depth=Math.max(.15,Math.min(.35,(Number(s.supportDepth)||20)/100));content.position.y+=.12;content.position.z+=depth;
   const cladding=new T.MeshStandardMaterial({color:/^#[a-f0-9]{6}$/i.test(s.supportColor||'')?s.supportColor:'#d6cabb',roughness:.72}),steel=new T.MeshStandardMaterial({color:'#23595d',metalness:.8,roughness:.28});
   for(const sign of [-1,1])box(.04,height-.04,.04,sign*(width/2-.04),height/2,-.23+.04,'Montant_bati_support',steel);box(width,height,depth,0,height/2,-.23+depth/2,'Habillage_bati_support',cladding);
   const supportSurfaces=[];
   const face=(part,w,h,x,y,z,rx=0,ry=0)=>{const surface=createSurface([[0,0],[w,0],[w,h],[0,h]],'Habillage_carrelage_'+part,[],{receiveTileShadows:true});surface.group.position.set(x,y,z);surface.group.rotation.set(rx,ry,0);surface.group.userData.editTarget='toilet';surface.group.userData.supportPart=part;surface.supportPart=part;surface.length=w;surface.height=h;surface.supportDimensions={width,height,depth};root.add(surface.group);supportSurfaces.push(surface);};
   // The back remains exactly at the wall plane (-23 cm). Four independent
   // physical tile faces allow real joints/cuts, matching wall material and HD.
   face('front',width,height,-width/2,0,-.23+depth+.001);
   face('left',depth,height,-width/2-.001,0,-.23,0,-Math.PI/2);
   face('right',depth,height,width/2+.001,0,-.23+depth,0,Math.PI/2);
   face('top',width,depth,-width/2,height+.001,-.23+depth,-Math.PI/2);
   addFlushPlate(Math.min(height-.13,1.0),-.23+depth+.005);
   return {root,spec:p,supportSurfaces,dimensions:{width:Math.max(p.width,width),depth:p.depth+depth,height,base:0},ceramic};
  }
  if(!floor)addFlushPlate(.90,-.225);
  return {root,spec:p,dimensions:{width:p.width,depth:p.depth,height:actualHeight,base:0},ceramic};
 }
 const trixie=p.id==='TR443',W=p.width,D=p.depth,H=p.height,x=trixie?.1035563:DALIA_LAYOUT.drainX,z=trixie?-.0857431:DALIA_LAYOUT.drainZ;
 let sourceHardware=null;
 if(trixie){
  add(makeTrixieCeramicGeometry(),ceramic,'Vasque_ovale');sourceHardware=makeTrixieHardwareGeometries();
  root.userData.geometrySource=TRIXIE_CERAMIC_PROVENANCE;
  // Named landmarks retain the existing decoration/controller contract. The
  // actual tablet and towel aperture are one continuous manufacturer mesh.
  for(const name of ['Tablette','Porte_serviettes']){const landmark=new T.Group();landmark.name=name;root.add(landmark);}
 }
 else{add(makeDaliaCeramicGeometry(),ceramic,'Vasque_rectangle');root.userData.geometrySource={source:DALIA_LAYOUT.source,method:DALIA_LAYOUT.method};}
 addWashstandPlumbing(root,{x,z,drainY:trixie?.025:.018,finish:s.metal||'Chrome brillant',trap:s.trap,drain:s.drain,coverGeometry:sourceHardware?.drain});
 const tap=makeTap(tapProduct(s.tap,'basin'));tap.name='Mitigeur_lave_mains';tap.position.set(trixie?-.046:DALIA_LAYOUT.tapX,H,trixie?-.175:DALIA_LAYOUT.tapZ);root.add(tap);
 if(trixie)add(sourceHardware.overflow,metal,'Trop_plein');
 else{
  const overflow=new T.Group();overflow.name='Trop_plein';overflow.position.set(0,H-.035,-.132);overflow.rotation.x=-.38;root.add(overflow);
  const dark=new T.MeshStandardMaterial({color:'#303537',roughness:.73});add(new T.CylinderGeometry(.0084,.0084,.002,48),dark,'Cavite_trop_plein',0,0,0,overflow).rotation.x=Math.PI/2;
  add(new T.TorusGeometry(.0084,.0011,8,64),metal,'Bague_trop_plein',0,0,.001,overflow);
  const cap=add(new T.CircleGeometry(.0082,48,Math.PI,Math.PI),metal,'Capot_trop_plein',0,0,.002,overflow);cap.castShadow=false;
 }
 return {root,spec:p,ceramic,dimensions:{width:W,depth:D,height:H+.19,base:0,clearanceBelow:.31}};
}
