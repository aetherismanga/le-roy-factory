// Studio One's account interface, backed exclusively by the verified private host.
const AGENTS = new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function animaIdentityState() {
  const verified=globalThis.NEOBATH_ANIMA_AGENT;
  if(verified?.neobathAllowed===true&&verified.client?.codeClient)return {client:verified.client,isAdmin:false,known:true,pending:false,proHT:null,proRows:[],privateCode:verified.client.codeClient,referenceAllowed:false,animaAllowed:true,error:''};
  const agent = globalThis.NEOBATH_ANIMA_AGENT;
  const email = String(agent?.email || '').toLowerCase();
  const allowed = !!agent?.uid && AGENTS.has(email);
  return {client:allowed?{id:agent.uid,codeClient:'',societe:email.startsWith('coryne')?'Coryne · Le Roy Factory':'Jérôme · Le Roy Factory',contact:email.startsWith('coryne')?'Coryne':'Jérôme',email}:null,
    isAdmin:allowed,known:true,pending:false,proHT:null,proRows:[],privateCode:'',referenceAllowed:false,randalAllowed:false,animaAllowed:allowed,error:allowed?'':'Connectez-vous à votre espace agent.'};
}
export function privateMarkup(state) {
  if(state?.client?.codeClient){const ref=state.referenceAllowed===true&&String(state.privateCode).startsWith(state.client.codeClient+'-')?state.privateCode:state.client.codeClient;return '<small class="pro-reference">'+escapeHTML(ref)+'</small><small>NEOBATH ANIMA · '+escapeHTML(state.client.societe)+'</small>';}
  return state?.client?'<small class="pro-reference">Atelier privé</small><small>NEOBATH ANIMA · <span translate="no">'+escapeHTML(state.client.societe)+'</span></small>':'<span>Connexion espace agent</span>';
}
export function createIdentity(_getProject, changed=()=>{}) {
  if(globalThis.NEOBATH_ANIMA_AGENT?.neobathAllowed===true){
    let state=animaIdentityState(),timer,turn=0;
    const publish=s=>{state=s;globalThis.LRF_VERIFIED_IDENTITY=s;changed(s);dispatchEvent(new CustomEvent('lrf-identity',{detail:s}));return s;};
    const refresh=async()=>{const t=++turn;publish({...animaIdentityState(),pending:true});try{const project=_getProject();const result=project?await globalThis.animaAPI('quote',{project}):animaIdentityState();return t===turn?publish({...result,known:true,pending:false}):state;}catch(error){return t===turn?publish({...animaIdentityState(),error:error.message}):state;}};
    const load=async()=>_getProject()?refresh():publish(state);queueMicrotask(()=>publish(state));
    return {get state(){return state;},load,reconnect:refresh,refresh,resync:refresh,schedule(){++turn;publish(animaIdentityState());clearTimeout(timer);timer=setTimeout(refresh,280);},authenticate:refresh,logout:async()=>{parent.postMessage({type:'anima-logout'},new URL(globalThis.__ANIMA_ROUTE_URL__).origin);return publish({...animaIdentityState(),client:null});},dispose(){++turn;clearTimeout(timer);}};
  }
  let state = animaIdentityState();
  const publish = () => {state=animaIdentityState();globalThis.LRF_VERIFIED_IDENTITY=state;changed(state);if(typeof CustomEvent==='function')dispatchEvent(new CustomEvent('lrf-identity',{detail:state}));return state;};
  const load = async () => publish();
  queueMicrotask(publish);
  return {get state(){return state;},load,reconnect:load,refresh:load,resync:load,schedule(){publish();},
    async authenticate(){const s=publish();if(!s.client)throw Error('Ouvrez la connexion dans votre espace agent Le Roy Factory.');return s;},
    async logout(){parent.postMessage({type:'anima-logout'},new URL(globalThis.__ANIMA_ROUTE_URL__||'https://leroyfactory.fr/').origin);state={...state,client:null,isAdmin:false};changed(state);return state;}};
}
export async function existingAdministrator(){return null;}
