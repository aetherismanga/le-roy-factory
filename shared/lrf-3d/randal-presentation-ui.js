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
   const help=element('p','Faites glisser pour tourner. Pincez ou utilisez la molette pour zoomer.');help.className='randal-presentation-help';controls.append(reset,help);
   await Promise.all(['floor','wall'].map(kind=>engine.presentation.setSurface(kind,selection[kind])));if(turn!==opening)return false;status.textContent='';return true;
  }catch(e){if(turn===opening)status.textContent='Affichage indisponible. Fermez puis réessayez. '+e.message;return false;}
 }
 return {sync,open,close};
}
