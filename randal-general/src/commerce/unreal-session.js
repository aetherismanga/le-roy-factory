import {getSessionCredential} from './client.js';
export async function requestUnrealSession({app,aspect}){
 const token=getSessionCredential();
 const response=await fetch('/api/unreal',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({app,aspect}),signal:AbortSignal.timeout(30000)});
 const data=await response.json().catch(()=>({error:'Rendu temporairement indisponible.'}));
 if(!response.ok)throw Error(data.error||'Rendu temporairement indisponible.');return data;
}
