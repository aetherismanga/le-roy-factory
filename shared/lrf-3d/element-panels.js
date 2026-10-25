// Element choices and editing stay beside the live scene. These dialogs are
// deliberately opened without the browser's modal top layer or a backdrop.
const panels=new WeakMap();
let activePanel=null;

export function closeElementPanel(){
 activePanel?.close();
 const document=globalThis.document,EventClass=document?.defaultView?.CustomEvent||globalThis.CustomEvent;
 if(document?.dispatchEvent&&EventClass)document.dispatchEvent(new EventClass('lrf-element-panel-open',{detail:{dialog:null}}));
}

function styles(document){
 if(document.getElementById('element-panels-style'))return;
 const style=document.createElement('style');style.id='element-panels-style';style.textContent=`
 dialog.element-side-panel[open]{position:absolute;inset:76px 12px auto auto;margin:0;width:340px;min-width:0;max-width:calc(100% - 24px);max-height:calc(100% - 88px);padding:16px;box-sizing:border-box;border:1px solid #cdd1c4;border-radius:12px;background:#fffdf7;color:#29483e;box-shadow:0 8px 26px #19352b22;overflow:auto;overscroll-behavior:contain;z-index:55}
 dialog.element-side-panel::backdrop{background:transparent;backdrop-filter:none}
 .element-side-panel .element-panel-heading{position:sticky;top:-16px;display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px 0 12px;margin:0;background:#fffdf7;z-index:2}
 .element-side-panel .element-panel-heading>div{flex:1;min-width:0}
 .element-side-panel .element-panel-heading h2{font:23px/1.15 Georgia,serif;margin:0}
 .element-side-panel .element-panel-heading .eyebrow{display:none}
 .element-side-panel .element-panel-heading button{float:none!important;flex-shrink:0;min-width:40px;min-height:40px;width:auto;height:auto;margin:0;padding:8px;border:1px solid #cdd1c4;border-radius:8px;background:#faf9f2;color:#29483e;font:14px Arial,sans-serif;cursor:pointer}
 .element-side-panel .element-panel-minimize{display:none}
 .element-side-panel #add-choices{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;margin:0}
 .element-side-panel #add-choices .add-card{min-width:0;width:100%;padding:8px 8px 12px;gap:6px;text-align:left}
 .element-side-panel #add-choices .catalogue-icon{height:130px}
 .element-side-panel #add-choices .add-card strong{font-size:13px}
 .element-side-panel .renovation-fields{grid-template-columns:minmax(0,1fr);gap:10px}
 .element-side-panel input,.element-side-panel select{min-width:0;max-width:100%;font-size:13px}
 #settings.element-panel-open>:not(.element-side-panel[open]){display:none!important}
 #settings.element-panel-open>dialog#add-dialog[open],#settings.element-panel-open>dialog#renovation-dialog[open]{display:block!important;position:static;inset:auto;width:100%;max-width:none;max-height:none;padding:0;border:0;border-radius:0;box-shadow:none;overflow:visible}
 #settings.element-panel-open>#object-editor{display:none!important}
 #viewer.element-panel-open #object-editor{display:none!important}
 #object-editor .element-panel-minimize{display:none}
 @media(max-width:760px),(pointer:coarse) and (max-width:1024px){
  #viewer dialog.element-side-panel[open]{inset:auto 8px 8px;width:auto;max-width:calc(100% - 16px);max-height:48%;padding:12px}
  .element-side-panel .element-panel-heading{top:-12px;padding:6px 0 8px}
  .element-side-panel .element-panel-heading h2{font-size:19px}
  .element-side-panel .element-panel-heading button{min-height:44px}
  .element-side-panel .element-panel-minimize,#object-editor .element-panel-minimize{display:block;font-size:11px;min-width:62px}
  .element-side-panel.element-panel-minimized>:not(.element-panel-heading){display:none!important}
  .element-side-panel #add-choices{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .element-side-panel #add-choices .catalogue-icon{height:90px}
  .element-side-panel #add-choices .add-card strong{font-size:12px}
  .element-side-panel #add-choices .add-card small{font-size:10px}
  .element-side-panel input,.element-side-panel select{font-size:16px;min-height:44px}
  #viewer #object-editor.object-editor{max-height:48%;overflow:auto;overscroll-behavior:contain;scroll-padding-bottom:16px}
  #viewer #object-editor .object-editor-heading{position:sticky;top:-14px;background:#fafbf5;padding:6px 0;gap:6px;z-index:3}
  #viewer #object-editor .object-editor-heading>div{min-width:0;flex:1}
  #viewer #object-editor .object-editor-heading h2{font-size:16px}
  #viewer #object-editor .object-editor-heading .eyebrow{display:none}
  #viewer #object-editor .object-editor-heading button{flex-shrink:0}
  #viewer #object-editor .object-editor-heading .element-panel-minimize{min-height:44px;min-width:62px;width:auto;height:44px;padding:6px;border-radius:8px;font-size:11px}
  #viewer #object-editor .object-editor-heading #object-editor-close{min-width:40px;min-height:44px}
  #viewer #object-editor .partition-context{width:100%;min-width:0;flex:none;margin:0;padding:12px 0;border-left:0;box-sizing:border-box}
  #viewer #object-editor.element-panel-minimized #object-editor-body{display:none!important}
 }
 `;document.head.append(style);
}

