'use strict';
const crypto=require('node:crypto');
const RECIPIENTS=Object.freeze(['glebreton@eliosceramica.it','ctoni@eliosceramica.it','jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
const VERSION='20261112-elios-samples-v1';
const text=(v,n=180)=>String(v??'').trim().slice(0,n);
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const money=n=>Number.isFinite(n)?n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'À confirmer';
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function currentPrices(catalogue,exact={},tariffs={}){
 const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const result={...exact};
 for(const p of catalogue.products){
  const format=String(p.format||'').replaceAll(',','.').match(/\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?/i);
  if(!format)continue;
  const key=clean(p.slug||p.collection)+'|'+format[0].replace(/\s/g,'').replace('×','x').toLowerCase()+'|'+(/20\s*mm/i.test(p.finish)?'20':'standard'),rate=tariffs[key];
  if(!rate||!Number.isFinite(rate.amount)||rate.amount<0||rate.amount>1000000||rate.unavailable||rate.locked)continue;
  // A collection-wide base tariff never proves the price of a decor or a
  // special unit. Keep its exact SKU price, or require Elios confirmation.
  if(/décor|decor|fenix|rebel|palm|prestige|intars|duplex/i.test(p.color+' '+p.finish))continue;
  if(rate.label&&/pièce|piece|pce|\/pz|\/ml/i.test(rate.label))continue;
  result[p.key]={purchaseHT:rate.amount};
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
   if(product.vrac!==true||Number(raw.quantity)!==1)throw fail('Le vrac est limité à une pièce par référence de la liste fabricant.');
   return {...base,sampleReference:product.sampleReference,quantity:1,label:true,netHT:0,discount:0,unitHT:0,totalHT:0};
  }
  const quantity=Number(raw.quantity);if(!Number.isFinite(quantity)||quantity<=0||quantity>10000)throw fail('Quantité incorrecte.');
  if(raw.type==='merchandising'){
   if(!Number.isInteger(quantity)||quantity>50)throw fail('Quantité de merchandising incorrecte.');
   // Budget 2027 is an agent cost allocation, never a customer sales tariff.
   return {...base,quantity,netHT:null,discount:0,unitHT:null,totalHT:null,status:product.status||'Sur demande'};
  }
  if(!product.packVerified||!(product.packArea>0)||!Number.isInteger(product.packPieces)||product.packPieces<=0)throw fail('Le conditionnement de '+product.reference+' doit être confirmé avant chiffrage.');
  const boxes=Math.ceil((quantity-1e-8)/product.packArea),ordered=Number((boxes*product.packArea).toFixed(4)),net=prices[id]?.purchaseHT;
  const netHT=typeof net==='number'&&Number.isFinite(net)&&net>=0?net:null;
  // Compute from the unrounded 50% amount, then round each line to cents.
  const unitHT=netHT===null?null:netHT*.5;
  return {...base,unit:'m²',requested:quantity,quantity:ordered,boxes,pieces:boxes*product.packPieces,packArea:product.packArea,netHT,discount:50,unitHT,totalHT:unitHT===null?null:round(ordered*unitHT)};
 });
}
function buildQuote(input,catalogue,prices,profiles=0){
 const rows=normalizedLines(input,catalogue,prices),metres=Number(profiles)||0;
 if(!Number.isFinite(metres)||metres<0||metres>1000)throw fail('Métré de profilés incorrect.');
 const incomplete=rows.some(row=>row.totalHT===null)||metres>0;
 return {rows,profiles:metres,discount:50,subtotalHT:round(rows.reduce((s,row)=>s+(row.totalHT??0),0)),totalHT:incomplete?null:round(rows.reduce((s,row)=>s+row.totalHT,0)),incomplete,notice:'Demande soumise à validation Elios. Hors pose, transport et profilés ; boîtes complètes. Vrac : une pièce avec étiquette.'};
}
function checkedProject(input){
 if(!input||input.version!==2||!input.room||!Array.isArray(input.room.points)||input.room.points.length<3||input.room.points.length>12||!Array.isArray(input.items)||input.items.length>32||JSON.stringify(input).length>100000)throw fail('Le projet de box est invalide.');
 // A project is an importable geometry snapshot, never an authority for costs,
 // recipients, identity or executable HTML.
 const sanitize=value=>Array.isArray(value)?value.map(sanitize):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([k])=>!/^(__proto__|prototype|constructor)$|purchase|achat|cost|price|token|password|credential|session/i.test(k)).map(([k,v])=>[k,sanitize(v)])):typeof value==='string'?value.slice(0,1000):value;
 return sanitize(input);
}
function pngAttachment(value){
 if(typeof value!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value)||value.length>3800000)throw fail('Joignez une capture PNG HD du box (2,7 Mo maximum).');
 const bytes=Buffer.from(value.slice(22),'base64');
 if(bytes.length<67||bytes.length>2800000||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.subarray(-8).toString('hex')!=='49454e44ae426082'||!bytes.includes(Buffer.from('IDAT')))throw fail('La capture PNG est invalide.');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(width<1920||height<400||width>8192||height>8192||width*height>16777216)throw fail('La capture doit mesurer au moins 1920 pixels de large.');
 return {bytes,width,height,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
function requestFingerprint(payload,account){return crypto.createHash('sha256').update(JSON.stringify({owner:account.owner,lines:payload.items,project:payload.project||null,visual:payload.visual?crypto.createHash('sha256').update(payload.visual).digest('hex'):null,contact:payload.contact,profiles:payload.profiles||0})).digest('hex');}
function mailHTML({reference,account,contact,quote,title,note,box}){
 const rows=quote.rows.map(r=>`<tr><td>${esc(r.type==='box'?'Box expo':r.type==='vrac'?'Vrac avec étiquette':'Merchandising')}</td><td>${esc(r.reference||'Code à confirmer')}<br>${esc(r.collection)}<br>${esc(r.description)}</td><td>${esc(r.quantity)} ${esc(r.unit)}${r.boxes?`<br>${r.boxes} boîte(s) · ${r.pieces} pièces`:''}</td><td>${r.discount?'−50 %':''}</td><td>${money(r.unitHT)}</td><td>${money(r.totalHT)}</td></tr>`).join('');
 return `<div style="font:14px/1.6 Arial,sans-serif;color:#232b25"><h2>Demande ELIOS — ${esc(title)}</h2><p>Bonjour Gyslaine, bonjour Caterina,</p><p>Merci de confirmer la demande ci-dessous, les références et les délais.</p><p><b>${esc(account.societe)}</b> · ${esc(account.codeClient||'Compte agent')}<br>${esc(contact.name)} · ${esc(contact.email)} · ${esc(contact.telephone)}<br>Livraison : ${esc(contact.address)}</p><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;border-color:#dedbd1"><thead><tr><th>Parcours</th><th>Article</th><th>Quantité</th><th>Remise</th><th>PU HT</th><th>Total HT</th></tr></thead><tbody>${rows}</tbody></table><p><b>${quote.incomplete?'Sous-total HT renseigné':'Total HT'} : ${money(quote.subtotalHT)}</b></p>${quote.profiles?`<p>Profilés : ${esc(quote.profiles)} ml — prix à confirmer, hors sous-total.</p>`:''}<p>${esc(quote.notice)}</p>${box?'<p>Le visuel HD du box et sa configuration importable sont joints. Les métrés restent indicatifs.</p>':''}${note?`<p>Observations : ${esc(note)}</p>`:''}<p>Référence de la demande : ${esc(reference)}</p><p>Jérôme & Coryne · LE ROY FACTORY</p></div>`;
}
module.exports={RECIPIENTS,VERSION,text,fail,currentPrices,normalizedLines,buildQuote,checkedProject,pngAttachment,requestFingerprint,mailHTML};
