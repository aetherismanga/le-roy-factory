import {isRandalPresentation} from './randal-client-access.js';

export function createRandalPresentation({getIdentity,getProject,createPreview,onChange=()=>{}}){
 let dialog=null,engine=null,catalog=null,project=null,selection=null,opening=0,previousFocus=null,wasRestricted=false,originalOrigin='';
 const element=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const button=(id,text)=>{const e=element('button',text);e.id=id;e.type='button';return e;};
 function close(){opening++;if(document.fullscreenElement===dialog)document.exitFullscreen?.().catch(()=>{});if(dialog?.open)dialog.close();engine?.dispose();engine=null;dialog?.remove();dialog=null;previousFocus?.focus?.();}
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
  exit.onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();
  // Native fullscreen must be requested during the click. The modal fills the
  // available viewport as well on iPhone and other browsers without this API.
  try{const native=dialog.requestFullscreen?.();native?.catch(()=>{});}catch{}
  try{
   const results=await Promise.all([import('./randal-presentation-catalog.js'),createPreview(stage,{presentation:true})]);catalog=results[0];const next=results[1];
   if(turn!==opening){next.dispose();return false;}engine=next;await engine.update(project);if(turn!==opening)return false;
   selection=catalog.presentationChoices(project);
   const openButton=button('randal-composition-open','Ouvrir la composition'),ledButton=button('randal-mirror-led','Allumer le miroir'),reset=button('randal-presentation-reset','Vue initiale');
   controls.append(openButton,ledButton);
   function reflect(){if(!engine)return;const state=engine.presentation.capabilities();openButton.hidden=!state.openable;openButton.textContent=state.opened?'Fermer la composition':'Ouvrir la composition';openButton.setAttribute('aria-pressed',String(state.opened));ledButton.hidden=!state.led;ledButton.textContent=state.ledOn?'Éteindre le miroir':'Allumer le miroir';ledButton.setAttribute('aria-pressed',String(state.ledOn));}
   openButton.onclick=()=>{const state=engine.presentation.capabilities();engine.presentation.setOpened(!state.opened);reflect();};ledButton.onclick=()=>{engine.presentation.setLED(!engine.presentation.capabilities().ledOn);reflect();};reset.onclick=()=>engine.reset();reflect();
   for(const kind of ['floor','wall']){
    const label=element('label',kind==='floor'?'Sol':'Murs'),select=element('select');select.id='randal-'+kind+'-choice';select.setAttribute('aria-label',kind==='floor'?'Sol':'Murs');label.htmlFor=select.id;
    const groups=new Map();for(const choice of kind==='floor'?catalog.RANDAL_FLOORS:catalog.RANDAL_WALLS){const groupName=kind==='floor'?'':choice.collection==='Peinture'?'Peinture':choice.collection==='Allure'?(choice.decor?'Allure · décors':'Allure · unis'):'Stone Icon';let parent=select;if(groupName){if(!groups.has(groupName)){const group=element('optgroup');group.label=groupName;select.append(group);groups.set(groupName,group);}parent=groups.get(groupName);}const option=element('option',choice.name);option.value=choice.id;parent.append(option);}
    select.value=selection[kind];label.append(select);controls.append(label);
    select.onchange=async()=>{const id=select.value;status.textContent='Chargement du revêtement…';try{const applied=await engine.presentation.setSurface(kind,id);if(!applied||turn!==opening)return;selection[kind]=id;project=catalog.withPresentationSurface(project,kind,id);onChange(structuredClone(project));status.textContent='';}catch(e){if(turn!==opening)return;select.value=selection[kind];status.textContent='Revêtement indisponible. Réessayez. '+e.message;}};
   }
   const furniture=element('details');furniture.className='randal-presentation-furniture';furniture.id='randal-furniture-controls';furniture.append(element('summary','Déplacer un meuble / sens d’ouverture'));
   const furnitureBody=element('div'),itemLabel=element('label','Élément à modifier'),itemSelect=element('select');itemSelect.id='randal-selected-item';itemSelect.setAttribute('aria-label','Élément à modifier');itemLabel.append(itemSelect);furnitureBody.append(itemLabel);
   const actions=element('div');actions.className='randal-furniture-actions';const moveButton=button('randal-move-mode','Déplacer dans la vue'),hingeButton=button('randal-reverse-hinge','Inverser l’ouverture');actions.append(moveButton,hingeButton);furnitureBody.append(actions);
   const steps=element('div');steps.className='randal-furniture-steps';const verticalButtons=[];
   for(const [id,text,label,du,dh]of [['left','← 5 cm','Déplacer de 5 cm vers la gauche',-5,0],['right','5 cm →','Déplacer de 5 cm vers la droite',5,0],['up','Monter 5 cm','Monter de 5 cm',0,5],['down','Descendre 5 cm','Descendre de 5 cm',0,-5]]){const b=button('randal-move-'+id,text);b.setAttribute('aria-label',label);b.onclick=()=>engine.presentation.editing.nudge(du,dh);steps.append(b);if(dh)verticalButtons.push(b);}
   furnitureBody.append(steps);furniture.append(furnitureBody);controls.append(furniture);
   let itemsKey='';
   function reflectFurniture(){if(!engine)return;const state=engine.presentation.editing.state(),key=JSON.stringify(state.items);if(key!==itemsKey){itemSelect.replaceChildren(...state.items.map(item=>{const option=element('option',item.label);option.value=item.id;return option;}));itemsKey=key;}itemSelect.value=state.selected||'';moveButton.disabled=!state.canMove;moveButton.textContent=state.moving?'Terminer le déplacement':'Déplacer dans la vue';moveButton.setAttribute('aria-pressed',String(state.moving));hingeButton.hidden=!state.canReverse;hingeButton.textContent='Ouverture à '+(state.hingeSide==='right'?'droite':'gauche')+' · inverser';for(const b of verticalButtons)b.disabled=!state.vertical;}
   itemSelect.onchange=()=>engine.presentation.editing.selectItem(itemSelect.value);moveButton.onclick=()=>engine.presentation.editing.setMoving(!engine.presentation.editing.state().moving);hingeButton.onclick=()=>engine.presentation.editing.reverseHinge();
   engine.presentation.editing.setListener(edit=>{if(turn!==opening)return;reflectFurniture();if(edit.kind==='selection'&&!edit.state?.moving)furniture.open=true;if(edit.kind==='invalid'){status.textContent=edit.message;return;}status.textContent='';if(!['placement','hinge'].includes(edit.kind))return;const item=project.items.find(i=>i.id===edit.itemId);if(!item)return;if(edit.kind==='placement')item.placement={...edit.placement};else item.settings={...item.settings,hingeSide:edit.hingeSide};onChange(structuredClone(project));});reflectFurniture();
   const help=element('p','Faites glisser pour tourner. Pincez pour zoomer. Pour déplacer un élément, activez « Déplacer dans la vue » puis faites-le glisser.');help.className='randal-presentation-help';controls.append(reset,help);
   await Promise.all(['floor','wall'].map(kind=>engine.presentation.setSurface(kind,selection[kind])));if(turn!==opening)return false;status.textContent='';return true;
  }catch(e){if(turn===opening)status.textContent='Affichage indisponible. Fermez puis réessayez. '+e.message;return false;}
 }
 return {sync,open,close};
}
