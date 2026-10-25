// Public catalogue UI only. The hosts own project restoration, immutable
// preview state, copying and cross-atelier navigation.
const VARIANTS=Object.freeze({'studio-one':'Studio One','randal-general':'Catalogue Général'});
export function compositionVariantLabel(variant){return VARIANTS[variant]||'Composition';}
export function compositionThumbnail(value){
 if(typeof value!=='string')return null;
 if(/^assets\/public-compositions\/[a-z0-9-]+\.(?:webp|png|jpg)$/.test(value))return value;
 return null;
}
function styles(document){
 if(document.getElementById('public-compositions-style'))return;
 const style=document.createElement('style');style.id='public-compositions-style';style.textContent=`
 .lrf-public-gallery{box-sizing:border-box;width:860px;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);padding:24px;border:1px solid #d3d2c4;border-radius:16px;background:#fffdf7;color:#283c32;overflow:auto;overscroll-behavior:contain;box-shadow:0 15px 60px #19352b33}
 .lrf-public-gallery::backdrop{background:#152c226b;backdrop-filter:blur(3px)}
 .lrf-public-gallery .lrf-gallery-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:0 0 14px}
 .lrf-public-gallery .lrf-gallery-heading h2{font:30px/1.15 Georgia,serif;margin:5px 0 0;color:#243e31;letter-spacing:0}
 .lrf-public-gallery .lrf-gallery-eyebrow{font:10px/1.4 Arial,sans-serif;letter-spacing:1.3px;text-transform:uppercase;color:#7b795f}
 .lrf-public-gallery .lrf-gallery-close{min-width:42px;min-height:42px;flex:0 0 auto;border:1px solid #cbd1c0;border-radius:50%;background:#fffdf7;color:#29483e;font:23px Arial,sans-serif;cursor:pointer}
 .lrf-public-gallery .lrf-gallery-intro{font:13px/1.6 Arial,sans-serif;margin:0 0 18px;max-width:650px;color:#5d6859}
 .lrf-public-gallery .lrf-gallery-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;min-width:0}
 .lrf-public-gallery .lrf-composition-card{display:flex;flex-direction:column;min-width:0;overflow:hidden;border:1px solid #d4d7c9;border-radius:12px;background:#fff}
 .lrf-public-gallery .lrf-composition-image{position:relative;display:grid;place-items:center;aspect-ratio:1.6;background:#ede9df;overflow:hidden}
 .lrf-public-gallery .lrf-composition-image img{display:block;width:100%;height:100%;object-fit:contain;position:absolute;inset:0}
 .lrf-public-gallery .lrf-composition-image .lrf-thumbnail-unavailable{font:12px Arial,sans-serif;color:#63705f;padding:16px}
 .lrf-public-gallery .lrf-composition-content{padding:15px;display:flex;flex:1;flex-direction:column;gap:10px;min-width:0}
 .lrf-public-gallery .lrf-composition-meta{display:flex;flex-wrap:wrap;align-items:center;gap:7px;font:10px/1.4 Arial,sans-serif;color:#64705c}
 .lrf-public-gallery .lrf-composition-locked{padding:4px 7px;border-radius:20px;border:1px solid #d7dbc8;background:#f1f3e9;color:#52654b;white-space:nowrap}
 .lrf-public-gallery .lrf-composition-content h3{font:22px/1.2 Georgia,serif;margin:0;color:#29483e;overflow-wrap:anywhere}
 .lrf-public-gallery .lrf-composition-content p{font:12px/1.5 Arial,sans-serif;margin:0;color:#64705c}
 .lrf-public-gallery .lrf-composition-actions{display:grid;grid-template-columns:1fr;gap:7px;margin-top:auto;padding-top:5px}
 .lrf-public-gallery .lrf-composition-actions button,.lrf-public-gallery .lrf-gallery-retry{min-height:44px;width:100%;padding:10px 12px;box-sizing:border-box;border:1px solid #cbd1c0;border-radius:8px;color:#29483e;background:#fffdf7;font:600 12px/1.4 Arial,sans-serif;cursor:pointer;white-space:normal}
 .lrf-public-gallery .lrf-composition-actions .lrf-composition-copy{background:#29483e;color:#fff;border-color:#29483e}
 .lrf-public-gallery button:disabled{opacity:.6;cursor:wait}
 .lrf-public-gallery button:focus-visible,.lrf-public-compositions-entry:focus-visible{outline:3px solid #b2996c;outline-offset:3px}
 .lrf-public-gallery .lrf-gallery-status{min-height:20px;font:12px/1.5 Arial,sans-serif;color:#8a4b2f;margin:12px 0 0}
 .lrf-public-gallery .lrf-gallery-empty{font:13px/1.6 Arial,sans-serif;color:#65715e;margin:12px 0}
 .lrf-public-compositions-entry{display:flex;flex-direction:column;gap:4px;width:100%;box-sizing:border-box;text-align:left;margin:0 0 14px;padding:13px 15px;border:1px solid #cbd2bc;border-radius:10px;background:#eef1e4;color:#29483e;cursor:pointer;font:600 13px/1.4 Arial,sans-serif}
 .lrf-public-compositions-entry small{font:11px/1.4 Arial,sans-serif;color:#64705c}
 @media(max-width:600px){.lrf-public-gallery{max-width:calc(100vw - 16px);max-height:calc(100dvh - 16px);padding:16px;border-radius:12px}.lrf-public-gallery .lrf-gallery-grid{grid-template-columns:minmax(0,1fr);gap:13px}.lrf-public-gallery .lrf-gallery-heading h2{font-size:25px}.lrf-public-gallery .lrf-composition-content{padding:12px}.lrf-public-gallery .lrf-composition-content h3{font-size:21px}.lrf-public-gallery .lrf-gallery-heading{gap:10px}.lrf-public-gallery .lrf-composition-actions{grid-template-columns:1fr}.lrf-public-gallery .lrf-gallery-intro{font-size:12px}}
 `;document.head.append(style);
}
const add=(document,parent,tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;parent.append(node);return node;};

