const media='https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/accessories/hd/';
export const topOptionPhoto=id=>['sella','tampa','neris','torne'].includes(id)?media+'basin-'+id+'.webp':null;
const groups=[{title:'Sans vasque',ids:['bare','none','plain']},{title:'Vasque intégrée au plan',ids:['sella','tampa','compact']},{title:'Plan avec vasque à poser',ids:['neris','torne']}];

function styles(document){
 if(document.getElementById('cabinet-options-style'))return;
 const style=document.createElement('style');style.id='cabinet-options-style';
 style.textContent=`#object-editor:has(.cabinet-top-options) #object-editor-body{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:12px;min-width:0;overflow-x:hidden}#object-editor:has(.cabinet-top-options) #object-editor-body>.object-models{display:block;width:100%;min-width:0}#object-editor:has(.cabinet-top-options) .fixture-fields{min-width:0;width:100%;box-sizing:border-box}.cabinet-top-options{display:grid;gap:12px;grid-column:1/-1;min-width:0}.cabinet-top-options section{margin:0;min-width:0}.cabinet-top-options h4{margin:0 0 6px;font:600 12px Arial,sans-serif;color:#29483e}.cabinet-top-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.cabinet-top-option{position:relative;min-width:0}.cabinet-top-option .cabinet-top-choice{display:grid;align-content:start;gap:5px;width:100%;min-height:76px;padding:10px 27px 10px 10px;text-align:left;border:1px solid #ccd2c3;border-radius:8px;background:#fffdf7;color:#29483e;cursor:pointer}.cabinet-top-choice[aria-pressed=true]{border-color:#29483e!important;background:#e9efdf!important;box-shadow:inset 0 0 0 1px #29483e}.cabinet-top-choice strong{font:600 12px/1.35 Arial,sans-serif}.cabinet-top-choice small{font:10px/1.4 Arial,sans-serif;color:#66715e}.cabinet-top-option .cabinet-top-preview-toggle{position:absolute;right:6px;top:6px;min-height:20px;min-width:20px;padding:0;border:1px solid #a9b7a1;border-radius:50%;font-weight:600;background:transparent;color:#56735d;font-size:16px;cursor:pointer}.cabinet-top-preview{position:absolute;right:0;top:calc(100% + 3px);z-index:30;width:148px;box-sizing:border-box;margin:0;padding:7px;border:1px solid #cdd1c4;border-radius:9px;background:#fff;box-shadow:0 5px 18px #19352b2b;pointer-events:none}.cabinet-top-preview[hidden]{display:none!important}.cabinet-top-preview img{display:block;width:100%;height:106px;object-fit:contain;background:#fff}.cabinet-top-preview figcaption{font:10px/1.3 Arial,sans-serif;color:#29483e;margin-top:5px}.cabinet-top-help{margin:0;font:11px/1.4 Arial,sans-serif;color:#66715e}.cabinet-drain-note{font:11px/1.5 Arial,sans-serif;padding:8px 0;color:#53694e}`;
 document.head.append(style);
}

// Existing manufacturer catalogue visuals, loaded only when the user asks for a preview. A
// separate touch button leaves the main option a direct one-tap selection.
export function renderCabinetTopOptions(parent,{options,value,onSelect,photoFor=topOptionPhoto}={}){
 const document=parent.ownerDocument||globalThis.document;styles(document);
 const host=document.createElement('div');host.className='cabinet-top-options';
 for(const group of groups){
  const choices=options.filter(option=>group.ids.includes(option.id));if(!choices.length)continue;
  const section=document.createElement('section'),title=document.createElement('h4'),grid=document.createElement('div');title.textContent=group.title;grid.className='cabinet-top-grid';section.append(title,grid);
  for(const option of choices){
   const wrap=document.createElement('div'),choice=document.createElement('button'),name=document.createElement('strong'),detail=document.createElement('small');wrap.className='cabinet-top-option';choice.className='cabinet-top-choice';choice.type='button';choice.dataset.topOption=option.id;choice.setAttribute('aria-pressed',String(value===option.id));name.textContent=option.name;detail.textContent=option.id==='sella'?'Céramique blanc brillant · plan intégré':option.description||'';choice.append(name,detail);choice.onclick=()=>onSelect(option.id);wrap.append(choice);
   const src=photoFor(option.id);
   if(src){
    const toggle=document.createElement('button'),figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');toggle.type='button';toggle.className='cabinet-top-preview-toggle';toggle.textContent='i';toggle.setAttribute('aria-label','Aperçu '+option.name);toggle.setAttribute('aria-expanded','false');figure.className='cabinet-top-preview';figure.hidden=true;image.alt='Visuel catalogue RANDAL · '+option.name;image.width=134;image.height=106;image.decoding='async';caption.textContent=option.name;figure.append(image,caption);
    const show=()=>{for(const other of host.querySelectorAll('.cabinet-top-preview'))other.hidden=true;for(const other of host.querySelectorAll('.cabinet-top-preview-toggle'))other.setAttribute('aria-expanded','false');if(!image.src)image.src=src;figure.hidden=false;toggle.setAttribute('aria-expanded','true');};
    const hide=()=>{figure.hidden=true;toggle.setAttribute('aria-expanded','false');};
    wrap.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')show();});wrap.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch')hide();});choice.addEventListener('focus',show);choice.addEventListener('blur',hide);toggle.onclick=event=>{event.stopPropagation();figure.hidden?show():hide();};wrap.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});wrap.append(toggle,figure);
   }
   grid.append(wrap);
  }
  host.append(section);
 }
 const hint=document.createElement('p');hint.className='cabinet-top-help';hint.textContent='Survolez un modèle pour son aperçu. Sur téléphone, touchez « i ».';host.append(hint);parent.append(host);return host;
}

export function renderCabinetDrainNote(parent,drain){
 if(!drain)return;const note=parent.ownerDocument.createElement('p');note.className='cabinet-drain-note';note.dataset.cabinetDrain=drain.reference;note.textContent='Clic-clac assortie au mitigeur · '+drain.finish+' · réf. '+drain.reference;parent.append(note);return note;
}
