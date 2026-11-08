import {portalRoute} from './randal-portal-context.js';
import {isRandalPresentation} from './randal-client-access.js';

// Gate direct atelier/house URLs before any editor interaction. Authentication
// uses the same server and first-party session exchange as the normal pages.
export function mountRandalWorkshopAccess(createIdentity){
 if(typeof window==='undefined'||typeof parent==='undefined')return null;
 const gate=document.createElement('dialog');gate.className='randal-workshop-check';gate.setAttribute('aria-label','Vérification du compte LRF');gate.textContent='Vérification de votre compte LRF…';gate.addEventListener('cancel',e=>e.preventDefault());document.body.append(gate);gate.showModal();
 let identity;
 const enforce=state=>{if(!state?.known||state.pending)return;if(isRandalPresentation(state)){location.replace(portalRoute('index.html?view=quote'));return;}if(state.error){gate.textContent='Votre compte ne peut pas être vérifié. ';const back=document.createElement('a');back.href=portalRoute('index.html');back.textContent='Revenir au configurateur';gate.append(back);return;}gate.close();gate.remove();identity?.dispose?.();};
 identity=createIdentity(()=>null);identity.load().then(enforce);
 // A session can change while an already-open workshop is in the background.
 addEventListener('lrf-identity',event=>{if(isRandalPresentation(event.detail))location.replace(portalRoute('index.html?view=quote'));});
 return identity;
}
