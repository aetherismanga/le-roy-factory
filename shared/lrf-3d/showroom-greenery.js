import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeShowroomLayout,showroomPoint} from './showroom-layout.js';

const noRaycast=()=>{};
const up=new T.Vector3(0,1,0);
function seeded(seed=8419){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function surfaceTexture(kind){
 const size=128,data=new Uint8Array(size*size),random=seeded(kind==='fabric'?183:473);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const weave=kind==='fabric'?(Math.sin(x*Math.PI*.5)*Math.cos(y*Math.PI*.5)*28):Math.sin(x*.17+y*.09)*6;
  data[y*size+x]=Math.max(0,Math.min(255,128+weave+(random()-.5)*(kind==='fabric'?14:25)));
 }
 const texture=new T.DataTexture(data,size,size,T.RedFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(kind==='fabric'?12:4,kind==='fabric'?12:4);texture.needsUpdate=true;return texture;
}
function contactTexture(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2)),i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=25;data[i+3]=Math.round(Math.max(0,1-r)**2*110);
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.needsUpdate=true;return texture;
}

// A cupped, twisted lamina with a physical midrib. Leaves are curved surfaces,
// never alpha-cutout cards or crossed planes. Vertex colour carries the vein.
function leafGeometry(kind='broad'){
 const rows=kind==='monstera'?17:kind==='narrow'?6:10,columns=kind==='monstera'?6:kind==='narrow'?2:4,positions=[],colors=[],uvs=[],indices=[];
 for(let row=0;row<=rows;row++){
  const t=row/rows,outline=Math.sin(Math.PI*t)**.65;
  const lobes=kind==='monstera'?1-.38*(Math.sin(t*Math.PI*5)**8):1;
  for(let column=0;column<=columns;column++){
   const s=column/columns*2-1,edge=outline*lobes;
   const x=s*edge*.5,z=.16*Math.sin(Math.PI*t)+.11*s*s*Math.sin(Math.PI*t)+.035*s*Math.sin(t*Math.PI*1.7);
   positions.push(x,t,z);uvs.push((s+1)/2,t);
   const vein=Math.abs(s)<.01?.91:1;
   colors.push(vein*.94,vein,vein*.91);
  }
 }
 for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
  const a=row*(columns+1)+column,b=a+columns+1;indices.push(a,b,a+1,b,b+1,a+1);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Native botanical geometry and a grounded reception lounge. No network or
 * browser APIs are needed. Planting follows the open plan's reserved pockets. */
export function makeShowroomGreenery({width,depth,stands=[],layout,onReady=()=>{}}={}){
 const root=new T.Group();root.name='Paysage_et_salon_accueil';root.userData={visualOnly:true,excludeFromProductBounds:true,botanical:true};
 const colliders=[],random=seeded(),geometries=new Set(),materials=new Set(),textures=new Set(),parts=new Map(),foliage=new Map(),plants=[];
 const plan={...makeShowroomLayout(stands.map(stand=>stand.manufacturer).filter(Boolean)),...layout};
 width=Number.isFinite(width)?width:plan.width;depth=Number.isFinite(depth)?depth:plan.depth;
 let disposed=false,frame=null;
 const grain=surfaceTexture('mineral'),fabric=surfaceTexture('fabric'),contact=contactTexture();textures.add(grain);textures.add(fabric);textures.add(contact);
 const mat=(name,options)=>{const material=new T.MeshStandardMaterial(options);material.name=name;materials.add(material);return material;};
 const palette={
  terracotta:mat('Terre_cuite_naturelle',{color:'#b36f50',roughness:.8,bumpMap:grain,bumpScale:.002}),
  ivory:mat('Ceramique_sable_mate',{color:'#cfc3aa',roughness:.68,bumpMap:grain,bumpScale:.0008}),
  darkPot:mat('Ceramique_vert_profond',{color:'#344a40',roughness:.36,metalness:.04}),
  bark:mat('Ecorce_brun_gris',{color:'#736049',roughness:.96,bumpMap:grain,bumpScale:.004}),
  soil:mat('Terreau',{color:'#332b21',roughness:1,bumpMap:grain,bumpScale:.009}),
  pebbles:mat('Galets_naturels',{color:'#b7a58b',roughness:.87}),
  sofa:mat('Tissu_boucle_ocre',{color:'#a96d47',roughness:.96,bumpMap:fabric,bumpScale:.0012}),
  sofaLight:mat('Tissu_boucle_lin',{color:'#c9b59b',roughness:.96,bumpMap:fabric,bumpScale:.0012}),
  wood:mat('Chene_huile',{color:'#8e6946',roughness:.5,bumpMap:grain,bumpScale:.0005}),
  metal:mat('Metal_bronze_satine',{color:'#8c7755',metalness:.8,roughness:.29}),
  paper:mat('Papier_catalogue',{color:'#e3dfd1',roughness:.88}),
  book:mat('Couverture_catalogue_olive',{color:'#3d5449',roughness:.62}),
  cup:mat('Porcelaine_emaillee',{color:'#e2ddcd',roughness:.21,metalness:.02}),
  broad:mat('Feuillage_ficus',{color:'#55794a',roughness:.56,metalness:0,side:T.DoubleSide,vertexColors:true}),
  olive:mat('Feuillage_olivier',{color:'#75866a',roughness:.75,side:T.DoubleSide,vertexColors:true}),
  palm:mat('Feuillage_areca',{color:'#4f743d',roughness:.62,side:T.DoubleSide,vertexColors:true}),
  monstera:mat('Feuillage_monstera',{color:'#3e653e',roughness:.46,side:T.DoubleSide,vertexColors:true})
 };
 const leafGeometries={broad:leafGeometry('broad'),olive:leafGeometry('narrow'),palm:leafGeometry('narrow'),monstera:leafGeometry('monstera')};Object.values(leafGeometries).forEach(g=>geometries.add(g));
 const cylinder=new T.CylinderGeometry(1,1,1,12),pebble=new T.IcosahedronGeometry(1,1);geometries.add(cylinder);geometries.add(pebble);
 const matrix=new T.Matrix4(),quaternion=new T.Quaternion(),scale=new T.Vector3(),position=new T.Vector3();
 function put(geometry,material,pose){
  const list=parts.get(material)||[];const piece=(geometry.index?geometry.toNonIndexed():geometry.clone());piece.applyMatrix4(pose);if(frame)piece.applyMatrix4(frame);list.push(piece);parts.set(material,list);
 }
 function pose(x,y,z,sx=1,sy=1,sz=1,rotation=0){return matrix.compose(position.set(x,y,z),quaternion.setFromAxisAngle(up,rotation),scale.set(sx,sy,sz)).clone();}
 function box(x,y,z,w,h,d,material,radius=.02,rotation=0){
  const geometry=new RoundedBoxGeometry(w,h,d,3,Math.min(radius,w/3,h/3,d/3));put(geometry,material,pose(x,y,z,1,1,1,rotation));geometry.dispose();
 }
 function tube(points,radius,material=palette.bark){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const geometry=new T.TubeGeometry(curve,Math.max(5,points.length*3),radius,7,false);put(geometry,material,new T.Matrix4());geometry.dispose();
 }
 function stem(a,b,radius,material=palette.bark){
  const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);quaternion.setFromUnitVectors(up,delta.clone().normalize());matrix.compose(start.add(end).multiplyScalar(.5),quaternion,new T.Vector3(radius,delta.length(),radius));put(cylinder,material,matrix);
 }
 function leaf(kind,at,direction,length,widthFactor=1,tint=1){
  const list=foliage.get(kind)||[];quaternion.setFromUnitVectors(up,new T.Vector3(...direction).normalize());
  matrix.compose(new T.Vector3(...at),quaternion,new T.Vector3(widthFactor,length,length));
  list.push({matrix:matrix.clone(),color:new T.Color().setRGB(tint,tint*(.97+random()*.06),tint*.92)});foliage.set(kind,list);
 }
 const shadowMaterial=new T.MeshBasicMaterial({map:contact,transparent:true,depthWrite:false,opacity:.8,toneMapped:false});shadowMaterial.name='Ombres_de_contact';materials.add(shadowMaterial);
 function shadow(x,z,w,d){const geometry=new T.PlaneGeometry(w,d);geometry.rotateX(-Math.PI/2);put(geometry,shadowMaterial,pose(x,.009,z));geometry.dispose();}
 function pot(x,z,{radius=.36,height=.65,material=palette.ivory}={}){
  const profile=[[0,0],[radius*.61,0],[radius*.69,.035],[radius*.78,height*.18],[radius*.96,height*.78],[radius,height*.96],[radius-.008,height],[radius-.037,height],[radius-.048,height-.045],[radius*.64,.05],[0,.05]].map(p=>new T.Vector2(...p));
  const geometry=new T.LatheGeometry(profile,44);put(geometry,material,pose(x,.018,z));geometry.dispose();
  put(cylinder,palette.soil,pose(x,height-.045,z,radius-.049,.022,radius-.049));
  for(let i=0;i<12;i++){const angle=random()*Math.PI*2,r=Math.sqrt(random())*(radius-.07),s=.025+random()*.021;put(pebble,palette.pebbles,pose(x+Math.cos(angle)*r,height-.027,z+Math.sin(angle)*r,s,s*.45,s*.7,random()*Math.PI));}
  shadow(x,z,radius*2.8,radius*2.8);colliders.push({minX:x-radius-.04,maxX:x+radius+.04,minZ:z-radius-.04,maxZ:z+radius+.04});return height;
 }
 function ficus(x,z,{height=2.7,base=.6,exterior=false}={}){
  const trunk=.035*(exterior?1.8:1);tube([[x,base-.02,z],[x+.04,height*.46,z-.02],[x-.07,height*.76,z+.025],[x+.02,height,z]],trunk);
  for(let branch=0;branch<10;branch++){
   const angle=branch*2.399,y=base+.36+branch*(height-base-.6)/10,r=.32+(Math.sin(branch*.41)+1)*.18;
   const end=[x+Math.cos(angle)*r,y+.40,z+Math.sin(angle)*r];stem([x,y,z],end,trunk*.37);
   for(let i=0;i<8;i++){
    const a=angle+i*.68,spread=.16+random()*.23,at=[end[0]+Math.cos(a)*spread,end[1]+(random()-.4)*.28,end[2]+Math.sin(a)*spread];
    leaf('broad',at,[Math.cos(a),.15+random()*.75,Math.sin(a)],.29+random()*.16,.12+random()*.065,.68+random()*.34);
   }
  }
 }
 function olive(x,z,{height=2.5,base=.6,exterior=false}={}){
  const mainRadius=exterior?.065:.025;
  for(let trunk=0;trunk<3;trunk++){
   const a=trunk*2.094,dx=Math.cos(a)*.16,dz=Math.sin(a)*.16;
   tube([[x,base-.025,z],[x+dx*.4,height*.45,z+dz*.3],[x+dx,height*.8,z+dz],[x+dx*.8,height,z+dz*.6]],mainRadius*(trunk===0?1:.67));
  }
  for(let branch=0;branch<14;branch++){
   const a=branch*2.399,y=height*.58+(branch%4)*.14,r=.45+random()*.37,end=[x+Math.cos(a)*r,y+.2+random()*.35,z+Math.sin(a)*r];stem([x,y-.18,z],end,mainRadius*.23);
   for(let i=0;i<18;i++){
    const fraction=i/18,at=[x+(end[0]-x)*fraction,y+(end[1]-y)*fraction,z+(end[2]-z)*fraction],side=i%2?-1:1,angle=a+side*1.1;
    leaf('olive',at,[Math.cos(angle),.20+random()*.7,Math.sin(angle)],.13+random()*.065,.025+random()*.016,.83+random()*.31);
   }
  }
 }
 function areca(x,z,{height=2.8,base=.6}={}){
  for(let frond=0;frond<8;frond++){
   const angle=frond*.785+.22,r=.83+random()*.23,y=height-.25+random()*.32;
   const mid=[x+Math.cos(angle)*r*.36,y,z+Math.sin(angle)*r*.36],end=[x+Math.cos(angle)*r,y-.47,z+Math.sin(angle)*r];
   const curve=new T.CatmullRomCurve3([new T.Vector3(x,base,z),new T.Vector3(x+Math.cos(angle)*.08,height*.74,z+Math.sin(angle)*.08),new T.Vector3(...mid),new T.Vector3(...end)]);
   const branch=new T.TubeGeometry(curve,14,.009,6,false);put(branch,palette.bark,new T.Matrix4());branch.dispose();
   for(let i=3;i<19;i++)for(const sign of [-1,1]){
    const t=i/20,p=curve.getPoint(t),length=.17+Math.sin(t*Math.PI)*.28;
    leaf('palm',p.toArray(),[Math.cos(angle+sign*1.05),-.20+Math.sin(t*Math.PI)*.27,Math.sin(angle+sign*1.05)],length,.025+Math.sin(t*Math.PI)*.024,.7+random()*.30);
   }
  }
 }
 function monstera(x,z,{height=1.55,base=.53}={}){
  for(let i=0;i<11;i++){
   const a=i*2.399,r=.28+random()*.37,y=base+.40+random()*(height-base-.35),at=[x+Math.cos(a)*r,y,z+Math.sin(a)*r];
   tube([[x,base-.01,z],[x+Math.cos(a)*r*.45,y-.22,z+Math.sin(a)*r*.45],at],.012);
   leaf('monstera',at,[Math.cos(a),.14+random()*.35,Math.sin(a)],.48+random()*.22,.36+random()*.18,.70+random()*.30);
  }
 }
 function plant(species,x,z,height,material=palette.ivory){
  const radius=species==='monstera'?.31:.37,base=pot(x,z,{radius,height:species==='monstera'?.53:.66,material});
  ({ficus,olive,areca,monstera}[species])(x,z,{height,base});plants.push({species,x,z,height,exterior:false});
 }
 const zones=plan.plantZones||[],species=['areca','olive','ficus','monstera','olive','ficus'],heights=[2.7,2.45,2.5,1.5,2.55,2.5];
 const approaches=stands.map(stand=>stand.approach||stand.layout?.approach).filter(Boolean),clearApproach=(x,z,radius=.41)=>approaches.every(point=>Math.hypot(point.x-x,point.z-z)>radius+.65);
 zones.forEach((zone,index)=>{
  const kind=zone.species||species[index%species.length],height=zone.height||heights[index%heights.length];
  plant(kind,zone.x,zone.z,height,index%3===0?palette.terracotta:index%3===1?palette.ivory:palette.darkPot);
  // Only corner zones receive a low companion; the loop and each scene's
  // entrance stay clear. Pairing follows the zone rather than a booth row.
  if(index===0||index===zones.length-1){const x=zone.x+(zone.x<0?-.75:.75),z=zone.z-.45;if(Math.abs(x)<width/2-.6&&z>-depth+.7&&clearApproach(x,z,.35))plant('monstera',x,z,1.25,palette.ivory);}
 });
 // Garden trees are outside the glazed hall. They do not contribute indoor
 // collision footprints and make the photographic sky read as an exterior.
 for(const side of [-1,1]){box(side*(width/2+3.8),-.075,-depth/2,6.6,.15,depth-2,palette.soil,.01);}
 for(const side of [-1,1])for(let i=0;i<4;i++){
  const x=side*(width/2+3.0+i%2*1.2),z=-3-i*(depth-6)/3;
  olive(x,z,{height:3.8+random()*.5,base:0,exterior:true});plants.push({species:'olive',x,z,height:4,exterior:true});
 }
 // The lounge is authored in its own compact frame, then baked into the
 // shared material batches. Collision rectangles use that exact same frame.
 const lounge={...plan.lounge},loungeColliders=[];
 frame=new T.Matrix4().makeRotationY(lounge.rotation||0).setPosition(lounge.x,0,lounge.z);
 function loungeCollider(minX,maxX,minZ,maxZ){
  const corners=[[minX,minZ],[maxX,minZ],[maxX,maxZ],[minX,maxZ]].map(([x,z])=>showroomPoint({...lounge,rotation:lounge.rotation||0},x,z));
  const bounds={minX:Math.min(...corners.map(p=>p.x)),maxX:Math.max(...corners.map(p=>p.x)),minZ:Math.min(...corners.map(p=>p.z)),maxZ:Math.max(...corners.map(p=>p.z))};colliders.push(bounds);loungeColliders.push(bounds);return bounds;
 }
 for(const x of [-.97,.97])for(const z of [-.27,.27])put(cylinder,palette.metal,pose(x,.13,z,.035,.25,.035));
 box(0,.36,0,2.45,.30,.86,palette.sofa,.13);
 box(0,.84,-.30,2.39,.74,.26,palette.sofa,.10);
 for(const x of [-1.10,1.10])box(x,.61,0,.25,.63,.85,palette.sofa,.11);
 for(const x of [-.53,.53]){box(x,.57,.06,1.02,.20,.65,palette.sofaLight,.075);box(x,.93,-.15,.99,.52,.15,palette.sofaLight,.065);}
 shadow(0,0,2.9,1.65);loungeCollider(-1.27,1.27,-.48,.48);
 const tableX=0,tableZ=1.18;
 for(const x of [-.43,.43])for(const z of [tableZ-.23,tableZ+.23])put(cylinder,palette.metal,pose(x,.20,z,.025,.40,.025));
 box(tableX,.43,tableZ,1.24,.075,.70,palette.wood,.055);shadow(tableX,tableZ,1.65,1.10);loungeCollider(-.67,.67,tableZ-.39,tableZ+.39);
 box(-.20,.49,tableZ,.40,.045,.28,palette.paper,.002,.12);box(-.20,.514,tableZ,.41,.009,.29,palette.book,.002,.12);
 box(-.18,.54,tableZ+.02,.35,.038,.25,palette.paper,.002,-.08);box(-.18,.563,tableZ+.02,.36,.009,.26,palette.terracotta,.002,-.08);
 const cupProfile=[[0,0],[.035,0],[.042,.008],[.047,.075],[.043,.078],[.038,.015],[0,.012]].map(p=>new T.Vector2(...p));const cupGeometry=new T.LatheGeometry(cupProfile,32);put(cupGeometry,palette.cup,pose(.37,.472,tableZ+.07));cupGeometry.dispose();
 const handle=new T.TorusGeometry(.023,.006,8,20);put(handle,palette.cup,pose(.42,.514,tableZ+.07));handle.dispose();
 const saucer=new T.CylinderGeometry(.078,.077,.008,32);put(saucer,palette.cup,pose(.37,.474,tableZ+.07));saucer.dispose();
 // A modest vase pair follows the sofa frame and stays within the side gap.
 const vasePoints=[[0,0],[.10,0],[.13,.05],[.15,.22],[.10,.37],[.065,.45],[.062,.48],[.045,.48],[.045,.43],[.075,.35],[.12,.20],[.08,.04],[0,.04]].map(p=>new T.Vector2(...p));
 const vase=new T.LatheGeometry(vasePoints,40);put(vase,palette.darkPot,pose(1.49,.018,-.10));put(vase,palette.terracotta,pose(1.49,.018,.25,.78,.75,.78));vase.dispose();
 loungeCollider(1.31,1.68,-.28,.42);shadow(1.49,.07,.75,1.0);frame=null;

 for(const [material,pieces]of parts){
  const combined=mergeGeometries(pieces,false);for(const piece of pieces)piece.dispose();if(!combined)continue;geometries.add(combined);
  const mesh=new T.Mesh(combined,material);mesh.name='Decor_'+material.name;mesh.receiveShadow=true;mesh.castShadow=material!==shadowMaterial;mesh.raycast=noRaycast;mesh.userData={visualOnly:true,excludeFromProductBounds:true};root.add(mesh);
 }
 for(const [kind,instances]of foliage){
  const mesh=new T.InstancedMesh(leafGeometries[kind],palette[kind],instances.length);mesh.name='Feuillage_modele_'+kind;
  instances.forEach((instance,i)=>{mesh.setMatrixAt(i,instance.matrix);mesh.setColorAt(i,instance.color);});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.castShadow=false;mesh.raycast=noRaycast;mesh.userData={visualOnly:true,excludeFromProductBounds:true,botanicalLeaves:instances.length};root.add(mesh);
 }
 root.userData.plants=plants.map(p=>({...p}));root.userData.lounge={...lounge,colliders:loungeColliders.map(bounds=>({...bounds}))};root.updateMatrixWorld(true);
 function dispose(){if(disposed)return;disposed=true;for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures)texture.dispose();root.removeFromParent();}
 // Normal editor disposal follows the existing material lifecycle as well.
 palette.soil.addEventListener('dispose',dispose);
 return {root,colliders,prepareNear(){return !disposed;},dispose,diagnostics:()=>({plants:plants.length,interiorPlants:plants.filter(p=>!p.exterior).length,leaves:Array.from(foliage.values()).reduce((n,list)=>n+list.length,0),drawCalls:root.children.filter(o=>o.isMesh).length,disposed})};
}
