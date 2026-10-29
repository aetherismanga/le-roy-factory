import * as T from 'three';
import {pickSelection} from './picking.js';
import {closeElementPanel} from './element-panels.js';
import {nichePlacement} from './niche-placement-math.js';
import {makeNicheGuide,disposeNicheGuide} from './niche-guides.js';

// One shared placement controller for both ateliers. The established editor,
// project format, finish handling and existing-niche dragging stay untouched.
export function withNichePlacement(api,mount){
 const {stage,canvas,camera,controls}=api;
 // Headless geometry/unit fixtures deliberately have no DOM or camera.
 if(!camera||!stage?.addEventListener||!document.createElementNS)return mount();
 let controller,active=null,bar=null,ghost=null,message=null,preview=null,swallowClick=false,toggle=null,guidesEnabled=true;
 const pointers=new Set(),guides=new Map();
 const visible=o=>{for(let p=o;p;p=p.parent)if(p.visible===false)return false;return true;};
 const visiting=()=>stage.classList.contains('walk-active');
 const readonly=()=>!!api.readonly();
 const style=document.createElement('style');
 style.textContent=`.niche-guide{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;overflow:hidden}.niche-guide polygon{fill:none;stroke:#846a32;stroke-width:2;stroke-dasharray:6 4;vector-effect:non-scaling-stroke}.niche-guide .niche-preview{fill:#bda15d22;stroke:#294b3f;stroke-width:3}.niche-guide .niche-preview[data-invalid=true]{stroke:#a13929;fill:#a1392922}.niche-placement-bar{position:absolute;left:12px;bottom:16px;z-index:46;max-width:calc(100% - 24px);display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #cdd1c4;border-radius:12px;background:#fffdf7;color:#29483e;box-sizing:border-box;font:13px/1.4 Arial,sans-serif;box-shadow:0 4px 18px #19352b22}.niche-placement-bar[hidden],.niche-cursor[hidden],.niche-guide[hidden]{display:none!important}.niche-placement-bar button{flex-shrink:0;min-width:44px;min-height:44px;padding:8px;border:1px solid #cdd1c4;border-radius:8px;background:#faf9f2;color:#29483e;cursor:pointer}.niche-placement-bar .niche-handle{cursor:grab;touch-action:none}.niche-placement-bar .niche-handle svg{display:block;width:44px;height:32px}.niche-cursor{position:absolute;z-index:47;pointer-events:none;width:54px;height:38px;filter:drop-shadow(0 1px 2px #fff);color:#294b3f}.niche-cursor svg{width:100%;height:100%}.niche-placement-active canvas{cursor:crosshair!important;touch-action:none}@media(max-width:760px){.niche-placement-bar{left:8px;bottom:8px;max-width:calc(100% - 16px);font-size:12px}.niche-placement-bar span{max-width:48vw}}`;
 document.head.append(style);
 const icon='<svg viewBox="0 0 60 40" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3h54v34H3z" stroke-dasharray="4 3"/><path d="M12 11h36v18H12zM3 3l9 8m45-8-9 8M3 37l9-8m45 8-9-8"/></svg>';
 function ui(){
  if(bar)return;
  bar=document.createElement('div');bar.className='niche-placement-bar lrf-workspace-overlay';bar.id='niche-placement-bar';bar.hidden=true;
  const handle=document.createElement('button');handle.type='button';handle.id='niche-placement-handle';handle.className='niche-handle';handle.setAttribute('aria-label','Glisser la niche sur un mur');handle.innerHTML=icon;bar.append(handle);
  message=document.createElement('span');message.setAttribute('role','status');bar.append(message);
  const cancel=document.createElement('button');cancel.type='button';cancel.id='cancel-niche-placement';cancel.textContent='Annuler';cancel.onclick=()=>stop();bar.append(cancel);stage.append(bar);
  ghost=document.createElement('div');ghost.className='niche-cursor';ghost.hidden=true;ghost.innerHTML=icon;ghost.setAttribute('aria-hidden','true');stage.append(ghost);
  toggle=document.createElement('button');toggle.type='button';toggle.id='toggle-niche-guides';toggle.className='niche-placement-bar';toggle.hidden=true;toggle.style.minHeight='44px';toggle.onclick=()=>setGuides(!guidesEnabled);stage.append(toggle);
 }
 function say(text){ui();if(message.textContent!==text)message.textContent=text;}
 function release(){for(const id of pointers)if(canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);pointers.clear();}
 function stop(){
  if(!active)return;
  const previous=active;active=null;preview=null;release();controls.enabled=previous.wasEnabled;controls.enableDamping=previous.wasDamping;controls.autoRotate=previous.wasAutoRotate;
  stage.classList.remove('niche-placement-active');bar.hidden=true;ghost.hidden=true;update();api.invalidate(false,false);
 }
 function start(){
  if(readonly()){api.status('Cette commande est validée. Dupliquez-la pour la modifier.');return false;}
  if(api.getComposition().locked){api.status('Déverrouillez la composition pour ajouter une niche.');return false;}
  if(visiting()){api.status('Quittez la visite 3D pour ajouter une niche.');return false;}
  stop();closeElementPanel();document.querySelector('#renovation-dialog')?.close();
  document.querySelector('#close-tile-zone-editor')?.click();document.querySelector('#close-calepinage-editor')?.click();
  ui();active={wasEnabled:controls.enabled,wasDamping:controls.enableDamping,wasAutoRotate:controls.autoRotate,multi:false};
  // Disabling input alone does not drain OrbitControls' accumulated damping.
  // Complete it before the first preview, then restore the user's settings.
  api.stopCamera?.();controls.enabled=false;controls.enableDamping=false;controls.autoRotate=false;controls.update();
  bar.hidden=false;stage.classList.add('niche-placement-active');
  say('Déplacez la niche sur le mur souhaité, puis cliquez pour la poser. Sur téléphone : touchez le mur ou glissez le dessin.');update();api.invalidate(false,false);return true;
 }
 function pointAt(event){
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height||event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)return null;
  const ndc=new T.Vector2((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2),hit=pickSelection(api.scene,camera,ndc);
  if(!hit)return {error:'Choisissez la face intérieure d’un mur.'};
  if(hit.itemId)return {error:'Choisissez une partie libre du mur, à côté des meubles.'};
  if(hit.editTarget?.startsWith('niche:'))return {error:'Une niche occupe déjà cet emplacement.'};
  const walls=api.getRoom().walls;
  let wall=/^wall:\d+$/.test(hit.editTarget||'')?walls[Number(hit.editTarget.slice(5))]:null;
  if(!wall){for(let o=hit.object;o&&!wall;o=o.parent)wall=walls.find(w=>w.group===o);}
  if(!wall||!visible(wall.group))return {error:'Choisissez la face intérieure d’un mur.'};
  const normal=new T.Vector3(0,0,1).applyQuaternion(wall.group.getWorldQuaternion(new T.Quaternion()));
  if(normal.dot(camera.getWorldPosition(new T.Vector3()).sub(hit.point))<=0)return {error:'Choisissez la face intérieure d’un mur.'};
  const local=wall.group.worldToLocal(hit.point.clone());
  if(Math.abs(local.z)>.03)return {error:'Choisissez la face intérieure d’un mur.'};
  return {...nichePlacement(api.getRoomConfig(),wall.key,local.x*100,local.y*100,{openings:wall.openings,zones:api.getWallFinish(walls.indexOf(wall))?.zones}),wall};
 }
 function move(event){
  const r=stage.getBoundingClientRect(),pointer={x:event.clientX,y:event.clientY};
  // Commit the footprint that was displayed, not a fresh ray at an unmoved
  // release while another frame is finishing its camera transition.
  if(!preview||!active.pointer||pointer.x!==active.pointer.x||pointer.y!==active.pointer.y)preview=pointAt(event);
  active.pointer=pointer;
  ghost.hidden=!preview;ghost.style.left=(event.clientX-r.left+13)+'px';ghost.style.top=(event.clientY-r.top+13)+'px';
  say(preview?.error|| (preview?.niche?'Relâchez ou cliquez pour poser la niche ici.':'Amenez le dessin sur un mur.'));
  update();api.invalidate(false,false);
 }
 function setGuides(value){guidesEnabled=!!value;update();api.checkpoint();api.invalidate(false);}
 function frontFacing(wall,niche){
  const normal=new T.Vector3(0,0,1).applyQuaternion(wall.group.getWorldQuaternion(new T.Quaternion())),center=wall.group.localToWorld(new T.Vector3(niche.u/100,(niche.bottom+niche.height/2)/100,0));
  return normal.dot(camera.getWorldPosition(new T.Vector3()).sub(center))>0;
 }
 function update(){
  if(!bar&&!api.getRoomConfig().niches?.length&&!active)return;
  ui();const hidden=readonly()||visiting();if(hidden&&active){stop();return;}
  if(active&&(readonly()||api.getComposition().locked)){stop();return;}
  api.scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const wanted=new Set(),draw=(wall,niche,isPreview=false,error='')=>{
   const id=isPreview?'preview':niche.id,signature=JSON.stringify([niche.width,niche.height,isPreview,!!error]);wanted.add(id);let entry=guides.get(id);
   if(entry&&(entry.wall!==wall||entry.signature!==signature)){disposeNicheGuide(entry.group);guides.delete(id);entry=null;}
   if(!entry){const group=makeNicheGuide(niche.width/100,niche.height/100,{preview:isPreview,invalid:!!error});wall.group.add(group);entry={group,wall,signature,preview:isPreview};guides.set(id,entry);}
   const offset=isPreview?null:wall.nicheLining?.getObjectByName('Niche_'+niche.id)?.position;
   entry.group.position.set((niche.u-niche.width/2)/100+(offset?.x||0),niche.bottom/100+(offset?.y||0),offset?.z||0);
   entry.group.visible=!hidden&&(isPreview||guidesEnabled)&&frontFacing(wall,niche);
  };
  for(const wall of api.getRoom().walls)for(const niche of wall.niches||[])draw(wall,niche);
  if(active&&preview?.niche)draw(preview.wall,preview.niche,true,preview.error);
  for(const [id,entry]of guides)if(!wanted.has(id)){disposeNicheGuide(entry.group);guides.delete(id);}
  toggle.hidden=hidden||!!active||!(api.getRoomConfig().niches?.length);toggle.textContent=guidesEnabled?'Masquer les repères des niches':'Afficher les repères des niches';toggle.setAttribute('aria-pressed',String(guidesEnabled));
 }
 const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
 // Register before the existing renovation handlers. Stage capture runs before
 // canvas furniture picking and OrbitControls, preventing accidental selection.
 stage.addEventListener('pointerdown',e=>{
  if(!active||e.button!==0||e.target!==canvas&&!e.target.closest?.('#niche-placement-handle'))return;
  if(pointers.size)active.multi=true;pointers.add(e.pointerId);canvas.setPointerCapture?.(e.pointerId);move(e);consume(e);
 },true);
 stage.addEventListener('pointermove',e=>{if(!active||e.target!==canvas&&!pointers.has(e.pointerId))return;move(e);consume(e);},true);
 stage.addEventListener('pointerup',e=>{
  if(!active||!pointers.has(e.pointerId))return;
  const multi=active.multi;pointers.delete(e.pointerId);if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);consume(e);swallowClick=true;
  if(multi){if(!pointers.size)active.multi=false;return;}
  move(e);if(!preview?.niche||preview.error)return;
  try{
   const value={...preview.niche,id:'niche-'+crypto.randomUUID()};controller.saveNiche(value);stop();api.status('Niche posée. Cliquez dessus pour régler ses dimensions, son fond et ses profilés.');
  }catch(error){say(error.message);}
 },true);
 stage.addEventListener('pointercancel',e=>{if(active&&pointers.has(e.pointerId)){consume(e);stop();}},true);
 stage.addEventListener('lostpointercapture',e=>{if(active&&pointers.has(e.pointerId))stop();},true);
 stage.addEventListener('click',e=>{if(e.target===canvas&&(active||swallowClick)){swallowClick=false;consume(e);}},true);
 stage.addEventListener('pointerdown',e=>{if(!active&&e.target===canvas)swallowClick=false;},true);
 document.addEventListener('keydown',e=>{if(active&&e.key==='Escape'){consume(e);stop();}},true);
 stage.addEventListener('pointerleave',()=>{if(active&&!pointers.size){preview=null;ghost.hidden=true;update();}});
 document.addEventListener('lrf-element-panel-open',()=>{if(active)stop();});
 window.addEventListener('blur',()=>stop());document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 controller=mount();
 const addMenu=document.querySelector('#add-menu');
 if(addMenu&&!addMenu.querySelector('#add-menu-niche')){
  const add=document.createElement('button');add.type='button';add.id='add-menu-niche';add.textContent='Ajouter une niche';add.onclick=()=>{addMenu.hidden=true;start();};addMenu.append(add);
 }
 const oldShow=controller.showNiche,oldRender=controller.renderContext,oldVisibility=controller.updateVisibility,oldRestore=controller.restore,oldState=controller.getState;
 controller.showNiche=(id=null,...args)=>id===null?start():oldShow(id,...args);
 controller.startNichePlacement=start;controller.cancelNichePlacement=stop;
 controller.getNichePlacementState=()=>({active:!!active,controlsEnabled:controls.enabled,valid:!!preview?.niche&&!preview.error,error:preview?.error||'',niche:preview?.niche||null});
 controller.setNicheGuidesVisible=setGuides;
 controller.getNicheGuideState=()=>({enabled:guidesEnabled,count:[...guides.values()].filter(g=>!g.preview).length,preview:[...guides.values()].some(g=>g.preview),depthTested:[...guides.values()].every(g=>g.group.children.every(line=>line.material.depthTest))});
 controller.getState=()=>({...oldState(),nicheGuidesVisible:guidesEnabled});
 controller.renderContext=(parent,target)=>{const result=oldRender(parent,target);const button=parent.querySelector?.('#context-add-niche');if(button)button.onclick=start;return result;};
 controller.updateVisibility=(...args)=>{oldVisibility(...args);update();};
 controller.restore=(data,...args)=>{stop();guidesEnabled=data?.nicheGuidesVisible!==false;const result=oldRestore(data,...args);update();return result;};
 return controller;
}
