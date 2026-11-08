import {isRandalPortal,PORTAL_ORIGIN} from './randal-portal-context.js';

export function notifyPortalPresentation(open,{view=globalThis.window,document=globalThis.document}={}){
 try{if(isRandalPortal(view.location.href)&&view.parent!==view&&new URL(document.referrer).origin===PORTAL_ORIGIN)view.parent.postMessage({type:'lrf-portal-presentation',open:!!open},PORTAL_ORIGIN);}catch{}
}

// The scene stays mounted; portrait options use a compact bottom panel so furniture stays visible.
export function mountPresentationOptions({dialog,body,controls,document=globalThis.document,view=globalThis.window}){
 const toggle=document.createElement('button');toggle.id='randal-options-toggle';toggle.className='randal-presentation-options-toggle';toggle.type='button';toggle.textContent='Options';toggle.setAttribute('aria-controls','randal-presentation-options');controls.id='randal-presentation-options';body.append(toggle);
 const tabs=document.createElement('nav');tabs.className='randal-mobile-options-tabs';tabs.setAttribute('aria-label','Réglages');
 const buttons=new Map();for(const [id,label]of [['furniture','Élément'],['floor','Sol'],['wall','Murs'],['view','Vue']]){const tab=document.createElement('button');tab.type='button';tab.textContent=label;tab.setAttribute('data-randal-tab',id);tab.onclick=()=>{activeTab=id;controls.scrollTop=0;paint();};buttons.set(id,tab);tabs.append(tab);}controls.prepend(tabs);
 let portrait=false,opened=false,disposed=false,activeTab='view';
 const coarse=view?.matchMedia?.('(pointer: coarse)');
 function paint(){
  body.dataset.randalOptionsTab=activeTab;tabs.hidden=!portrait;for(const [id,tab]of buttons)tab.setAttribute('aria-pressed',String(id===activeTab));
  body.classList.toggle('randal-mobile-controls-open',portrait&&opened);controls.inert=portrait&&!opened;controls.setAttribute('aria-hidden',String(portrait&&!opened));
  toggle.setAttribute('aria-expanded',String(portrait&&opened));toggle.setAttribute('aria-label',opened?'Masquer les options':'Afficher les options');toggle.textContent=opened?'Fermer':'Options';
 }
 function sync(){if(disposed)return;const mobile=coarse?.matches===true&&(view.innerWidth<=760||(view.innerWidth<=1200&&view.innerHeight<=600)),next=!!mobile&&view.innerHeight>=view.innerWidth;
  if(next!==portrait)opened=false;portrait=next;body.classList.toggle('randal-mobile-view',!!mobile);body.classList.toggle('randal-mobile-portrait',portrait);dialog.classList.toggle('randal-mobile-view',!!mobile);toggle.hidden=!portrait;paint();
 }
 function hide(){if(!portrait||!opened)return false;opened=false;paint();toggle.focus?.();return true;}
 toggle.onclick=()=>{if(!portrait)return;opened=!opened;paint();};
 view?.addEventListener?.('resize',sync);view?.addEventListener?.('orientationchange',sync);coarse?.addEventListener?.('change',sync);sync();
 return {register(node,group){if(buttons.has(group))node.setAttribute('data-randal-option-group',group);},reveal(group){if(portrait){if(buttons.has(group))activeTab=group;opened=true;controls.scrollTop=0;paint();}},refresh:paint,hide,get expanded(){return portrait&&opened;},dispose(){disposed=true;view?.removeEventListener?.('resize',sync);view?.removeEventListener?.('orientationchange',sync);coarse?.removeEventListener?.('change',sync);toggle.remove();tabs.remove();controls.inert=false;}};
}
