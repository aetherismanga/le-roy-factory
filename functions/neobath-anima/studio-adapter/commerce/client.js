import {animaIdentityState} from './identity.js';
// The private host authorizes Anima through animaAPI. Its Firebase/session
// credentials must never be forwarded to the separate RANDAL commerce API.
export const getSessionCredential=()=>'';
const mailOperations=new Map();
export async function commercialRequest(){return animaIdentityState();}
export async function projectRequest(action,payload={}) {
  if(globalThis.NEOBATH_ANIMA_AGENT?.neobathAllowed===true){if(action==='list')return {projects:[],deletedIds:[]};throw Object.assign(Error('Votre projet est conservé sur cet appareil. Utilisez l’export pour le partager.'),{status:403});}
  if(typeof globalThis.animaAPI!=='function')throw Object.assign(Error('Synchronisation indisponible. Votre projet reste sur cet appareil.'),{status:503});
  const kind={list:'projects-list',save:'projects-save',delete:'projects-delete','local-email':'projects-email','local-administrator':'projects-email','local-order':'projects-order',email:'projects-email',administrator:'projects-email',order:'projects-order'}[action];
  if(!kind)throw Object.assign(Error('Action de projet Anima inconnue.'),{status:400});
  const mail=['projects-email','projects-order'].includes(kind),operationKey=mail?JSON.stringify({kind,record:payload.record,recipient:payload.recipient,administrator:action.includes('administrator')}):'';
  if(mail&&!mailOperations.has(operationKey))mailOperations.set(operationKey,crypto.randomUUID());
  const result=await globalThis.animaAPI(kind,{...payload,profile:'studio-one',...(action==='local-administrator'||action==='administrator'?{administrator:true}:{}),...(action==='save'?{project:payload.record}:{}),...(mail?{operationId:mailOperations.get(operationKey)}:{})});
  if(mail&&result.delivered===true)mailOperations.delete(operationKey);
  return result.project?{...result,record:result.project}:result;
}
export function statusText(s){return s?.client?s.client.societe:'Connectez-vous à votre espace agent Le Roy Factory.';}
