// Illustrated choices keep browsing a picture separate from applying a value.
// Native selects remain the source of truth when enhanced through the adapter.
let serial=0;
const installed=new WeakSet(),previews=new WeakMap();
const text=value=>String(value??'');
const normalize=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
const entriesFor=entries=>{const seen=new Set();return (entries||[]).filter(entry=>entry&&entry.value!==undefined).map(entry=>({...entry,value:text(entry.value),label:text(entry.label??entry.value)})).filter(entry=>!seen.has(entry.value)&&seen.add(entry.value));};
const documentFor=node=>node?.ownerDocument||globalThis.document;
const windowFor=doc=>doc.defaultView||globalThis.window||{};
const capable=doc=>{if(!doc?.body?.append||!doc.addEventListener||!doc.defaultView?.addEventListener)return false;const probe=doc.createElement('button');return !!(probe.getBoundingClientRect&&probe.getAttribute&&probe.removeAttribute&&probe.contains&&probe.remove&&probe.focus&&probe.ownerDocument===doc);};
const portalFor=(anchor,doc)=>anchor?.closest?.('dialog[open]')||doc.body;
const listen=(target,event,handler,options)=>{target?.addEventListener?.(event,handler,options);return ()=>target?.removeEventListener?.(event,handler,options);};
const remove=node=>node?.remove?.();
const focus=node=>{if(node?.isConnected!==false)node?.focus?.({preventScroll:true});};
const stop=event=>{event?.preventDefault?.();event?.stopPropagation?.();};
const resolveEntry=entry=>typeof entry==='function'?entry():entry;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(Math.max(lo,hi),n));

