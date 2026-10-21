// Verified credentials stay in this tab and are never included in project files.
let credential='';try{credential=sessionStorage.getItem('studio-one-session')||'';}catch{}
async function request(url,body){
 const response=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(credential?{'Authorization':'Bearer '+credential}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(url.includes('projects')?(body.action==='save'?12000:65000):18000),keepalive:url.includes('projects')&&body.action==='save'&&new Blob([JSON.stringify(body)]).size<60000});
 const result=await response.json().catch(()=>({error:'Réponse du service indisponible.'}));
 if(!response.ok)throw Object.assign(Error(result.error||'Le service LRF est indisponible. Réessayez.'),{status:response.status});
 if(result.accessToken){credential=result.accessToken;try{sessionStorage.setItem('studio-one-session',credential);}catch{}delete result.accessToken;}
 return result;
}
export async function commercialRequest(action,payload={}){const result=await request('/api/commercial',{action,...payload});if(action==='logout'){credential='';try{sessionStorage.removeItem('studio-one-session');}catch{}}return result;}
export const projectRequest=(action,payload={})=>request('/api/projects',{action,...payload});
export function statusText(s){return s?.client?(s.client.codeClient+' · '+s.client.societe+(Number.isInteger(s.proHT)?' · Prix d’achat HT : '+(s.proHT/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):' · Prix d’achat HT sur demande pour les références non renseignées.')):'Identifiez votre compte LRF pour vérifier vos conditions professionnelles.';}
