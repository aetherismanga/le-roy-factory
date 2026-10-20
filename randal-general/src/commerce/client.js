// Session tokens are verified on every server request. Saved compositions never contain them.
let credential='';try{credential=sessionStorage.getItem('randal-general-session')||'';}catch{}
export async function commercialRequest(action,payload={}){
 const response=await fetch('/api/commercial',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(credential?{'Authorization':'Bearer '+credential}:{})},body:JSON.stringify({action,...payload}),signal:AbortSignal.timeout(15000)});
 const result=await response.json().catch(()=>({error:'Réponse du service indisponible.'}));
 if(!response.ok)throw Error(result.error||'Le service commercial est indisponible. Réessayez.');
 if(result.accessToken){credential=result.accessToken;try{sessionStorage.setItem('randal-general-session',credential);}catch{}delete result.accessToken;}
 if(action==='logout'){credential='';try{sessionStorage.removeItem('randal-general-session');}catch{}}
 return result;
}
export function statusText(session){return session?.client?`Code client : ${session.client.codeClient} · ${session.client.societe}. Votre prix PRO HT : Prix sur demande — conditions du catalogue général à confirmer.`:'Identifiez votre compte LRF pour vérifier vos conditions professionnelles.';}
