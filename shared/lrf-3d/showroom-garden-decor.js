import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const noRaycast=()=>{},up=new T.Vector3(0,1,0),identity=new T.Matrix4();
const DEFAULT_BOUNDS=Object.freeze({minX:14,maxX:32,minZ:-29,maxZ:-4});
const DEFAULT_POOL=Object.freeze({minX:20,maxX:28,minZ:-21,maxZ:-11});
const point=(x,y,z)=>new T.Vector3(x,y,z);
function randomSource(seed=713){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
function texture(kind){
 const size=128,random=randomSource(kind==='fabric'?293:kind==='wood'?751:19),data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4;
  if(kind==='contact'){
   const distance=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));data[i]=data[i+1]=data[i+2]=18;data[i+3]=Math.round(Math.max(0,1-distance)**1.9*110);continue;
  }
  const grain=kind==='wood'?Math.sin(x*.38+Math.sin(y*.06)*.9)*16+Math.sin(x*1.45+Math.sin(y*.12)*1.2)*7:kind==='fabric'?(x%2?9:-9)+(y%2?6:-6):Math.sin(x*.15+y*.12)*11;
  const v=Math.max(0,Math.min(255,128+grain+(random()-.5)*(kind==='stone'?39:13)));data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
 }
 const map=new T.DataTexture(data,size,size,T.RGBAFormat);map.name='Jardin_'+kind;map.wrapS=map.wrapT=kind==='contact'?T.ClampToEdgeWrapping:T.RepeatWrapping;map.repeat.set(kind==='contact'?1:kind==='fabric'?9:kind==='wood'?3:2,kind==='contact'?1:kind==='fabric'?18:kind==='wood'?.7:2);map.needsUpdate=true;return map;
}

// A closed, upholstered section swept along the real reclining profile. Its
// back, seat and foot are continuously curved surfaces, never image billboards.
function chaiseCushion(profile){
 const section=[[-.30,.014],[-.35,.004],[-.365,-.017],[-.365,-.053],[-.34,-.073],[-.29,-.08],[.29,-.08],[.34,-.073],[.365,-.053],[.365,-.017],[.35,.004],[.30,.014],[0,.034]],rows=42,columns=section.length,positions=[],uvs=[],indices=[];
 for(let row=0;row<=rows;row++){
  const t=row/rows,p=profile.getPointAt(t),tangent=profile.getTangentAt(t),normal=point(0,tangent.z,-tangent.y).normalize();
  for(const [x,v]of section){positions.push(x,p.y+normal.y*v,p.z+normal.z*v);uvs.push(x/.73+.5,t);}
 }
 for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){const next=(column+1)%columns,a=row*columns+column,b=row*columns+next,c=a+columns,d=b+columns;indices.push(a,b,c,b,d,c);}
 for(const row of [0,rows]){const center=positions.length/3,p=profile.getPointAt(row/rows);positions.push(0,p.y-.025,p.z);uvs.push(.5,row/rows);for(let column=0;column<columns;column++){const a=row*columns+column,b=row*columns+(column+1)%columns;indices.push(...(row===0?[center,b,a]:[center,a,b]));}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.userData={curvedChaise:true};return geometry;
}

/** Real-scale outdoor furniture and a native stone fountain. The garden host
 * owns the architecture, pool and tile choices. All supplied positions are in
 * the same coordinate system as its garden root; this module never rescales it. */
