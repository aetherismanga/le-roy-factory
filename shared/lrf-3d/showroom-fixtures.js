import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {makeModel} from '../../studio-one/src/model.js';
import {makeColumn,COLUMN_SPEC} from '../../studio-one/src/column.js';
import {makeFixture,setBathData} from '../../studio-one/src/fixtures.js';
import {FINISHES} from '../../studio-one/src/finishes.js';
import {makeCatalogueMirror,mirrorGeometry} from './mirrors.js';
import {makeTap,tapsFor,AQUAHOME} from './taps.js';
import {makeEquipment} from './equipment.js';
import {SHOWROOM_MANUFACTURERS} from './showroom-catalog.js';
import {loadQueuedTexture,surfaceAssetURL} from './texture-loader.js';

const noRaycast=()=>{};
const SITE='https://leroyfactory.fr/';
const studioImage='https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/2-tiroirs.webp';
const randal=SHOWROOM_MANUFACTURERS.find(m=>m.id==='randal-pro');
const aqua=SHOWROOM_MANUFACTURERS.find(m=>m.id==='aquahome');
const canonicalStudio=Object.freeze({id:'randal-studio-one',name:'STUDIO ONE',image:studioImage,hdImage:studioImage,href:SITE+'studio-one-configurateur.html',formats:['80 · 100 · 120 cm','Colonne 38 × 132 × 27 cm'],description:'Mobilier RANDAL STUDIO ONE issu du moteur natif. Équipements de salle de bains et robinetterie AQUA HOME présentés en ambiance.'});
const nativeStudioEntry=()=>({manufacturer:randal,collection:canonicalStudio});
const key=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const tapEntry=product=>({manufacturer:aqua,collection:aqua.collections.find(c=>key(c.name)===key(product.collection))||{id:'aquahome-'+product.reference,name:product.collection,image:aqua.logo,href:SITE+'aquahome-catalogue-interactif.html?ref='+product.reference,formats:[product.name,product.finish],reference:product.reference}});

function shadowMap(){
 const edge=64,data=new Uint8Array(edge*edge*4);
 for(let y=0;y<edge;y++)for(let x=0;x<edge;x++){const r=Math.hypot((x+.5-edge/2)/(edge/2),(y+.5-edge/2)/(edge/2)),i=(y*edge+x)*4;data[i]=data[i+1]=data[i+2]=19;data[i+3]=Math.round(Math.max(0,1-r)**1.8*105);}
 const map=new T.DataTexture(data,edge,edge,T.RGBAFormat);map.needsUpdate=true;return map;
}

/** Actual native catalogue geometry. The furniture remains a staged RANDAL
 * composition even on a tile-brand booth; no RANDAL shape is relabelled Neobath
 * or OPAL. Everything is visual-only and excluded from saved project items. */