function minimizeButton(document,panel,heading){
 let button=heading.querySelector('.element-panel-minimize');if(button)return button;
 button=document.createElement('button');button.type='button';button.className='element-panel-minimize';button.textContent='Réduire';button.setAttribute('aria-expanded','true');button.addEventListener('click',()=>{const reduced=panel.classList.toggle('element-panel-minimized');button.textContent=reduced?'Agrandir':'Réduire';button.setAttribute('aria-expanded',String(!reduced));});
 heading.insertBefore(button,heading.lastElementChild);return button;
}

export function mountElementPanelControls({document=globalThis.document,onPanelOpen}={}){
 styles(document);const inspector=document.querySelector('#object-editor');if(!inspector||inspector.dataset.elementPanelControls)return;
 inspector.dataset.elementPanelControls='true';const heading=inspector.querySelector('.object-editor-heading');if(!heading)return;
 // A custom editor owns the rail until it closes. Clear the prior inspector's
 // controller state as well as its DOM, so live scene refreshes cannot reopen
 // it underneath a layout or zone panel and hide both through competing CSS.
 document.addEventListener?.('lrf-element-panel-open',()=>onPanelOpen?.());
 const button=minimizeButton(document,inspector,heading);
 if(typeof MutationObserver==='function')new MutationObserver(()=>{if(!inspector.hidden){inspector.classList.remove('element-panel-minimized');button.textContent='Réduire';button.setAttribute('aria-expanded','true');}}).observe(inspector,{attributes:true,attributeFilter:['hidden']});
}

export function openElementPanel(dialog,{stage=dialog.ownerDocument.querySelector('#viewer'),settings=dialog.ownerDocument.querySelector('#settings')}={}){
 const document=dialog.ownerDocument,view=document.defaultView;styles(document);
 const addMenu=document.querySelector('#add-menu');if(addMenu)addMenu.hidden=true;
 if(panels.has(dialog)){panels.get(dialog).dock();return dialog;}
 if(activePanel&&activePanel!==dialog)activePanel.close();
 document.dispatchEvent(new view.CustomEvent('lrf-element-panel-open',{detail:{dialog}}));
 if(dialog.open)dialog.close();
 const originalParent=dialog.parentElement,originalNext=dialog.nextSibling,scroll=settings?.scrollTop||0,nativeClose=dialog.close.bind(dialog);
 const priorClose=dialog.close;let closed=false,rail=null;
 let heading=dialog.querySelector('.dialog-heading');
 if(!heading){heading=document.createElement('div');const title=dialog.querySelector('h2'),close=dialog.querySelector('button');heading.className='element-panel-heading';if(title)heading.append(title);if(close)heading.append(close);dialog.prepend(heading);}
 heading.classList.add('element-panel-heading');minimizeButton(document,dialog,heading);dialog.classList.add('element-side-panel','lrf-workspace-overlay');dialog.classList.remove('element-panel-minimized');dialog.setAttribute('aria-modal','false');
 const title=heading.querySelector('h2');if(title){if(!title.id)title.id=dialog.id+'-title';dialog.setAttribute('aria-labelledby',title.id);}
 function dock(){
  if(closed)return;const mobile=view.matchMedia('(max-width:760px),(pointer:coarse) and (max-width:1024px)').matches,main=document.querySelector('#atelier');
  main?.classList.remove('mobile-sheet-open');
  const next=!mobile&&!document.fullscreenElement&&!stage?.classList.contains('expanded')&&settings&&settings.getBoundingClientRect().width>100?settings:null;
  if(rail&&rail!==next)rail.classList.remove('element-panel-open');rail=next;rail?.classList.add('element-panel-open');
  const parent=rail||stage||originalParent;if(dialog.parentElement!==parent){parent.append(dialog);if(rail)rail.scrollTop=0;}
 }
 function cleanup(){
  if(closed)return;closed=true;panels.delete(dialog);if(activePanel===dialog)activePanel=null;
  document.removeEventListener('fullscreenchange',dock);view.removeEventListener('resize',dock);observer?.disconnect();dialog.removeEventListener('keydown',key);dialog.removeEventListener('close',onClose);
  rail?.classList.remove('element-panel-open');stage?.classList.remove('element-panel-open');dialog.classList.remove('element-side-panel','lrf-workspace-overlay','element-panel-minimized');heading.querySelector('.element-panel-minimize')?.remove();heading.classList.remove('element-panel-heading');dialog.removeAttribute('aria-modal');dialog.close=priorClose;
  if(originalNext?.parentElement===originalParent)originalParent.insertBefore(dialog,originalNext);else originalParent.append(dialog);if(settings)settings.scrollTop=scroll;
 }
 const key=event=>{if(event.key==='Escape'){event.preventDefault();dialog.close();}event.stopPropagation();};
 const onClose=()=>{if(!dialog.open)cleanup();};
 const observer=typeof MutationObserver==='function'&&stage?new MutationObserver(dock):null;
 dialog.close=(...args)=>{nativeClose(...args);cleanup();};dialog.addEventListener('keydown',key);dialog.addEventListener('close',onClose);
 panels.set(dialog,{dock});activePanel=dialog;stage?.classList.add('element-panel-open');dock();document.addEventListener('fullscreenchange',dock);view.addEventListener('resize',dock);observer?.observe(stage,{attributes:true,attributeFilter:['class']});dialog.show();
 return dialog;
}
