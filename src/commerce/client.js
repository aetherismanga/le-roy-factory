// Verified credentials stay in this tab and are never included in project files.
let credential='',credentialVersion=0;try{credential=sessionStorage.getItem('studio-one-session')||'';}catch{}
async function request(url,body){
 const changesIdentity=url==='/api/commercial'&&['identify','exchange','admin','admin-token','logout'].includes(body.action),turn=changesIdentity?++credentialVersion:credentialVersion;
 const response=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(credential?{'Authorization':'Bearer '+credential}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(url.includes('projects')?(body.action==='save'?12000:65000):30000),keepalive:url.includes('projects')&&body.action==='save'&&new Blob([JSON.stringify(body)]).size<60000});
 const result=await response.json().catch(()=>({error:'Réponse du service indisponible.'}));
 if(!response.ok)throw Object.assign(Error(result.error||'Le service LRF est indisponible. Réessayez.'),{status:response.status});
 if(result.accessToken){if(turn===credentialVersion){credential=result.accessToken;try{sessionStorage.setItem('studio-one-session',credential);}catch{}}delete result.accessToken;}
 if(url==='/api/commercial'&&body.action==='logout'&&turn===credentialVersion){credential='';try{sessionStorage.removeItem('studio-one-session');}catch{}}
 return result;
}
export const commercialRequest=(action,payload={})=>request('/api/commercial',{action,...payload});
export const projectRequest=(action,payload={})=>request('/api/projects',{action,...payload});
export function statusText(s){return s?.client?(s.client.codeClient+' · '+s.client.societe+(Number.isInteger(s.proHT)?' · Prix d’achat HT : '+(s.proHT/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):' · Prix d’achat HT sur demande pour les références non renseignées.')):'Identifiez votre compte LRF pour vérifier vos conditions professionnelles.';}
