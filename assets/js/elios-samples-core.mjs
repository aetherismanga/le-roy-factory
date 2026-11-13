export const ELIOS_ORIGIN='https://studio-one-beta-test-v2.vercel.app';
export const MAX_BOX_VISUAL_CHARS=8100000;
export const API='https://us-central1-le-roy-factory.cloudfunctions.net/eliosSamples';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=n=>Number.isFinite(n)?n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'À confirmer';
export const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const selectionStorageKey=owner=>`lrf-elios-selection-v1:${owner}`;
export const boxDraftKey=owner=>`draft:${owner}`;
export function sampleRequestDetails(details={},customer={}){
 return Object.fromEntries(['name','email','telephone','address','note'].map(key=>[key,String(details?.[key]??customer?.[key]??'').slice(0,{name:160,email:254,telephone:60,address:600,note:2000}[key])]));
}
export function sampleMailFiles(mail){
 const decode=(value,type)=>{const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));return new Blob([bytes],{type});};
 return {message:new File([decode(mail.content,'message/rfc822')],mail.filename,{type:'message/rfc822'}),attachments:(mail.files||[]).map(f=>new File([decode(f.content,f.type)],f.filename,{type:f.type}))};
}
export function sampleMailto(mail){
 return 'mailto:'+mail.to.join(',')+'?'+new URLSearchParams({cc:mail.cc.join(','),subject:mail.subject,body:mail.text}).toString().replace(/\+/g,'%20');
}
export function sampleReviewTable(q){
 const table=(title,heads,rows)=>rows.length?`<h3>${title}</h3><div class="es-review-scroll"><table class="es-review-table"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:'';
 const picture=r=>r.image?`<img src="${esc(new URL(r.image,'https://leroyfactory.fr/').href)}" alt="${esc(r.reference)}" width="70" style="max-height:90px;object-fit:contain">`:'Visuel à confirmer';
 const article=r=>`${esc(r.reference||'Code à confirmer')}<br>${esc(r.collection+' · '+r.description)}`;
 const vrac=table('Vrac',['Visuel','Référence','Étiquette','Quantité'],q.rows.filter(r=>r.type==='vrac').map(r=>`<tr><td>${picture(r)}</td><td>${esc(r.reference)}</td><td>Avec étiquette</td><td>${r.quantity} ${esc(r.unit)}</td></tr>`));
 const box=table('Box expo',['Référence / article','Quantité','Remise','À payer HT'],q.rows.filter(r=>r.type==='box').map(r=>`<tr><td>${article(r)}</td><td>${r.quantity} ${esc(r.unit)}<br>${r.boxes} boîte(s)</td><td>50 %</td><td>${money(r.totalHT)}</td></tr>`));
 const merch=table('Merchandising',['Visuel','Référence','Quantité'],q.rows.filter(r=>r.type==='merchandising').map(r=>`<tr><td>${picture(r)}</td><td>${article(r)}</td><td>${r.quantity} ${esc(r.unit)}</td></tr>`));
 return vrac+box+merch+(box?`<p><strong>${q.incomplete?'Sous-total à payer HT connu':'À payer HT'} : ${money(q.subtotalHT)}</strong>${q.profiles?'<br>Profilés : '+q.profiles.toFixed(2)+' ml · prix à confirmer':''}</p>`:'');
}
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
