import {createIdentityState} from './commerce/identity-state.js';
import {isRandalPresentation} from './randal-client-access.js';
import {PORTAL_ORIGIN,PORTAL_URL,isRandalPortal} from './randal-portal-context.js';

const CHILD_ORIGINS=new Set([PORTAL_ORIGIN,'https://randal-catalogue-general-3d.vercel.app']);
const gates=new WeakMap();
export function trustedRandalPortalParent({view=globalThis.window,document=globalThis.document}={}){
 try{const referrer=new URL(document.referrer);return isRandalPortal(view.location.href)&&CHILD_ORIGINS.has(new URL(view.location.href).origin)&&view.parent!==view&&referrer.origin===PORTAL_ORIGIN&&!referrer.username&&!referrer.password;}catch{return false;}
}
export function redirectRandalPortal(view=globalThis.window){try{view.location.replace(PORTAL_URL);}catch{}}

// A locked child never displays or accepts input in a cached account's UI.
// This is a presentation gate; server verification remains the authority.
export function mountRandalPortalGate({document=globalThis.document}={}){
 if(!document?.createElement||!document.body)return {setVerified(){},dispose(){}};
 if(gates.has(document))return gates.get(document);
 const style=document.createElement('style');style.id='randal-portal-gate-style';
 style.textContent='html[data-randal-portal-verified="false"] body>*:not(#randal-portal-gate){visibility:hidden!important;pointer-events:none!important}#randal-portal-gate{position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;gap:18px;padding:28px;background:#f6f4ef;color:#29362c;text-align:center;font:16px/1.6 system-ui,sans-serif}#randal-portal-gate[hidden]{display:none}#randal-portal-gate p{margin:0;max-width:460px}#randal-portal-gate a{display:block;min-height:44px;padding:10px 16px;border:1px solid #b9c1ae;border-radius:8px;color:#29362c;background:#fffefb;text-decoration:none}#randal-portal-gate a:focus-visible{outline:3px solid #a78a55;outline-offset:3px}';
 const gate=document.createElement('section');gate.id='randal-portal-gate';gate.setAttribute('aria-label','Compte RANDAL');
 const message=document.createElement('p');message.setAttribute('role','status');
 const back=document.createElement('a');back.href=PORTAL_URL;back.target='_top';back.textContent='Choisir un configurateur';gate.append(message,back);document.head.append(style);document.body.append(gate);
 let verified=false;
 function block(event){if(verified||gate.contains(event.target))return;event.preventDefault();event.stopImmediatePropagation?.();event.stopPropagation?.();}
 for(const type of ['click','pointerdown','keydown','submit'])document.addEventListener(type,block,true);
 const controller={setVerified(value,text){verified=!!value;document.documentElement.dataset.randalPortalVerified=String(verified);gate.hidden=verified;message.textContent=text||'Vérification du compte RANDAL…';},dispose(){for(const type of ['click','pointerdown','keydown','submit'])document.removeEventListener(type,block,true);gate.remove();style.remove();delete document.documentElement.dataset.randalPortalVerified;gates.delete(document);}};
 gates.set(document,controller);controller.setVerified(false);return controller;
}

