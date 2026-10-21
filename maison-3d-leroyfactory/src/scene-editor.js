import * as T from 'three';
import {ROOMS,SCALE,LEVEL_HEIGHT,unpoint,roomAt,roomBounds} from './plan.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round=v=>Math.round(v*10)/10;

export function createSceneEditor(api){
 const {canvas,camera,controls,scene}=api,ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(),v=new T.Vector3(),history=[],future=[];
 let selected=null,drag=null,helper=null,lastMessage='';
 const reg=()=>api.getHouse().arrangement,active=()=>api.active();
 function refresh(){api.refresh?.();}
 function message(text){lastMessage=text;api.status(text);}
 function clearHelper(){if(helper){scene.remove(helper);helper.geometry.dispose();helper.material.dispose();helper=null;}}
 function highlight(valid=true){clearHelper();const it=reg().items.get(selected);if(!it||!it.root.visible||!active())return;it.root.updateWorldMatrix(true,true);helper=new T.Box3Helper(new T.Box3(new T.Vector3(-it.dimensions.x/2,0,-it.dimensions.z/2),new T.Vector3(it.dimensions.x/2,it.dimensions.y,it.dimensions.z/2)).applyMatrix4(it.root.matrixWorld),valid?0xb39258:0xc04c40);helper.userData.editorHelper=true;helper.raycast=()=>{};helper.material.depthTest=false;helper.renderOrder=100;scene.add(helper);api.invalidate();}
 function select(id){if(!reg().items.has(id))return false;selected=id;lastMessage='';highlight();refresh();return true;}
 function finishCommit(before,id,patch){const result=reg().update(id,patch);if(!result.ok){message(result.errors[0]);highlight(false);refresh();return result;}
  history.push({id,before,after:reg().read(reg().items.get(id))});if(history.length>60)history.shift();future.length=0;api.onCommit();highlight();return result;
 }
 function update(id,patch){const it=reg().items.get(id);if(!it)return {ok:false,errors:['Élément introuvable.']};const result=finishCommit(reg().read(it),id,patch);if(result.ok){lastMessage='Aménagement enregistré.';refresh();}return result;}
 function undo(redo=false){const from=redo?future:history,to=redo?history:future,entry=from.pop();if(!entry)return false;const it=reg().items.get(entry.id);if(!it)return false;const s=structuredClone(redo?entry.after:entry.before);reg().apply(it,s);api.getProject().items??={};api.getProject().items[entry.id]=s;to.push(entry);selected=entry.id;lastMessage=redo?'Modification rétablie.':'Modification annulée.';api.onCommit();highlight();refresh();return true;}
 function pointer(e){camera.updateMatrixWorld(true);const b=canvas.getBoundingClientRect();ndc.set((e.clientX-b.x)/b.width*2-1,-(e.clientY-b.y)/b.height*2+1);ray.setFromCamera(ndc,camera);}
 function stop(e){e.preventDefault();e.stopImmediatePropagation();}
 canvas.addEventListener('pointerdown',e=>{
  if(!active()||e.button>0)return;pointer(e);const roots=[...reg().items.values()].filter(i=>i.floor===api.getState().floor&&i.root.visible).map(i=>i.root),hit=ray.intersectObjects(roots,true).find(h=>h.object.visible);if(!hit)return;
  let o=hit.object;while(o&&!o.userData.editableId)o=o.parent;if(!o)return;
  stop(e);select(o.userData.editableId);const it=reg().items.get(selected);plane.set(new T.Vector3(0,1,0),-(it.floor*LEVEL_HEIGHT+it.root.position.y));if(!ray.ray.intersectPlane(plane,v))return;
  drag={id:selected,pointer:e.pointerId,start:[e.clientX,e.clientY],anchor:v.clone(),position:it.root.position.clone(),before:reg().read(it),moved:false};controls.enabled=false;canvas.setPointerCapture(e.pointerId);canvas.classList.add('moving-furniture');
 },{capture:true});
 canvas.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;stop(e);if(Math.hypot(e.clientX-drag.start[0],e.clientY-drag.start[1])<4&&!drag.moved)return;pointer(e);if(!ray.ray.intersectPlane(plane,v))return;
  drag.moved=true;const it=reg().items.get(drag.id),p=drag.position.clone().add(v.clone().sub(drag.anchor)),[x,z]=unpoint(p.x,p.z),r=roomAt(x,z,it.floor)||ROOMS.find(r=>r.id===drag.before.room),b=roomBounds(r),snap=e.shiftKey?1:5;
  const patch={...drag.before,room:r.id,x:Math.round((x-b.x)*SCALE*100/snap)*snap,z:Math.round((z-b.z)*SCALE*100/snap)*snap};drag.patch=patch;drag.result=reg().update(it.id,patch,{preview:true});highlight(drag.result.ok);api.invalidate();
 },{capture:true});
 function release(e,cancel=false){if(!drag||e.pointerId!==drag.pointer)return;stop(e);const d=drag;drag=null;controls.enabled=true;canvas.classList.remove('moving-furniture');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);const it=reg().items.get(d.id);reg().apply(it,d.before);
  if(d.moved&&!cancel){const result=finishCommit(d.before,d.id,d.patch);lastMessage=result.ok?'Élément déplacé · position enregistrée.':result.errors[0];}highlight();refresh();api.invalidate();
 }
 canvas.addEventListener('pointerup',e=>release(e),{capture:true});canvas.addEventListener('pointercancel',e=>release(e,true),{capture:true});
 window.addEventListener('keydown',e=>{if(!active()||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();undo(true);}else if(e.key==='Delete'&&selected){e.preventDefault();update(selected,{hidden:true});}else if(e.key==='Escape'){selected=null;clearHelper();refresh();}});
 function render(body,room,actions){
  const list=reg().list().filter(i=>i.room===room.id),current=reg().items.get(selected),item=current&&current.room===room.id?reg().describe(current):null;
  const input=(key,label,min=0,max=1500)=>`<label>${label}<input type="number" id="item-${key}" name="${key}" min="${min}" max="${max}" step="0.1" value="${round(item[key])}" required></label>`;
  body.innerHTML=`<p class="workshop-kicker">La maison se compose avec vous</p><h4>Aménager la pièce</h4><p class="workshop-copy">Touchez un élément dans la vue 3D, puis glissez-le. Les murs, les portes et l’escalier doivent rester dégagés.</p><div class="edit-history"><button id="item-undo" class="secondary" ${history.length?'':'disabled'}>↶ Annuler</button><button id="item-redo" class="secondary" ${future.length?'':'disabled'}>↷ Rétablir</button></div><label>Éléments de la pièce<select id="item-select"><option value="">Choisir dans la vue ou la liste</option>${list.map(i=>`<option value="${esc(i.id)}" ${item?.id===i.id?'selected':''}>${i.hidden?'[Retiré] ':''}${esc(i.name)}</option>`).join('')}</select></label>${item?`<div class="item-heading"><b>${esc(item.name)}</b><span>${round(item.width)} × ${round(item.depth)} × ${round(item.height)} cm</span></div>${item.hidden?`<p class="workshop-copy">Cet élément a été retiré de la composition. Il reste disponible pour être réinstallé.</p><button id="item-restore" class="primary workshop-apply">Réinstaller cet élément</button>`:`<form id="item-form"><label>Pièce de destination<select id="item-room" name="room">${ROOMS.filter(r=>r.floor===item.floor).map(r=>`<option value="${r.id}" ${r.id===item.room?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label><div class="form-grid">${input('x','Position X · cm depuis la gauche')}${input('z','Position Y · cm depuis le fond')}${input('angle','Rotation · degrés',-360,360)}${input('y','Hauteur sous l’élément · cm',0,260)}</div>${item.fixed?`<p class="field-note">Les dimensions de ce produit sont conservées. ${['vanity','column'].includes(item.kind)?'Le modèle, la largeur et les finitions se règlent dans « Mobilier RANDAL ».':''}</p>`:`<h5>Dimensions de l’élément · cm</h5><div class="form-grid">${input('width','Largeur',5,600)}${input('depth','Profondeur',2,600)}${input('height','Hauteur',1,260)}</div>`}${['vanity','column'].includes(item.kind)?'':`<label>Teinte de visualisation<input id="item-color" name="color" type="color" value="${item.color||'#d6c6ad'}"></label><p class="field-note">La teinte s’applique à cet élément. Le verre et les sources lumineuses conservent leur rendu.</p>`}<button type="submit" class="primary workshop-apply">Appliquer les réglages <span>↗</span></button></form><div class="form-grid"><button id="item-rotate" class="secondary">Tourner de 90°</button><button id="item-focus" class="secondary">Cadrer l’élément</button></div>${['vanity','column'].includes(item.kind)?'<button id="item-catalogue" class="secondary">Modèle & finitions RANDAL ↗</button>':''}<button id="item-remove" class="secondary danger-outline">Retirer de la composition</button>`}<button id="item-reset" class="text-button">Rétablir la position et l’aspect initiaux →</button>`:'<p class="field-note">Chaque chaise, tabouret, meuble, sanitaire et décor peut être sélectionné séparément. Les déplacements sont aimantés tous les 5 cm ; les champs permettent un placement précis.</p>'}<p class="edit-feedback" role="status">${esc(lastMessage)}</p><button id="item-return-visit" class="secondary">Reprendre la visite ↗</button>`;
  const $=s=>body.querySelector(s);
  $('#item-undo').onclick=()=>undo();$('#item-redo').onclick=()=>undo(true);$('#item-select').onchange=e=>{if(e.target.value)select(e.target.value);};$('#item-return-visit').onclick=()=>{clearHelper();actions.visit();};
  if(!item){clearHelper();return;}
  if($('#item-form'))$('#item-form').onsubmit=e=>{e.preventDefault();const data=new FormData(e.currentTarget),patch={};for(const [key,value]of data){if(key==='color'&&!$('#item-color').dataset.changed&&!item.color)continue;patch[key]=['room','color'].includes(key)?value:+value;}const destination=ROOMS.find(r=>r.id===patch.room);if(destination.id!==item.room){const b=roomBounds(destination);patch.x=Math.min(patch.x,b.w*SCALE*100-item.width/2-2);patch.z=Math.min(patch.z,b.d*SCALE*100-item.depth/2-2);}update(item.id,patch);};
  if($('#item-color'))$('#item-color').oninput=e=>e.target.dataset.changed='true';
  if($('#item-restore'))$('#item-restore').onclick=()=>update(item.id,{hidden:false});
  if($('#item-remove'))$('#item-remove').onclick=()=>{const r=update(item.id,{hidden:true});if(r.ok){lastMessage='Élément retiré. « Annuler » ou « Réinstaller » permet de le retrouver.';refresh();}};
  if($('#item-rotate'))$('#item-rotate').onclick=()=>update(item.id,{angle:(item.angle+90)%360});
  if($('#item-focus'))$('#item-focus').onclick=()=>api.focus(item);
  if($('#item-catalogue'))$('#item-catalogue').onclick=()=>actions.catalogue();
  $('#item-reset').onclick=()=>{const it=reg().items.get(item.id),before=reg().read(it),r=reg().reset(item.id);if(r.ok){history.push({id:item.id,before,after:reg().read(it)});future.length=0;api.onCommit();highlight();refresh();}else{message(r.errors[0]);refresh();}};
  highlight();
 }
 return {render,select,update,undo,refreshHelper:()=>active()?highlight():clearHelper(),get selected(){return selected;},get dragging(){return !!drag;},reset(){selected=null;history.length=0;future.length=0;clearHelper();}};
}
