import {resolveShowroomHDGallery} from './showroom-hd-gallery.js';
import * as T from 'three';

const localPoint=(item,point)=>{item.asset.visitInterior.root.updateWorldMatrix(true,false);return item.asset.visitInterior.root.worldToLocal(point.clone());};
const eligible=item=>item.type==='door'&&item.asset?.visitInterior&&item.asset.interiorEnabled!==false;

// Exhibition space belongs to an exterior opening, never to the project model.
// Only the vestibule reached through that opening can admit the walker.
export function showroomMoveAllowed(items,from,to,radius=.20){
 for(const item of items.filter(eligible)){
  const space=item.asset.visitInterior,a=localPoint(item,from),b=localPoint(item,to);
  if(!item.settings?.doorOpen&&!space.occupied)continue;
  const inSpace=a.z<-.24&&space.canWalk(a,0)===true;
  const nearPortal=Math.abs(a.x)<(item.dimensions?.width||.83)/2&&a.z<.18&&a.z>-.65;
  if(!inSpace&&!nearPortal)continue;
  const allowed=space.canWalk(b,radius);
  if(allowed!==null)return allowed;
 }
 return null;
}

function nearestPhysicalHit(root,ray){
 const hits=[];root.updateWorldMatrix(true,true);
 root.traverseVisible(object=>{if(!object.isMesh)return;(object.isInstancedMesh?T.InstancedMesh.prototype:T.Mesh.prototype).raycast.call(object,ray,hits);});
 return hits.sort((a,b)=>a.distance-b.distance)[0]||null;
}