export function createRandalPortalIdentity({getProject,getKey,request,clearCredential=()=>{},changed=()=>{},settled=()=>{},view=globalThis.window,document=globalThis.document,parentTimeout=5000}={}){
 const gate=mountRandalPortalGate({document}),trusted=trustedRandalPortalParent({view,document});gate.setVerified(false);
 let disposed=false,verified=false,revision=0,manualLogout=false,waiting=null,resolveParent=null,parentTimer=null,authRequiredSent=false,lastParentToken='',exchangeFlight=null;
 const post=data=>{if(trusted&&!disposed)view.parent.postMessage(data,PORTAL_ORIGIN);};
 function finishParent(){clearTimeout(parentTimer);parentTimer=null;resolveParent?.();resolveParent=null;waiting=null;}
 function requireAuthentication(){if(authRequiredSent||disposed)return;authRequiredSent=true;post({type:'lrf-portal-auth-required'});}
 function publish(state){
  if(disposed)return;
  const allowed=trusted&&verified&&isRandalPresentation(state)&&!state.error;
  gate.setVerified(allowed,allowed?'':state.error?'Reconnectez le compte RANDAL depuis le choix des configurateurs.':'Vérification du compte RANDAL…');
  changed(state);
  if(state.known&&!state.pending&&!allowed&&!manualLogout)requireAuthentication();
 }
 const controller=createIdentityState({getProject,getKey,changed:publish,settled:state=>{if(!disposed)settled(state);},request:async(action,payload)=>{
  if(!trusted||manualLogout&&action!=='logout')throw Object.assign(Error('Connectez votre compte depuis le portail RANDAL.'),{status:401});
  const turn=revision;
  const data=await request(action,payload);
  if(turn!==revision||disposed)return data;
  if(action!=='logout'){
   if(!isRandalPresentation(data)){verified=false;clearCredential();throw Object.assign(Error('Ce compte ne dispose pas de cet accès RANDAL.'),{status:403});}
   if(action==='exchange'){verified=true;authRequiredSent=false;}
  }
  return data;
 }});
 function requestParent(){
  if(!trusted||manualLogout||disposed)return Promise.resolve();
  if(waiting)return waiting;
  waiting=new Promise(resolve=>{resolveParent=resolve;parentTimer=setTimeout(()=>{finishParent();if(!verified)requireAuthentication();},parentTimeout);});
  post({type:'lrf-configurator-session-needed'});return waiting;
 }
 async function endSession({notify=true,acknowledge=true,requestId}={}){
  if(disposed)return;
  const turn=++revision;manualLogout=true;verified=false;gate.setVerified(false,'Reconnectez le compte RANDAL depuis le choix des configurateurs.');finishParent();
  // Clear the JS credential even if the network cannot clear its cookie.
  clearCredential();
  if(notify)post({type:'lrf-portal-logout'});
  try{await controller.logout();}catch{}finally{if(turn===revision)clearCredential();if(!notify&&acknowledge)post({type:'lrf-portal-session-ended',...(requestId!==undefined?{requestId}:{} )});}
 }
 const receiveSession=async event=>{
  if(disposed||!trusted||event.source!==view.parent||event.origin!==PORTAL_ORIGIN)return;
  const data=event.data;
  if(data?.type==='lrf-portal-end-session'){await endSession({notify:false,requestId:data.requestId});return;}
  if(data?.type==='lrf-configurator-session-absent'){await endSession({notify:false,acknowledge:false});requireAuthentication();return;}
  if(data?.type!=='lrf-configurator-session'||manualLogout||typeof data.sessionToken!=='string'||!/^[A-Za-z0-9_-]{32,256}$/.test(data.sessionToken))return;
  if(data.sessionToken===lastParentToken&&verified&&isRandalPresentation(controller.state)){finishParent();return;}
  if(exchangeFlight?.token===data.sessionToken){await exchangeFlight.promise;return;}
  const turn=++revision;verified=false;clearTimeout(parentTimer);parentTimer=null;gate.setVerified(false);authRequiredSent=false;
  const flight={token:data.sessionToken,promise:null};exchangeFlight=flight;lastParentToken=data.sessionToken;flight.promise=controller.authenticate('exchange',{sessionToken:data.sessionToken});
  try{await flight.promise;}finally{if(exchangeFlight===flight)exchangeFlight=null;if(turn===revision)finishParent();}
 };
 view.addEventListener('message',receiveSession);
 if(trusted)post({type:'lrf-configurator-ready'});else redirectRandalPortal(view);
 return {
  get state(){return controller.state;},
  async load(){if(!verified)await requestParent();return controller.state;},
  async reconnect(){manualLogout=false;if(!verified)await requestParent();return controller.state;},
  refresh(){return verified?controller.refresh():Promise.resolve(controller.state);},
  schedule(){if(verified)controller.schedule();},
  resync(){return verified?controller.resync():Promise.resolve(controller.state);},
  authenticate(){requireAuthentication();return Promise.resolve(controller.state);},
  logout:()=>endSession(),
  dispose(){disposed=true;revision++;verified=false;finishParent();view.removeEventListener('message',receiveSession);gate.setVerified(false);}
 };
}
