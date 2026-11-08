import {isRandalPortal,PORTAL_ORIGIN} from './randal-portal-context.js';

export function notifyPortalPresentation(open,{view=globalThis.window,document=globalThis.document}={}){
 try{if(isRandalPortal(view.location.href)&&view.parent!==view&&new URL(document.referrer).origin===PORTAL_ORIGIN)view.parent.postMessage({type:'lrf-portal-presentation',open:!!open},PORTAL_ORIGIN);}catch{}
}

// The scene stays mounted while the mobile drawer opens or the phone rotates.
export function mountPresentationOptions({dialog,body,controls,document=globalThis.document,view=globalThis.window}){
 const toggle=document.createElement('button');toggle.id='randal-options-toggle';toggle.className='randal-presentation-options-toggle';toggle.type='button';toggle.textContent='Options';toggle.setAttribute('aria-controls','randal-presentation-options');controls.id='randal-presentation-options';body.append(toggle);
 let portrait=false,opened=false,disposed=false;
 const coarse=view?.matchMedia?.('(pointer: coarse)');
 function paint(){
  body.classList.toggle('randal-mobile-controls-open',portrait&&opened);controls.inert=portrait&&!opened;controls.setAttribute('aria-hidden',String(portrait&&!opened));
  toggle.setAttribute('aria-expanded',String(portrait&&opened));toggle.setAttribute('aria-label',opened?'Masquer les options':'Afficher les options');toggle.textContent=opened?'Fermer':'Options';
 }
 function sync(){if(disposed)return;const mobile=coarse?.matches===true&&(view.innerWidth<=760||(view.innerWidth<=1200&&view.innerHeight<=600)),next=!!mobile&&view.innerHeight>=view.innerWidth;
  if(next!==portrait)opened=false;portrait=next;body.classList.toggle('randal-mobile-view',!!mobile);body.classList.toggle('randal-mobile-portrait',portrait);dialog.classList.toggle('randal-mobile-view',!!mobile);toggle.hidden=!portrait;paint();
 }
 function hide(){if(!portrait||!opened)return false;opened=false;paint();toggle.focus?.();return true;}
 toggle.onclick=()=>{if(!portrait)return;opened=!opened;paint();};
 view?.addEventListener?.('resize',sync);view?.addEventListener?.('orientationchange',sync);coarse?.addEventListener?.('change',sync);sync();
 return {reveal(){if(portrait){opened=true;paint();}},hide,get expanded(){return portrait&&opened;},dispose(){disposed=true;view?.removeEventListener?.('resize',sync);view?.removeEventListener?.('orientationchange',sync);coarse?.removeEventListener?.('change',sync);toggle.remove();controls.inert=false;}};
}