export function makeGardenDecor({layout={},onReady=()=>{}}={}){
 const bounds={...DEFAULT_BOUNDS,...layout.bounds},pool={...DEFAULT_POOL,...layout.poolBounds},floorY=Number.isFinite(layout.floorY)?layout.floorY:.018;
 const root=new T.Group();root.name='Jardin_mobilier_et_fontaine';root.userData={visualOnly:true,excludeFromProductBounds:true,gardenDecor:true};
 const geometries=new Set(),materials=new Set(),textures=new Set(),parts=new Map(),colliders=[],placements=[],ripples=[];
 let disposed=false,frame=identity.clone(),waterSurface=null,waterRest=null;
 const wood=texture('wood'),fabric=texture('fabric'),stone=texture('stone'),contact=texture('contact');for(const map of [wood,fabric,stone,contact])textures.add(map);
 const standard=(name,options)=>{const material=new T.MeshStandardMaterial(options);material.name=name;materials.add(material);return material;};
 const physical=(name,options)=>{const material=new T.MeshPhysicalMaterial(options);material.name=name;materials.add(material);return material;};
 const palette={
  teak:standard('Teck_huile_exterieur',{color:'#a07c50',roughness:.48,bumpMap:wood,bumpScale:.0009}),
  metal:standard('Aluminium_anthracite',{color:'#343c39',metalness:.73,roughness:.34}),
  linen:physical('Tissu_exterieur_lin',{color:'#d2c7b1',roughness:.96,bumpMap:fabric,bumpScale:.0015,sheen:.32,sheenColor:'#eee9da',sheenRoughness:.86}),
  olive:physical('Tissu_exterieur_olive',{color:'#7e8971',roughness:.96,bumpMap:fabric,bumpScale:.0015,sheen:.32,sheenColor:'#bec4b2',sheenRoughness:.86}),
  canopy:physical('Toile_parasol_ecrue',{color:'#d7ccb6',roughness:.98,bumpMap:fabric,bumpScale:.0008,side:T.DoubleSide,sheen:.2}),
  limestone:standard('Pierre_fontaine_sculptee',{color:'#a9a18d',roughness:.7,bumpMap:stone,bumpScale:.003}),
  basalt:standard('Pierre_sombre_bassin',{color:'#4c5854',roughness:.62,bumpMap:stone,bumpScale:.002}),
  ceramic:physical('Ceramique_table_emaillee',{color:'#b6a786',roughness:.22,clearcoat:.68,clearcoatRoughness:.16}),
  water:physical('Eau_fontaine',{color:'#6caaa5',roughness:.08,metalness:.16,clearcoat:1,clearcoatRoughness:.06,ior:1.333,transparent:true,opacity:.77,depthWrite:false}),
  jets:physical('Eau_jets_et_cascade',{color:'#c2e1d8',roughness:.12,metalness:.04,clearcoat:1,transparent:true,opacity:.64,depthWrite:false})
 };
 const shadowMaterial=new T.MeshBasicMaterial({map:contact,transparent:true,opacity:.73,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1});shadowMaterial.name='Jardin_ombres_de_contact';materials.add(shadowMaterial);
 function pose(x=0,y=0,z=0,sx=1,sy=1,sz=1,rotation=0){return new T.Matrix4().compose(point(x,y,z),new T.Quaternion().setFromAxisAngle(up,rotation),point(sx,sy,sz));}
 function put(geometry,material,matrix=identity){
  const piece=geometry.index?geometry.toNonIndexed():geometry.clone();for(const name of Object.keys(piece.attributes))if(!['position','normal','uv'].includes(name))piece.deleteAttribute(name);if(!piece.attributes.normal)piece.computeVertexNormals();if(!piece.attributes.uv)piece.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(piece.attributes.position.count*2),2));piece.applyMatrix4(matrix);piece.applyMatrix4(frame);
  const list=parts.get(material)||[];list.push(piece);parts.set(material,list);
 }
 function transient(geometry,material,matrix=identity){put(geometry,material,matrix);geometry.dispose();}
 function box(x,y,z,w,h,d,material=palette.teak,radius=.016,rotation=0){transient(new RoundedBoxGeometry(w,h,d,2,Math.min(radius,w/4,h/4,d/4)),material,pose(x,y,z,1,1,1,rotation));}
 function tube(points,radius,material=palette.metal,segments=20){const curve=points instanceof T.Curve?points:new T.CatmullRomCurve3(points.map(p=>point(...p)));transient(new T.TubeGeometry(curve,segments,radius,7,false),material);}
 function lathe(profile,material,x=0,y=0,z=0,segments=48){transient(new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),segments),material,pose(x,y,z));}
 function shadow(x,z,w,d){transient(new T.PlaneGeometry(w,d).rotateX(-Math.PI/2),shadowMaterial,pose(x,.003,z));}
 function footprint(kind,x,z,width,depth,rotation=0){
  const c=Math.cos(rotation),s=Math.sin(rotation),corners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([sx,sz])=>({x:x+c*sx*width/2+s*sz*depth/2,z:z-s*sx*width/2+c*sz*depth/2}));
  const collider={minX:Math.min(...corners.map(p=>p.x)),maxX:Math.max(...corners.map(p=>p.x)),minZ:Math.min(...corners.map(p=>p.z)),maxZ:Math.max(...corners.map(p=>p.z)),kind,gardenDecor:true};colliders.push(collider);return collider;
 }
 function inFrame(item,run){const previous=frame;frame=pose(item.x,floorY,item.z,1,1,1,item.rotation||0);run();frame=previous;}
 const loungerSpecs=layout.loungers??[20.6,23,25.4,27.8].map(x=>({x,z:pool.maxZ+3,rotation:0})).concat([{x:22.1,z:pool.minZ-4.3,rotation:Math.PI},{x:25.1,z:pool.minZ-4.3,rotation:Math.PI}]);
 for(const [index,item]of loungerSpecs.entries()){
  inFrame(item,()=>{
   const profile=new T.CatmullRomCurve3([point(0,.83,-.93),point(0,.72,-.7),point(0,.47,-.38),point(0,.35,-.06),point(0,.34,.35),point(0,.29,.75),point(0,.26,.99)],false,'centripetal');
   transient(chaiseCushion(profile),index%3===1?palette.olive:palette.linen);
   for(const x of [-.385,.385]){const rail=[];for(let step=0;step<=24;step++){const p=profile.getPointAt(step/24);rail.push([x,p.y-.105,p.z]);}tube(rail,.023,palette.teak,32);}
   for(const z of [-.48,.63])tube([[-.33,.31,z],[-.30,.045,z+.03],[.30,.045,z+.03],[.33,.31,z]],.018,palette.metal,12);
   for(const z of [-.61,-.26,.16,.54,.88])box(0,.22+(z<-.3?.11:0),z,.77,.038,.045,palette.teak,.009);
   const pillow=pose(0,.767,-.728,.29,.065,.20);pillow.multiply(new T.Matrix4().makeRotationX(.62));transient(new T.SphereGeometry(1,20,12),index%3===1?palette.linen:palette.olive,pillow);
   shadow(0,0,1.08,2.38);
  });
  footprint('garden-lounger',item.x,item.z,.84,2.04,item.rotation||0);placements.push({kind:'lounger',...item,width:.84,depth:2.04,curved:true});
 }
 const tableSpecs=layout.tables??[{x:21.8,z:pool.maxZ+3,radius:.25},{x:26.6,z:pool.maxZ+3,radius:.25},{x:23.6,z:pool.minZ-4.3,radius:.30}];
 for(const item of tableSpecs){const radius=item.radius||.26;inFrame(item,()=>{lathe([[0,0],[.11,0],[.15,.035],[.105,.09],[.075,.35],[radius,.39],[radius,.435],[radius-.018,.45],[0,.45]],palette.ceramic);shadow(0,0,radius*3,radius*3);});footprint('garden-table',item.x,item.z,radius*2,radius*2,item.rotation||0);placements.push({kind:'table',...item,radius});}
 function parasol(item){
  const radius=item.radius||1.38,height=item.height||2.65;
  const overlaps=colliders.some(b=>item.x+.43>b.minX&&item.x-.43<b.maxX&&item.z+.43>b.minZ&&item.z-.43<b.maxZ),outward=item.x<(pool.minX+pool.maxX)/2?-1:1;
  // A canopy above a lounger uses a real cantilever mast and an offset ballast
  // base. Its support cannot pass through the upholstered seating underneath.
  const base=item.base&&Number.isFinite(item.base.x)&&Number.isFinite(item.base.z)?item.base:{x:item.x+(overlaps?outward*1.55:0),z:item.z},dx=base.x-item.x,dz=base.z-item.z,c=Math.cos(item.rotation||0),s=Math.sin(item.rotation||0),baseX=c*dx-s*dz,baseZ=s*dx+c*dz,cantilever=Math.hypot(dx,dz)>.01;
  inFrame(item,()=>{
   lathe([[0,0],[.37,0],[.40,.035],[.37,.11],[.31,.14],[0,.14]],palette.basalt,baseX,0,baseZ);
   if(cantilever)tube([[baseX,.13,baseZ],[baseX,height*.77,baseZ],[baseX*.83,height+.16,baseZ*.83],[baseX*.35,height+.24,baseZ*.35],[0,height+.08,0]],.035,palette.metal,25);
   else transient(new T.CylinderGeometry(.027,.031,height,16),palette.metal,pose(0,height/2,0));
   const positions=[],uvs=[],indices=[],rings=7,sides=64;
   for(let ring=0;ring<=rings;ring++)for(let side=0;side<=sides;side++){
    const t=ring/rings,a=side/sides*Math.PI*2,r=radius*t,scallop=Math.cos(a*8)*.018*t*t,y=height-.31*t**.7-.08*t*t+scallop;positions.push(Math.cos(a)*r,y,Math.sin(a)*r);uvs.push((Math.cos(a)*t+1)/2,(Math.sin(a)*t+1)/2);
   }
   for(let ring=0;ring<rings;ring++)for(let side=0;side<sides;side++){const a=ring*(sides+1)+side,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();transient(g,palette.canopy);
   for(let i=0;i<8;i++){const angle=i/8*Math.PI*2;const rib=[];for(let j=0;j<=6;j++){const t=j/6;rib.push([Math.cos(angle)*radius*t,height-.025-.31*t**.7-.08*t*t,Math.sin(angle)*radius*t]);}tube(rib,.008,palette.metal,10);}
   transient(new T.SphereGeometry(.06,16,8),palette.teak,pose(0,height+.025,0,1,.65,1));shadow(baseX,baseZ,.95,.95);
  });
  footprint('garden-parasol-base',base.x,base.z,.81,.81);placements.push({kind:'parasol',...item,radius,height,base:{...base},cantilever});
 }
 for(const item of layout.parasols??[{x:29.5,z:pool.maxZ+2.7,radius:1.45}])parasol(item);
 const pergola=layout.pergola===null?null:{x:23.6,z:pool.minZ-4.6,width:6.7,depth:3.4,height:2.75,...layout.pergola};
 if(pergola){
  inFrame(pergola,()=>{
   for(const x of [-pergola.width/2,pergola.width/2])for(const z of [-pergola.depth/2,pergola.depth/2])box(x,pergola.height/2,z,.13,pergola.height,.13,palette.teak,.013);
   for(const z of [-pergola.depth/2,pergola.depth/2])box(0,pergola.height,z,pergola.width+.25,.20,.13,palette.teak,.012);
   const count=Math.ceil(pergola.width/.27);for(let i=0;i<=count;i++)box(-pergola.width/2+i/count*pergola.width,pergola.height+.14,0,.055,.14,pergola.depth+.40,palette.teak,.007);
  });
  const c=Math.cos(pergola.rotation||0),s=Math.sin(pergola.rotation||0);for(const x of [-pergola.width/2,pergola.width/2])for(const z of [-pergola.depth/2,pergola.depth/2])footprint('garden-pergola-post',pergola.x+c*x+s*z,pergola.z-s*x+c*z,.15,.15,pergola.rotation||0);
  placements.push({kind:'pergola',...pergola});
 }
 const fountain=layout.fountain===null?null:{x:17.2,z:pool.minZ-3,radius:1.10,...layout.fountain};
 if(fountain){
  const radius=fountain.radius;
  inFrame(fountain,()=>{
   lathe([[0,0],[radius*.84,0],[radius,.09],[radius,.30],[radius-.06,.36],[radius-.13,.36],[radius-.16,.29],[radius-.17,.13],[0,.13]],palette.basalt);
   box(-.14,.74,-.14,.37,1.18,.36,palette.limestone,.035,-.12);box(.16,.54,.05,.24,.77,.33,palette.limestone,.028,.16);
   box(-.11,1.33,-.14,.61,.075,.46,palette.limestone,.025);box(-.11,1.372,-.14,.34,.009,.28,palette.jets,.003);
   // A real transparent sheet falls from the stone lip into the water basin.
   const sheet=new T.PlaneGeometry(.31,1.08,5,12);sheet.translate(-.11,.82,.105);transient(sheet,palette.jets);
   for(let i=0;i<5;i++){
    const angle=i/5*Math.PI*2,start=point(Math.cos(angle)*radius*.64,.29,Math.sin(angle)*radius*.64),end=point(Math.cos(angle)*.22,.30,Math.sin(angle)*.22),mid=start.clone().lerp(end,.47);mid.y=.85;
    tube(new T.QuadraticBezierCurve3(start,mid,end),.012,palette.jets,22);
   }
   shadow(0,0,radius*2.7,radius*2.7);
  });
  footprint('garden-fountain',fountain.x,fountain.z,radius*2,radius*2);placements.push({kind:'fountain',...fountain});
  const g=new T.CircleGeometry(radius-.16,64);g.rotateX(-Math.PI/2);geometries.add(g);waterRest=g.attributes.position.array.slice();waterSurface=new T.Mesh(g,palette.water);waterSurface.name='Fontaine_eau_surface';waterSurface.position.set(fountain.x,floorY+.272,fountain.z);waterSurface.receiveShadow=true;waterSurface.raycast=noRaycast;waterSurface.userData={visualOnly:true,excludeFromProductBounds:true,gardenWater:true};root.add(waterSurface);
  for(let i=0;i<3;i++){
   const material=new T.MeshBasicMaterial({color:'#d8ece0',transparent:true,opacity:.18,depthWrite:false,toneMapped:false});materials.add(material);const geometry=new T.TorusGeometry(.28,.004,3,48);geometry.rotateX(-Math.PI/2);geometries.add(geometry);const ring=new T.Mesh(geometry,material);ring.name='Fontaine_onde_'+i;ring.position.set(fountain.x-.08,floorY+.278,fountain.z+.20);ring.raycast=noRaycast;ring.userData={visualOnly:true,excludeFromProductBounds:true,gardenWater:true};root.add(ring);ripples.push(ring);
  }
 }
 for(const [material,pieces]of parts){
  const geometry=mergeGeometries(pieces,false);for(const piece of pieces)piece.dispose();if(!geometry)continue;geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.add(geometry);
  const mesh=new T.Mesh(geometry,material);mesh.name='Jardin_'+material.name;mesh.castShadow=material!==shadowMaterial&&!material.transparent;mesh.receiveShadow=material!==shadowMaterial;mesh.raycast=noRaycast;mesh.userData={visualOnly:true,excludeFromProductBounds:true,gardenDecor:true};root.add(mesh);
 }
 root.userData.placements=placements.map(p=>({...p}));root.updateMatrixWorld(true);onReady();
 function update(timeSeconds=0){
  if(disposed||!root.visible||!waterSurface)return false;const time=Number.isFinite(timeSeconds)?timeSeconds:0,positions=waterSurface.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){const x=waterRest[i*3],z=waterRest[i*3+2];positions.setY(i,.0018*Math.sin(x*13+z*8+time*1.9)+.0012*Math.sin(z*19-x*7-time*1.2));}positions.needsUpdate=true;
  for(let i=0;i<ripples.length;i++){const t=((time*.32+i/3)%1+1)%1;const scale=.35+t*1.65;ripples[i].scale.set(scale,1,scale);ripples[i].material.opacity=.18*(1-t);}
  return true;
 }
 function prepareNear(position){if(disposed)return false;if(position&&Number.isFinite(position.x)&&Number.isFinite(position.z)){const dx=Math.max(bounds.minX-position.x,0,position.x-bounds.maxX),dz=Math.max(bounds.minZ-position.z,0,position.z-bounds.maxZ);root.visible=Math.hypot(dx,dz)<65;}return root.visible;}
 function dispose(){if(disposed)return;disposed=true;for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const map of textures)map.dispose();root.removeFromParent();}
 function diagnostics(){let drawCalls=0,triangles=0;root.traverseVisible(o=>{if(o.isMesh){drawCalls++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return {loungers:loungerSpecs.length,curvedLoungers:loungerSpecs.length,tables:placements.filter(p=>p.kind==='table').length,parasols:placements.filter(p=>p.kind==='parasol').length,pergolas:pergola?1:0,fountains:fountain?1:0,waterJets:fountain?5:0,drawCalls,triangles,colliders:colliders.length,placements:placements.map(p=>({...p})),disposed};}
 return {root,colliders,update,prepareNear,dispose,diagnostics};
}
