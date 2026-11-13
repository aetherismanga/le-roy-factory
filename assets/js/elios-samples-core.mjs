export const ELIOS_ORIGIN='https://studio-one-beta-test-v2.vercel.app';
export const MAX_BOX_VISUAL_CHARS=8100000;
export const API='https://us-central1-le-roy-factory.cloudfunctions.net/eliosSamples';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=n=>Number.isFinite(n)?n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'À confirmer';
export const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const selectionStorageKey=owner=>`lrf-elios-selection-v1:${owner}`;
export const boxDraftKey=owner=>`draft:${owner}`;
export function readSampleSelection(storage,{owner,customer={},isAgent=false,targetClientId=''}){
 const key=selectionStorageKey(owner),current=storage.getItem(key);
 if(current!==null)return {selection:JSON.parse(current),legacyKey:null};
 // Only the verified account's own historical cart can be recovered. An agent
 // acting for a client always starts in that client's separate workspace.
 const legacyOwner=targetClientId?'':isAgent&&customer.email?'agent-'+customer.email:!isAgent?customer.codeClient:'';
 const legacyKey=legacyOwner?selectionStorageKey(legacyOwner):null,legacy=legacyKey&&storage.getItem(legacyKey);
 return {selection:legacy?JSON.parse(legacy):null,legacyKey:legacy?legacyKey:null};
}
export const boxBridgeMatches=(message,session,owner)=>!!session&&session.owner===owner&&typeof session.bridgeId==='string'&&session.bridgeId.length>0&&message?.bridgeId===session.bridgeId;
export function availableSampleFormats(products,{collection='',query='',mode='vrac'}={}){
 const q=norm(query);
 return [...new Set(products.filter(p=>(mode==='box'||p.vrac)&&(!collection||p.collection===collection)&&(!q||norm([p.reference,p.collection,p.color,p.description,p.format,p.finish].join(' ')).includes(q))).map(p=>p.format).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true}));
}
export function samplePieceStyle(product){
 const dimensions=String(product.format||'').replaceAll(',','.').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
 const width=Number(product.tileWidth)||Math.max(...(dimensions?dimensions.slice(1).map(Number):[1])),height=Number(product.tileHeight)||Math.min(...(dimensions?dimensions.slice(1).map(Number):[1]));
 return `--tile-ratio:${Math.max(.1,Math.min(25,width/height))};--tile-cut:${Math.min(40,100*height/width)}%`;
}
export function merchandisingChoices(catalogue,product,image=product?.images?.[0]?.image){
 const codes=new Set((catalogue.documents||[]).filter(page=>page.image===image).flatMap(page=>page.codes||[]));
 const choices=(catalogue.merchandising||[]).filter(item=>item.id===product?.id||item.reference&&codes.has(item.reference));
 return [...new Map(choices.map(item=>[item.id,item])).values()];
}
export function selectMerchandisingLine(items,key,quantity,catalogue){
 const product=catalogue.merchandising?.find(item=>item.id===key);
 if(!product)throw Error('Choisissez une référence de merchandising.');
 if(!Number.isInteger(quantity)||quantity<1||quantity>50)throw Error('Choisissez une quantité entière entre 1 et 50.');
 const line={type:'merchandising',key:product.id,quantity},index=items.findIndex(item=>item.type==='merchandising'&&item.key===product.id);
 if(index<0){if(items.length>=200)throw Error('La sélection contient déjà 200 références.');return [...items,line];}
 return items.map((item,i)=>i===index?line:item);
}
export function merchandisingValue(items,catalogue){
 const products=new Map((catalogue.merchandising||[]).map(item=>[item.id,item]));
 let knownValueHT=0,incomplete=false,references=0;
 for(const item of items){if(item.type!=='merchandising')continue;references++;const value=products.get(item.key)?.valueUnitHT,quantity=Number(item.quantity);if(typeof value!=='number'||!Number.isFinite(value)||value<0||!Number.isInteger(quantity)||quantity<1||quantity>50){incomplete=true;continue;}knownValueHT+=Math.round((value*quantity+Number.EPSILON)*100)/100;}
 knownValueHT=Math.round((knownValueHT+Number.EPSILON)*100)/100;
 return {references,knownValueHT,valueHT:incomplete?null:knownValueHT,incomplete};
}
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