function styles(doc){
 if(installed.has(doc))return;installed.add(doc);
 const style=doc.createElement('style');style.id='lrf-visual-choice-style';style.textContent=`
 .lrf-visual-choice,.lrf-visual-choice-popup,.lrf-visual-hover,.lrf-visual-preview{box-sizing:border-box;font:13px/1.4 Arial,sans-serif;color:#29483e}
 .lrf-visual-choice *,.lrf-visual-choice-popup *,.lrf-visual-hover *,.lrf-visual-preview *{box-sizing:border-box}
 .lrf-visual-choice [hidden],.lrf-visual-choice-popup[hidden],.lrf-visual-hover[hidden],.lrf-visual-preview[hidden]{display:none!important}
 .lrf-visual-choice{display:grid;grid-template-columns:52px minmax(0,1fr);gap:7px;width:100%;min-width:0}
 .lrf-visual-choice.lrf-visual-choice-no-preview{grid-template-columns:minmax(0,1fr)}
 .lrf-visual-choice button,.lrf-visual-choice-popup button,.lrf-visual-preview button{font:inherit;touch-action:manipulation;cursor:pointer;border:1px solid #cbd2c2;border-radius:8px;background:#fffdf7;color:#29483e;min-height:44px}
 .lrf-visual-choice button:focus-visible,.lrf-visual-choice-popup button:focus-visible,.lrf-visual-choice-popup input:focus-visible,.lrf-visual-preview button:focus-visible{outline:3px solid #887858;outline-offset:2px}
 .lrf-visual-choice button:disabled,.lrf-visual-choice-popup button:disabled{cursor:default;opacity:.5}
 .lrf-visual-choice .lrf-visual-choice-photo{display:grid;place-items:center;gap:2px;padding:3px;min-height:52px;font-size:9px;overflow:hidden}
 .lrf-visual-sample{display:grid;place-items:center;width:100%;height:100%;min-height:24px;overflow:hidden;background:#eeeee6;border-radius:4px}
 .lrf-visual-sample img{display:block;width:100%;height:100%;object-fit:contain}
 .lrf-visual-sample[data-missing=true]{font-size:10px;color:#71816d;text-align:center;padding:4px}
 .lrf-visual-choice-photo .lrf-visual-sample{height:34px}
 .lrf-visual-choice .lrf-visual-choice-trigger{display:flex;align-items:center;gap:8px;padding:8px 10px;text-align:left;width:100%;min-width:0}
 .lrf-visual-choice-copy{display:grid;gap:2px;min-width:0;flex:1;overflow-wrap:anywhere}
 .lrf-visual-choice-copy strong{font-size:12px;line-height:1.35;font-weight:600}
 .lrf-visual-choice-copy small{font-size:10px;line-height:1.3;color:#71816d;overflow-wrap:anywhere}
 .lrf-visual-choice-arrow{flex:none;font-size:16px;color:#63705f}
 .lrf-visual-choice-popup{position:fixed;z-index:10050;display:flex;flex-direction:column;gap:8px;max-width:calc(100vw - 16px);padding:10px;border:1px solid #cbd2c2;border-radius:11px;background:#fffdf7;box-shadow:0 8px 36px #19352b38;overflow:hidden;overscroll-behavior:contain}
 .lrf-visual-choice-popup-header{display:flex;align-items:center;gap:8px;flex-shrink:0}
 .lrf-visual-choice-popup-title{font-weight:600;flex:1;font-size:12px}
 .lrf-visual-choice-popup .lrf-visual-choice-close{min-width:44px;padding:6px;font-size:19px}
 .lrf-visual-choice-popup input{display:block;flex-shrink:0;width:100%;min-height:44px;padding:9px 11px;border:1px solid #cbd2c2;border-radius:7px;font:13px Arial,sans-serif;background:white;color:#29483e}
 .lrf-visual-choice-list{display:grid;align-content:start;gap:6px;overflow-y:auto;min-height:0;padding:2px;overscroll-behavior:contain;touch-action:pan-y}
 .lrf-visual-choice-row{display:grid;grid-template-columns:62px minmax(0,1fr);gap:6px;min-width:0}
 .lrf-visual-choice-popup .lrf-visual-choice-row-photo{display:grid;gap:2px;align-content:start;padding:4px;font-size:9px;min-width:0;overflow:hidden}
 .lrf-visual-choice-row-photo .lrf-visual-sample{height:52px}
 .lrf-visual-choice-popup .lrf-visual-choice-option{display:flex;align-items:center;gap:7px;text-align:left;padding:9px;min-width:0;width:100%}
 .lrf-visual-choice-option[aria-pressed=true]{background:#e9eddf;border-color:#887858;box-shadow:inset 0 0 0 1px #887858}
 .lrf-visual-choice-empty{margin:0;padding:12px;color:#71816d}
 .lrf-visual-hover{position:fixed;z-index:10060;margin:0;padding:9px;width:230px;max-width:calc(100vw - 16px);border:1px solid #cbd2c2;border-radius:10px;background:#fffdf7;box-shadow:0 7px 25px #19352b30;pointer-events:none}
 .lrf-visual-hover .lrf-visual-sample{height:200px;background:#fff}
 .lrf-visual-hover figcaption{font-size:11px;padding-top:7px;overflow-wrap:anywhere}
 .lrf-visual-preview{position:fixed;inset:0;z-index:10100;display:grid;place-items:center;padding:16px;background:#172a25b8;overscroll-behavior:contain}
 .lrf-visual-preview-card{display:grid;gap:10px;width:min(680px,100%);max-height:calc(100dvh - 32px);min-height:0;padding:14px;border-radius:12px;background:#fffdf7;box-shadow:0 8px 36px #0004}
 .lrf-visual-preview-heading{display:flex;align-items:center;gap:10px;min-width:0}
 .lrf-visual-preview-heading strong{flex:1;font-size:14px;overflow-wrap:anywhere}
 .lrf-visual-preview .lrf-visual-preview-close{min-width:44px;flex:none;padding:7px}
 .lrf-visual-preview .lrf-visual-sample{min-height:100px;height:min(65dvh,580px);background:#fff}
 .lrf-visual-preview-detail{margin:0;font-size:12px;color:#63705f;overflow-wrap:anywhere}
 @media(max-width:600px){.lrf-visual-preview{padding:8px}.lrf-visual-preview-card{padding:10px;max-height:calc(100dvh - 16px)}.lrf-visual-choice-popup{padding:8px}.lrf-visual-hover{display:none}}
 `;doc.head?.append(style);
}

