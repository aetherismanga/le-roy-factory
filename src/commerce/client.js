export async function commercialRequest(action,payload={}){
 const response=await fetch('/api/commercial',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload}),signal:AbortSignal.timeout(15000)});
 const result=await response.json().catch(()=>({error:'Réponse du service indisponible.'}));
 if(!response.ok)throw Error(result.error||'Le service commercial est indisponible. Réessayez.');return result;
}
export function statusText(session){return session?.client?`Code client : ${session.client.codeClient} · ${session.client.societe}. Votre prix PRO HT : Prix sur demande — conditions individuelles non disponibles.`:'Identifiez votre compte LRF pour vérifier vos conditions professionnelles.';}
