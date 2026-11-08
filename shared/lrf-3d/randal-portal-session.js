import {isRandalPresentation} from './randal-client-access.js';
export const RANDAL_PORTAL_ORIGINS=Object.freeze({studio:'https://studio-one-beta-test-v2.vercel.app',general:'https://randal-catalogue-general-3d.vercel.app'});
export function randalPortalFrameURL(variant,lang='fr'){
 if(!Object.hasOwn(RANDAL_PORTAL_ORIGINS,variant))throw Error('Configurateur RANDAL inconnu.');
 const url=new URL('/index.html',RANDAL_PORTAL_ORIGINS[variant]);
 url.searchParams.set('entry','randal');url.searchParams.set('standalone','1');url.searchParams.set('lang',lang==='es'?'es':'fr');return url.href;
}
// Roles always come from the existing same-origin, server-verified API.
// Entry context and messages only choose navigation; neither grants a role.
export function createRandalPortalSession({request,getCredential,changed=()=>{}}){
 let state={known:false,pending:false,client:null},generation=0;
 const publish=next=>{state=next;changed(state);return state;};
 const allowed=()=>state.known&&!state.pending&&!state.error&&isRandalPresentation(state)&&getCredential().length>=32;
 async function verify(action,payload={}){
  const turn=++generation;publish({known:false,pending:true,client:null});
  try{
   const data=await request(action,payload);if(turn!==generation)return state;
   if(!isRandalPresentation(data)||getCredential().length<32){
    await request('logout').catch(()=>{});
    if(turn!==generation)return state;
    return publish({known:true,pending:false,client:null,error:'Cet espace est réservé au compte client RANDAL. Utilisez vos identifiants LRF RANDAL.'});
   }
   return publish({...data,known:true,pending:false,error:''});
  }catch(error){if(turn!==generation)return state;return publish({known:true,pending:false,client:null,error:error.message||'La connexion LRF est indisponible. Réessayez.'});}
 }
 return {
  get state(){return state;},allowed,
  connect:payload=>verify('identify',payload),
  resume:()=>getCredential().length>=32?verify('session'):Promise.resolve(publish({known:true,pending:false,client:null})),
  async logout(){++generation;publish({known:true,pending:true,client:null});try{await request('logout');}finally{publish({known:true,pending:false,client:null});}},
  lock(message='Votre session a expiré. Reconnectez votre compte LRF RANDAL.'){
   ++generation;publish({known:true,pending:false,client:null,error:message});
  },
  // This broker accepts only a frame opened by the portal at its fixed origin.
  sendSession(event,frame,variant){
   if(!frame?.contentWindow||event.source!==frame.contentWindow||event.origin!==RANDAL_PORTAL_ORIGINS[variant])return false;
   if(!['lrf-configurator-ready','lrf-configurator-session-needed'].includes(event.data?.type))return false;
   event.source.postMessage(allowed()?{type:'lrf-configurator-session',sessionToken:getCredential()}:{type:'lrf-configurator-session-absent'},event.origin);return true;
  }
 };
}