function sample(doc,entry,urlFor=value=>value){
 const node=doc.createElement('span');node.className='lrf-visual-sample';
 if(entry?.image){const image=doc.createElement('img');image.alt='';image.loading='lazy';image.decoding='async';image.src=urlFor(entry.image);image.onerror=()=>{node.dataset.missing='true';node.replaceChildren();node.textContent='Aperçu indisponible';};node.append(image);}
 else if(entry?.swatch)node.style.backgroundColor=entry.swatch;
 else{node.dataset.missing='true';node.textContent='Sans aperçu';}
 return node;
}

function viewport(doc){
 const win=windowFor(doc),view=win.visualViewport;
 return {left:view?.offsetLeft||0,top:view?.offsetTop||0,width:view?.width||win.innerWidth||doc.documentElement?.clientWidth||360,height:view?.height||win.innerHeight||doc.documentElement?.clientHeight||640};
}

// Observe only while a portal is visible. Inspector replacement must not leave
// a popup, document listener, or preview attached to an abandoned picker.
function watchRemoval(anchor,close){
 const doc=documentFor(anchor),dialog=anchor.closest?.('dialog'),Observer=windowFor(doc).MutationObserver||globalThis.MutationObserver;
 const unlisten=listen(dialog,'close',close),check=()=>{if(anchor.isConnected===false||dialog&&!dialog.open)close();};
 const observer=Observer?new Observer(check):null;observer?.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});return ()=>{unlisten();observer?.disconnect();};
}

export function openVisualPreview(source,{urlFor=value=>value,opener,document:providedDocument}={}){
 const entry=resolveEntry(source),doc=providedDocument||documentFor(opener);
 if(!entry||!capable(doc))return null;
 previews.get(doc)?.close(false);styles(doc);
 const overlay=doc.createElement('div'),card=doc.createElement('div'),heading=doc.createElement('div'),title=doc.createElement('strong'),closeButton=doc.createElement('button'),detail=doc.createElement('p');
 const id='lrf-visual-preview-'+(++serial);overlay.className='lrf-visual-preview';overlay.dataset.visualPreview='true';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby',id);card.className='lrf-visual-preview-card';heading.className='lrf-visual-preview-heading';title.id=id;title.textContent=entry.label||entry.value||'Aperçu';closeButton.type='button';closeButton.className='lrf-visual-preview-close';closeButton.textContent='Fermer';closeButton.setAttribute('aria-label','Fermer l’aperçu');detail.className='lrf-visual-preview-detail';detail.textContent=entry.detail||'';detail.hidden=!entry.detail;
 heading.append(title,closeButton);card.append(heading,sample(doc,entry,urlFor),detail);overlay.append(card);
 const previous=opener||doc.activeElement,oldOverflow=doc.body.style.overflow;doc.body.style.overflow='hidden';let closed=false,unwatch=()=>{};
 const close=(restore=true)=>{if(closed)return;closed=true;unwatch();remove(overlay);doc.body.style.overflow=oldOverflow;if(previews.get(doc)?.element===overlay)previews.delete(doc);if(restore)focus(previous);};
 closeButton.onclick=event=>{stop(event);close();};overlay.onclick=event=>{if(event.target===overlay){stop(event);close();}};
 overlay.onkeydown=event=>{if(event.key==='Escape'){stop(event);close();}else if(event.key==='Tab'){stop(event);focus(closeButton);}};
 const api={element:overlay,close};previews.set(doc,api);portalFor(opener,doc).append(overlay);if(opener)unwatch=watchRemoval(opener,()=>close(false));focus(closeButton);return api;
}

