// Recovery runs on the original origin. It never writes browser storage.
export const SAVED_PREFIX='lrf-studio-one-saved-projects-v2-';
export const DRAFT_KEY='lrf-studio-one-project-v2';
export const AMBIENCE_KEY='lrf-studio-one-elios-ambience-v2';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const legacyShape=value=>value?.version===2&&Array.isArray(value.items)&&value.items.every(item=>object(item)&&typeof item.kind==='string'&&object(item.position));
const safeText=value=>String(value).replace(/LRF-([a-z0-9]+)(?:-\d+(?:[.,]\d+)?){1,}/gi,'LRF-$1').replace(/\b\d+(?:[\s.,]\d+)*\s*(?:€|EUR\b|euros?\b)/gi,'[montant retiré]').replace(/\b\d+(?:[.,]\d+)?\s*(?:HT|TTC)\b/gi,'[montant retiré]');
function publicValue(value){
 if(typeof value==='string')return safeText(value).slice(0,2000);
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 if(typeof value==='boolean'||value===null)return value;
 return undefined;
}
function pick(value,keys){const out={};if(!object(value))return out;for(const key of keys)if(own(value,key)&&(!object(value[key])&&!Array.isArray(value[key]))){const v=publicValue(value[key]);if(v!==undefined)out[key]=v;}return out;}
const ITEM_KEYS=['id','kind','model','width','height','depth','finish','facade','option','open','doorSide','ledOn','mirrorRotated','mirror','mirrorSize','mirrorFinish','drawers'];
const SURFACE_KEYS=['collection','collectionId','brand','color','colorId','sourceColorId','format','orientation','layout','groutWidth','groutColor','reference','catalogueKey','key','label','quality','finish'];
function surface(value){return typeof value==='string'?safeText(value).slice(0,300):pick(value,SURFACE_KEYS);}
export function publicLegacyRecord(input){
 const record=object(input)?input:{},snapshot=object(record.data)?record.data:record;
 const result=pick(record,['client','name','date']);
 // A strict list protects old snapshots which may have embedded catalogue rows.
 if(Array.isArray(snapshot.items))result.data={version:Number.isFinite(snapshot.version)?snapshot.version:null,items:snapshot.items.map(value=>{
  const item=pick(value,ITEM_KEYS);
  if(object(value?.position))item.position=pick(value.position,['x','y','z']);
  if(value?.sink===null)item.sink=null;
  else if(object(value?.sink))item.sink=pick(value.sink,['model','color','layout','width','height','depth','reference','ref']);
  if(Array.isArray(value?.accessories))item.accessories=value.accessories.map(v=>{
   if(typeof v==='string')return safeText(v);
   const accessory=pick(v,['id','kind','model','reference','ref','color','width','height','depth']);
   if(object(v?.position))accessory.position=pick(v.position,['x','y','z']);
   return accessory;
  });
  return item;
 })};
 if(object(record.ambience)){
  const a=record.ambience;result.ambience=pick(a,['floorOrientation','wallOrientation']);
  if(object(a.room))result.ambience.room=pick(a.room,['width','depth','height']);
  for(const key of ['floor','wall','floorSelection','wallSelection'])if(own(a,key))result.ambience[key]=surface(a[key]);
 }
 return result;
}
export function recoveryBackup(entries){
 return {format:'lrf-studio-one-legacy-recovery',version:1,note:'Copie publique de récupération : géométrie, finitions et ambiance. Tarifs, codes privés, aperçus et objets de catalogue exclus. Le stockage original est intact.',projects:entries.map((entry,index)=>({source:{storage:entry.storage,index},record:publicLegacyRecord(entry.record)}))};
}
export function scanLegacyStorage(local,session){
 const entries=[],issues=[];
 const parse=(storage,key,label)=>{try{const text=storage?.getItem(key);if(!text)return null;if(text.length>20000000)throw Error('volume');return JSON.parse(text);}catch{issues.push(label+' : données illisibles ou accès au stockage refusé. Les données sont conservées.');return null;}};
 try{
  for(let i=0;i<(local?.length||0);i++){
   const key=local.key(i);if(typeof key!=='string'||!key.startsWith(SAVED_PREFIX))continue;
   const list=parse(local,key,'Sauvegarde '+(i+1));if(list===null)continue;
   if(!Array.isArray(list)){issues.push('Une sauvegarde historique ne contient pas une liste de projets. Elle reste intacte.');continue;}
   list.forEach((record,index)=>entries.push({storage:'localStorage',key,index,record:publicLegacyRecord(record),recognized:legacyShape(record?.data)}));
  }
 }catch{issues.push('Accès au stockage local refusé. Autorisez le stockage sur cette origine, puis rechargez.');}
 const draft=parse(session,DRAFT_KEY,'Brouillon de cet onglet');
 if(draft!==null){const ambience=parse(session,AMBIENCE_KEY,'Ambiance du brouillon');entries.push({storage:'sessionStorage',key:DRAFT_KEY,index:0,record:publicLegacyRecord({name:'Brouillon de cet onglet',data:draft,...(object(ambience)?{ambience}:{})}),recognized:legacyShape(draft)});}
 return {entries,issues};
}
export function readRecoveryFile(input){
 if(input?.format==='lrf-studio-one-legacy-recovery'&&input.version===1&&Array.isArray(input.projects))return input.projects.map((entry,index)=>({storage:'file',key:'archive',index,record:publicLegacyRecord(entry.record),recognized:legacyShape(entry.record?.data)}));
 const data=object(input?.data)?input.data:input;
 if(Array.isArray(data?.room?.points)||Array.isArray(data?.items)&&data.items.some(item=>item?.type&&item?.settings&&item?.placement&&!item.kind))throw Error('Ce fichier utilise le format de l’atelier actuel. Ouvrez-le directement dans cet atelier.');
 const record=publicLegacyRecord(input);
 if(!record.data)throw Error('Ce fichier ne contient pas un ancien projet Studio One.');
 return [{storage:'file',key:'import',index:0,record,recognized:legacyShape(record.data)}];
}
