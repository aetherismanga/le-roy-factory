/* Composition locale : identifiants durables, commandes atomiques, collisions en mètres. */
(()=>{'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),uid=()=>globalThis.crypto?.randomUUID?.()||'rc-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
function create(resolve){
 let state={version:1,id:uid(),name:'Mon projet RANDAL',client:'',items:[],room:{floor:'elios-creta-ginepro',wall:'ivory',orientation:'horizontal'}},selected=null,listeners=new Set();
 function all(){return state.items.map(i=>({...i,...resolve({...i.source,quantity:1,columnAccessory:false})}))}
 // Constrain furniture to the room visible in the 3D viewport.
 function roomSize(){return window.RandalRoomSize(state.room?.dimensions);}
 function insideWall(a){const r=roomSize(),edge=r.width/2-.005;return a.x-a.w/2>=-edge-1e-7&&a.x+a.w/2<=edge+1e-7&&a.y>=0&&a.y+a.h<=r.height+.002;}
 function expandWidth(next){const r=roomSize();state.room.dimensions={...r,width:Math.min(7,Math.max(r.width,next))};}
 function rect(item){const c=resolve(item.source).config;return {x:item.position.x,y:item.position.y,w:Number(c.width)/100,h:Number(c.height)/100+(c.basinMode==='vessel'?.18:c.basinMode==='integrated'?.03:0)}}
 function overlaps(a,b,gap=.02){return Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y}
 function mirrorRect(item,mirror){const c=resolve(item.source).config,v=String(c.mirrorSize||'').match(/\d+/g)?.map(Number)||[60,80];return {x:mirror.position.x,y:mirror.position.y-(v[1]||v[0])/200,w:v[0]/100,h:(v[1]||v[0])/100}}
 function fits(item,list){const a=rect(item);if(!insideWall(a))return false;return !list.some(b=>b.id!==item.id&&(overlaps(a,rect(b),.035)||(b.mirrors||[]).some(m=>overlaps(a,mirrorRect(b,m)))))}
 function mirrorFits(item,m,list){const a=mirrorRect(item,m);return insideWall(a)&&a.y>=.3&&!list.some(b=>overlaps(a,rect(b))||(b.mirrors||[]).some(other=>other.id!==m.id&&overlaps(a,mirrorRect(b,other))))}
 function place(item,list,preferred){const candidates=[preferred??0];for(const other of list){const r=rect(other),w=rect(item).w;candidates.push(r.x+r.w/2+w/2+.10,r.x-r.w/2-w/2-.10)}candidates.sort((a,b)=>Math.abs(a-(preferred??0))-Math.abs(b-(preferred??0)));for(const x of candidates){const candidate={...item,position:{...item.position,x}};if(fits(candidate,list))return candidate}return null}
 function placeExpanding(item,list,preferred){
  let found=place(item,list,preferred);if(found)return found;
  const original=state.room.dimensions?clone(state.room.dimensions):undefined,start=roomSize().width;
  for(let cm=Math.ceil(start*100)+10;cm<=700;cm+=10){expandWidth(cm/100);found=place(item,list,preferred);if(found)return found;}
  state.room.dimensions=original;return null;
 }
 function mirrorSetup(item,list=[]){
  const c=resolve(item.source).config,values=String(c.mirrorSize||'').match(/\d+/g)?.map(Number)||[60,80],w=values[0]/100,h=(values[1]||values[0])/100;
  const count=c.mirror==='Sans miroir'?0:Math.max(1,Math.min(3,Number(c.mirrorQuantity)||1));item.mirrors=(item.mirrors||[]).slice(0,count);
  while(item.mirrors.length<count){const index=item.mirrors.length;item.mirrors.push({id:uid(),position:{x:item.position.x+index*(w+.10),y:Math.max(1.24,Number(c.height)/100+item.position.y+.18+h/2)}})}
  const all=[...list.filter(i=>i.id!==item.id),item];
  for(const m of item.mirrors){if(mirrorFits(item,m,all))continue;const desired=m.position.x,positions=[desired];for(const b of all){const r=rect(b);positions.push(r.x-r.w/2-w/2-.1,r.x+r.w/2+w/2+.1);for(const other of b.mirrors||[])if(other.id!==m.id){const mr=mirrorRect(b,other);positions.push(mr.x-(mr.w+w)/2-.1,mr.x+(mr.w+w)/2+.1)}}positions.sort((a,b)=>Math.abs(a-desired)-Math.abs(b-desired));let found=false;for(const x of positions){const candidate={...m,position:{...m.position,x}};if(mirrorFits(item,candidate,all)){m.position=candidate.position;found=true;break}}if(!found){
   const previous=state.room.dimensions?clone(state.room.dimensions):undefined,start=roomSize().width;
   for(let cm=Math.ceil(start*100)+10;cm<=700&&!found;cm+=10){expandWidth(cm/100);
    for(const x of positions){const candidate={...m,position:{...m.position,x}};if(mirrorFits(item,candidate,all)){m.position=candidate.position;found=true;break}}
   }
   if(!found){state.room.dimensions=previous;throw Error('Aucune place disponible pour ce miroir dans une salle de bains de 700 cm.');}
  }}
 }

 function emit(){for(const fn of listeners)fn(read())}
 function read(){const items=all(),rows=items.flatMap(i=>i.rows.map(r=>({...r,itemId:i.id,collection:i.source.model}))),total=Math.round(rows.reduce((s,r)=>s+(r.unit??0)*r.quantity,0)*100)/100;return {...clone(state),items,rows,total,selected}}
 function add(source,replacing){
  if(!Number.isInteger(Number(source.quantity??1))||Number(source.quantity??1)<1||Number(source.quantity??1)>9)throw Error('Choisissez une quantité entière de 1 à 9.');
  const r=resolve(source);if(!r.valid)throw Error('Terminez les choix du catalogue avant d’ajouter cet élément.');
  const originalRoom=clone(state.room);try{const draft=clone(state.items),quantity=Math.max(1,Math.min(9,Math.floor(Number(source.quantity)||1))),added=[];
  for(let n=0;n<quantity;n++){
   const base={...r.state,quantity:1,columnAccessory:false},old=n===0?draft.find(i=>i.id===replacing):null;
   const c=r.config,defaultY=c.kind==='column'||c.typeId.startsWith('three')||c.model==='Brent'?0:c.kind==='counter'?.8:.39;
   let item={id:old?.id||uid(),source:base,position:old?.position||{x:0,y:defaultY},mirrors:clone(old?.mirrors||[]),open:old?.open||false};
   if(old){draft.splice(draft.indexOf(old),1);if(!fits(item,draft)){
     // Keep the edited item in place; move nearest colliding neighbours only.
     for(let k=0;k<draft.length;k++)if(!fits(item,[draft[k]])){const moved=placeExpanding(draft[k],[item,...draft.filter((_,j)=>j!==k)],draft[k].position.x);if(!moved)throw Error('Cette largeur ne tient pas dans la composition. Déplacez un élément ou retirez-le.');draft[k]=moved;}
   }}
   if(!fits(item,draft))item=placeExpanding(item,draft,old?.position.x);if(!item)throw Error('Aucun emplacement libre dans les 700 cm de la pièce.');
   mirrorSetup(item,draft);draft.push(item);added.push(item.id);
   if(source.columnAccessory){
    const colSource={...base,typeId:'column',variantCode:'',mirror:'Sans miroir',basinMode:'none'},col=resolve(colSource);if(col.valid){const ci=placeExpanding({id:uid(),source:col.state,position:{x:0,y:0},open:false},draft,item.position.x+Number(c.width)/100);if(!ci)throw Error('Il ne reste pas de place pour la colonne assortie.');draft.push(ci)}
   }
  }
  state.items=draft;selected=added[0];emit();return added;}catch(e){state.room=originalRoom;throw e;}
 }
 function patch(id,value){const item=state.items.find(i=>i.id===id);if(!item)return;return add({...item.source,...value,quantity:1},id)}
 function duplicate(id){const item=state.items.find(i=>i.id===id);if(item)return add({...item.source,quantity:1})}
 function remove(id){const main=id.split(':')[0];if(id.includes(':mirror:')){const item=state.items.find(i=>i.id===main);if(!item)return;const mirrorId=id.split(':mirror:')[1];item.mirrors=item.mirrors.filter(m=>m.id!==mirrorId);patch(main,item.mirrors.length?{mirrorQuantity:item.mirrors.length}:{mirror:'Sans miroir',mirrorSize:'',mirrorFinish:''});}else{state.items=state.items.filter(i=>i.id!==main);if(selected?.split(':')[0]===main)selected=null;emit()}}
 function move(id,dx,dy){const main=id.split(':')[0],item=state.items.find(i=>i.id===main);if(!item)return false;if(id.includes(':mirror:')){const m=item.mirrors.find(m=>m.id===id.split(':mirror:')[1]);if(!m)return false;const candidate={...m,position:{x:m.position.x+dx,y:m.position.y+dy}};if(!mirrorFits(item,candidate,state.items))return false;m.position=candidate.position;emit();return true}const candidate={...item,position:{x:item.position.x+dx,y:Math.max(0,item.position.y+dy)}};if(!fits(candidate,state.items)||(item.mirrors||[]).some(m=>overlaps(rect(candidate),mirrorRect(item,m))))return false;item.position=candidate.position;emit();return true}
 function load(input){
  if(input?.version!==1||!Array.isArray(input.items)||input.items.length>60)throw Error('Format de projet non reconnu.');
  const next=clone(input),previous=state;
  if(new Set(next.items.map(i=>i.id)).size!==next.items.length)throw Error('Identifiants dupliqués dans ce projet.');
  for(const i of next.items)if(!i.position||!Number.isFinite(i.position.x)||!Number.isFinite(i.position.y)||!i.id||!resolve(i.source).valid)throw Error('Une référence ou position de ce projet doit être vérifiée.');
  state=next;state.room={floor:'elios-creta-ginepro',wall:'ivory',orientation:'horizontal',...state.room,dimensions:window.RandalRoomSize(state.room?.dimensions)};
  try{
   const placed=[];
   for(const i of next.items){
    const item=fits(i,placed)?i:placeExpanding(i,placed,i.position.x);
    if(!item)throw Error('Projet trop large pour une pièce de 700 cm. Aucune pièce n’a été supprimée.');
    mirrorSetup(item,placed);placed.push(item);
   }
   state.items=placed;selected=null;emit();
  }catch(e){state=previous;throw e;}
 }
 return {read,add,patch,duplicate,remove,move,load,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},select(id){selected=id;emit()},setMeta(v){if(v.room!==undefined){const original=state.room;state.room=clone(v.room);
    if(!state.items.every(i=>fits(i,state.items)&&(i.mirrors||[]).every(m=>mirrorFits(i,m,state.items)))){state.room=original;return false;}}
   for(const k of['name','client'])if(v[k]!==undefined)state[k]=clone(v[k]);emit();return true;},setOpen(ids,value){for(const i of state.items)if(ids.includes(i.id))i.open=value;emit()},clear(){state={...state,id:uid(),name:'Mon projet RANDAL',client:'',items:[]};selected=null;emit()},snapshot:()=>clone(state),roomSize,insideWall,collisions:()=>state.items.filter(i=>!fits(i,state.items)).map(i=>i.id)};
}
window.RandalCatalogueStore={create,uid};
})();
