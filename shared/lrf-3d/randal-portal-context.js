// This URL context selects navigation only. Authentication, account roles and
// RANDAL presentation permissions remain verified by the existing server.
export const PORTAL_ORIGIN='https://studio-one-beta-test-v2.vercel.app';
export const PORTAL_URL=PORTAL_ORIGIN+'/randal.html';
const localPages=new Set(['/','/index.html','/atelier.html']);
const variants=new Set(['studio-one','randal-general']);

export function isRandalPortal(url=globalThis.location?.href){
 try{const value=new URL(url);return value.searchParams.get('entry')==='randal'&&value.searchParams.get('standalone')==='1';}catch{return false;}
}

export function portalRoute(path,base=globalThis.location?.href){
 if(!isRandalPortal(base))return path;
 try{
  const current=new URL(base),target=new URL(path,current);
  if(!['https:','http:'].includes(current.protocol)||target.origin!==current.origin||target.username||target.password||!localPages.has(target.pathname))return PORTAL_URL;
  target.searchParams.set('entry','randal');target.searchParams.set('standalone','1');target.searchParams.delete('demo');return target.href;
 }catch{return PORTAL_URL;}
}

function portalParent(view,document){
 try{const referrer=new URL(document?.referrer);return view?.parent&&view.parent!==view&&referrer.origin===PORTAL_ORIGIN&&!referrer.username&&!referrer.password?view.parent:null;}catch{return null;}
}

export function returnToRandalPortal({view=globalThis.window,document=globalThis.document}={}){
 const parent=portalParent(view,document);
 if(parent){try{parent.postMessage({type:'lrf-portal-exit'},PORTAL_ORIGIN);return;}catch{}}
 view?.location?.assign(PORTAL_URL);
}

export function portalCompositionRequest(composition,mode='preview'){
 if(!variants.has(composition?.variant)||typeof composition.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,95}$/i.test(composition.id)||!['preview','copy'].includes(mode))throw Error('Composition RANDAL inconnue.');
 return {type:'lrf-portal-open',variant:composition.variant,compositionId:composition.id,mode};
}

export function portalCompositionURL(composition,mode='preview'){
 const request=portalCompositionRequest(composition,mode),url=new URL(PORTAL_URL);url.searchParams.set('variant',request.variant);url.searchParams.set('composition',request.compositionId);if(mode==='copy')url.searchParams.set('compositionMode','copy');return url.href;
}

export function openRandalPortalComposition(composition,mode='preview',{view=globalThis.window,document=globalThis.document}={}){
 const request=portalCompositionRequest(composition,mode),parent=portalParent(view,document),url=portalCompositionURL(composition,mode);
 if(parent){try{parent.postMessage(request,PORTAL_ORIGIN);return url;}catch{}}
 view?.location?.assign(url);return url;
}

const mounted=new WeakSet();
export function mountRandalPortalNavigation({document=globalThis.document,view=globalThis.window}={}){
 if(!document||!view||!isRandalPortal(view.location?.href)||mounted.has(document))return false;mounted.add(document);
 const exit=()=>{
  // Match the normal navigation's project checkpoint before leaving the app.
  try{const EventType=view.Event||globalThis.Event;if(EventType)view.dispatchEvent?.(new EventType('lrf-project-checkpoint'));const flushed=view.LRF_PROJECT_WORKSPACE?.flush();Promise.resolve(flushed).then(()=>returnToRandalPortal({view,document})).catch(()=>{});}catch{}
 };
 document.addEventListener('click',event=>{
  const quit=event.target?.closest?.('#quit-configurator,#return-randal,#house-quit'),link=event.target?.closest?.('a[href]');
  if(quit){event.preventDefault();event.stopImmediatePropagation();exit();return;}
  if(!link)return;const href=link.getAttribute('href');if(!href||href.startsWith('#'))return;
  let url;try{url=new URL(href,view.location.href);}catch{}
  if(link.hasAttribute('download')&&['blob:','data:'].includes(url?.protocol))return;
  const route=portalRoute(href,view.location.href);
  if(route===PORTAL_URL){event.preventDefault();event.stopImmediatePropagation();exit();return;}
  link.href=route;link.target='_self';
 },true);
 return true;
}

mountRandalPortalNavigation();
