import {portalRoute} from './randal-portal-context.js';
import {isRandalPresentation} from './randal-client-access.js';

// Reuse the workshop's commerce verification and its settled events.
// Never create a second controller or exchange the parent session twice.
export function mountRandalWorkshopAccess(createIdentity){
 if(typeof window==='undefined'||typeof parent==='undefined')return null;
 const gate=document.createElement('dialog');gate.className='randal-workshop-check';gate.setAttribute('aria-label','Ouverture du configurateur');gate.textContent='Ouverture de votre configurateur…';gate.addEventListener('cancel',e=>e.preventDefault());document.body.append(gate);
 let done=false;
 const show=setTimeout(()=>{if(!done)gate.showModal();},350);
 const enforce=state=>{
  if(!state?.known||state.pending)return;
  if(isRandalPresentation(state)){location.replace(portalRoute('index.html?view=quote'));return;}
  if(done)return;
  if(state.error){gate.textContent='Votre compte ne peut pas être vérifié. ';const back=document.createElement('a');back.href=portalRoute('index.html');back.textContent='Revenir au configurateur';gate.append(back);if(!gate.open)gate.showModal();return;}
  done=true;clearTimeout(show);clearTimeout(fallback);if(gate.open)gate.close();gate.remove();
 };
 const fallback=setTimeout(()=>{if(!done)enforce({known:true,error:'Le chargement prend plus de temps que prévu.'});},12000);
 addEventListener('lrf-identity',event=>enforce(event.detail));
 // Block input until the server capability is known, without showing a modal
 // during the normal fast path. A persisted browser flag never grants access.
 const block=event=>{if(done||gate.contains(event.target))return;event.preventDefault();event.stopImmediatePropagation();};
 for(const type of ['pointerdown','click','keydown','submit'])document.addEventListener(type,block,true);
 return {dispose(){clearTimeout(show);clearTimeout(fallback);for(const type of ['pointerdown','click','keydown','submit'])document.removeEventListener(type,block,true);gate.remove();}};
}