export function attachVisualPreview(element,source,{urlFor=value=>value}={}){
 const doc=documentFor(element);if(!capable(doc)||!element?.addEventListener)return ()=>{};
 let figure=null,unwatch=()=>{};
 const hide=()=>{unwatch();unwatch=()=>{};remove(figure);figure=null;};
 const show=event=>{
  const win=windowFor(doc),view=viewport(doc),entry=resolveEntry(source);
  if(!entry||(!entry.image&&!entry.swatch)||view.width<700||event?.pointerType==='touch'||event?.type==='pointerenter'&&win.matchMedia&&!win.matchMedia('(hover: hover) and (pointer: fine)').matches)return;
  hide();styles(doc);figure=doc.createElement('figure');figure.className='lrf-visual-hover';figure.dataset.visualHover='true';figure.setAttribute('aria-hidden','true');const caption=doc.createElement('figcaption');caption.textContent=[entry.label,entry.detail].filter(Boolean).join(' · ');figure.append(sample(doc,entry,urlFor),caption);portalFor(element,doc).append(figure);
  const rect=element.getBoundingClientRect(),width=230,height=Math.min(300,view.height-16),left=rect.right+10+width<=view.left+view.width-8?rect.right+10:rect.left-width-10;
  figure.style.left=clamp(left,view.left+8,view.left+view.width-width-8)+'px';figure.style.top=clamp(rect.top,view.top+8,view.top+view.height-height-8)+'px';figure.style.maxHeight=(view.height-16)+'px';unwatch=watchRemoval(element,hide);
 };
 const cleanups=[listen(element,'pointerenter',show),listen(element,'pointerleave',hide),listen(element,'focusin',show),listen(element,'focusout',hide),listen(element,'pointerdown',hide)];
 return ()=>{hide();cleanups.forEach(cleanup=>cleanup());};
}

function fallbackChoice(parent,options){
 const doc=documentFor(parent),element=doc.createElement('select');element.dataset.visualChoice='fallback';parent?.append(element);let entries=[],value='',label=options.label||'Choisir',disabled=false;
 const setValue=(next,{emit=false}={})=>{const entry=entries.find(item=>item.value===text(next));if(emit&&(!entry||entry.disabled||disabled))return false;const changed=value!==text(next);value=text(next);element.value=value;if(emit&&changed)options.onChange?.(value,entry);return true;};
 const update=patch=>{if(patch.label!==undefined)label=patch.label;if(patch.disabled!==undefined)disabled=!!patch.disabled;if(patch.entries){entries=entriesFor(patch.entries);element.replaceChildren();for(const entry of entries){const option=doc.createElement('option');option.value=entry.value;option.textContent=entry.label;option.disabled=!!entry.disabled;element.append(option);}}element.disabled=disabled;element.setAttribute('aria-label',label);setValue(patch.value!==undefined?patch.value:value);};
 element.onchange=()=>setValue(element.value,{emit:true});update({...options,value:options.value??''});
 return {element,trigger:element,search:null,get value(){return value;},set value(next){setValue(next);},getValue:()=>value,setValue,update,open:()=>focus(element),close:()=>{},preview:()=>null,destroy:()=>remove(element)};
}