export function createShowroomVisit({stage,canvas,camera,getItems,onInvalidate=()=>{},onOverlay=()=>{}}){
 let occupiedId=null,dialog=null,previousFocus=null;
 const point=new T.Vector3(),ray=new T.Raycaster();ray.far=7;
 function close(){if(!dialog)return;dialog.close?.();dialog.remove();dialog=null;previousFocus?.focus?.();onOverlay(false);onInvalidate();}
 const element=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
 function openCollection(manufacturer,selected=null){
  close();previousFocus=document.activeElement;
  dialog=element('dialog',undefined,'lrf-showroom-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',selected?selected.name+' · '+manufacturer.name:'Collections '+manufacturer.name);
  const style=element('style');style.textContent=`
   .lrf-showroom-dialog{box-sizing:border-box;width:min(1280px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);padding:0;border:1px solid #b6a582;border-radius:16px;background:#f3f0e8;color:#242b27;font:14px/1.5 system-ui;box-shadow:0 24px 80px #0006;overflow:auto;overscroll-behavior:contain}.lrf-showroom-dialog::backdrop{background:#101713bd;backdrop-filter:blur(7px)}
   .lrf-showroom-dialog header{display:flex;align-items:center;gap:14px;padding:13px 20px;border-bottom:1px solid #d8d2c5;position:sticky;top:0;z-index:2;background:#f3f0e8}.lrf-showroom-dialog h2{font-size:22px;line-height:1.25;margin:0;flex:1}.lrf-showroom-dialog button,.lrf-showroom-dialog a{font:inherit;cursor:pointer}.lrf-showroom-close{color:#242b27;border:1px solid #c8c0b0;background:#fff;border-radius:50%;width:38px;min-width:38px;height:38px;font-size:24px!important;line-height:1}.lrf-showroom-body{padding:18px 20px}.lrf-showroom-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}.lrf-showroom-card{border:1px solid #d8d2c5;border-radius:10px;padding:0;overflow:hidden;background:#fff;text-align:left;color:inherit}.lrf-showroom-card img{width:100%;aspect-ratio:1.2;object-fit:cover;display:block}.lrf-showroom-card strong{display:block;padding:10px}.lrf-showroom-dialog input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #bbb4a6;border-radius:8px;margin-bottom:18px;font:inherit}.lrf-showroom-detail{display:grid;grid-template-columns:minmax(0,1fr) 264px;gap:22px;align-items:start}.lrf-showroom-gallery{min-width:0}.lrf-showroom-hero{position:relative;display:block;box-sizing:border-box;width:100%;height:clamp(240px,59dvh,760px);overflow:auto;border:1px solid #b9b5aa;border-radius:10px;background:#252c28;padding:0;touch-action:pan-x pan-y pinch-zoom;overscroll-behavior:contain;cursor:zoom-in!important}.lrf-showroom-hero img{display:block;width:100%;height:100%;object-fit:contain;max-width:none;max-height:none;margin:auto}.lrf-showroom-hero.is-zoomed{cursor:zoom-out!important}.lrf-showroom-hero.is-zoomed img{width:auto;height:auto;min-width:0;min-height:0;object-fit:initial;margin:0}.lrf-showroom-gallery-tools{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:10px 0}.lrf-showroom-gallery-tools button,.lrf-showroom-gallery-tools a{padding:7px 11px;border:1px solid #b5b5a7;border-radius:7px;background:#fff;color:#2d4539;text-decoration:none}.lrf-showroom-gallery-status{font-size:12px;color:#596259;flex:1;min-width:120px}.lrf-showroom-gallery-options{display:flex;gap:7px;overflow:auto;max-width:100%;padding:3px 0 9px;overscroll-behavior:contain}.lrf-showroom-gallery-options button{flex:0 0 auto;display:flex;align-items:center;gap:7px;max-width:210px;padding:8px 12px;border:1px solid #bfb9ac;border-radius:7px;background:#fff;color:#2e3b32;text-align:left;font-size:12px;line-height:1.3}.lrf-showroom-gallery-options button[aria-pressed=true]{border-color:#aa8b50;background:#e8dec9;box-shadow:inset 0 0 0 1px #aa8b50}.lrf-showroom-gallery-options img{width:40px;height:40px;object-fit:cover;border-radius:3px}.lrf-showroom-link{display:inline-block;padding:10px 16px;margin-top:14px;background:#203f36;color:#fff!important;text-decoration:none;border-radius:8px}.lrf-showroom-count{color:#687066;margin:0 0 14px}.lrf-showroom-back{border:0;background:transparent;text-decoration:underline;padding:0;margin-bottom:13px;color:#354c42}.lrf-showroom-selected{padding:10px 12px;border-left:3px solid #ac8e54;background:#e9e5da;color:#384239}.lrf-showroom-detail aside p{margin:0 0 14px}.lrf-showroom-dialog button:focus-visible,.lrf-showroom-dialog a:focus-visible{outline:3px solid #b09b6f;outline-offset:3px}@media(max-width:760px){.lrf-showroom-detail{grid-template-columns:1fr;gap:12px}.lrf-showroom-dialog header{padding:10px 13px}.lrf-showroom-dialog h2{font-size:19px}.lrf-showroom-body{padding:12px}.lrf-showroom-hero{height:55dvh;min-height:230px}.lrf-showroom-detail aside{font-size:13px}.lrf-showroom-detail aside p{margin-bottom:9px}}@media(orientation:landscape) and (max-height:600px){.lrf-showroom-dialog{width:calc(100vw - 16px);max-height:calc(100dvh - 16px)}.lrf-showroom-hero{height:calc(100dvh - 150px);min-height:180px}.lrf-showroom-detail{grid-template-columns:minmax(0,1fr) 230px}.lrf-showroom-dialog header{padding:8px 14px}.lrf-showroom-body{padding:10px 14px}.lrf-showroom-back{margin-bottom:8px}}`;
  dialog.append(style);const header=element('header'),title=element('h2',selected?.name||manufacturer.name),exit=element('button','×','lrf-showroom-close');exit.type='button';exit.setAttribute('aria-label','Fermer la collection');exit.addEventListener('click',close);header.append(title,exit);dialog.append(header);
  const body=element('div',undefined,'lrf-showroom-body');dialog.append(body);
  const link=(label,href,className='lrf-showroom-link')=>{const a=element('a',label,className);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;};
  if(selected){
   const back=element('button','← Toutes les collections '+manufacturer.name,'lrf-showroom-back');back.type='button';back.addEventListener('click',()=>openCollection(manufacturer));body.append(back);
   const detail=element('div',undefined,'lrf-showroom-detail'),gallery=element('div',undefined,'lrf-showroom-gallery'),hero=element('button',undefined,'lrf-showroom-hero'),image=element('img'),tools=element('div',undefined,'lrf-showroom-gallery-tools'),status=element('span',undefined,'lrf-showroom-gallery-status'),zoom=element('button','Zoom 100 %'),original=link('Ouvrir l’image originale','#',''),options=element('div',undefined,'lrf-showroom-gallery-options');
   const images=resolveShowroomHDGallery(manufacturer,selected),buttons=[];let activeIndex=0,zoomed=false;
   hero.type='button';hero.setAttribute('aria-label','Agrandir le visuel à sa définition d’origine');hero.append(image);image.decoding='async';image.fetchPriority='high';image.draggable=false;zoom.type='button';status.setAttribute('role','status');options.setAttribute('role','group');options.setAttribute('aria-label','Visuels et coloris de la collection');
   function setZoom(next){zoomed=!!next;hero.classList.toggle('is-zoomed',zoomed);hero.setAttribute('aria-label',zoomed?'Revenir à la vue d’ensemble':'Agrandir le visuel à sa définition d’origine');zoom.textContent=zoomed?'Vue d’ensemble':'Zoom 100 %';zoom.setAttribute('aria-pressed',String(zoomed));if(!zoomed){hero.scrollLeft=0;hero.scrollTop=0;}}
   function showImage(index){const entry=images[index];if(!entry)return;activeIndex=index;setZoom(false);image.src=entry.url;image.alt=selected.name+' · '+entry.label;original.href=entry.url;status.textContent=entry.label+' · '+(index+1)+' / '+images.length;for(const [i,button]of buttons.entries())button.setAttribute('aria-pressed',String(i===index));}
   hero.addEventListener('click',()=>setZoom(!zoomed));zoom.addEventListener('click',()=>setZoom(!zoomed));image.addEventListener('error',()=>{status.textContent='Ce visuel est indisponible. Retrouvez les autres images dans la fiche collection.';});
   for(const [index,entry]of images.entries()){
    const button=element('button');button.type='button';button.setAttribute('aria-label',entry.label);button.setAttribute('aria-pressed','false');
    // Native originals load only when selected. A reviewed small derivative may
    // supply a thumbnail; absent one, a labelled chip avoids downloading every HD face.
    if(entry.preview){const thumbnail=element('img');thumbnail.src=entry.preview;thumbnail.alt='';thumbnail.loading='lazy';button.append(thumbnail);}
    button.append(element('span',entry.label));button.addEventListener('click',()=>showImage(index));buttons.push(button);options.append(button);
   }
   tools.append(status,zoom,original);gallery.append(hero,tools,options);if(!images.length){hero.hidden=true;zoom.hidden=true;original.hidden=true;options.hidden=true;status.textContent='Les visuels sont disponibles dans la fiche collection.';}
   const info=element('aside');info.append(element('p',manufacturer.name,'lrf-showroom-count'));
   const shown=[selected.selectedColor,selected.selectedFormat].filter(Boolean);if(shown.length)info.append(element('p','Ce revêtement : '+shown.join(' · '),'lrf-showroom-selected'));
   if(selected.imageKind==='catalogue')info.append(element('p','Visuel de catalogue. Consultez la collection pour les modèles disponibles.'));
   if(selected.formats?.length)info.append(element('p','Formats : '+selected.formats.join(' · ')));
   if(selected.colors?.length)info.append(element('p','Coloris : '+selected.colors.join(' · ')));
   info.append(link('Voir la collection complète',selected.href||manufacturer.href));detail.append(gallery,info);body.append(detail);showImage(activeIndex);
  }else{
   body.append(element('p',manufacturer.category+' · '+manufacturer.collections.length+' collections et gammes','lrf-showroom-count'));
   const search=element('input');search.type='search';search.placeholder='Rechercher une collection…';search.setAttribute('aria-label','Rechercher dans les collections');body.append(search);
   const grid=element('div',undefined,'lrf-showroom-grid');body.append(grid);
   const render=()=>{grid.replaceChildren();const query=search.value.trim().toLocaleLowerCase('fr');for(const collection of manufacturer.collections.filter(c=>c.name.toLocaleLowerCase('fr').includes(query))){const card=element('button',undefined,'lrf-showroom-card');card.type='button';const img=element('img');img.src=collection.image;img.alt=collection.name;img.loading='lazy';card.append(img,element('strong',collection.name));card.addEventListener('click',()=>openCollection(manufacturer,collection));grid.append(card);}if(!grid.childElementCount)grid.append(element('p','Aucune collection ne correspond à cette recherche.'));};
   search.addEventListener('input',render);render();body.append(link('Ouvrir la sélection '+manufacturer.name,manufacturer.href));
  }
  stage.append(dialog);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});dialog.showModal();exit.focus();onOverlay(true);onInvalidate();
 }
 function update(position){
  occupiedId=null;
  for(const item of getItems().filter(eligible)){
   const space=item.asset.visitInterior,local=localPoint(item,position),occupied=local.z<-.25&&space.canWalk(local,0)===true;
   space.setOccupied(occupied);if(occupied){occupiedId=item.id;item.root.visible=true;space.root.visible=true;space.prepareNear(local);}
  }
 }
 function tap(event){
  const items=getItems().filter(eligible),current=items.find(item=>item.id===occupiedId);
  if(!current)return false;
  const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);ray.far=7;
  const space=current.asset.visitInterior,hit=nearestPhysicalHit(space.root,ray);if(!hit)return false;
  for(let object=hit.object;object&&object!==space.root.parent;object=object.parent){
   const action=object.userData.showroomAction;
   if(action?.kind==='inner-door'){
    // Keep an occupied exhibition visible; the door can be closed on returning
    // to the vestibule without making the hall vanish under the visitor.
    const local=localPoint(current,point.copy(camera.position));if(space.innerOpen&&local.z<-3.1)return true;
    space.toggleInner();onInvalidate();return true;
   }
   if(action){const hall=space.showroom;if(action.kind==='catalogue'){const manufacturer=hall?.panels.find(p=>p.manufacturer.id===action.manufacturerId)?.manufacturer;if(manufacturer)openCollection(manufacturer);}else hall?.activateAction?.(action);onInvalidate();return true;}
   const entry=object.userData.showroomCollection;if(entry){openCollection(entry.manufacturer,entry.collection);return true;}
  }
  return false;
 }
 return {update,tap,get occupiedId(){return occupiedId},get blocked(){return !!dialog},close,exit(){close();occupiedId=null;for(const item of getItems().filter(eligible)){item.asset.visitInterior.endVisit();item.asset.visitInterior.setVisible(item.settings?.doorOpen===true);}},openCollection};
}
