import {publicComposition,publicCompositionProject} from './public-compositions.js';
const clone=value=>JSON.parse(JSON.stringify(value));

// Public examples are immutable source data. Preview is an isolated scene and
// never an active saved project. Only an explicit copy enters the workspace.
export function createPublicCompositionSession({getProject,restoreProject,getWorkspace,storage,activeKey,onBefore=()=>{},onChange=()=>{}}){
 let active=null,previous=null;
 const refresh=()=>getWorkspace()?.refreshLock?.();
 return {
  get isPreview(){return !!active;},get composition(){return active;},
  preview(id,{checkpoint=true}={}){const descriptor=publicComposition(id);if(!descriptor)throw Error('Composition introuvable.');onBefore();
   const prior=active,priorPrevious=previous;
   if(!active){if(checkpoint)getWorkspace()?.checkpoint?.();previous=clone(getProject());}
   active=descriptor;
   if(!restoreProject(publicCompositionProject(id))){active=prior;previous=priorPrevious;refresh();throw Error('Cette composition ne peut pas être ouverte.');}
   onChange('preview',descriptor);refresh();return true;
  },
  copy(id=active?.id,{checkpoint=true}={}){const descriptor=publicComposition(id);if(!descriptor)throw Error('Composition introuvable.');onBefore();
   if(!active&&checkpoint)getWorkspace()?.checkpoint?.();
   const prior=active,priorPrevious=previous,priorId=storage.getItem(activeKey);active=null;previous=null;storage.removeItem(activeKey);
   if(!restoreProject(publicCompositionProject(id,{copy:true}))){active=prior;previous=priorPrevious;if(priorId)storage.setItem(activeKey,priorId);refresh();throw Error('La copie ne peut pas être créée.');}
   onChange('copy',descriptor);refresh();getWorkspace()?.checkpoint?.({capture:true});return true;
  },
  leave({restore=true}={}){if(!active)return false;onBefore();const saved=previous,prior=active;active=null;previous=null;try{if(restore&&saved&&!restoreProject(saved))throw Error('Votre projet ne peut pas être réaffiché.');}catch(error){active=prior;previous=saved;refresh();throw error;}onChange('close');refresh();return true;}
 };
}

export function mountPublicCompositionBanner({stage,session,onCopy,onClose}){
 const document=stage.ownerDocument;
 if(!document.getElementById('public-composition-banner-style')){const style=document.createElement('style');style.id='public-composition-banner-style';style.textContent='.public-composition-banner{position:absolute;z-index:45;left:16px;bottom:90px;max-width:440px;box-sizing:border-box;border:1px solid #cbd1bf;border-radius:10px;background:#fffdf6f5;color:#29483e;padding:12px;box-shadow:0 4px 18px #19352b20;font:12px/1.4 Arial,sans-serif}.public-composition-banner[hidden]{display:none}.public-composition-banner strong{display:block;margin-bottom:4px}.public-composition-banner p{margin:0 0 9px}.public-composition-banner div{display:flex;gap:7px;flex-wrap:wrap}.public-composition-banner button{min-height:40px;border:1px solid #cbd1bf;border-radius:7px;padding:8px 11px;background:#fffdf6;color:#29483e;cursor:pointer}.public-composition-banner button:first-child{background:#294b3f;color:white}@media(max-width:760px){.public-composition-banner{left:8px;right:8px;bottom:78px;max-width:none;padding:10px;font-size:11px}.public-composition-banner button{min-height:40px;font-size:11px}#viewer.walk-active .public-composition-banner{left:auto;right:8px;top:128px;bottom:auto;width:calc(100% - 156px);max-width:220px}#viewer.walk-active .public-composition-banner p{display:none}#viewer.walk-active .public-composition-banner button{min-height:38px;width:100%;padding:6px;font-size:10px}}';document.head.append(style);}
 const banner=document.createElement('section');banner.className='public-composition-banner';banner.hidden=true;banner.setAttribute('aria-label','Composition publique en lecture seule');
 const title=document.createElement('strong'),note=document.createElement('p'),actions=document.createElement('div'),copy=document.createElement('button'),close=document.createElement('button');note.textContent='Lecture seule · visitez et ouvrez les éléments, ou créez votre copie pour modifier la composition.';copy.type=close.type='button';copy.textContent='Copier pour mon projet';close.textContent='Fermer l’aperçu';copy.dataset.copyPublicComposition='true';close.dataset.closePublicComposition='true';copy.onclick=()=>onCopy(session.composition.id);close.onclick=onClose;actions.append(copy,close);banner.append(title,note,actions);stage.append(banner);
 return {refresh(){banner.hidden=!session.isPreview;title.textContent=session.composition?.title||'';}};
}
