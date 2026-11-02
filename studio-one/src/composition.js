import {isItemPositionLocked} from '../../shared/lrf-3d/position-lock.js';
import * as T from 'three';
import {inside,intersect} from './room.js';
import {isFixture,fixtureDimensions} from './fixtures.js';
import {equipmentDimensions,isAccessory,isFloorAccessory} from './equipment.js';
import {mirrorSpec} from './mirrors.js';
import {cabinetFormat} from './configuration.js';
import {isOpening} from './openings.js';
import {equipmentSolidCollision} from './equipment-collision.js';
import {screenMount,nearestScreenMount} from './screen-mount.js';
import {isWallMountedSanitary,isFloorAnchoredSanitary,normalizeSanitaryPlacement,sanitaryMountError,remapSanitaryPlacement} from '../../shared/lrf-3d/sanitary-mount.js';
export const OBJECT_LIMIT=32,MIRROR_LIMIT=3;
export function itemDimensions(type,settings={}){return isAccessory(type)?equipmentDimensions(type,settings):isFixture(type)?fixtureDimensions(type,settings):isOpening(type)?{width:settings.width/100,height:settings.height/100,depth:.07,base:0}:type==='cabinet'?{width:(settings.width||80)/100,height:cabinetFormat(settings.format).height+.02+(settings.top==='neris'?.14:settings.top==='torne'?.12:0),depth:.46,base:cabinetFormat(settings.format).base}:type==='column'?{width:.38,height:1.32,depth:.27,base:.28}:{width:mirrorSpec(settings).width,height:mirrorSpec(settings).height,depth:.038,base:1.40};}
export function boundsOnWall(room,item,placement=item.placement,dimensions=item.dimensions){
 const wall=room.walls[placement.wall];if(!wall)return null;const angle=wall.group.rotation.y+(isFloorItem(item)?(placement.rotation||0)*Math.PI/180:0),tangent=new T.Vector3(Math.cos(angle),0,-Math.sin(angle)),normal=new T.Vector3(Math.sin(angle),0,Math.cos(angle)),wallTangent=new T.Vector3(Math.cos(wall.group.rotation.y),0,-Math.sin(wall.group.rotation.y));
 const start=wall.start.clone().addScaledVector(wallTangent,placement.u/100).addScaledVector(wall.normal,(placement.offset||0)/100+(isFloorItem(item)?dimensions.depth/2:0)),half=dimensions.width/2-(isFloorItem(item)?.002:0);
 const zs=isFloorItem(item)?[-dimensions.depth/2+.002,dimensions.depth/2-.002]:[.002,dimensions.depth];
 const corners=[[-half,zs[0]],[half,zs[0]],[half,zs[1]],[-half,zs[1]]].map(([x,z])=>{const p=start.clone().addScaledVector(tangent,x).addScaledVector(normal,z);return [p.x,p.z+.23];});
 const bottom=placement.height/100-(item.type==='mirror'?dimensions.height/2:dimensions.clearanceBelow||0);return {corners,bottom,top:bottom+dimensions.height+(dimensions.clearanceBelow||0),tangent,normal};
}
function overlap(a,b){if(a.top<=b.bottom+.005||b.top<=a.bottom+.005)return false;for(const axis of [a.tangent,a.normal,b.tangent,b.normal]){const project=p=>p[0]*axis.x+p[1]*axis.z,aa=a.corners.map(project),bb=b.corners.map(project);if(Math.max(...aa)<=Math.min(...bb)+.005||Math.max(...bb)<=Math.min(...aa)+.005)return false;}return true;}
export function floorExtents(item,placement=item.placement){const a=(placement.rotation||0)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),d=item.dimensions;return {along:(c*d.width+s*d.depth)/2,normal:(s*d.width+c*d.depth)/2};}
export class Composition{
 constructor(room){this.room=room;this.locked=false;this.items=[];this.selectedId=null;this.nextId=1;}
 get selected(){return this.items.find(i=>i.id===this.selectedId)||null;}
 validate(item,p=item.placement,d=item.dimensions,items=this.items,room=this.room){
  if(!p||![p.wall,p.u,p.height,p.offset??0,p.rotation??0].every(Number.isFinite)||!Number.isInteger(p.wall))return 'Position invalide.';
  if((item.type==='door'||isFloorItem(item)&&item.type!=='screen')&&p.height!==0)return 'Cet élément doit reposer au sol (hauteur 0 cm).';
  if(item.type==='screen'){const tray=items.find(t=>t.id===item.settings.trayId)||this.items.find(t=>t.id===item.settings.trayId),mount=tray&&screenMount(tray,{...item,dimensions:d});if(!mount||['wall','u','offset','height','rotation'].some(k=>Math.abs((p[k]||0)-(mount.placement[k]||0))>.02))return 'La paroi doit rester sur le bord supérieur du receveur.';}
  const wall=room.walls[p.wall];if(!wall)return 'Choisissez un mur existant.';
  const mountError=sanitaryMountError({...item,dimensions:d},p,room);if(mountError)return mountError;
  if(!isFloorItem(item)&&(p.u<d.width*50||p.u>wall.length*100-d.width*50))return 'L’élément dépasse le bord du mur.';
  if(isOpening(item.type)&&(p.u<d.width*50+2||p.u>wall.length*100-d.width*50-2||p.height+d.height*100>(wall.height||room.height)*100-2))return 'Conservez au moins 2 cm autour du cadre, sous le plafond et aux extrémités du mur.';
  const b=boundsOnWall(room,item,p,d);if(b.bottom<-.001||b.top>(isFloorItem(item)?room.height:wall.height||room.height)+.001)return 'L’élément dépasse la hauteur de la pièce.';
  const attachedNiche=!!p.nicheId,containment=attachedNiche?boundsOnWall(room,item,{...p,offset:0},d):b;
  if(containment.corners.some(q=>!inside(q,room.points)))return 'L’élément dépasse le contour de la pièce.';
  for(let i=0;i<4;i++)for(let j=0;j<room.points.length;j++)if(intersect(containment.corners[i],containment.corners[(i+1)%4],room.points[j],room.points[(j+1)%room.points.length]))return 'Un angle de la pièce empiète sur l’élément.';
  for(const [partitionIndex,p] of (room.partitions||[]).entries()){if((isOpening(item.type)||attachedNiche)&&wall.partition===partitionIndex)continue;if(b.bottom>=p.height-.002)continue;const obstacle={corners:p.corners,bottom:0,top:p.height,tangent:new T.Vector3((p.b[0]-p.a[0])/p.length,0,-(p.a[1]-p.b[1])/p.length),normal:p.normal};if(overlap(b,obstacle))return 'Une cloison occupe cet emplacement.';}
  for(const other of items)if(other.id!==item.id){if(canOverlay(item,other)){if(overlap(b,boundsOnWall(room,other))&&equipmentSolidCollision({...item,dimensions:d},p,other,other.placement,room))return 'La robinetterie traverse un équipement : déplacez-la ou remontez-la.';}else if(overlap(b,boundsOnWall(room,other)))return 'Un autre élément occupe cet emplacement.';}
  if(item.type==='shower'){
   const tray={...item,placement:p,dimensions:d},children=(items.length?items:this.items).filter(i=>i.type==='screen'&&i.settings.trayId===item.id),proposed=[];
   for(const child of children){const m=screenMount(tray,child);if(!m)return 'Le receveur est trop petit pour sa paroi.';proposed.push({...child,placement:m.placement});}
   const planned=[...items.filter(i=>i.id!==item.id&&!proposed.some(c=>c.id===i.id)),tray,...proposed];for(const child of proposed){const error=this.validate(child,child.placement,child.dimensions,planned,room);if(error)return error;}
  }
  return '';
 }
 syncOpenings(){this.room.setOpenings?.(this.items.filter(i=>isOpening(i.type)));}
 sync(item){const w=this.room.walls[item.placement.wall],tangent=new T.Vector3(Math.cos(w.group.rotation.y),0,-Math.sin(w.group.rotation.y));item.root.position.copy(w.start).addScaledVector(tangent,item.placement.u/100).addScaledVector(w.normal,isFloorItem(item)?(item.placement.offset||0)/100+item.dimensions.depth/2:.23+(item.placement.offset||0)/100);if(isFloorItem(item))item.asset.root.position.z=.23-item.dimensions.depth/2;item.root.position.y=item.placement.height/100-item.dimensions.base;item.root.rotation.y=w.group.rotation.y+(isFloorItem(item)?(item.placement.rotation||0)*Math.PI/180:0);item.root.updateMatrixWorld(true);}
 findSpace(item,preferred={}){
  const wallOrder=[preferred.wall??0,...this.room.walls.map((_,i)=>i)].filter((n,i,a)=>a.indexOf(n)===i);
  for(const wall of wallOrder){const length=this.room.walls[wall]?.length*100;if(!length)continue;const positions=[preferred.u??length/2,length/2];for(let u=item.dimensions.width*50+2;u<=length-item.dimensions.width*50-2;u+=5)positions.push(u);positions.sort((a,b)=>Math.abs(a-(preferred.u??length/2))-Math.abs(b-(preferred.u??length/2)));
   for(const u of positions){const p={wall,u:Math.round(u),height:preferred.height??(item.type==='mirror'?140:item.type==='window'?100:item.type==='door'||isFloorItem(item)||isFloorAnchoredSanitary(item)?0:isWallMountedSanitary(item)?12:item.type==='cabinet'?item.dimensions.base*100:28)};const mounted=normalizeSanitaryPlacement(item,p,this.room);if(!this.validate(item,mounted))return mounted;}
  }return null;
 }
 add(type,asset,settings={},preferred={}){
  if(this.items.length>=OBJECT_LIMIT)return {error:'Ce prototype accepte jusqu’à 32 éléments.'};if(type==='mirror'&&this.items.filter(i=>i.type==='mirror').length>=MIRROR_LIMIT)return {error:'Ce prototype accepte jusqu’à 3 miroirs réfléchissants.'};
  const root=new T.Group(),id='object-'+this.nextId++;root.name=type+'_'+id;root.userData.itemId=id;root.add(asset.root);
  const item={id,type,root,asset,settings:{...settings,drawers:[...(settings.drawers||[0,0])]},dimensions:itemDimensions(type,settings),motion:{drawers:Array(type==='cabinet'?cabinetFormat(settings.format).drawers:2).fill(0),door:0,window:type==='window'&&settings.windowOpen===true?1:0},placement:null,decor:[]};
  if(type==='screen'){const trays=this.items.filter(t=>t.type==='shower'),tray=trays.find(t=>t.id===settings.trayId)||trays.find(t=>t.id===this.selectedId)||trays[0];if(!tray)return {error:'Ajoutez d’abord un receveur pour y poser la paroi.'};let mount=screenMount(tray,item,settings.edge||'left',settings.edgeShift||0);if(!mount)mount=nearestScreenMount(trays,item,{wall:tray.placement.wall,u:tray.placement.u,offset:tray.placement.offset||0},tray.id);if(!mount)return {error:'Cette paroi est trop grande pour les bords du receveur.'};Object.assign(item.settings,{trayId:mount.trayId,edge:mount.edge,edgeShift:mount.edgeShift});preferred=mount.placement;if(this.validate(item,preferred)){for(const edge of ['left','right','front','back']){const candidate=screenMount(tray,item,edge,0);if(!candidate)continue;const test={...item,settings:{...item.settings,edge,edgeShift:0}};if(!this.validate(test,candidate.placement)){Object.assign(item.settings,{edge,edgeShift:0});preferred=candidate.placement;break;}}}}
  preferred=normalizeSanitaryPlacement(item,preferred,this.room);
  item.placement=!this.validate(item,preferred)?{...preferred}:type==='screen'?null:this.findSpace(item,preferred);if(!item.placement)return {error:'Aucun emplacement libre : agrandissez la pièce ou déplacez un élément.'};this.items.push(item);this.selectedId=id;this.sync(item);this.syncOpenings();return {item};
 }
 move(id,p){return this.place(id,p,false);}
 // Dragging may cross furniture, while a shower screen remains on its tray.
 previewMove(id,p){return this.place(id,p,true);}
 place(id,p,preview=false){
  const item=this.items.find(i=>i.id===id);if(!item)return {error:'Élément introuvable.'};if(isItemPositionLocked(this,item)||this.items.some(child=>child.type==='screen'&&child.settings.trayId===id&&isItemPositionLocked(this,child)))return {error:'Élément verrouillé : déverrouillez-le pour le déplacer.'};let candidate=normalizeSanitaryPlacement(item,{...item.placement,...p},this.room),mount;
  if(item.type==='screen'){mount=nearestScreenMount(this.items.filter(i=>i.type==='shower'),item,candidate,item.settings.trayId);if(!mount)return {error:'Aucun bord du receveur ne convient à cette paroi.'};candidate=mount.placement;}
  else if(preview&&isFloorItem(item))candidate=this.clampFloorPlacement(item,candidate);
  const settings=mount?{...item.settings,trayId:mount.trayId,edge:mount.edge,edgeShift:mount.edgeShift}:item.settings,proposed={...item,placement:candidate,settings},patches=[proposed];
  if(item.type==='shower')for(const child of this.items.filter(i=>i.type==='screen'&&i.settings.trayId===id)){const m=screenMount(proposed,child);if(!m)return {error:'Le nouveau receveur est trop petit pour sa paroi.'};patches.push({...child,placement:m.placement});}
  const planned=this.items.map(i=>patches.find(p=>p.id===i.id)||i);
  for(const patch of patches){const error=this.validate(patch,patch.placement,patch.dimensions,preview&&(['cabinet','column','mirror'].includes(item.type)||isWallMountedSanitary(item))?planned.filter(i=>i.id===patch.settings.trayId):planned);if(error)return {error};}
  for(const patch of patches){const original=this.items.find(i=>i.id===patch.id);original.placement=patch.placement;original.settings=patch.settings;this.sync(original);}this.syncOpenings();return {item,overlap:preview&&patches.some(i=>!!this.validate(i,i.placement,i.dimensions,planned))};
 }
 clampFloorPlacement(item,desired,snap=true){
  const w=this.room.walls[desired.wall];if(!w||![desired.u,desired.offset??0,desired.rotation??0].every(Number.isFinite))return desired;
  const p={...desired},d=item.dimensions,e=floorExtents(item,p),t=new T.Vector3(Math.cos(w.group.rotation.y),0,-Math.sin(w.group.rotation.y));
  const lo=e.along*100,hi=w.length*100-lo,flush=(e.normal-d.depth/2)*100;
  p.u=T.MathUtils.clamp(p.u,lo,Math.max(lo,hi));p.offset=Math.max(flush,p.offset||0);
  if(snap){if(p.u-lo<3)p.u=lo;else if(hi-p.u<3)p.u=hi;if(p.offset-flush<3)p.offset=flush;}
  // For a convex room the exact support of the rotated footprint can be
  // projected against every wall. An overshooting pointer slides along walls
  // into the corner rather than freezing at the last accepted centimetre.
  const points=this.room.points,convex=points.every((a,i)=>{const b=points[(i+1)%points.length],c=points[(i+2)%points.length];return (b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])>=-1e-8;});
  if(convex){
   const angle=w.group.rotation.y+(p.rotation||0)*Math.PI/180,axis=new T.Vector3(Math.cos(angle),0,-Math.sin(angle)),normal=new T.Vector3(Math.sin(angle),0,Math.cos(angle)),center=w.start.clone().addScaledVector(t,p.u/100).addScaledVector(w.normal,p.offset/100+d.depth/2);
   for(let pass=0;pass<16;pass++){let changed=false;for(const face of this.room.walls.slice(0,points.length)){const n=face.normal,support=Math.abs(n.dot(axis))*d.width/2+Math.abs(n.dot(normal))*d.depth/2,gap=center.clone().sub(face.start).dot(n)-support;if(gap<-.000001||snap&&gap>0&&gap<.03){center.addScaledVector(n,-gap);changed=true;}}if(!changed)break;}
   const delta=center.sub(w.start);p.u=delta.dot(t)*100;p.offset=(delta.dot(w.normal)-d.depth/2)*100;
  }
  p.u=Math.round(p.u*1e8)/1e8;p.offset=Math.round(p.offset*1e8)/1e8;return p;
 }
 flushFloor(id,corner=null){const item=this.items.find(i=>i.id===id);if(!item||!isFloorItem(item))return {error:'Choisissez un équipement au sol.'};const w=this.room.walls[item.placement.wall],e=floorExtents(item),p={...item.placement,offset:(e.normal-item.dimensions.depth/2)*100};if(corner==='left')p.u=e.along*100;else if(corner==='right')p.u=(w.length-e.along)*100;return this.move(id,this.clampFloorPlacement(item,p));}
 nearestPlacement(item,desired=item.placement){
  if(item.type==='screen'){const mount=nearestScreenMount(this.items.filter(i=>i.type==='shower'),item,desired,item.settings.trayId);return mount&&!this.validate({...item,settings:{...item.settings,edge:mount.edge,edgeShift:mount.edgeShift}},mount.placement)?mount.placement:null;}
  if(isFloorItem(item)){desired=this.clampFloorPlacement(item,desired);if(!this.validate(item,desired))return desired;const e=floorExtents(item,desired),flush=(e.normal-item.dimensions.depth/2)*100,w=this.room.walls[desired.wall],t=new T.Vector3(Math.cos(w.group.rotation.y),0,-Math.sin(w.group.rotation.y)),us=[desired.u,e.along*100,(w.length-e.along)*100],offsets=[desired.offset||0,flush];
   for(const other of this.items){if(other.id===item.id)continue;const bounds=boundsOnWall(this.room,other),points=bounds.corners.map(p=>new T.Vector3(p[0],0,p[1]-.23).sub(w.start)),xs=points.map(p=>p.dot(t)*100),zs=points.map(p=>p.dot(w.normal)*100);us.push(Math.min(...xs)-e.along*100-1,Math.max(...xs)+e.along*100+1);offsets.push(Math.min(...zs)-e.normal*100-item.dimensions.depth*50-1,Math.max(...zs)+e.normal*100-item.dimensions.depth*50+1);}
   for(let delta=5;delta<=Math.max(...this.room.metrics.lengths);delta+=10){us.push(desired.u-delta,desired.u+delta);offsets.push((desired.offset||0)-delta,(desired.offset||0)+delta);}
   const nearest=(a,at,min,max)=>[...new Set(a.map(v=>Math.round(v*100)/100))].filter(v=>v>=min-.01&&v<=max+.01).sort((a,b)=>Math.abs(a-at)-Math.abs(b-at)).slice(0,80),x=nearest(us,desired.u,e.along*100,(w.length-e.along)*100),z=nearest(offsets,desired.offset||0,flush,Math.max(...this.room.metrics.lengths));let checks=0;
   for(const offset of z)for(const u of x){if(++checks>6400)return null;const p={...desired,u,offset,height:0};if(!this.validate(item,p))return p;}return null;}


  desired=normalizeSanitaryPlacement(item,desired,this.room);
  const wall=this.room.walls[desired.wall];if(!wall)return null;const d=item.dimensions,edge=isOpening(item.type)?2:1,lo=Math.ceil(d.width*50+edge),hi=Math.floor(wall.length*100-d.width*50-edge),mirrorOffset=item.type==='mirror'?d.height*50:0;
  const minH=mirrorOffset,maxH=Math.floor((wall.height||this.room.height)*100-d.height*100+mirrorOffset-(isOpening(item.type)?2:0)),height=item.type==='door'||isFloorAnchoredSanitary(item)?0:T.MathUtils.clamp(Math.round(desired.height),minH,maxH);
  const heights=new Set([height,minH,maxH]);
  for(const other of this.items){if(other.id===item.id)continue;const b=boundsOnWall(this.room,other);heights.add(Math.floor(b.bottom*100-d.height*100+mirrorOffset-1));heights.add(Math.ceil(b.top*100+mirrorOffset+1));}
  const candidates=[...heights].filter(h=>h>=minH&&h<=maxH&&((item.type!=='door'&&!isFloorAnchoredSanitary(item))||h===0)).sort((a,b)=>Math.abs(a-height)-Math.abs(b-height));
  // Prefer keeping the requested mounting height. Search at centimetre steps
  // on the requested wall, never jump silently to a different wall.
  for(const h of candidates){const positions=[];for(let u=lo;u<=hi;u++)positions.push(u);positions.sort((a,b)=>Math.abs(a-desired.u)-Math.abs(b-desired.u)||a-b);for(const u of positions){const p=normalizeSanitaryPlacement(item,{...desired,wall:desired.wall,u,height:h},this.room);if(!this.validate(item,p))return p;}}
  return null;
 }
 settle(id,origin){const item=this.items.find(i=>i.id===id);if(!item)return {error:'Élément introuvable.'};const desired={...item.placement};if(!this.validate(item))return {item,adjusted:false};const position=this.nearestPlacement(item,desired);if(position){const result=this.move(id,position);return {...result,adjusted:true};}const restored=this.move(id,origin);return {...restored,restored:true,error:'Aucun emplacement libre sur ce mur : position de départ rétablie.'};}
 resize(item,dimensions){if(isItemPositionLocked(this,item))return 'Élément verrouillé : déverrouillez-le pour modifier ses dimensions.';const error=this.validate(item,item.placement,dimensions);if(error)return error;item.dimensions=dimensions;return '';}
 remove(id){const target=this.items.find(i=>i.id===id);if(isItemPositionLocked(this,target)||this.items.some(i=>i.type==='screen'&&i.settings.trayId===id&&isItemPositionLocked(this,i)))return null;for(const child of [...this.items].filter(i=>i.type==='screen'&&i.settings.trayId===id))this.remove(child.id);const index=this.items.findIndex(i=>i.id===id);if(index<0)return null;const [item]=this.items.splice(index,1);item.root.removeFromParent();if(this.selectedId===id)this.selectedId=this.items[0]?.id||null;this.syncOpenings();return item;}
 setRoom(next,{allowLockedPartition=false,allowLockedNiche=false}={}){
  if(this.locked&&!allowLockedPartition&&!allowLockedNiche)return 'Déverrouillez la composition avant de modifier la pièce.';
  const remap=this.items.map(item=>{const old=this.room.walls[item.placement.wall],match=next.walls.findIndex(w=>w.key===old.key);if(old.partition!==undefined&&match<0)return null;const wall=match>=0?match:Math.min(item.placement.wall,next.walls.length-1);const placement=remapSanitaryPlacement(item,{...item.placement,wall,u:Math.round(item.placement.u/(old.length*100)*(next.walls[wall].length*100))},this.room,next);return placement?{...item,placement}:null;});if(remap.some(i=>!i))return 'Déplacez les éléments fixés à cette cloison ou à cette niche avant de la supprimer ou de la réduire.';const planned=remap;for(const screen of planned.filter(i=>i.type==='screen')){const tray=planned.find(i=>i.id===screen.settings.trayId),mount=tray&&screenMount(tray,screen);if(!mount)return 'Le receveur ne convient plus à sa paroi.';screen.placement=mount.placement;}
  for(const item of planned){const error=this.validate(item,item.placement,item.dimensions,planned,next);if(error)return 'La nouvelle pièce ne convient pas à la composition : '+error;}
  this.room=next;this.items.forEach((item,i)=>{item.placement=planned[i].placement;this.sync(item);});this.syncOpenings();return '';
 }
 snapshot(){return this.items.map(i=>({id:i.id,type:i.type,locked:!!i.locked,...(i.positionUnlocked===true?{positionUnlocked:true}:{}),placement:{...i.placement},settings:{...i.settings,drawers:[...i.settings.drawers]}}));}
}
export function disposeObject(root){const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.isMesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}

export function isFloorItem(item){return isFixture(item.type)||isFloorAccessory(item.type,item.settings);}
function canOverlay(a,b){if(a.type==='tap'&&['bath','shower','screen'].includes(b.type)||b.type==='tap'&&['bath','shower','screen'].includes(a.type))return true;if(a.type==='screen'&&b.type==='shower'||b.type==='screen'&&a.type==='shower')return true;return false;}