export function renderVisualChoice(parent,options={}){
 const doc=documentFor(parent);if(!capable(doc))return fallbackChoice(parent,options);styles(doc);
 const element=doc.createElement('div'),photo=doc.createElement('button'),trigger=doc.createElement('button'),copy=doc.createElement('span'),title=doc.createElement('strong'),detail=doc.createElement('small'),arrow=doc.createElement('span');
 const popup=doc.createElement('div'),header=doc.createElement('div'),popupTitle=doc.createElement('span'),closeButton=doc.createElement('button'),search=doc.createElement('input'),list=doc.createElement('div'),id='lrf-visual-choice-'+(++serial);
 element.className='lrf-visual-choice';element.dataset.visualChoice='true';photo.type=trigger.type=closeButton.type='button';photo.className='lrf-visual-choice-photo';photo.dataset.visualChoicePreview='current';trigger.className='lrf-visual-choice-trigger';trigger.dataset.visualChoiceTrigger='true';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',id);copy.className='lrf-visual-choice-copy';arrow.className='lrf-visual-choice-arrow';arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');copy.append(title,detail);trigger.append(copy,arrow);element.append(photo,trigger);
 popup.id=id;popup.className='lrf-visual-choice-popup';popup.dataset.visualChoicePopup='true';popup.hidden=true;popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','false');header.className='lrf-visual-choice-popup-header';popupTitle.className='lrf-visual-choice-popup-title';closeButton.className='lrf-visual-choice-close';closeButton.textContent='×';closeButton.setAttribute('aria-label','Fermer la liste');header.append(popupTitle,closeButton);search.type='search';search.autocomplete='off';search.placeholder=options.searchPlaceholder||'Rechercher un nom ou une référence…';search.setAttribute('aria-label','Rechercher dans la liste');list.className='lrf-visual-choice-list';list.setAttribute('role','list');popup.append(header,search,list);parent?.append(element);
 let entries=[],value='',label='',disabled=false,opened=false,destroyed=false,rows=[],rowCleanups=[],openCleanups=[],unwatch=()=>{};const urlFor=options.urlFor||((value)=>value),current=()=>entries.find(entry=>entry.value===value);
 const clearRows=()=>{rowCleanups.forEach(cleanup=>cleanup());rowCleanups=[];rows=[];};
 const drawTrigger=()=>{const entry=current(),hasPreview=!!(entry?.image||entry?.swatch);title.textContent=entry?.label||options.placeholder||'Choisir…';detail.textContent=entry?.detail||(value&&!entry?'Référence indisponible':'');detail.hidden=!detail.textContent;trigger.disabled=disabled;trigger.setAttribute('aria-label',[label,entry?.label,entry?.detail].filter(Boolean).join(' · '));photo.replaceChildren(sample(doc,entry,urlFor));const enlarge=doc.createElement('span');enlarge.textContent='Agrandir';photo.append(enlarge);photo.hidden=!hasPreview;element.classList.toggle('lrf-visual-choice-no-preview',!hasPreview);photo.disabled=!hasPreview;photo.setAttribute('aria-label','Agrandir '+(entry?.label||label));};
 function close(restore=false){if(!opened)return;opened=false;popup.hidden=true;trigger.setAttribute('aria-expanded','false');unwatch();unwatch=()=>{};openCleanups.forEach(cleanup=>cleanup());openCleanups=[];clearRows();remove(popup);if(restore)focus(trigger);}
 const setValue=(next,{emit=false}={})=>{const entry=entries.find(item=>item.value===text(next));if(emit&&(!entry||entry.disabled||disabled))return false;const changed=value!==text(next);value=text(next);drawTrigger();if(emit){close(true);if(changed)options.onChange?.(value,entry);}else if(opened)drawRows();return true;};
 const move=(from,delta)=>{const enabled=rows.filter(row=>!row.entry.disabled);if(!enabled.length)return;let index=enabled.findIndex(row=>row.button===from);index=delta===Infinity?enabled.length-1:delta===-Infinity?0:index<0?(delta<0?enabled.length-1:0):(index+delta+enabled.length)%enabled.length;focus(enabled[index].button);enabled[index].button.scrollIntoView?.({block:'nearest'});};
 function drawRows(){
  clearRows();list.replaceChildren();const query=normalize(search.value),filtered=entries.filter(entry=>normalize([entry.label,entry.detail,entry.value].join(' ')).includes(query));
  for(const entry of filtered){
   const row=doc.createElement('div'),preview=doc.createElement('button'),button=doc.createElement('button'),copy=doc.createElement('span'),name=doc.createElement('strong'),meta=doc.createElement('small'),mark=doc.createElement('span'),zoom=doc.createElement('span');
   row.className='lrf-visual-choice-row';row.setAttribute('role','listitem');preview.type=button.type='button';preview.className='lrf-visual-choice-row-photo';preview.dataset.visualChoicePreview=entry.value;preview.setAttribute('aria-label','Agrandir '+entry.label);preview.disabled=!entry.image&&!entry.swatch;preview.append(sample(doc,entry,urlFor));zoom.textContent='Agrandir';preview.append(zoom);button.className='lrf-visual-choice-option';button.dataset.visualChoiceValue=entry.value;button.disabled=!!entry.disabled;button.setAttribute('aria-pressed',String(entry.value===value));button.setAttribute('aria-label',[entry.label,entry.detail].filter(Boolean).join(' · '));copy.className='lrf-visual-choice-copy';name.textContent=entry.label;meta.textContent=entry.detail||'';meta.hidden=!entry.detail;mark.textContent=entry.value===value?'✓':'';mark.setAttribute('aria-hidden','true');copy.append(name,meta);button.append(copy,mark);row.append(preview,button);list.append(row);rows.push({entry,button,preview});
   button.onclick=event=>{stop(event);setValue(entry.value,{emit:true});};preview.onclick=event=>{stop(event);openVisualPreview(entry,{urlFor,opener:preview,document:doc});};
   row.onkeydown=event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){stop(event);move(button,event.key==='ArrowDown'?1:-1);}else if(event.key==='Home'||event.key==='End'){stop(event);move(button,event.key==='Home'?-Infinity:Infinity);}else if(event.key==='ArrowRight'){stop(event);focus(preview);}else if(event.key==='ArrowLeft'){stop(event);focus(button);}else if(event.key==='Escape'){stop(event);close(true);}};
   rowCleanups.push(attachVisualPreview(row,entry,{urlFor}));
  }
  if(!filtered.length){const empty=doc.createElement('p');empty.className='lrf-visual-choice-empty';empty.textContent='Aucun résultat pour cette recherche.';list.append(empty);}
 }
 function place(){
  if(!opened)return;if(element.isConnected===false){close();return;}const v=viewport(doc),rect=trigger.getBoundingClientRect(),width=Math.min(Math.max(element.getBoundingClientRect().width||rect.width,300),v.width-16),below=v.top+v.height-rect.bottom-12,above=rect.top-v.top-12,up=below<220&&above>below,height=Math.min(460,Math.max(120,up?above:below),v.height-16);
  popup.style.width=width+'px';popup.style.maxHeight=height+'px';popup.style.left=clamp(rect.left,v.left+8,v.left+v.width-width-8)+'px';const actual=Math.min(popup.getBoundingClientRect().height||height,height);popup.style.top=clamp(up?rect.top-actual-5:rect.bottom+5,v.top+8,v.top+v.height-actual-8)+'px';
 }
 function open({focusSearch=true}={}){
  if(destroyed||disabled||opened)return;opened=true;search.value='';popup.hidden=false;popupTitle.textContent=label;popup.setAttribute('aria-label',label);trigger.setAttribute('aria-expanded','true');portalFor(element,doc).append(popup);drawRows();place();
  const outside=event=>{if(element.isConnected===false){close();return;}if(element.contains(event.target)||popup.contains(event.target)||previews.get(doc)?.element.contains(event.target))return;close();};
  openCleanups=[listen(doc,'pointerdown',outside,true),listen(doc,'focusin',outside,true),listen(windowFor(doc),'resize',place),listen(windowFor(doc),'scroll',place,true),listen(windowFor(doc).visualViewport,'resize',place),listen(windowFor(doc).visualViewport,'scroll',place)];unwatch=watchRemoval(element,()=>close());if(focusSearch)focus(search);
 }
 trigger.onclick=event=>{stop(event);if(opened)close(true);else open();};trigger.onkeydown=event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){stop(event);open({focusSearch:false});const selected=rows.find(row=>row.entry.value===value&&!row.entry.disabled);if(selected)focus(selected.button);else move(null,event.key==='ArrowUp'?-1:1);}else if(event.key==='Escape'){stop(event);close(true);}};
 photo.onclick=event=>{stop(event);openVisualPreview(current(),{urlFor,opener:photo,document:doc});};const removeTriggerPreview=attachVisualPreview(photo,current,{urlFor}),removeLabelPreview=attachVisualPreview(trigger,current,{urlFor});
 closeButton.onclick=event=>{stop(event);close(true);};search.oninput=()=>{drawRows();place();};search.onkeydown=event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){stop(event);move(null,event.key==='ArrowUp'?-1:1);}else if(event.key==='Escape'){stop(event);close(true);}else if(event.key==='Enter'){const first=rows.find(row=>!row.entry.disabled);if(first){stop(event);setValue(first.entry.value,{emit:true});}}};
 popup.onkeydown=event=>{if(event.key==='Escape'){stop(event);close(true);}};
 const update=(patch={})=>{if(patch.entries!==undefined)entries=entriesFor(patch.entries);if(patch.label!==undefined)label=text(patch.label);if(patch.disabled!==undefined)disabled=!!patch.disabled;if(patch.value!==undefined)value=text(patch.value);drawTrigger();if(disabled)close();else if(opened){popupTitle.textContent=label;drawRows();place();}};
 update({...options,label:options.label||'Choisir',value:options.value??''});
 return {element,trigger,search,get value(){return value;},set value(next){setValue(next);},getValue:()=>value,setValue,update,open,close,preview:next=>openVisualPreview(entries.find(entry=>entry.value===text(next??value)),{urlFor,opener:photo,document:doc}),destroy(){if(destroyed)return;close();destroyed=true;removeTriggerPreview();removeLabelPreview();remove(element);}};
}

