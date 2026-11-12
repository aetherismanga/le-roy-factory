export const ELIOS_ORIGIN='https://studio-one-beta-test-v2.vercel.app';
export const API='https://us-central1-le-roy-factory.cloudfunctions.net/eliosSamples';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=n=>Number.isFinite(n)?n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'À confirmer';
export const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function linesForBox(report){
 if(!report||!Array.isArray(report.groups)||!report.groups.length)throw Error('Ajoutez du carrelage à votre box.');
 const lines=report.groups.filter(g=>!g.paint).map(g=>{
  if(g.brand!=='ELIOS')throw Error('Ce box doit contenir uniquement des carreaux Elios.');
  if(!g.catalogueKey||!g.reference||!(g.needed>0))throw Error('Choisissez une référence commerciale précise pour chaque surface du box.');
  if(g.customPack||!g.packVerified)throw Error('Le conditionnement fabricant doit être confirmé pour '+g.reference+'.');
  return {type:'box',key:g.catalogueKey,quantity:g.needed};
 });
 const combined=new Map();for(const line of lines){const previous=combined.get(line.key);if(previous)previous.quantity+=line.quantity;else combined.set(line.key,{...line});}return [...combined.values()];
}
export function openDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open('lrf-elios-expo-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('projects');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Le navigateur ne peut pas enregistrer le box.'));});}
export async function boxStore(action,key,value){const db=await openDatabase();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('projects',action==='get'?'readonly':'readwrite'),store=tx.objectStore('projects'),request=action==='get'?store.get(key):action==='delete'?store.delete(key):store.put(value,key);let result;request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(Error('L’enregistrement du box a échoué.'));tx.onabort=()=>reject(Error('L’enregistrement du box a été interrompu.'));});}finally{db.close();}}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
