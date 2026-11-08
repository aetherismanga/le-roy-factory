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
  const header=element('header');header.className='randal-presentation-header';header.append(element('strong','Votre composition RANDAL'));const exit=button('randal-presentation-close','Fermer ✕');header.append(exit);
  const body=element('div');body.className='randal-presentation-body';const stage=element('div');stage.className='randal-presentation-stage';stage.id='randal-presentation-stage';const controls=element('aside');controls.className='randal-presentation-controls';controls.setAttribute('aria-label','Personnaliser la présentation');const status=element('p','Préparation de votre composition…');status.className='randal-presentation-status';status.setAttribute('role','status');stage.append(status);body.append(stage,controls);dialog.append(header,body);document.body.append(dialog);
  exit.onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();onVisibility(true);
  // Native fullscreen must be requested during the click. The modal fills the
  // available viewport as well on iPhone and other browsers without this API.
  try{const native=dialog.requestFullscreen?.();native?.catch(()=>{});}catch{}
  try{
   const settled=await Promise.allSettled([import('./randal-presentation-catalog.js'),createPreview(stage,{presentation:true}),import('./randal-presentation-products.js'),import('./randal-presentation-choice-previews.js')]),failure=settled.find(r=>r.status==='rejected');
   if(failure){if(settled[1].status==='fulfilled')settled[1].value.dispose();throw failure.reason;}
   const results=settled.map(r=>r.value);catalog=results[0];const next=results[1],productCatalog=products?results[2].createPresentationProducts(products):null,mirrorSpec=results[2].mirrorSpec,choicePreview=results[3].presentationChoicePreview;
   const migrateDefaults=project.presentation?.defaultsVersion!==(catalog.RANDAL_PRESENTATION_DEFAULTS_VERSION??3);
   if(turn!==opening){next.dispose();return false;}engine=next;project=catalog.presentationDefaults?.(project)??project;await engine.update(project);if(turn!==opening)return false;
   selection=catalog.presentationChoices(project);
   const openButton=button('randal-composition-open','Ouvrir la composition'),ledButton=button('randal-mirror-led','Allumer le miroir'),reset=button('randal-presentation-reset','Vue initiale');
   controls.append(openButton,ledButton);
   const boundedBrightness=value=>Number.isFinite(Number(value))?Math.min(150,Math.max(25,Math.round(Number(value)))):71;
   let brightnessValue=boundedBrightness(project.presentation?.brightness??71),dimensionsVisible=project.presentation?.dimensions===true;
   engine.setBrightness?.(brightnessValue);engine.dimensions?.setVisible(dimensionsVisible);
   const displayControls=element('div');displayControls.className='randal-presentation-display';
   const dimensionButton=button('randal-dimensions-toggle','Cotes');dimensionButton.setAttribute('aria-pressed',String(dimensionsVisible));dimensionButton.title='Afficher ou masquer les dimensions du mobilier';
   const brightnessLabel=element('label');brightnessLabel.className='randal-presentation-brightness';brightnessLabel.htmlFor='randal-brightness';
   const brightnessHeading=element('span');brightnessHeading.className='randal-brightness-heading';const brightnessOutput=element('output');brightnessOutput.id='randal-brightness-value';brightnessOutput.setAttribute('for','randal-brightness');brightnessHeading.append(element('span','Luminosité'),brightnessOutput);
   const brightness=element('input');brightness.type='range';brightness.id='randal-brightness';brightness.min='25';brightness.max='150';brightness.step='1';brightness.setAttribute('aria-label','Luminosité');
   function reflectBrightness(){brightness.value=String(brightnessValue);brightness.setAttribute('aria-valuetext',brightnessValue+' %');brightnessOutput.value=brightnessValue+' %';brightnessOutput.textContent=brightnessValue+' %';}
   function saveDisplay(){const prior=project.presentation&&typeof project.presentation==='object'&&!Array.isArray(project.presentation)?project.presentation:{};project.presentation={...prior,brightness:brightnessValue,dimensions:dimensionsVisible};onChange(structuredClone(project));}
   brightness.oninput=()=>{if(turn!==opening||!engine)return false;brightnessValue=boundedBrightness(brightness.value);engine.setBrightness?.(brightnessValue);reflectBrightness();return true;};
   brightness.onchange=()=>{if(brightness.oninput())saveDisplay();};
   dimensionButton.onclick=()=>{if(turn!==opening||!engine)return;dimensionsVisible=!dimensionsVisible;engine.dimensions?.setVisible(dimensionsVisible);dimensionButton.setAttribute('aria-pressed',String(dimensionsVisible));saveDisplay();};
   reflectBrightness();brightnessLabel.append(brightnessHeading,brightness);displayControls.append(dimensionButton,brightnessLabel);controls.append(displayControls);
   function reflect(){if(!engine)return;const state=engine.presentation.capabilities();openButton.hidden=!state.openable;openButton.textContent=state.opened?'Fermer la composition':state.partlyOpened?'Ouvrir toute la composition':'Ouvrir la composition';openButton.setAttribute('aria-pressed',String(state.opened));ledButton.hidden=!state.led;ledButton.textContent=state.ledOn?'Éteindre le miroir':'Allumer le miroir';ledButton.setAttribute('aria-pressed',String(state.ledOn));}
   openButton.onclick=()=>{if(turn!==opening||!engine)return;const state=engine.presentation.capabilities();engine.presentation.setOpened(!state.opened);reflect();reflectContext();};
   const ledEligible=new Set(),ledModels=new Map();
   function rememberLED(){for(const item of project.items)if(item.type==='mirror'){if(ledModels.get(item.id)!==item.settings.mirrorModel)ledEligible.delete(item.id);ledModels.set(item.id,item.settings.mirrorModel);const spec=mirrorSpec(item.settings);if(spec.led||spec.metal&&item.settings.led)ledEligible.add(item.id);else if(!spec.metal)ledEligible.delete(item.id);}}
   rememberLED();ledButton.onclick=()=>{if(turn!==opening||!engine)return;const enabled=!engine.presentation.capabilities().ledOn;engine.presentation.setLED(enabled);for(const item of project.items)if(ledEligible.has(item.id))item.settings={...item.settings,led:enabled};onChange(structuredClone(project));reflect();};reset.onclick=()=>{if(turn!==opening||!engine)return;engine.reset();};reflect();
   const productControls=element('div');productControls.className='randal-presentation-products';controls.append(productControls);let productBusy=false,surfaceBusy=0,context=null;
   const hingeButton=button('randal-reverse-hinge','Inverser l’ouverture');hingeButton.hidden=true;hingeButton.onclick=()=>{if(turn!==opening||!engine)return;engine.presentation.editing.reverseHinge();};
   const itemButton=button('randal-item-open','Ouvrir ce meuble');itemButton.className='randal-item-open';itemButton.hidden=true;
   function contextItem(){const item=project.items.find(i=>i.id===context?.itemId);return item&&['cabinet','column'].includes(item.type)&&!['basin','top','tap','mirror'].includes(context?.part)?item:null;}
   function reflectContext(){if(!engine)return;const state=engine.presentation.editing.state();hingeButton.hidden=!context||state.selected!==context.itemId||!state.canReverse;hingeButton.textContent='Ouverture à '+(state.hingeSide==='right'?'droite':'gauche')+' · inverser';const item=contextItem(),opening=item&&engine.presentation.itemCapabilities?.(item.id);itemButton.hidden=!opening?.openable||typeof engine.presentation.setItemOpened!=='function';itemButton.textContent=(opening?.opened?'Fermer ':'Ouvrir ')+(item?.type==='column'?'cette colonne':'ce meuble');itemButton.setAttribute('aria-pressed',String(!!opening?.opened));}
   itemButton.onclick=()=>{if(turn!==opening||!engine||productBusy||surfaceBusy)return;const item=contextItem(),state=item&&engine.presentation.itemCapabilities?.(item.id);if(!state?.openable)return;engine.presentation.setItemOpened?.(item.id,!state.opened);reflect();reflectContext();};
   function choiceFigure(){const figure=element('figure');figure.className='randal-choice-preview';figure.hidden=true;return figure;}
   function showChoicePreview(figure,preview){
    figure.replaceChildren();figure.hidden=!preview;if(!preview)return;figure.dataset.type=preview.type;
    if(preview.type==='image'&&preview.src){const image=element('img');image.src=preview.src;image.alt=preview.alt||'Aperçu du choix sélectionné';image.loading='lazy';image.decoding='async';if(preview.fit==='contain')image.className='randal-choice-contain';image.onerror=()=>{if(turn!==opening||!figure.contains(image))return;figure.replaceChildren(element('figcaption','Visuel indisponible pour ce choix.'));};figure.append(image);}
    else if(preview.type==='color'&&/^#[0-9a-f]{6}$/i.test(preview.hex||'')){const swatch=element('span');swatch.className='randal-choice-color';swatch.style.backgroundColor=preview.hex;swatch.setAttribute('role','img');swatch.setAttribute('aria-label',preview.alt||'Couleur sélectionnée');figure.append(swatch);}
    else{figure.hidden=true;return;}
    if(preview.caption||preview.alt)figure.append(element('figcaption',preview.caption||preview.alt));
   }
   function renderProducts(){
    productControls.replaceChildren();
    if(!context||!project.items.some(i=>i.id===context.itemId)){context=null;const hint=element('p','Cliquez sur un meuble, une vasque, une colonne ou un miroir pour le personnaliser.');hint.className='randal-presentation-help randal-context-hint';productControls.append(hint);reflectContext();return;}
    productControls.append(itemButton);if(!productCatalog){reflectContext();return;}
    try{const state=productCatalog.fields(project,context);for(const group of state.groups){
     const section=element('section');section.className='randal-presentation-product';section.dataset.family=group.id;const heading=element('h2',group.label);section.append(heading);const fields=element('div');
     for(const field of group.fields){const label=element('label',field.label),select=element('select');select.id='randal-product-'+field.key;label.htmlFor=select.id;select.setAttribute('aria-label',field.label);for(const choice of field.choices){const option=element('option',choice.label+(choice.disabled?' · indisponible':''));option.value=choice.value;option.disabled=choice.disabled;if(choice.reason)option.title=choice.reason;select.append(option);}select.value=field.value;const visual=choiceFigure(),selectedPreview=value=>field.choices.find(choice=>String(choice.value)===String(value))?.preview;showChoicePreview(visual,selectedPreview(field.value)||field.preview);label.append(select,visual);fields.append(label);
      select.onchange=async()=>{if(productBusy||surfaceBusy||turn!==opening){select.value=field.value;showChoicePreview(visual,selectedPreview(field.value)||field.preview);return;}showChoicePreview(visual,selectedPreview(select.value));const value=field.key==='mirror'&&!select.value?null:['width','mirrorSize'].includes(field.key)?Number(select.value):select.value;let next;try{next=productCatalog.apply(project,{[field.key]:value},context);}catch(e){status.textContent=e.message;select.value=field.value;showChoicePreview(visual,selectedPreview(field.value)||field.preview);return;}const preview=engine,opened=preview.presentation.capabilities().opened;productBusy=true;controls.inert=true;preview.presentation.editing.setEnabled?.(false);status.textContent='Préparation de votre choix…';
       try{const applied=await preview.update(next);if(turn!==opening)return;if(!applied){select.value=field.value;showChoicePreview(visual,selectedPreview(field.value)||field.preview);status.textContent='Ce choix ne peut pas s’afficher. Réessayez.';return;}onChange(structuredClone(next));project=next;rememberLED();if(opened)preview.presentation.setOpened(true);renderProducts();reflect();reflectContext();preview.presentation.editing.refresh();status.textContent='';}
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
    const choices=kind==='floor'?catalog.RANDAL_FLOORS:catalog.RANDAL_WALLS,visual=choiceFigure(),surfacePreview=id=>choicePreview(choices.find(choice=>choice.id===id));select.value=selection[kind];showChoicePreview(visual,surfacePreview(select.value));label.append(select,visual);controls.append(label);
    select.onchange=async()=>{if(turn!==opening||productBusy||surfaceBusy){select.value=selection[kind];showChoicePreview(visual,surfacePreview(select.value));return;}const id=select.value;showChoicePreview(visual,surfacePreview(id));surfaceBusy++;productControls.inert=true;engine.presentation.editing.setEnabled?.(false);status.textContent='Chargement du revêtement…';try{const applied=await engine.presentation.setSurface(kind,id);if(turn!==opening)return;if(!applied){select.value=selection[kind];showChoicePreview(visual,surfacePreview(select.value));status.textContent='Revêtement indisponible. Réessayez.';return;}selection[kind]=id;project=catalog.withPresentationSurface(project,kind,id);onChange(structuredClone(project));status.textContent='';}catch(e){if(turn!==opening)return;select.value=selection[kind];showChoicePreview(visual,surfacePreview(select.value));status.textContent='Revêtement indisponible. Réessayez. '+e.message;}finally{surfaceBusy--;productControls.inert=surfaceBusy>0;if(turn===opening&&!surfaceBusy)engine?.presentation.editing.setEnabled?.(true);}};
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
   const initialSurfaces=await Promise.all(['floor','wall'].map(kind=>engine.presentation.setSurface(kind,selection[kind])));if(turn!==opening)return false;if(initialSurfaces.some(applied=>!applied))throw Error('Un revêtement n’a pas pu être chargé.');status.textContent='';if(migrateDefaults)onChange(structuredClone(project));return true;
  }catch(e){if(turn===opening){engine?.dispose();engine=null;controls.replaceChildren();status.textContent='Affichage indisponible. Fermez puis réessayez. '+e.message;}return false;}
 }
 return {sync,open,close};
}