// Keep all existing .value/.onchange/dataset contracts and the caller's native
// select. Only complete browser DOMs receive the illustrated replacement.
export function enhanceVisualSelect(select,options={}){
 const doc=documentFor(select);let metadata=entriesFor(options.entries||[]),control=null;
 const nativeEntries=()=>Array.from(select.options||select.children||[]).map(option=>{const entry=metadata.find(entry=>entry.value===text(option.value));return {...entry,value:text(option.value),label:entry?.label??(option.textContent||option.label||option.value),disabled:!!option.disabled};});
 const sync=entries=>{if(entries)metadata=entriesFor(entries);control?.update({entries:entries?metadata:nativeEntries(),value:select.value,disabled:!!select.disabled});return control;};
 if(!capable(doc))return {element:select,trigger:select,search:null,get value(){return select.value;},set value(next){select.value=text(next);},getValue:()=>select.value,setValue(next,{emit=false}={}){const changed=select.value!==text(next);select.value=text(next);if(emit&&changed)select.onchange?.();return true;},update(patch={}){if(patch.value!==undefined)select.value=text(patch.value);if(patch.disabled!==undefined)select.disabled=!!patch.disabled;},sync,open:()=>focus(select),close:()=>{},preview:()=>null,destroy:()=>{}};
 const parent=options.parent||select.parentElement||select.parentNode;if(!parent)throw Error('Le sélecteur visuel nécessite un parent.');
 const hidden=select.hidden,tabIndex=select.getAttribute('tabindex'),ariaHidden=select.getAttribute('aria-hidden');
 control=renderVisualChoice(parent,{...options,entries:options.entries||nativeEntries(),value:select.value,label:options.label||select.getAttribute('aria-label')||'Choisir',onChange:(value,entry)=>{select.value=value;const EventType=windowFor(doc).Event||globalThis.Event;if(select.dispatchEvent&&EventType)select.dispatchEvent(new EventType('change',{bubbles:true}));else select.onchange?.();options.onChange?.(value,entry);}});
 if(parent.insertBefore)parent.insertBefore(control.element,select.nextSibling);Object.assign(control.element.dataset,select.dataset);select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 const unlisten=listen(select,'change',()=>sync()),baseSet=control.setValue,baseUpdate=control.update,baseDestroy=control.destroy;
 control.update=(patch={})=>{if(patch.entries!==undefined)metadata=entriesFor(patch.entries);if(patch.value!==undefined)select.value=text(patch.value);if(patch.disabled!==undefined)select.disabled=!!patch.disabled;baseUpdate(patch);};
 control.setValue=(value,settings={})=>{const result=baseSet(value,settings);if(result)select.value=text(value);return result;};Object.defineProperty(control,'value',{configurable:true,get:()=>select.value,set:value=>{control.setValue(value);}});control.getValue=()=>select.value;control.sync=sync;
 control.destroy=()=>{unlisten();baseDestroy();select.hidden=hidden;if(tabIndex===null)select.removeAttribute('tabindex');else select.setAttribute('tabindex',tabIndex);if(ariaHidden===null)select.removeAttribute('aria-hidden');else select.setAttribute('aria-hidden',ariaHidden);};return control;
}
