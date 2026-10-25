const CURRENT='studio-one-current-project',ACTIVE='studio-one-active-project-id-v2';
const PREVIOUS='studio-one-previous-project-v1',EMPTY='studio-one-empty-entry-v1';
export function beginEmptyStudioEntry(storage){
 // Keep the prior draft and its saved-project identity available to Resume.
 try{
  if(!storage.getItem(EMPTY)){
   const raw=storage.getItem(CURRENT);
   if(raw){try{const data=JSON.parse(raw);if([1,2].includes(data?.version)&&Array.isArray(data.items))storage.setItem(PREVIOUS,JSON.stringify({data,active:storage.getItem(ACTIVE)}));}catch{}}
  }
  storage.removeItem(ACTIVE);storage.setItem(EMPTY,'1');
 }catch{}
}
export function settleEmptyStudioEntry(storage,data){try{if(storage.getItem(EMPTY)==='1')storage.setItem(EMPTY,JSON.stringify(data));}catch{}}
export function markStudioEntryEdited(storage,data){
 try{const baseline=storage.getItem(EMPTY);
  if(data&&(baseline==='1'||baseline===JSON.stringify(data)))return false;
  storage.removeItem(EMPTY);return !!baseline;
 }catch{return false;}
}
export function resumeStudioEntry(storage){
 try{
  if(!storage.getItem(EMPTY))return null;
  const previous=JSON.parse(storage.getItem(PREVIOUS)||'null');if(!previous?.data)return null;
  if(previous.active)storage.setItem(ACTIVE,previous.active);else storage.removeItem(ACTIVE);
  storage.setItem(CURRENT,JSON.stringify(previous.data));storage.removeItem(EMPTY);return previous.data;
 }catch{return null;}
}