export function makeShowroomFixtures({stands=[],onReady=()=>{},loadTexture=loadQueuedTexture,bathData=null,floorY=.012}={}){
 const root=new T.Group();root.name='Ambiances_salles_de_bains_et_robinetterie';root.userData={visualOnly:true,excludeFromProductBounds:true};
 if(bathData)setBathData(bathData);
 const colliders=[],stations=[],textures=new Set(),materials=new Set(),geometries=new Set(),materialPool=new Map(),sourceMaterials=new WeakMap(),finishes=new Map();
 let disposed=false,bathTask=null;const abort=new AbortController();
 const contact=shadowMap();textures.add(contact);
 const shadow=new T.MeshBasicMaterial({map:contact,color:'#ffffff',transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});materials.add(shadow);
 const bronze=new T.MeshStandardMaterial({color:'#9e845b',metalness:.75,roughness:.32}),stone=new T.MeshStandardMaterial({color:'#2c3534',roughness:.7}),paper=new T.MeshStandardMaterial({color:'#d7cbb6',roughness:.9});
 for(const m of [bronze,stone,paper])materials.add(m);
 function box(parent,w,h,d,x,y,z,material,name){const geometry=new RoundedBoxGeometry(w,h,d,2,Math.min(.006,w/6,h/6,d/6));const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.name=name;parent.add(mesh);return mesh;}
 const collider=(x,z,width,depth,kind)=>colliders.push({minX:x-width/2,maxX:x+width/2,minZ:z-depth/2,maxZ:z+depth/2,kind});
 function materialSignature(m){return JSON.stringify([m.type,m.color?.getHexString(),m.roughness,m.metalness,m.clearcoat,m.clearcoatRoughness,m.transmission,m.thickness,m.ior,m.side,m.transparent,m.opacity,m.depthWrite,m.emissive?.getHexString(),m.emissiveIntensity,m.map?.uuid,m.bumpMap?.uuid,m.bumpScale,m.userData?.fixtureFinish]);}
 function ownMaterial(original){
  if(materials.has(original))return original;if(sourceMaterials.has(original))return sourceMaterials.get(original);
  const signature=materialSignature(original);let owned=materialPool.get(signature);
  if(!owned){owned=original.clone();for(const slot of ['map','bumpMap','normalMap','roughnessMap','metalnessMap','alphaMap','aoMap','emissiveMap'])if(original[slot]){owned[slot]=original[slot].clone();textures.add(owned[slot]);}materials.add(owned);materialPool.set(signature,owned);}
  sourceMaterials.set(original,owned);return owned;
 }
 function normalizedGeometry(source){
  const g=source.index?source.toNonIndexed():source.clone();for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
  if(!g.attributes.normal)g.computeVertexNormals();if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g;
 }
 function flatten(bundle,entry,name){
  bundle.updateMatrixWorld(true);const inverse=bundle.matrixWorld.clone().invert(),batches=new Map();
  bundle.traverseVisible(object=>{
   if(!object.isMesh||Array.isArray(object.material))return;
   const material=ownMaterial(object.material),parts=batches.get(material)||[];
   const matrix=new T.Matrix4().multiplyMatrices(inverse,object.matrixWorld);
   if(object.isInstancedMesh){const instance=new T.Matrix4();for(let i=0;i<object.count;i++){object.getMatrixAt(i,instance);const geometry=normalizedGeometry(object.geometry);geometry.applyMatrix4(matrix.clone().multiply(instance));parts.push(geometry);}}
   else{const geometry=normalizedGeometry(object.geometry);geometry.applyMatrix4(matrix);parts.push(geometry);}
   batches.set(material,parts);
  });
  const group=new T.Group();group.name=name;group.userData={visualOnly:true,excludeFromProductBounds:true,showroomCollection:entry,nativeGeometry:true};
  for(const [material,parts]of batches){const geometry=mergeGeometries(parts,false);for(const part of parts)part.dispose();if(!geometry)continue;geometries.add(geometry);geometry.computeBoundingBox();geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,material);mesh.name='Exposition_native_'+name;mesh.castShadow=!material.transparent;mesh.receiveShadow=true;mesh.raycast=noRaycast;mesh.userData={visualOnly:true,excludeFromProductBounds:true,nativeGeometry:true,showroomCollection:entry};group.add(mesh);}
  // Factories may use shared caches in the future. Only cloned, staged geometry
  // and materials are owned/disposed here; originals are never modified/disposed.
  return group;
 }
 function label(parent,text,x,y,z,w=1.3){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.fillStyle='#ede5d5';ctx.fillRect(0,0,512,80);ctx.fillStyle='#303b34';ctx.font='500 27px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,40,480);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;textures.add(map);const mat=new T.MeshBasicMaterial({map,toneMapped:false});materials.add(mat);
  const g=new T.PlaneGeometry(w,.19);geometries.add(g);const object=new T.Mesh(g,mat);object.position.set(x,y,z);object.raycast=noRaycast;object.name='Etiquette_'+text;object.userData={visualOnly:true,excludeFromProductBounds:true};parent.add(object);
 }
 function contactPlane(parent,x,z,width,depth){const object=new T.Mesh(new T.PlaneGeometry(width,depth),shadow);object.rotation.x=-Math.PI/2;object.position.set(x,.002,z);object.name='Ombre_de_contact_ambiance';object.castShadow=false;parent.add(object);}
 function registerFinish(asset,id){
  const finish=FINISHES.find(f=>f.id===id)||FINISHES[0];asset.wood.color.set(finish.hex);asset.frontWood.color.set(finish.hex);asset.wood.roughness=asset.frontWood.roughness=finish.roughness;
  asset.wood.userData.fixtureFinish=id+':body';asset.frontWood.userData.fixtureFinish=id+':front';
  return finish;
 }
 function finishTargets(finish,asset){
  if(finish.kind!=='Bois')return;
  let record=finishes.get(finish.id);if(!record){record={finish,body:new Set(),front:new Set(),loaded:false,task:null,maps:null};finishes.set(finish.id,record);}
  for(const [role,original]of [['body',asset.wood],['front',asset.frontWood]]){const material=sourceMaterials.get(original);if(material){record[role].add(material);if(record.maps){material.map=record.maps[role];material.color.set('#ffffff');material.needsUpdate=true;}}}
 }
 async function loadFinish(record){
  if(disposed||record.loaded)return false;if(record.task)return record.task;
  if(loadTexture===loadQueuedTexture&&typeof Image==='undefined')return false;
  record.task=Promise.resolve().then(()=>loadTexture(surfaceAssetURL(record.finish.textureVariants?.balanced||record.finish.texture),{signal:abort.signal,maxDimension:1024})).then(map=>{
   if(disposed){map.dispose();return false;}
   map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;map.repeat.set(...record.finish.textureRepeat);map.needsUpdate=true;const front=map.clone();front.center.set(.5,.5);front.rotation=record.finish.frontRotation||0;front.repeat.set(...record.finish.frontRepeat);front.needsUpdate=true;textures.add(map);textures.add(front);record.maps={body:map,front};
   for(const role of ['body','front'])for(const material of record[role]){material.map=record.maps[role];material.color.set('#ffffff');material.needsUpdate=true;}
   record.loaded=true;onReady();return true;
  }).catch(()=>false);return record.task;
 }
 function nativeBasinTap(model,product){for(const faucet of model.faucets)faucet.visible=false;const root=makeTap(product);root.position.set(0,model.spec.bottom+model.spec.height+.018,-.173);root.userData.showroomCollection=tapEntry(product);return root;}
 function makeVanity(width,index,{column=true,side=index%2===0?-1:1}={}){
  const format=['two','three','two','one-xl','two-xl','two'][index%6],model=makeModel({width:width/100,format,includeMirror:false}),finish=registerFinish(model,['NOGAL','AZUL','ROBLE','GRIS','BISC','NOGAL'][index%6]);
  const bundle=new T.Group();bundle.add(model.root);
  if(column){const item=makeColumn();item.root.position.x=side*1.3;item.root.traverse(o=>{if(o.material===item.wood)o.material=model.wood;else if(o.material===item.frontWood)o.material=model.frontWood;});bundle.add(item.root);}
  const mirrorModel=['capsule','round','metal-rect','ilse','zen','basic'][index%6],settings={mirrorModel,width:mirrorModel==='capsule'?45:mirrorModel==='round'?60:width===120?120:80,height:mirrorModel==='capsule'?90:mirrorModel==='round'?60:mirrorModel==='metal-rect'?60:80,mirrorFinish:index%2?'Doré':'Noir',led:['capsule','ilse','zen'].includes(mirrorModel)},mirror=makeCatalogueMirror(settings);
  mirror.root.position.y=1.43+Math.max(0,model.spec.bottom+model.spec.height-.82)*.45;const face=new T.Mesh(mirrorGeometry(settings,.018),new T.MeshPhysicalMaterial({color:'#bcc9c7',metalness:1,roughness:.045,envMapIntensity:1.2}));face.name='Face_miroir_reflet_environnement';face.position.z=.012;mirror.root.add(face);bundle.add(mirror.root);
  const product=tapsFor('basin').find(p=>p.collection===['Bel Air','Flip','Oporto'][index%3]&&p.finish===['Chrome brillant','Or brossé','Noir mat'][index%3])||tapsFor('basin')[0];bundle.add(nativeBasinTap(model,product));
  const top=model.spec.bottom+model.spec.height+.018;box(bundle,.15,.025,.12,-width/200+.105,top+.0125,.06,paper,'Linge_plie_sur_plan');const dispenser=new T.Mesh(new T.CylinderGeometry(.026,.029,.112,24),bronze);dispenser.name='Distributeur_sur_plan';dispenser.position.set(width/200-.075,top+.056,.06);bundle.add(dispenser);
  const group=flatten(bundle,nativeStudioEntry(),'RANDAL_STUDIO_ONE_'+width+'_'+finish.id);finishTargets(finish,model);return {group,spec:model.spec,finish};
 }
 function tryBath(){try{return makeFixture('bath',{kind:'island',width:170,depth:80,metal:'Chrome brillant'});}catch{return null;}}
 function completeBath(station){
  const bath=tryBath();if(!bath)return false;const part=new T.Group();part.add(bath.root);const product=AQUAHOME.find(p=>p.use==='island'&&p.finish==='Or brossé')||AQUAHOME.find(p=>p.use==='island');if(product){const tap=makeTap(product);const bounds=new T.Box3().setFromObject(tap);tap.position.set(-station.side*1.02,-bounds.min.y,-.10-bounds.min.z);part.add(tap);}
  const group=flatten(part,nativeStudioEntry(),'Baignoire_ilot_170x80_et_mitigeur');group.position.set(station.side*7.35,floorY,station.back+.32);(station.detail||station.group).add(group);station.bathBuilt=true;if(station.detail)refreshOverview(station);return true;
 }
 async function ensureBathData(){
  if(bathTask)return bathTask;if(typeof Image==='undefined')return false;
  bathTask=fetch('assets/bathroom/baths.json',{signal:abort.signal}).then(response=>{if(!response.ok)throw Error('Baignoire native indisponible');return response.json();}).then(data=>{if(disposed)return false;setBathData(data);for(const station of stations)if(station.built&&station.kind==='bathroom'&&station.bath&&!station.bathBuilt)completeBath(station);onReady();return true;}).catch(()=>false);return bathTask;
 }
 function makeShower(station){
  const tray=makeFixture('shower',{width:120,depth:90,trayColor:'anthracite'}),bundle=new T.Group();bundle.add(tray.root);
  const product=AQUAHOME.find(p=>p.use==='shower'&&p.reference==='540000018')||AQUAHOME.find(p=>p.use==='shower');const column=makeEquipment('tap',{use:'shower',tap:product.reference});column.root.userData.showroomCollection=tapEntry(product);bundle.add(column.root);
  const screen=makeEquipment('screen',{width:100,screen:'fixed',metal:'Noir mat'});screen.root.position.z=.89;screen.root.traverse(o=>{if(o.material?.userData.architecturalGlass){o.material.transmission=0;o.material.opacity=.14;o.material.depthWrite=false;o.material.transparent=true;o.castShadow=false;}});bundle.add(screen.root);
  const group=flatten(bundle,tapEntry(product),'Douche_120x90_et_colonne_AQUAHOME');group.position.set(station.side*7.35,floorY,station.back+.27);station.group.add(group);
 }
 function makeTapBar(station){
  const bundle=new T.Group();box(bundle,4.15,.98,.58,0,.49,0,stone,'Comptoir_robinetterie');box(bundle,4.25,.045,.65,0,1.0025,0,paper,'Plan_presentoir_mitigeurs');for(const x of [-1.8,1.8])box(bundle,.04,.06,.60,x,.04,0,bronze,'Pied_presentoir');
  contactPlane(bundle,0,.04,4.4,.9);const stand=flatten(bundle,{manufacturer:aqua,collection:aqua.collections[0]},'Presentoir_mitigeurs_AQUAHOME');stand.position.set(station.center,floorY,station.back+1.10);station.group.add(stand);
  const products=[];for(const collection of ['Bel Air','Flip','New Twist','Oporto']){const finish=['Chrome brillant','Or brossé','Noir mat','Inox brossé'][products.length],product=AQUAHOME.find(p=>p.use==='basin'&&p.collection===collection&&p.finish===finish)||AQUAHOME.find(p=>p.use==='basin'&&p.collection===collection);if(product)products.push(product);}
  for(const [index,product]of products.entries()){const tap=makeTap(product),raw=new T.Group();raw.add(tap);const merged=flatten(raw,tapEntry(product),'Mitigeur_'+product.reference);merged.position.set(station.center-1.5+index,1.04+floorY,station.back+.98);station.group.add(merged);label(station.group,product.collection+' · '+product.finish,station.center-1.5+index,.86+floorY,station.back+1.41,.88);}
  station.references=products.map(p=>p.reference);
 }
 function overviewFor(station){
  const previousDetail=station.detail?.visible;if(station.detail)station.detail.visible=true;
  const overviewEntry=station.kind==='tapbar'?{manufacturer:aqua,collection:aqua.collections[0]}:nativeStudioEntry();
  const overview=new T.Group();overview.name='Exposition_vue_ensemble';overview.userData={visualOnly:true,excludeFromProductBounds:true,nativeGeometry:true,showroomCollection:overviewEntry};
  station.group.updateMatrixWorld(true);const inverse=station.group.matrixWorld.clone().invert(),opaque=[],transparent=new Map();
  station.group.traverseVisible(object=>{if(!object.isMesh)return;const geometry=normalizedGeometry(object.geometry);geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,object.matrixWorld));
   if(object.material.transparent){const list=transparent.get(object.material)||[];list.push(geometry);transparent.set(object.material,list);return;}
   const colors=new Float32Array(geometry.attributes.position.count*3),color=object.material.color||new T.Color('#ffffff');for(let i=0;i<geometry.attributes.position.count;i++)colors.set([color.r,color.g,color.b],i*3);geometry.setAttribute('color',new T.BufferAttribute(colors,3));opaque.push(geometry);
  });
  const overviewMaterial=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.52,metalness:.12});materials.add(overviewMaterial);
  const add=(parts,material)=>{if(!parts.length)return;const geometry=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());if(!geometry)return;geometries.add(geometry);const mesh=new T.Mesh(geometry,material);mesh.name='Silhouette_native_optimisee';mesh.castShadow=!material.transparent;mesh.receiveShadow=true;mesh.raycast=noRaycast;mesh.userData={visualOnly:true,excludeFromProductBounds:true,nativeGeometry:true,showroomCollection:overviewEntry,...(station.kind==='tapbar'?{showroomAction:{kind:'catalogue',manufacturerId:'aquahome'}}:{})};overview.add(mesh);};
  add(opaque,overviewMaterial);for(const [material,parts]of transparent)add(parts,material);if(station.detail)station.detail.visible=previousDetail;return overview;
 }
 function refreshOverview(station){if(station.overview){station.overview.removeFromParent();station.overview.traverse(o=>{if(o.isMesh){o.geometry.dispose();geometries.delete(o.geometry);}});}station.overview=overviewFor(station);station.overview.visible=!station.detailWanted;station.group.add(station.overview);}
 function buildStation(station){
  if(disposed||station.built)return false;station.built=true;
  if(station.kind==='tapbar')makeTapBar(station);
  else if(station.kind==='gallery'){
   for(let i=0;i<3;i++){const native=makeVanity([80,100,120][i],i,{column:false});native.group.position.set(station.center-1.6+i*1.6,floorY,station.back+.27);station.group.add(native.group);}
   label(station.group,'RANDAL · STUDIO ONE',station.center,2.1,station.back+.07,2.4);
  }else{
   const native=makeVanity(station.width,station.index,{side:station.side});native.group.position.set(station.side*4.7,floorY,station.back+.27);station.group.add(native.group);
   const shadowBundle=new T.Group();contactPlane(shadowBundle,0,.01,station.width/100+.30,.75);const ao=flatten(shadowBundle,nativeStudioEntry(),'Ombre_contact_meuble');ao.position.set(station.side*4.7,floorY,station.back+.50);station.group.add(ao);
   if(station.bath){if(!completeBath(station))ensureBathData();}else makeShower(station);
   label(station.group,'Ambiance · RANDAL STUDIO ONE',station.side*4.7,1.09,station.back+.075,2.1);
  }
  station.group.traverse(o=>{if(o.isMesh)o.raycast=noRaycast;});
  // The same native silhouettes survive at distance in one colour-baked batch.
  // Close views retain the exact physical materials, metal finishes and wood maps.
  station.overview=overviewFor(station);station.detail=new T.Group();station.detail.name='Exposition_detail_native';for(const child of [...station.group.children])station.detail.add(child);station.group.add(station.detail,station.overview);station.detail.visible=station.detailWanted!==false;station.overview.visible=!station.detail.visible;
  onReady();return true;
 }
 function stationFor(stand,index,kind){
  const bounds=stand.bounds,front=stand.front??bounds.maxZ,back=stand.back??bounds.minZ,center=(bounds.minX+bounds.maxX)/2,side=center<0?-1:1,group=new T.Group();group.name='Ambiance_'+stand.manufacturer.id;group.userData={visualOnly:true,excludeFromProductBounds:true};root.add(group);
  const record={stand,index,kind,front,back,center,side,group,built:false,bath:index%2===0,bathBuilt:false,width:[100,120,80,100,120,80][index%6],bounds};stations.push(record);
  if(kind==='tapbar')collider(center,back+1.1,4.25,.65,'tap-display');
  else if(kind==='gallery')for(let i=0;i<3;i++)collider(center-1.6+i*1.6,back+.27,[.806,1.006,1.206][i],.48,'cabinet');
  else{collider(side*4.7,back+.27,record.width/100+.01,.48,'cabinet');collider(side*6.0,back+.17,COLUMN_SPEC.width,COLUMN_SPEC.depth,'column');collider(side*7.35,back+.49,record.bath?1.7:1.2,record.bath?.8:.92,record.bath?'bath':'shower');}
  return record;
 }
 for(const [index,stand]of stands.entries())if(index<6)stationFor(stand,index,'bathroom');
 const randalStand=stands.find(s=>s.manufacturer.id==='randal-pro');if(randalStand&&!stations.some(s=>s.stand===randalStand))stationFor(randalStand,9,'gallery');
 const aquaStand=stands.find(s=>s.manufacturer.id==='aquahome');if(aquaStand&&!stations.some(s=>s.stand===aquaStand))stationFor(aquaStand,12,'tapbar');
 // A second genuine tap display is visible from arrival, before the supplier
 // booth further down the salon. It occupies the free left reception band.
 if(aquaStand)stationFor({...aquaStand,front:-3.7,back:-5.6,bounds:{minX:-9.4,maxX:-1.9,minZ:-5.6,maxZ:-3.7}},12,'tapbar');
 function distance(station,position){const b=station.bounds,dx=Math.max(b.minX-position.x,0,position.x-b.maxX),dz=Math.max(b.minZ-position.z,0,position.z-b.maxZ);return Math.hypot(dx,dz);}
 function scheduleBuild(station){
  if(station.pending)return station.pending;
  station.pending=new Promise(resolve=>{const run=()=>{buildStation(station);resolve(!disposed);};if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:180});else run();});return station.pending;
 }
 function prepareNear(position){
  if(disposed)return Promise.resolve(false);const jobs=[];
  for(const station of stations){const reach=distance(station,position),focus=Math.hypot(station.center-position.x,station.back+.8-position.z);station.group.visible=reach<23;station.detailWanted=focus<(station.kind==='tapbar'?5:8.5);if(station.detail){station.detail.visible=station.detailWanted;station.overview.visible=!station.detailWanted;}if(reach<18&&!station.built)jobs.push(scheduleBuild(station));}
  return Promise.all(jobs).then(()=>Promise.all([...finishes.values()].map(loadFinish))).then(()=>!disposed);
 }
 function dispose(){if(disposed)return;disposed=true;abort.abort();for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();for(const geometry of geometries)geometry.dispose();root.removeFromParent();}
 const diagnostics=()=>{let visibleBatches=0,triangles=0;root.traverseVisible(o=>{if(o.isMesh){visibleBatches++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return {stations:stations.length,bathroomVignettes:stations.filter(s=>s.kind==='bathroom').length,nativeVanities:stations.reduce((n,s)=>n+(s.built?(s.kind==='gallery'?3:s.kind==='bathroom'?1:0):0),0),baths:stations.filter(s=>s.bathBuilt).length,showers:stations.filter(s=>s.built&&s.kind==='bathroom'&&!s.bath).length,tapBars:stations.filter(s=>s.built&&s.kind==='tapbar').length,built:stations.filter(s=>s.built).length,visibleBatches,triangles,finishTextures:[...finishes.values()].filter(f=>f.loaded).length,disposed};};
 return {root,colliders,stations,prepareNear,dispose,diagnostics};
}