export function mountPublicCompositionsGallery({document=globalThis.document,getCompositions=()=>[],getCurrentVariant=()=>'',onPreview=()=>false,onCopy=()=>false,onNavigate=()=>false}={}){
 styles(document);
 const dialog=document.createElement('dialog');dialog.className='lrf-public-gallery';dialog.id='lrf-public-compositions';dialog.setAttribute('aria-labelledby','lrf-public-gallery-title');
 const heading=add(document,dialog,'div','lrf-gallery-heading'),titles=add(document,heading,'div');add(document,titles,'span','lrf-gallery-eyebrow','Les salles de bain de l’agence');
 const title=add(document,titles,'h2','','Composition Le Roy FACTORY');title.id='lrf-public-gallery-title';
 const close=add(document,heading,'button','lrf-gallery-close','×');close.type='button';close.setAttribute('aria-label','Fermer les compositions');
 add(document,dialog,'p','lrf-gallery-intro','Découvrez nos compositions en lecture seule. Pour les personnaliser, créez une copie dans vos projets.');
 const grid=add(document,dialog,'div','lrf-gallery-grid');grid.setAttribute('aria-label','Compositions publiques');
 const status=add(document,dialog,'p','lrf-gallery-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 document.body.append(dialog);
 let disposed=false,version=0,busy=false,focusBefore=null;
 const setBusy=on=>{busy=on;dialog.setAttribute('aria-busy',String(on));for(const button of grid.querySelectorAll('button'))button.disabled=on;};
 function hide(){if(dialog.open)dialog.close();version++;setBusy(false);}
 close.onclick=hide;
 dialog.addEventListener('cancel',event=>{event.preventDefault();hide();});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)hide();});
 dialog.addEventListener('close',()=>{if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});});
 async function act(composition,mode){
  if(busy||disposed)return;const current=version;setBusy(true);status.textContent=mode==='copy'?'Préparation de votre copie…':'Ouverture de la composition…';
  try{
   const same=composition.variant===getCurrentVariant();
   const result=await (same?(mode==='copy'?onCopy(composition):onPreview(composition)):onNavigate({composition,mode}));
   if(current!==version||disposed)return;
   if(result!==false){hide();return;}
   status.textContent='';
  }catch(error){if(current===version&&!disposed)status.textContent=error?.message||'La composition ne peut pas être ouverte. Réessayez.';}
  finally{if(current===version&&!disposed)setBusy(false);}
 }
 function card(composition){
  const article=add(document,grid,'article','lrf-composition-card');article.dataset.compositionId=composition.id;
  const imageBox=add(document,article,'div','lrf-composition-image'),source=compositionThumbnail(composition.thumbnail);
  if(source){const image=add(document,imageBox,'img');image.src=source;image.alt='Vue de '+composition.title;image.width=640;image.height=400;image.loading='lazy';image.decoding='async';image.addEventListener('error',()=>{image.remove();add(document,imageBox,'span','lrf-thumbnail-unavailable','Aperçu indisponible');},{once:true});}
  else add(document,imageBox,'span','lrf-thumbnail-unavailable','Composition de salle de bain');
  const content=add(document,article,'div','lrf-composition-content'),meta=add(document,content,'div','lrf-composition-meta');
  add(document,meta,'span','',compositionVariantLabel(composition.variant));add(document,meta,'span','lrf-composition-locked','Lecture seule · verrouillée');
  add(document,content,'h3','',composition.title||'Composition Le Roy FACTORY');
  if(composition.description)add(document,content,'p','',composition.description);
  const actions=add(document,content,'div','lrf-composition-actions');
  const preview=add(document,actions,'button','lrf-composition-preview','Visualiser');preview.type='button';preview.dataset.compositionMode='preview';preview.onclick=()=>act(composition,'preview');
  const copy=add(document,actions,'button','lrf-composition-copy','Copier pour mon projet');copy.type='button';copy.dataset.compositionMode='copy';copy.onclick=()=>act(composition,'copy');
 }
 async function show(){
  if(disposed)return false;const current=++version;focusBefore=document.activeElement;grid.replaceChildren();status.textContent='Chargement des compositions…';setBusy(false);
  if(!dialog.open)dialog.showModal();
  try{
   const compositions=await getCompositions();if(current!==version||disposed)return false;
   const visible=Array.isArray(compositions)?compositions.filter(c=>c&&typeof c.id==='string'&&typeof c.title==='string'&&Object.hasOwn(VARIANTS,c.variant)):[];
   status.textContent='';if(!visible.length)add(document,grid,'p','lrf-gallery-empty','Les compositions seront bientôt disponibles.');else visible.forEach(card);
   return true;
  }catch(error){if(current!==version||disposed)return false;status.textContent=error?.message||'Les compositions ne peuvent pas être chargées.';const retry=add(document,grid,'button','lrf-gallery-retry','Réessayer');retry.type='button';retry.onclick=show;return false;}
 }
 function createProjectEntry(parent){
  const button=add(document,parent,'button','lrf-public-compositions-entry');button.type='button';button.dataset.publicCompositions='true';add(document,button,'span','','Composition Le Roy FACTORY');add(document,button,'small','','Voir les salles de bain de l’agence et créer votre copie');button.onclick=show;return button;
 }
 return {show,close:hide,createProjectEntry,dialog,get busy(){return busy;},destroy(){disposed=true;version++;dialog.remove();}};
}
