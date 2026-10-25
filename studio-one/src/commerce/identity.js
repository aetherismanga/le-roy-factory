import {localStorage,sessionStorage,isRandalDemo,createDemoIdentity} from '../../../shared/lrf-3d/demo-session.js';
import {commercialRequest} from './client.js';
import {quoteProject} from './pricing.js';
import {createIdentityState} from './identity-state.js';
import {privateMarkup as referenceMarkup} from '../../../shared/lrf-3d/commerce/private-reference.js';
export {escapeHTML} from '../../../shared/lrf-3d/commerce/private-reference.js';
export const privateMarkup=state=>isRandalDemo()?'':referenceMarkup(state,'STUDIO ONE');
export function createIdentity(getProject,changed=()=>{}){
 if(isRandalDemo())return createDemoIdentity(changed);
 const origins=['https://leroyfactory.fr','https://www.leroyfactory.fr'];let host='';try{host=new URL(document.referrer).origin;}catch{}const embedded=parent!==window&&origins.includes(host);
 let manualLogout=false,waiting=null,resolveParent=null,parentTimer;
 const notify=s=>{globalThis.LRF_VERIFIED_IDENTITY=s;return dispatchEvent(new CustomEvent('lrf-identity',{detail:s}));};
 const controller=createIdentityState({getProject,getKey:p=>{if(!p)return 'none';try{const q=quoteProject(p);return JSON.stringify(q.rows.map(r=>[r.ref,r.publicTTC]));}catch{return JSON.stringify(p.items||[]);}},request:commercialRequest,changed,settled:notify});
 function finishParent(){clearTimeout(parentTimer);resolveParent?.();resolveParent=null;waiting=null;}
 function requestParent(){if(!embedded||manualLogout)return Promise.resolve();if(waiting)return waiting;waiting=new Promise(resolve=>{resolveParent=resolve;parentTimer=setTimeout(finishParent,2500);});parent.postMessage({type:'lrf-configurator-session-needed'},host);return waiting;}
 addEventListener('message',e=>{
  if(e.source!==parent||!origins.includes(e.origin))return;const d=e.data;
  if(d?.type==='lrf-configurator-session-absent'){finishParent();return;}
  if(d?.type!=='lrf-configurator-session'||manualLogout)return;
  let action,payload;if(typeof d.sessionToken==='string'&&d.sessionToken.length>=32){action='exchange';payload={sessionToken:d.sessionToken};}else if(typeof d.idToken==='string'){action='admin-token';payload={idToken:d.idToken};}else return;
  // A previous logout in this origin must not reject a new authenticated visit
  // from the official site. The server still verifies the received credential.
  try{sessionStorage.removeItem('studio-one-auth-manual');}catch{}
  controller.authenticate(action,payload).finally(finishParent);
 });
 if(embedded)parent.postMessage({type:'lrf-configurator-ready'},host);
 return {get state(){return controller.state;},async reconnect(){manualLogout=false;await requestParent();return controller.load();},async load(){if(embedded&&!controller.state.client){await requestParent();}let token='';try{if(!embedded&&sessionStorage.getItem('studio-one-auth-manual')!=='1')token=sessionStorage.getItem('lrfProSessionToken')||localStorage.getItem('lrfProRememberToken')||'';}catch{}return token&&!controller.state.known?controller.authenticate('exchange',{sessionToken:token}):controller.load();},refresh:controller.refresh,schedule:controller.schedule,async authenticate(action,payload){manualLogout=false;const result=await controller.authenticate(action,payload);if(result.client){try{sessionStorage.removeItem('studio-one-auth-manual');localStorage.setItem('studio-one-auth-revision',Date.now()+':'+Math.random());}catch{}}return result;},resync:controller.resync,async logout(){manualLogout=true;await controller.logout();try{sessionStorage.setItem('studio-one-auth-manual','1');sessionStorage.removeItem('lrfProSessionToken');localStorage.removeItem('lrfProRememberToken');localStorage.setItem('studio-one-auth-revision',Date.now()+':'+Math.random());}catch{}}};
}
// Read the existing site's Firebase persistence only on explicit account access.
// A different preview origin cannot read the production site's browser storage.
export async function existingAdministrator(){if(isRandalDemo())return null;try{if(sessionStorage.getItem('studio-one-auth-manual')==='1')return null;}catch{}const load=url=>import(url),[app,auth]=await Promise.all([load('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),load('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')]);const config={apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory',storageBucket:'le-roy-factory.firebasestorage.app',messagingSenderId:'249878619253',appId:'1:249878619253:web:05f051710b6251dbfa843c'};
 const instance=auth.getAuth(app.getApps().length?app.getApp():app.initializeApp(config));await instance.authStateReady();const user=instance.currentUser;if(!user)return null;return user.getIdToken();}
