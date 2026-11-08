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
  dialog=element('dialog',undefined,'lrf-showroom-dialog');dialog.setAttribute('aria-label',selected?selected.name+' · '+manufacturer.name:'Collections '+manufacturer.name);
  const style=element('style');style.textContent=`
   .lrf-showroom-dialog{box-sizing:border-box;width:min(900px,calc(100vw - 24px));max-height:88dvh;padding:0;border:1px solid #c5b388;border-radius:18px;background:#f5f2eb;color:#202622;font:14px/1.5 system-ui;box-shadow:0 24px 80px #0005}.lrf-showroom-dialog::backdrop{background:#1017149c;backdrop-filter:blur(6px)}
   .lrf-showroom-dialog header{display:flex;align-items:center;gap:12px;padding:18px 22px;border-bottom:1px solid #d8d4c9;position:sticky;top:0;z-index:2;background:#f5f2eb}.lrf-showroom-dialog h2{font-size:21px;margin:0;flex:1}.lrf-showroom-dialog button,.lrf-showroom-dialog a{font:inherit;cursor:pointer}.lrf-showroom-close{color:#202622;border:1px solid #c8c6bc;background:white;border-radius:50%;width:36px;height:36px;font-size:22px!important}.lrf-showroom-body{padding:20px}.lrf-showroom-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}.lrf-showroom-card{border:1px solid #d8d4c9;border-radius:10px;padding:0;overflow:hidden;background:white;text-align:left;color:inherit}.lrf-showroom-card img{width:100%;aspect-ratio:1.2;object-fit:cover;display:block}.lrf-showroom-card strong{display:block;padding:10px}.lrf-showroom-dialog input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #bbb9ae;border-radius:8px;margin-bottom:18px;font:inherit}.lrf-showroom-detail{display:grid;grid-template-columns:1.2fr 1fr;gap:24px}.lrf-showroom-detail img{width:100%;max-height:55dvh;object-fit:contain;border-radius:10px;background:#e8e4dc}.lrf-showroom-link{display:inline-block;padding:10px 16px;margin-top:14px;background:#203f36;color:white;text-decoration:none;border-radius:8px}.lrf-showroom-count{color:#666;margin:0 0 18px}.lrf-showroom-back{border:0;background:transparent;text-decoration:underline;padding:0;margin-bottom:16px;color:#354c42}@media(max-width:600px){.lrf-showroom-detail{grid-template-columns:1fr}.lrf-showroom-dialog header{padding:12px 16px}.lrf-showroom-body{padding:14px}.lrf-showroom-detail img{max-height:36dvh}}`;
  dialog.append(style);const header=element('header'),title=element('h2',selected?.name||manufacturer.name),exit=element('button','×','lrf-showroom-close');exit.type='button';exit.setAttribute('aria-label','Fermer la collection');exit.addEventListener('click',close);header.append(title,exit);dialog.append(header);
  const body=element('div',undefined,'lrf-showroom-body');dialog.append(body);
  const link=(label,href)=>{const a=element('a',label,'lrf-showroom-link');a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;};
  if(selected){
   const back=element('button','← Toutes les collections '+manufacturer.name,'lrf-showroom-back');back.type='button';back.addEventListener('click',()=>openCollection(manufacturer));body.append(back);
   const detail=element('div',undefined,'lrf-showroom-detail'),image=element('img');image.src=selected.image;image.alt=selected.name;const info=element('div');info.append(element('p',manufacturer.name,'lrf-showroom-count'));
   if(selected.imageKind==='catalogue')info.append(element('p','Visuel de catalogue. Consultez la collection pour les modèles disponibles.'));
   if(selected.formats?.length)info.append(element('p','Formats : '+selected.formats.join(' · ')));
   if(selected.colors?.length)info.append(element('p','Coloris : '+selected.colors.join(' · ')));
   info.append(element('p','Retrouvez les visuels, variantes et informations de cette collection.'),link('Voir la collection',selected.href||manufacturer.href));detail.append(image,info);body.append(detail);
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
