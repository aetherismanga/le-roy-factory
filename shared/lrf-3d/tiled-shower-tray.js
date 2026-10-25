import * as T from 'three';
import {createSurface,tiledPolygonGeometry} from './room.js';
import {COLLECTIONS,formatsForColor,normalizeLayout} from './surface-catalog.js';
import {selectedFormat} from './surface-picker.js';
import {METAL_FINISHES,metalMaterial} from './taps.js';
import {canonicalSurfaceIdentity,commercialSurfaceOptions} from './surface-identity.mjs';
import commercialSurfaces from './commercial-surfaces.json' with {type:'json'};
import clipping from './polygon-clipping.mjs';
import {geometryArea} from './plan-topology.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const rectangle=(w,h)=>[[0,0],[w,0],[w,h],[0,h]];
const profileAliases={Argent:'Chrome brillant',Noir:'Noir mat',Doré:'Or brossé',Bronze:'Cuivre'};
export const isTiledShowerTray=settings=>settings?.trayType==='tile';
export const trayCoveringMode=settings=>['inherit','all','split'].includes(settings?.trayCovering?.mode)?settings.trayCovering.mode:'inherit';
export const traySurfaceFinish=(settings,part,floorFinish={})=>trayCoveringMode(settings)==='inherit'?floorFinish:part!=='top'&&trayCoveringMode(settings)==='split'?settings.trayCovering.reveal:settings.trayCovering.top;
export function collectTrayFinishes(items=[]){return items.filter(item=>item.type==='shower'&&isTiledShowerTray(item.settings)).flatMap(item=>trayCoveringMode(item.settings)==='all'?[item.settings.trayCovering.top]:trayCoveringMode(item.settings)==='split'?[item.settings.trayCovering.top,item.settings.trayCovering.reveal]:[]).filter(Boolean);}
export function tiledShowerTrayDimensions(settings={}){return {width:settings.width/100,depth:settings.depth/100,height:settings.trayInstallation==='raised'?(Number(settings.trayHeight)||12)/100:.002,base:0};}
export function tiledShowerTrayError(settings={}){
 if(!Number.isInteger(settings.width)||!Number.isInteger(settings.depth)||settings.width<80||settings.width>200||settings.depth<80||settings.depth>200)return 'Receveur à carreler : dimensions entières entre 80 et 200 cm.';
 if(settings.trayInstallation!==undefined&&!['flush','raised'].includes(settings.trayInstallation))return 'Choisissez une pose encastrée ou surélevée.';
 if(settings.trayInstallation==='raised'&&(!Number.isFinite(settings.trayHeight)||settings.trayHeight<3||settings.trayHeight>40))return 'Receveur surélevé : hauteur de 3 à 40 cm.';
 if(settings.trayProfile!==undefined&&typeof settings.trayProfile!=='boolean')return 'Choix de profilé du receveur invalide.';
 const profile=profileAliases[settings.trayProfileColor]||settings.trayProfileColor;
 if(profile!==undefined&&!METAL_FINISHES.some(f=>f.id===profile))return 'Finition du profilé du receveur inconnue.';
 const covering=settings.trayCovering;if(covering===undefined)return '';
 if(!covering||Array.isArray(covering)||!['inherit','all','split'].includes(covering.mode))return 'Revêtement du receveur invalide.';
 for(const finish of covering.mode==='split'?[covering.top,covering.reveal]:covering.mode==='all'?[covering.top]:[]){
  if(!finish||finish.collection==='Peinture'||!COLLECTIONS[finish.collection]?.colors.some(c=>c.id===finish.color)||!formatsForColor(finish.collection,finish.color).some(f=>f.id===finish.format))return 'Choisissez un carrelage et un format disponibles pour le receveur.';
  try{canonicalSurfaceIdentity(finish,{products:commercialSurfaces.products});}catch(error){return error.message;}
  if(finish.reference&&!commercialSurfaceOptions(finish,commercialSurfaces.products).some(product=>product.reference===finish.reference&&(!finish.catalogueKey||product.key===finish.catalogueKey)))return 'La référence commerciale du carrelage du receveur ne correspond pas à son coloris et son format.';
 }
 return '';
}

