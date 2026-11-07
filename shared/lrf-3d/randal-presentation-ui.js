import {isRandalPresentation} from './randal-client-access.js';

export function createRandalPresentation({getIdentity,getProject,createPreview,products,onVisibility=()=>{},onChange=()=>{}}){
 let dialog=null,engine=null,catalog=null,project=null,selection=null,opening=0,previousFocus=null,wasRestricted=false,originalOrigin='';
 const element=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const button=(id,text)=>{const e=element('button',text);e.id=id;e.type='button';return e;};
 function close(){const visible=!!dialog;opening++;if(document.fullscreenElement===dialog)document.exitFullscreen?.().catch(()=>{});if(dialog?.open)dialog.close();engine?.dispose();engine=null;dialog?.remove();dialog=null;if(visible)onVisibility(false);previousFocus?.focus?.();}
 function sync(){const restricted=isRandalPresentation(getIdentity()),pending=!getIdentity()?.known;
  document.body.classList.toggle('randal-access-pending',pending);document.body.classList.toggle('randal-client-presentation',restricted);
  const direct=document.querySelector('#direct-atelier');if(direct)direct.hidden=restricted;
  const open=document.querySelector('#open-3d');if(open)open.textContent=restricted?'Plein écran':'Voir ma composition 3D ↗';
  for(const photo of document.querySelectorAll('.quote-photoreal,.photoreal-card'))photo.hidden=restricted;
  const origin=document.querySelector('#quote-origin'),presentationOrigin='Vérifiez votre composition puis ouvrez-la en plein écran.';
  if(origin){if(restricted){if(origin.textContent!==presentationOrigin)originalOrigin=origin.textContent;origin.textContent=presentationOrigin;}else if(wasRestricted&&originalOrigin)origin.textContent=originalOrigin;}wasRestricted=restricted;
  if(!restricted&&dialog)close();
 }
 async function open(input=getProject()){
  if(!isRandalPresentation(getIdentity())||!input)return false;
  if(dialog)close();previousFocus=document.activeElement;project=structuredClone(input);const turn=++opening;
  dialog=element('dialog');dialog.className='randal-presentation';dialog.id='randal-presentation';dialog.setAttribute('aria-label','Votre composition en plein écran');
  const header=element('header');header.className='randal-presentation-header';header.append(element('strong','Votre composition RANDAL · version de test'));const exit=button('randal-presentation-close','Fermer ✕');header.append(exit);
  const body=element('div');body.className='randal-presentation-body';const stage=element('div');stage.className='randal-presentation-stage';stage.id='randal-presentation-stage';const controls=element('aside');controls.className='randal-presentation-controls';controls.setAttribute('aria-label','Personnaliser la présentation');const status=element('p','Préparation de votre composition…');status.className='randal-presentation-status';status.setAttribute('role','status');const renderQuality=element('p','Préparation du rendu…');renderQuality.className='randal-render-quality';renderQuality.setAttribute('role','status');stage.append(status,renderQuality);body.append(stage,controls);dialog.append(header,body);document.body.append(dialog);
  exit.onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();onVisibility(true);
  // Native fullscreen must be requested during the click. The modal fills the
  // available viewport as well on iPhone and other browsers without this API.
  try{const native=dialog.requestFullscreen?.();native?.catch(()=>{});}catch{}
  try{
   const settled=await Promise.allSettled([import('./randal-presentation-catalog.js'),createPreview(stage,{presentation:true,onRenderStatus:render=>{if(turn!==opening)return;const label=render.mode==='ready'?'Rendu photo prêt':render.mode==='photoreal'?'Rendu photo · affinage '+Math.floor(render.samples||0)+' / '+(render.maxSamples||256):render.mode==='preparing'?'Calcul de la lumière…':render.mode==='fallback'?'Aperçu interactif · qualité adaptée':'Aperçu fluide';if(renderQuality.textContent!==label)renderQuality.textContent=label;renderQuality.dataset.mode=render.mode;renderQuality.title=render.message||label;}}),import('./randal-presentation-products.js')]),failure=settled.find(r=>r.status==='rejected');
   if(failure){if(settled[1].status==='fulfilled')settled[1].value.dispose();throw failure.reason;}
   const results=settled.map(r=>r.value);catalog=results[0];const next=results[1],productCatalog=products?results[2].createPresentationProducts(products):null,mirrorSpec=results[2].mirrorSpec;
   if(turn!==opening){next.dispose();return false;}engine=next;await engine.update(project);if(turn!==opening)return false;
   selection=catalog.presentationChoices(project);
   const openButton=button('randal-composition-open','Ouvrir la composition'),ledButton=button('randal-mirror-led','Allumer le miroir'),reset=button('randal-presentation-reset','Vue initiale');
   controls.append(openButton,ledButton);
   function reflect(){if(!engine)return;const state=engine.presentation.capabilities();openButton.hidden=!state.openable;openButton.textContent=state.opened?'Fermer la composition':'Ouvrir la composition';openButton.setAttribute('aria-pressed',String(state.opened));ledButton.hidden=!state.led;ledButton.textContent=state.ledOn?'Éteindre le miroir':'Allumer le miroir';ledButton.setAttribute('aria-pressed',String(state.ledOn));}
   openButton.onclick=()=>{const state=engine.presentation.capabilities();engine.presentation.setOpened(!state.opened);reflect();};
   const ledEligible=new Set(),ledModels=new Map();
   function rememberLED(){for(const item of project.items)if(item.type==='mirror'){if(ledModels.get(item.id)!==item.settings.mirrorModel)ledEligible.delete(item.id);ledModels.set(item.id,item.settings.mirrorModel);const spec=mirrorSpec(item.settings);if(spec.led||spec.metal&&item.settings.led)ledEligible.add(item.id);else if(!spec.metal)ledEligible.delete(item.id);}}
   rememberLED();ledButton.onclick=()=>{const enabled=!engine.presentation.capabilities().ledOn;engine.presentation.setLED(enabled);for(const item of project.items)if(ledEligible.has(item.id))item.settings={...item.settings,led:enabled};onChange(structuredClone(project));reflect();};reset.onclick=()=>engine.reset();reflect();
   const productControls=element('div');productControls.className='randal-presentation-products';controls.append(productControls);let productBusy=false,surfaceBusy=0,context=null;
   const hingeButton=button('randal-reverse-hinge','Inverser l’ouverture');hingeButton.hidden=true;hingeButton.onclick=()=>engine?.presentation.editing.reverseHinge();
   function reflectContext(){if(!engine)return;const state=engine.presentation.editing.state();hingeButton.hidden=!context||state.selected!==context.itemId||!state.canReverse;hingeButton.textContent='Ouverture à '+(state.hingeSide==='right'?'droite':'gauche')+' · inverser';}
   function renderProducts(){
    productControls.replaceChildren();
    if(!context||!project.items.some(i=>i.id===context.itemId)){context=null;const hint=element('p','Cliquez sur un meuble, une vasque, une colonne ou un miroir pour le personnaliser.');hint.className='randal-presentation-help randal-context-hint';productControls.append(hint);reflectContext();return;}
    if(!productCatalog)return;
    try{const state=productCatalog.fields(project,context);for(const group of state.groups){
     const section=element('section');section.className='randal-presentation-product';section.dataset.family=group.id;const heading=element('h2',group.label);section.append(heading);const fields=element('div');
     for(const field of group.fields){const label=element('label',field.label),select=element('select');select.id='randal-product-'+field.key;label.htmlFor=select.id;select.setAttribute('aria-label',field.label);for(const choice of field.choices){const option=element('option',choice.label+(choice.disabled?' · indisponible':''));option.value=choice.value;option.disabled=choice.disabled;if(choice.reason)option.title=choice.reason;select.append(option);}select.value=field.value;label.append(select);fields.append(label);
      select.onchange=async()=>{if(productBusy||surfaceBusy||turn!==opening){select.value=field.value;return;}const value=field.key==='mirror'&&!select.value?null:['width','mirrorSize'].includes(field.key)?Number(select.value):select.value;let next;try{next=productCatalog.apply(project,{[field.key]:value},context);}catch(e){status.textContent=e.message;select.value=field.value;return;}const preview=engine,opened=preview.presentation.capabilities().opened;productBusy=true;controls.inert=true;preview.presentation.editing.setEnabled?.(false);status.textContent='Préparation de votre choix…';
       try{const applied=await preview.update(next);if(turn!==opening||!applied)return;onChange(structuredClone(next));project=next;rememberLED();if(opened)preview.presentation.setOpened(true);renderProducts();reflect();reflectContext();preview.presentation.editing.refresh();status.textContent='';}
       catch(e){if(turn!==opening)return;try{await preview.update(project);}catch{}status.textContent='Ce choix ne peut pas s’afficher. '+e.message;renderProducts();}
       finally{productBusy=false;controls.inert=false;if(turn===opening){preview.presentation.editing.setEnabled?.(true);reflectContext();}}
      };
     }section.append(fields);productControls.append(section);
    }productControls.append(hingeButton);reflectContext();}
    catch(e){const note=element('p',e.message);note.className='randal-presentation-help';productControls.append(note);}
   }

   for(const kind of ['floor','wall']){
    const label=element('label',kind==='floor'?'Sol':'Murs'),select=element('select');select.id='randal-'+kind+'-choice';select.setAttribute('aria-label',kind==='floor'?'Sol':'Murs');label.htmlFor=select.id;
    const groups=new Map();for(const choice of kind==='floor'?catalog.RANDAL_FLOORS:catalog.RANDAL_WALLS){const groupName=kind==='floor'?'':choice.collection==='Peinture'?'Peinture':choice.collection==='Allure'?(choice.decor?'Allure · décors':'Allure · unis'):'Stone Icon';let parent=select;if(groupName){if(!groups.has(groupName)){const group=element('optgroup');group.label=groupName;select.append(group);groups.set(groupName,group);}parent=groups.get(groupName);}const option=element('option',choice.name);option.value=choice.id;parent.append(option);}
    select.value=selection[kind];label.append(select);controls.append(label);
    select.onchange=async()=>{const id=select.value;surfaceBusy++;productControls.inert=true;engine.presentation.editing.setEnabled?.(false);status.textContent='Chargement du revêtement…';try{const applied=await engine.presentation.setSurface(kind,id);if(!applied||turn!==opening)return;selection[kind]=id;project=catalog.withPresentationSurface(project,kind,id);onChange(structuredClone(project));status.textContent='';}catch(e){if(turn!==opening)return;select.value=selection[kind];status.textContent='Revêtement indisponible. Réessayez. '+e.message;}finally{surfaceBusy--;productControls.inert=surfaceBusy>0;if(turn===opening&&!surfaceBusy)engine?.presentation.editing.setEnabled?.(true);}};
   }
   engine.presentation.editing.setListener(edit=>{
    if(turn!==opening)return;
    if(edit.kind==='selection'){context=edit.itemId?{itemId:edit.itemId,part:edit.part||edit.state?.part}:null;renderProducts();status.textContent='';return;}
    if(edit.kind==='invalid'){status.textContent=edit.message;return;}
    if(!['placement','hinge'].includes(edit.kind))return;
    status.textContent='';const item=project.items.find(i=>i.id===edit.itemId);if(!item)return;
    if(edit.kind==='placement'){item.placement={...edit.placement};if(context&&context.itemId!==edit.itemId){context=null;renderProducts();}}
    else item.settings={...item.settings,hingeSide:edit.hingeSide};
    onChange(structuredClone(project));reflectContext();
   });renderProducts();
   const help=element('p','Glissez un élément pour le déplacer. Cliquez dessus pour modifier ses options. Glissez le fond pour tourner ; pincez pour zoomer.');help.className='randal-presentation-help';controls.append(reset,help);
   await Promise.all(['floor','wall'].map(kind=>engine.presentation.setSurface(kind,selection[kind])));if(turn!==opening)return false;status.textContent='';return true;
  }catch(e){if(turn===opening){engine?.dispose();engine=null;controls.replaceChildren();status.textContent='Affichage indisponible. Fermez puis réessayez. '+e.message;}return false;}
 }
 return {sync,open,close};
}
