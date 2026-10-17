/* Composition locale : identifiants durables, commandes atomiques, collisions en mètres. */
(()=>{'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),uid=()=>globalThis.crypto?.randomUUID?.()||'rc-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
function create(resolve){
 let state={version:1,id:uid(),name:'Mon projet RANDAL',client:'',items:[],room:{floor:'elios-creta-ginepro',wall:'ivory',orientation:'horizontal'}},selected=null,listeners=new Set();
 function all(){return state.items.map(i=>({...i,...resolve({...i.source,quantity:1,columnAccessory:false})}))}
 function rect(item){const c=resolve(item.source).config;return {x:item.position.x,y:item.position.y,w:Number(c.width)/100,h:Number(c.height)/100+(c.basinMode==='vessel'?.18:c.basinMode==='integrated'?.03:0)}}
 function fits(item,list){const a=rect(item);if(a.x-a.w/2< -4.5||a.x+a.w/2>4.5||a.y<0||a.y+a.h>3.6)return false;return !list.some(b=>{if(b.id===item.id)return false;const r=rect(b);return Math.abs(a.x-r.x)<(a.w+r.w)/2+.035&&a.y<r.y+r.h+.015&&a.y+a.h+.015>r.y})}
 function place(item,list,preferred){const candidates=[preferred??0];for(const other of list){const r=rect(other),w=rect(item).w;candidates.push(r.x+r.w/2+w/2+.10,r.x-r.w/2-w/2-.10)}candidates.sort((a,b)=>Math.abs(a-(preferred??0))-Math.abs(b-(preferred??0)));for(const x of candidates){const candidate={...item,position:{...item.position,x}};if(fits(candidate,list))return candidate}return null}
 function mirrorSetup(item){
  const c=resolve(item.source).config,values=String(c.mirrorSize||'').match(/\d+/g)?.map(Number)||[60,80],w=values[0]/100,h=(values[1]||values[0])/100;
  const count=c.mirror==='Sans miroir'?0:Math.max(1,Math.min(3,Number(c.mirrorQuantity)||1));item.mirrors=(item.mirrors||[]).slice(0,count);
  while(item.mirrors.length<count){const index=item.mirrors.length;item.mirrors.push({id:uid(),position:{x:item.position.x+index*(w+.10),y:Math.max(1.24,Number(c.height)/100+item.position.y+.18+h/2)}})}
 }
 function emit(){for(const fn of listeners)fn(read())}
 function read(){const items=all(),rows=items.flatMap(i=>i.rows.map(r=>({...r,itemId:i.id,collection:i.source.model}))),total=Math.round(rows.reduce((s,r)=>s+(r.unit??0)*r.quantity,0)*100)/100;return {...clone(state),items,rows,total,selected}}
 function add(source,replacing){
  if(!Number.isInteger(Number(source.quantity??1))||Number(source.quantity??1)<1||Number(source.quantity??1)>9)throw Error('Choisissez une quantité entière de 1 à 9.');
  const r=resolve(source);if(!r.valid)throw Error('Terminez les choix du catalogue avant d’ajouter cet élément.');
  const draft=clone(state.items),quantity=Math.max(1,Math.min(9,Math.floor(Number(source.quantity)||1))),added=[];
  for(let n=0;n<quantity;n++){
   const base={...r.state,quantity:1,columnAccessory:false},old=n===0?draft.find(i=>i.id===replacing):null;
   const c=r.config,defaultY=c.kind==='column'||c.typeId.startsWith('three')||c.model==='Brent'?0:c.kind==='counter'?.8:.39;
   let item={id:old?.id||uid(),source:base,position:old?.position||{x:0,y:defaultY},mirrors:clone(old?.mirrors||[]),open:old?.open||false};
   if(old){draft.splice(draft.indexOf(old),1);if(!fits(item,draft)){
     // Keep the edited item in place; move nearest colliding neighbours only.
     for(let k=0;k<draft.length;k++)if(!fits(item,[draft[k]])){const moved=place(draft[k],[item,...draft.filter((_,j)=>j!==k)],draft[k].position.x);if(!moved)throw Error('Cette largeur ne tient pas dans la composition. Déplacez un élément ou retirez-le.');draft[k]=moved;}
   }}
   if(!fits(item,draft))item=place(item,draft,old?.position.x);if(!item)throw Error('Aucun emplacement disponible sur le mur de 9 m. Retirez ou déplacez un élément.');
   mirrorSetup(item);draft.push(item);added.push(item.id);
   if(source.columnAccessory){
    const colSource={...base,typeId:'column',variantCode:'',mirror:'Sans miroir',basinMode:'none'},col=resolve(colSource);if(col.valid){const ci=place({id:uid(),source:col.state,position:{x:0,y:0},open:false},draft,item.position.x+Number(c.width)/100);if(!ci)throw Error('Il ne reste pas de place pour la colonne assortie.');draft.push(ci)}
   }
  }
  state.items=draft;selected=added[0];emit();return added;
 }
 function patch(id,value){const item=state.items.find(i=>i.id===id);if(!item)return;return add({...item.source,...value,quantity:1},id)}
 function duplicate(id){const item=state.items.find(i=>i.id===id);if(item)return add({...item.source,quantity:1})}
 function remove(id){const main=id.split(':')[0];if(id.includes(':mirror:')){const item=state.items.find(i=>i.id===main);if(!item)return;const mirrorId=id.split(':mirror:')[1];item.mirrors=item.mirrors.filter(m=>m.id!==mirrorId);patch(main,item.mirrors.length?{mirrorQuantity:item.mirrors.length}:{mirror:'Sans miroir',mirrorSize:'',mirrorFinish:''});}else{state.items=state.items.filter(i=>i.id!==main);if(selected?.split(':')[0]===main)selected=null;emit()}}
 function move(id,dx,dy){const main=id.split(':')[0],item=state.items.find(i=>i.id===main);if(!item)return false;if(id.includes(':mirror:')){const m=item.mirrors.find(m=>m.id===id.split(':mirror:')[1]);if(!m)return false;m.position={x:Math.max(-4.2,Math.min(4.2,m.position.x+dx)),y:Math.max(.5,Math.min(3,m.position.y+dy))};emit();return true}const candidate={...item,position:{x:item.position.x+dx,y:Math.max(0,item.position.y+dy)}};if(!fits(candidate,state.items))return false;item.position=candidate.position;emit();return true}
 function load(input){if(input?.version!==1||!Array.isArray(input.items))throw Error('Format de projet non reconnu.');const next=clone(input);for(const i of next.items){if(!i.position||!Number.isFinite(i.position.x)||!Number.isFinite(i.position.y))throw Error('Position invalide dans le projet.');if(!i.id||!resolve(i.source).valid)throw Error('Une référence de ce projet doit être vérifiée dans le catalogue.');mirrorSetup(i);if(!fits(i,next.items))throw Error('Ce projet comporte une collision. Sa composition a été conservée ; vérifiez les positions.')}if(new Set(next.items.map(i=>i.id)).size!==next.items.length)throw Error('Identifiants dupliqués dans ce projet.');state=next;selected=null;emit()}
 return {read,add,patch,duplicate,remove,move,load,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},select(id){selected=id;emit()},setMeta(v){for(const k of['name','client','room'])if(v[k]!==undefined)state[k]=clone(v[k]);emit()},setOpen(ids,value){for(const i of state.items)if(ids.includes(i.id))i.open=value;emit()},clear(){state={...state,id:uid(),name:'Mon projet RANDAL',client:'',items:[]};selected=null;emit()},snapshot:()=>clone(state),collisions:()=>state.items.filter(i=>!fits(i,state.items)).map(i=>i.id)};
}
window.RandalCatalogueStore={create,uid};
})();