// The editable tray is a construction component, not a fabricated catalogue
// product. Its tile faces retain their exact manufacturer references separately.
export function makeTiledShowerTray(settings){
 const error=tiledShowerTrayError(settings);if(error)throw Error(error);
 const root=new T.Group(),dimensions=tiledShowerTrayDimensions(settings),{width:w,depth:d,height:h}=dimensions,raised=settings.trayInstallation==='raised',topHeight=raised?h:.0015;
 root.name='Receveur_a_carreler';root.userData.editTarget='shower';
 const slabMaterial=new T.MeshStandardMaterial({color:'#d1c9b8',roughness:.95}),metal=metalMaterial(profileAliases[settings.trayProfileColor]||settings.trayProfileColor||'Chrome brillant');
 const addBox=(width,height,depth,x,y,z,name,material)=>{const mesh=new T.Mesh(new T.BoxGeometry(width,height,depth),material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=raised;mesh.receiveShadow=true;root.add(mesh);return mesh;};
 if(raised)addBox(w,h,d,0,h/2,-.23+d/2,'Support_receveur_a_carreler',slabMaterial);
 const channelLength=Math.min(1.4,d-.16),channelX=w/2-.095,channelZ=-.23+d/2;
 const channelPolygon=[[channelX-.022,channelZ-channelLength/2-.008],[channelX+.022,channelZ-channelLength/2-.008],[channelX+.022,channelZ+channelLength/2+.008],[channelX-.022,channelZ+channelLength/2+.008]];
 const faces=[],face=(part,width,height,x,y,z,rx=0,ry=0)=>{const s=createSurface(rectangle(width,height),'Receveur_carrelage_'+part,[],{receiveTileShadows:true});s.group.position.set(x,y,z);s.group.rotation.set(rx,ry,0);s.group.userData.editTarget='shower';s.group.userData.trayPart=part;s.trayPart=part;s.length=width;s.height=height;s.trayWidth=width;s.trayHeight=height;root.add(s.group);faces.push(s);return s;};
 const top=face('top',w,d,-w/2,topHeight,-.23+d,-Math.PI/2);delete top.length;delete top.height;
 if(raised){face('front',w,h,-w/2,0,-.23+d+.0004);face('left',d,h,-w/2-.0004,0,-.23,0,-Math.PI/2);face('right',d,h,w/2+.0004,0,-.23+d,0,Math.PI/2);face('back',w,h,w/2,0,-.23-.0004,0,Math.PI);}
 // A dark channel and its narrower cover expose a real evacuation slot. The
 // tray tiles themselves are cut around the complete channel footprint.
 const dark=new T.MeshStandardMaterial({color:'#171d1e',roughness:.65,metalness:.25});
 addBox(.044,.0005,channelLength+.016,channelX,topHeight+.00025,channelZ,'Caniveau_receveur_a_carreler',dark);
 const cover=addBox(.028,.001,channelLength,channelX,topHeight+.001,channelZ,'Grille_receveur_a_carreler',metal);cover.castShadow=false;
 const profiles=[];
 if(settings.trayProfile){for(const [part,width,x,z,angle]of [['front',w,0,-.23+d,0],['back',w,0,-.23,0],['left',d,-w/2,-.23+d/2,Math.PI/2],['right',d,w/2,-.23+d/2,Math.PI/2]]){const mesh=addBox(width,.005,.007,x,topHeight+.001,z,'Profile_receveur_'+part,metal);mesh.rotation.y=angle;mesh.userData.trayPart=part;profiles.push(mesh);}}
 return {root,dimensions,traySurfaces:faces,trayProfiles:profiles,trayChannelPolygon:channelPolygon,trayTopHeight:topHeight,trayProfileMetres:settings.trayProfile?2*(w+d):0};
}

export function trayFootprintInFloor(item,floorSurface){
 if(!item?.asset?.root||!floorSurface?.group)return [];
 const {width:w,depth:d}=item.dimensions;item.asset.root.updateWorldMatrix(true,false);floorSurface.group.updateWorldMatrix(true,false);
 return [[-w/2,-.23],[w/2,-.23],[w/2,-.23+d],[-w/2,-.23+d]].map(([x,z])=>{const p=floorSurface.group.worldToLocal(item.asset.root.localToWorld(new T.Vector3(x,0,z)));return [p.x,p.y];});
}
function withTraySurfaceQuantities(surface,items,callback){
 const footprints=items.filter(item=>item.type==='shower'&&isTiledShowerTray(item.settings)).map(item=>trayFootprintInFloor(item,surface)).filter(p=>p.length);
 if(!footprints.length)return callback(surface);
 // Zones and tray footprints can intersect. A geometric difference keeps each
 // material's area correct and does not subtract overlapping holes twice.
 const regions=clipping.difference([surface.polygon],...(surface.holes||[]).map(hole=>[hole]),...footprints.map(footprint=>[footprint])),cells=new Map(),geometry=new T.BufferGeometry();
 for(const rings of regions){const part=tiledPolygonGeometry(rings[0],surface.layout,rings.slice(1));try{for(const cell of part.userData.cells||[]){const previous=cells.get(cell.key);if(previous)previous.area+=cell.area;else cells.set(cell.key,{...cell});}}finally{part.dispose();}}
 geometry.userData={cells:[...cells.values()],tileCount:cells.size};
 try{return callback({...surface,quantityAreaOverride:geometryArea(regions),tiles:{...surface.tiles,geometry}});}finally{geometry.dispose();}
}
export function withTrayFloorQuantities(floor,items,callback){return withTraySurfaceQuantities(floor,items,callback);}
export function withTrayZoneQuantities(face,floor,items,callback){
 // The same reporting helper also receives wall zones. Only horizontal floor
 // zones lose the material beneath a tray, in their own translated coordinates.
 if(!face?.group||!floor?.group)return callback(face);
 face.group.updateWorldMatrix(true,false);floor.group.updateWorldMatrix(true,false);
 const normal=new T.Vector3(0,0,1).transformDirection(face.group.matrixWorld),floorNormal=new T.Vector3(0,0,1).transformDirection(floor.group.matrixWorld);
 const planeHeight=floor.group.worldToLocal(face.group.getWorldPosition(new T.Vector3())).z;
 return normal.dot(floorNormal)>.999&&Math.abs(planeHeight)<.01?withTraySurfaceQuantities(face,items,callback):callback(face);
}
const round=n=>Math.round(n*1e8)/1e8;
function worldFaceBlocked(face,walls){
 if(!walls?.length)return false;
 face.group.updateWorldMatrix(true,false);const points=rectangle(face.trayWidth,face.trayHeight).map(p=>face.group.localToWorld(new T.Vector3(...p,0)));
 return walls.some(wall=>{wall.group.updateWorldMatrix(true,false);return points.every(point=>{const p=wall.group.worldToLocal(point.clone());return Math.abs(p.z)<.002&&p.x>=-.002&&p.x<=wall.length+.002&&p.y>=-.002&&p.y<=wall.height+.002;});});
}
function worldProfileBlocked(profile,walls){
 if(!walls?.length)return false;profile.updateWorldMatrix(true,false);
 const width=profile.geometry.parameters.width,points=[-width/2,width/2].map(x=>profile.localToWorld(new T.Vector3(x,0,0)));
 return walls.some(wall=>{wall.group.updateWorldMatrix(true,false);return points.every(point=>{const p=wall.group.worldToLocal(point.clone());return Math.abs(p.z)<.002&&p.x>=-.002&&p.x<=wall.length+.002&&p.y>=-.002&&p.y<=wall.height+.002;});});
}
function rebuildPolygon(surface,polygon,holes){
 surface.polygon.splice(0,surface.polygon.length,...polygon);surface.holes.splice(0,surface.holes.length,...holes);surface.baseHoles=holes.map(ring=>ring.map(p=>[...p]));
 const shape=new T.Shape(polygon.map(p=>new T.Vector2(...p)));for(const hole of holes)shape.holes.push(new T.Path(hole.map(p=>new T.Vector2(...p))));
 for(const mesh of [surface.grout,surface.paint]){mesh.geometry.dispose();mesh.geometry=new T.ShapeGeometry(shape);}
 surface.tiles.geometry.dispose();surface.tiles.geometry=tiledPolygonGeometry(surface.polygon,surface.layout,surface.holes);
}

// Top geometry is expressed in the actual floor's coordinates and transformed
// back into the tray root. This preserves the exact joint grid even on a tray
// rotated freely or attached to an oblique/opposite wall.
export function applyTrayCladding(item,floorSurface,floorFinish={},applyMaterial,{force=false,walls}={}){
 if(item?.type!=='shower'||!isTiledShowerTray(item.settings)||!item.asset?.traySurfaces?.length||!floorSurface)return [];
 const asset=item.asset,mode=trayCoveringMode(item.settings),inherited={...floorFinish,format:floorFinish.format||selectedFormat(floorFinish.collection,floorFinish.color,floorSurface.layout)};
 asset.root.updateWorldMatrix(true,false);floorSurface.group.updateWorldMatrix(true,false);
 const footprint=trayFootprintInFloor(item,floorSurface).map(p=>p.map(round)),channel=asset.trayChannelPolygon.map(([x,z])=>{const p=floorSurface.group.worldToLocal(asset.root.localToWorld(new T.Vector3(x,0,z)));return [round(p.x),round(p.y)];});
 const result=[];
 for(const face of asset.traySurfaces){
  const top=face.trayPart==='top',finish=traySurfaceFinish(item.settings,face.trayPart,inherited),layout=normalizeLayout({...floorSurface.layout,planAxes:!!floorSurface.layout.planAxes},finish.collection,finish.format,finish.color);
  let geometryChanged=false;if(top){
   const geometryKey=JSON.stringify([footprint,channel]);
   const matrix=new T.Matrix4().copy(asset.root.matrixWorld).invert().multiply(floorSurface.group.matrixWorld),height=floorSurface.group.worldToLocal(asset.root.localToWorld(new T.Vector3(0,asset.trayTopHeight,0))).z;
   matrix.multiply(new T.Matrix4().makeTranslation(0,0,height));face.group.matrixAutoUpdate=false;face.group.matrix.copy(matrix);face.group.matrixWorldNeedsUpdate=true;
   if(face.trayGeometryKey!==geometryKey){face.trayGeometryKey=geometryKey;rebuildPolygon(face,footprint,[channel]);geometryChanged=true;}
   face.trayFloorPolygon=footprint.map(p=>[...p]);
  }else{
   // Vertical risers unfold from the tray's top grid. Their courses retain
   // the chosen tile dimensions; the floor origin does not become a height.
   layout.planAxes=false;layout.x=0;layout.y=0;
  }
  const blocked=!top&&(walls?.length?worldFaceBlocked(face,walls):face.trayPart==='back'&&Math.abs(item.placement?.offset||0)<.01&&Math.abs(item.placement?.rotation||0)<.01);
  face.group.visible=!blocked;face.trayBlocked=blocked;
  const layoutKey=JSON.stringify(layout),finishKey=JSON.stringify([mode,finish,floorSurface.grout?.material?.color?.getHexString()]);
  const changed=geometryChanged||face.trayLayoutKey!==layoutKey||face.trayFinishKey!==finishKey;face.trayFinish=clone(finish);
  face.refreshTileColors=()=>applyMaterial(face,face.trayFinish);
  if(face.trayLayoutKey!==layoutKey){const refresh=face.refreshTileColors;face.refreshTileColors=null;try{face.setLayout(layout);}finally{face.refreshTileColors=refresh;}}
  if(floorSurface.grout?.material?.color)face.grout.material.color.copy(floorSurface.grout.material.color);
  if(force||changed)face.refreshTileColors();face.trayLayoutKey=layoutKey;face.trayFinishKey=finishKey;
  if(!blocked)result.push({surface:face,finish:face.trayFinish,label:'Receveur à carreler · '+({top:'dessus',front:'façade',back:'arrière',left:'côté gauche',right:'côté droit'}[face.trayPart])});
 }
 let metres=0;for(const profile of asset.trayProfiles){const face=asset.traySurfaces.find(f=>f.trayPart===profile.userData.trayPart),blocked=face?face.trayBlocked:walls?.length?worldProfileBlocked(profile,walls):profile.userData.trayPart==='back'&&Math.abs(item.placement?.offset||0)<.01&&Math.abs(item.placement?.rotation||0)<.01;profile.visible=!blocked;if(!blocked)metres+=profile.userData.trayPart==='front'||profile.userData.trayPart==='back'?item.dimensions.width:item.dimensions.depth;}asset.trayProfileMetres=metres;
 return result;
}
