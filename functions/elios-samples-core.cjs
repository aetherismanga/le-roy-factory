'use strict';
const crypto=require('node:crypto');
const {withSampleCharges,sampleChargesHTML,sampleChargesText}=require('./elios-samples-options.cjs');
const TO=Object.freeze(['ctoni@eliosceramica.it']);
const CC=Object.freeze(['glebreton@eliosceramica.it','jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
const RECIPIENTS=Object.freeze([...TO,...CC]);
const VERSION='20261113-elios-samples-direct-box-v8';
const text=(v,n=180)=>String(v??'').trim().slice(0,n);
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const money=n=>Number.isFinite(n)?n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'À confirmer';
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function sampleCustomer(client){return {id:text(client.id,150),societe:text(client.societe||client.nom||'Client'),codeClient:text(client.codeClient,40),contact:{name:text(client.contact),email:text(client.email),telephone:text(client.telephone),address:[client.adresse,client.codePostal||client.code_postal,client.ville].filter(Boolean).join(' ')}};}
async function agentCustomer(db,agent,targetClientId){
 const id=text(targetClientId,150);if(!id||id.includes('/')||id!==targetClientId)throw fail('Client incorrect.');
 const snap=await db.collection('clients').doc(id).get(),client=snap.data();
 if(!client||client.deleted===true||client.archived===true)throw fail('Ce client n’est plus disponible.',404);
 return {...sampleCustomer({...client,id:snap.id||id}),owner:'agent:'+agent.uid+':client:'+id,isAgent:true,createdBy:{uid:agent.uid,email:agent.email}};
}
function currentPrices(catalogue,exact={},tariffs={},exactSku={}){
 const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const result={...exact};
 for(const p of catalogue.products){
  const format=String(p.format||'').replaceAll(',','.').match(/\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?/i);
  if(!format)continue;
  const key=clean(p.slug||p.collection)+'|'+format[0].replace(/\s/g,'').replace('×','x').toLowerCase()+'|'+(/20\s*mm/i.test(p.finish)?'20':'standard'),rate=tariffs[key];
  if(!rate||!Number.isFinite(rate.amount)||rate.amount<0||rate.amount>1000000||rate.unavailable||rate.locked)continue;
  if(clean(p.collection)==='dynasty')continue; // Exact finishes and decor SKUs only.
  // A collection-wide base tariff never proves the price of a decor or a
  // special unit. Keep its exact SKU price, or require Elios confirmation.
  if(/décor|decor|fenix|rebel|palm|prestige|intars|duplex/i.test(p.color+' '+p.finish))continue;
  if(rate.label&&/pièce|piece|pce|\/pz|\/ml/i.test(rate.label))continue;
  result[p.key]={purchaseHT:rate.amount};
 }
 for(const p of catalogue.products){
  const ref=String(p.reference||'');
  const amount=exactSku[ref];
  if(/^[A-Z0-9]{7,14}$/.test(ref)&&typeof amount==='number'&&Number.isFinite(amount)&&amount>0&&amount<10000)result[p.key]={purchaseHT:amount};
 }
 return result;
}
function normalizedLines(input,catalogue,prices={}){
 if(!Array.isArray(input)||input.length<1||input.length>200)throw fail('Sélectionnez entre 1 et 200 références.');
 const products=new Map(catalogue.products.map(p=>[p.key,p])),merch=new Map(catalogue.merchandising.map(p=>[p.id,p])),seen=new Set();
 return input.map(raw=>{
  if(!raw||!['vrac','box','merchandising'].includes(raw.type))throw fail('Type de demande inconnu.');
  const id=text(raw.key,240),unique=raw.type+'|'+id;if(seen.has(unique))throw fail('Une référence est présente deux fois dans la sélection.');seen.add(unique);
  const product=(raw.type==='merchandising'?merch:products).get(id);if(!product)throw fail('Référence ELIOS inconnue.');
  const base={type:raw.type,key:id,reference:product.reference,collection:product.collection,description:product.description||[product.color,product.format,product.finish].filter(Boolean).join(' · '),image:product.image||product.images?.[0]?.image||'',unit:'pièce'};
  if(raw.type==='vrac'){
   if(product.vrac!==true||![1,2].includes(Number(raw.quantity)))throw fail('Le vrac est limité à 1 ou 2 pièces par référence éligible.');
   return {...base,sampleReference:product.sampleReference,quantity:Number(raw.quantity),label:true,netHT:0,discount:0,unitHT:0,totalHT:0};
  }
  const quantity=Number(raw.quantity);if(!Number.isFinite(quantity)||quantity<=0||quantity>10000)throw fail('Quantité incorrecte.');
  if(raw.type==='merchandising'){
   if(!Number.isInteger(quantity)||quantity>50)throw fail('Quantité de merchandising incorrecte.');
   // The manufacturer's merchandising valuation is visible, but attribution
   // remains an Elios decision and never becomes a customer amount to pay.
   const value=product.valueUnitHT;
   const valueUnitHT=typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1000000?value:null;
   return {...base,quantity,netHT:null,discount:0,unitHT:0,totalHT:0,payable:false,valueUnitHT,valueTotalHT:valueUnitHT===null?null:round(valueUnitHT*quantity),factoryApprovalRequired:true,status:'Attribution soumise à validation Elios'};
  }
  if(!product.packVerified||!(product.packArea>0)||!Number.isInteger(product.packPieces)||product.packPieces<=0)throw fail('Le conditionnement de '+product.reference+' doit être confirmé avant chiffrage.');
  const boxes=Math.ceil((quantity-1e-8)/product.packArea),ordered=Number((boxes*product.packArea).toFixed(4)),net=prices[id]?.purchaseHT;
  const netHT=typeof net==='number'&&Number.isFinite(net)&&net>=0?net:null;
  // Compute from the unrounded 50% amount, then round each line to cents.
  const unitHT=netHT===null?null:netHT*.5;
  return {...base,unit:'m²',requested:quantity,quantity:ordered,boxes,pieces:boxes*product.packPieces,packArea:product.packArea,netHT,discount:50,unitHT,totalHT:unitHT===null?null:round(ordered*unitHT)};
 });
}
function buildQuote(input,catalogue,prices,profiles=0,installationRequested=false){
 const rows=normalizedLines(input,catalogue,prices),metres=Number(profiles)||0;
 if(!Number.isFinite(metres)||metres<0||metres>1000)throw fail('Métré de profilés incorrect.');
 const incomplete=rows.some(row=>row.totalHT===null)||metres>0;
 const merchandising=rows.filter(row=>row.type==='merchandising');
 const merchandisingValueIncomplete=merchandising.some(row=>row.valueTotalHT===null);
 const merchandisingValueHT=round(merchandising.reduce((sum,row)=>sum+(row.valueTotalHT??0),0));
 const budgetYear=Number.isInteger(catalogue.budgetYear)&&catalogue.budgetYear>=2026&&catalogue.budgetYear<=2100?catalogue.budgetYear:2027;
 return withSampleCharges({rows,profiles:metres,discount:50,budgetYear,subtotalHT:round(rows.reduce((s,row)=>s+(row.totalHT??0),0)),totalHT:incomplete?null:round(rows.reduce((s,row)=>s+row.totalHT,0)),incomplete,merchandisingValueHT,merchandisingValueIncomplete,notice:'Demande soumise à validation Elios. Le merchandising est valorisé à titre indicatif, hors montant à payer ; son attribution reste à la décision de l’usine. Hors pose, transport et profilés ; boîtes complètes. Vrac : 1 ou 2 pièces avec étiquette.'},installationRequested);
}
function checkedProject(input){
 if(!input||input.version!==2||!input.room||!Array.isArray(input.room.points)||input.room.points.length<3||input.room.points.length>12||!Array.isArray(input.items)||input.items.length>32||JSON.stringify(input).length>100000)throw fail('Le projet de box est invalide.');
 // A project is an importable geometry snapshot, never an authority for costs,
 // recipients, identity or executable HTML.
 const sanitize=value=>Array.isArray(value)?value.map(sanitize):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([k])=>!/^(__proto__|prototype|constructor)$|purchase|achat|cost|price|token|password|credential|session/i.test(k)).map(([k,v])=>[k,sanitize(v)])):typeof value==='string'?value.slice(0,1000):value;
 return sanitize(input);
}
function pngAttachment(value){
 if(typeof value!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value)||value.length>8100000)throw fail('Joignez une capture PNG HD du box (6 Mo maximum).');
 const bytes=Buffer.from(value.slice(22),'base64');
 if(bytes.length<67||bytes.length>6000000||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.subarray(-8).toString('hex')!=='49454e44ae426082'||!bytes.includes(Buffer.from('IDAT')))throw fail('La capture PNG est invalide.');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(width<1920||height<400||width>8192||height>8192||width*height>16777216)throw fail('La capture doit mesurer au moins 1920 pixels de large.');
 return {bytes,width,height,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
function requestFingerprint(payload,account){return crypto.createHash('sha256').update(JSON.stringify({owner:account.owner,lines:payload.items,installationRequested:payload.installationRequested===true,project:payload.project||null,visual:payload.visual?crypto.createHash('sha256').update(payload.visual).digest('hex'):null,contact:payload.contact,profiles:payload.profiles||0,title:text(payload.title,100),note:text(payload.note,2000)})).digest('hex');}
function mailHTML({reference,account,contact,quote,title,note,box}){
 const imageFor=row=>{const src=row.imageCID?'cid:'+row.imageCID:require('./elios-samples-images.cjs').publicImageURL(row.image);return src?`<img src="${esc(src)}" alt="${esc(row.collection+' · '+row.reference)}" width="90" style="display:block;max-width:90px;max-height:100px;object-fit:contain">`:'Visuel à confirmer';};
 const table=(heading,heads,rows)=>rows.length?`<h3>${heading}</h3><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;border-color:#dedbd1"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`:'';
 const article=r=>`${esc(r.reference||'Code à confirmer')}<br>${esc(r.collection)} · ${esc(r.description)}`;
 const vrac=table('Échantillons en vrac',['Visuel','Référence du carreau','Étiquette','Quantité'],quote.rows.filter(r=>r.type==='vrac').map(r=>`<tr><td>${imageFor(r)}</td><td>${esc(r.reference)}</td><td>Avec étiquette</td><td>${esc(r.quantity)} ${esc(r.unit)}</td></tr>`));
 const expo=table('Box expo',['Visuel','Référence du carreau','Quantité','Remise','PU HT','À payer HT'],quote.rows.filter(r=>r.type==='box').map(r=>`<tr><td>${imageFor(r)}</td><td>${article(r)}</td><td>${esc(r.quantity)} ${esc(r.unit)}<br>${r.boxes} boîte(s) · ${r.pieces} pièces</td><td>−50 %</td><td>${money(r.unitHT)}</td><td>${money(r.totalHT)}</td></tr>`));
 const merch=table('Merchandising',['Visuel','Référence','Quantité'],quote.rows.filter(r=>r.type==='merchandising').map(r=>`<tr><td>${imageFor(r)}</td><td>${article(r)}</td><td>${esc(r.quantity)} ${esc(r.unit)}</td></tr>`));
 return `<div style="font:14px/1.6 Arial,sans-serif;color:#232b25"><h2>Demande ELIOS — ${esc(title)}</h2><p>Bonjour Caterina,</p><p>Merci de confirmer la demande ci-dessous et les délais.</p><p><b>${esc(account.societe)}</b>${account.codeClient?' · '+esc(account.codeClient):''}<br>${esc(contact.name)} · ${esc(contact.email)} · ${esc(contact.telephone)}<br>Livraison : ${esc(contact.address)}</p>${vrac}${expo}${merch}${quote.rows.some(r=>r.type==='box')?`${sampleChargesHTML(quote)}${box?'<h3>Votre box expo</h3><img src="cid:elios-box-hd@leroyfactory.fr" alt="Visuel HD du box expo" width="680" style="display:block;width:100%;max-width:680px;height:auto"><p>Le visuel HD du box et sa configuration importable sont joints. Les métrés restent indicatifs.</p>':''}`:''}${note?`<p>Observations : ${esc(note)}</p>`:''}<p>Référence de la demande : ${esc(reference)}</p><p>${esc(contact.name)}<br>${esc(account.societe)}</p></div>`;
}
function mailText({reference,account,contact,quote,note}){
 const lines=quote.rows.map(r=>[r.type==='vrac'?'Vrac avec étiquette':r.type==='box'?'Box expo':'Merchandising',r.reference,r.type==='vrac'?'':r.collection,r.type==='vrac'?'':r.description,`${r.quantity} ${r.unit}`,r.type==='box'?`−50 % · ${money(r.totalHT)} HT`:'',require('./elios-samples-images.cjs').publicImageURL(r.image)].filter(Boolean).join(' · '));
 return ['Bonjour Caterina,','Merci de confirmer cette demande et les délais.',account.societe,contact.name+' · '+contact.email+' · '+contact.telephone,'Livraison : '+contact.address,...lines,sampleChargesText(quote),note?'Observations : '+note:'','Référence : '+reference,contact.name].filter(Boolean).join('\n\n');
}
module.exports={sampleCustomer,agentCustomer,TO,CC,RECIPIENTS,VERSION,text,fail,currentPrices,normalizedLines,buildQuote,checkedProject,pngAttachment,requestFingerprint,mailHTML,mailText};
