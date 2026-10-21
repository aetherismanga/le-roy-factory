import * as T from 'three';
import {ROOMS, WALLS, WELL, SCALE, CLEAR_HEIGHT, LEVEL_HEIGHT, point, unpoint, roomAt, roomBounds,adaptPoint,ACTIVE_LEVELS} from './plan.js';

// Geometry, navigation and the editor share these measured, oriented footprints.
export function rectangle(x,z,w,d,a=0){const c=Math.cos(a),s=Math.sin(a);return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([u,v])=>[x+c*u+s*v,z-s*u+c*v]);}
export function overlaps(a,b,gap=0){
 for(const p of [a,b])for(let i=0;i<p.length;i++){
  const q=p[(i+1)%p.length],dx=q[0]-p[i][0],dz=q[1]-p[i][1],l=Math.hypot(dx,dz);if(l<1e-8)continue;
  const axis=[-dz/l,dx/l],aa=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),bb=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);
  if(Math.max(...aa)<=Math.min(...bb)+gap||Math.max(...bb)<=Math.min(...aa)+gap)return false;
 }return true;
}
export function insidePolygon(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a[1]>p[1])!==(b[1]>p[1]))&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function measured(root){
 root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),bounds=new T.Box3(),matrix=new T.Matrix4();
 root.traverseVisible(o=>{if(!o.isMesh||!o.geometry||o.userData.editorHelper)return;if(o.material?.visible===false||o.material?.opacity===0)return;if(o.isInstancedMesh)o.computeBoundingBox();else o.geometry.computeBoundingBox();matrix.multiplyMatrices(inv,o.matrixWorld);bounds.union((o.isInstancedMesh?o.boundingBox:o.geometry.boundingBox).clone().applyMatrix4(matrix));});
 return bounds;
}
const LABELS={kitchen:'Cuisine · plan de travail',island:'Îlot de cuisine',dining:'Table de repas',sofa:'Canapé',chair:'Chaise / fauteuil',stool:'Tabouret de l’îlot',coffeeTable:'Tables basses',tv:'Télévision & console',bed:'Lit',nightstand:'Chevet & lampe',wardrobe:'Armoire',desk:'Bureau',bookcase:'Bibliothèque',washer:'Lave-linge',plant:'Plante',rug:'Tapis',art:'Tableau',curtain:'Rideau',light:'Luminaire',shelf:'Étagères',bench:'Banquette',vanity:'Meuble RANDAL & vasque',mirror:'Miroir',column:'Colonne RANDAL',shower:'Receveur de douche',bath:'Baignoire',tap:'Robinetterie',screen:'Paroi de douche',towel:'Sèche-serviettes',toilet:'WC suspendu',washstand:'Lave-mains',flush:'Plaque de chasse',fridge:'Réfrigérateur',counter:'Cuisine · retour'};
const NONBLOCKING=new Set(['rug','art','curtain','light','mirror','tap','towel','flush','shelf']);
export function validateItemOverrides(items={}){
 if(!items||Array.isArray(items)||typeof items!=='object'||Object.keys(items).length>250)throw Error('Aménagement du projet invalide.');
 for(const [id,s]of Object.entries(items)){
  if(!/^[\w-]{1,90}$/.test(id)||!s||typeof s!=='object')throw Error('Élément du projet invalide.');
  if(s.room!==undefined&&!ROOMS.some(r=>r.id===s.room))throw Error('Pièce de mobilier inconnue.');
  for(const k of ['x','z','y','angle'])if(s[k]!==undefined&&(!Number.isFinite(s[k])||Math.abs(s[k])>(k==='angle'?3600:2500)))throw Error('Position du mobilier invalide.');
  for(const k of ['width','depth','height'])if(s[k]!==undefined&&(!Number.isFinite(s[k])||s[k]<1||s[k]>600))throw Error('Dimension de mobilier invalide.');
  if(s.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(s.color))throw Error('Couleur du mobilier invalide.');
  if(s.hidden!==undefined&&typeof s.hidden!=='boolean')throw Error('Visibilité du mobilier invalide.');
 }return items;
}
export function createArrangement({project,root,floors,doors}){
 const items=new Map(),counts=new Map();let suppress=false;
 const reservations=[];
 // A clear landing is retained at both ends of the staircase.
 for(const floor of ACTIVE_LEVELS===1?[]:[0,1]){
  reservations.push({floor,name:'l’escalier et sa trémie',poly:rectangle(WELL.x+WELL.w/2,WELL.z+WELL.d/2,WELL.w,WELL.d)});
  reservations.push({floor,name:'le palier de l’escalier',poly:rectangle(floor?4.79:3.61,3.48,floor?1.06:1.06,.64)});
 }
 function prepare(){
 reservations.splice(ACTIVE_LEVELS===1?0:4);
 for(const d of doors){
  const w=d.wall,o=d.opening,L=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]),dx=(w.b[0]-w.a[0])/L,dz=(w.b[1]-w.a[1])/L,
   x=w.a[0]+dx*o.u/SCALE,z=w.a[1]+dz*o.u/SCALE,a=-Math.atan2(dz,dx),width=o.width/SCALE;
  reservations.push({floor:w.floor,name:'le passage de la porte',poly:rectangle(x,z,width+.04,.78,a),door:d.id,maxY:o.height});
  if(!d.sliding&&!w.outside){
   const sign=d.hinge==='right'?-1:1,hinge=-sign*(width/2-.05),r=width-.09,poly=[[hinge,0]];
   for(let i=0;i<=16;i++){const t=i*Math.PI/32;poly.push([hinge+sign*r*Math.cos(t),d.inward*r*Math.sin(t)]);}
   const c=Math.cos(a),s=Math.sin(a);reservations.push({floor:w.floor,name:'le débattement de la porte',door:d.id,maxY:o.height,poly:poly.map(([u,v])=>[x+c*u+s*v,z-s*u+c*v])});
  }
 }
 for(const w of WALLS.filter(w=>w.outside))for(const o of w.openings.filter(o=>o.kind==='window')){
   const dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],L=Math.hypot(dx,dz);
   reservations.push({floor:w.floor,name:'la fenêtre',window:true,minY:o.bottom,maxY:o.bottom+o.height,poly:rectangle(w.a[0]+dx*o.u/L,w.a[1]+dz*o.u/L,o.width-.04,.24,-Math.atan2(dz,dx))});
 }
 }
 function register(object,{kind='furniture',floor=0,id,name,fixed=false,blocking=!NONBLOCKING.has(kind),room}={}){
  const n=(counts.get(`${floor}-${kind}`)||0)+1;counts.set(`${floor}-${kind}`,n);id||=`item-${floor}-${kind}-${n}`;
  if(items.has(id))throw Error('Identifiant de mobilier dupliqué : '+id);
  const b=measured(object);if(b.isEmpty())return null;
  const center=b.getCenter(new T.Vector3()),origin=new T.Vector3(center.x,b.min.y,center.z),parent=object.parent;
  const pivot=new T.Group();pivot.name=name||LABELS[kind]||object.name||'Élément';pivot.position.copy(object.position).add(origin.clone().multiply(object.scale).applyQuaternion(object.quaternion));pivot.rotation.set(0,object.rotation.y,0);pivot.scale.copy(object.scale);parent.add(pivot);pivot.add(object);object.position.copy(origin).negate();object.rotation.set(0,0,0);object.scale.set(1,1,1);
  const p=unpoint(pivot.position.x,pivot.position.z),rr=ROOMS.find(r=>r.id===room)||roomAt(...p,floor),dimensions=b.getSize(new T.Vector3());
  const item={id,name:pivot.name,kind,floor,room:rr?.id||ROOMS.find(r=>r.floor===floor).id,root:pivot,object,dimensions,fixed,blocking,base:null,materials:new Map(),clones:new Map(),originalScale:pivot.scale.clone()};
  pivot.userData.editableId=id;items.set(id,item);item.base=read(item);return item;
 }
 function read(it){const [px,pz]=unpoint(it.root.position.x,it.root.position.z),r=ROOMS.find(r=>r.id===it.room),b=roomBounds(r);return {room:it.room,x:(px-b.x)*SCALE*100,z:(pz-b.z)*SCALE*100,y:it.root.position.y*100,angle:it.root.rotation.y*180/Math.PI,width:it.dimensions.x*it.root.scale.x*100,depth:it.dimensions.z*it.root.scale.z*100,height:it.dimensions.y*it.root.scale.y*100,hidden:!!it.hidden,...(it.color?{color:it.color}:{})};}
 function footprint(it,s=read(it)){const b=roomBounds(ROOMS.find(r=>r.id===s.room));return rectangle(b.x+s.x/(100*SCALE),b.z+s.z/(100*SCALE),s.width/(100*SCALE),s.depth/(100*SCALE),s.angle*Math.PI/180);}
 function bounds(it,s=read(it)){return {poly:footprint(it,s),minY:s.y/100,maxY:(s.y+s.height)/100};}
 function check(it,s,{pairs=true}={}){
  if(s.hidden)return [];
  const errors=[],r=ROOMS.find(r=>r.id===s.room),bb=bounds(it,s),p=bb.poly;
  if(!r||r.floor!==it.floor)return ['Choisissez une pièce du même niveau.'];
  if(p.some(v=>!insidePolygon(v,r.polygon))||p.some((a,i)=>{const b=p[(i+1)%p.length];return r.polygon.some((c,j)=>{const d=r.polygon[(j+1)%r.polygon.length],cross=(u,v,w)=>(v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0]);return cross(a,b,c)*cross(a,b,d)<-1e-10&&cross(c,d,a)*cross(c,d,b)<-1e-10;});}))errors.push('L’élément dépasse les murs de la pièce.');
  if(s.y<0||s.y+s.height>CLEAR_HEIGHT*100+1)errors.push('L’élément dépasse le sol ou le plafond.');
  if(it.kind!=='rug'){
   for(const zone of reservations)if(zone.floor===it.floor&&bb.minY<(zone.maxY??CLEAR_HEIGHT)&&bb.maxY>(zone.minY??0)&&(!zone.window||(['art','mirror','tv','wardrobe','bookcase','fridge','kitchen'].includes(it.kind)&&bb.maxY>zone.minY&&bb.minY<zone.maxY))&&overlaps(p,zone.poly,.003))errors.push('Gardez libre '+zone.name+'.');
  }
  if(it.blocking){
   if(pairs)for(const other of items.values()){
    if(other===it||!other.blocking||other.floor!==it.floor||other.hidden)continue;
    // A screen and its shower tray, or plumbing against a fixture, form an assembly.
    if((it.kind==='shower'&&other.kind==='screen')||(it.kind==='screen'&&other.kind==='shower'))continue;
    const ob=bounds(other);if(Math.min(bb.maxY,ob.maxY)-Math.max(bb.minY,ob.minY)<.025)continue;
    if(overlaps(p,ob.poly,.015))errors.push('Chevauchement avec '+other.name+'.');
   }
  }return [...new Set(errors)];
 }
 function apply(it,s){
  const r=ROOMS.find(r=>r.id===s.room),b=roomBounds(r);it.room=r.id;it.root.position.set(...point(b.x+s.x/(100*SCALE),s.y/100,b.z+s.z/(100*SCALE)));it.root.rotation.y=s.angle*Math.PI/180;
  if(!it.fixed)it.root.scale.set(s.width/(it.dimensions.x*100),s.height/(it.dimensions.y*100),s.depth/(it.dimensions.z*100));
  it.hidden=!!s.hidden;it.root.visible=!it.hidden;
  if(s.color!==it.color){
   it.object.traverse(o=>{if(!o.isMesh||o.userData.editorHelper)return;const mats=Array.isArray(o.material)?o.material:[o.material];o.material=mats.map(m=>{
    const original=it.materials.get(m)||m;
    if(!s.color)return original;
    // Preserve glass, light sources, electronics and ceramics; tint the main finishes.
    if(original.transparent||original.emissive?.getHex()>0||/écran|vitre|LED|lentille|vasque|miroir/i.test(o.name))return original;
    let clone=it.clones.get(original);if(!clone){clone=original.clone();it.clones.set(original,clone);it.materials.set(clone,original);}clone.color?.set(s.color);return clone;
   });if(!Array.isArray(o.material)||mats.length===1)o.material=o.material[0];});it.color=s.color;
  }
  it.root.updateWorldMatrix(true,true);
 }
 function update(id,patch,{preview=false,allowInvalid=false}={}){
  const it=items.get(id);if(!it)throw Error('Élément introuvable.');
  const current=read(it),s={...current,...patch};if(it.fixed)for(const k of ['width','height','depth'])s[k]=current[k];
  validateItemOverrides({[id]:s});const errors=check(it,s);
  if(errors.length&&!allowInvalid&&!preview)return {ok:false,errors};
  apply(it,s);if(!preview&&!suppress){project.items??={};project.items[id]=read(it);}return {ok:!errors.length,errors,item:describe(it)};
 }
 function describe(it){return {id:it.id,name:it.name,kind:it.kind,floor:it.floor,fixed:it.fixed,blocking:it.blocking,...read(it)};}
 function audit(){const issues=[];for(const it of items.values()){const s=read(it);for(const message of check(it,s))issues.push({id:it.id,name:it.name,room:it.room,message});}return issues;}
 function load(){suppress=true;for(const [id,s]of Object.entries(project.items||{})){const it=items.get(id);if(it){const merged={...read(it),...s};if(it.fixed)for(const k of ['width','height','depth'])merged[k]=read(it)[k];apply(it,merged);}}suppress=false;}
 function colliders(){return [...items.values()].filter(it=>!it.hidden&&it.blocking&&it.kind!=='shower').map(it=>{const s=read(it),b=roomBounds(ROOMS.find(r=>r.id===s.room)),p=point(b.x+s.x/(100*SCALE),0,b.z+s.z/(100*SCALE));return {id:it.id,x:p[0],z:p[2],w:s.width/100,d:s.depth/100,angle:it.root.rotation.y,floor:it.floor,minY:s.y/100,maxY:(s.y+s.height)/100};});}
 function at(id,x,z,angle){const it=items.get(id);if(!it)return;[x,z]=adaptPoint(x,z,it.floor);const r=roomAt(x,z,it.floor)||ROOMS.find(r=>r.id===it.room),b=roomBounds(r),s={...read(it),room:r.id,x:(x-b.x)*SCALE*100,z:(z-b.z)*SCALE*100};if(angle!==undefined)s.angle=angle;apply(it,s);it.base=read(it);}
 function reset(id){const it=items.get(id);const errors=check(it,it.base);if(errors.length)return {ok:false,errors};apply(it,it.base);delete project.items?.[id];return {ok:true,item:describe(it)};}
 return {items,reservations,prepare,register,read,footprint,check,apply,update,audit,load,colliders,at,reset,list:()=>[...items.values()].map(describe),describe};
}
