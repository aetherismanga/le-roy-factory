const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { clientFromSessionToken } = require('./pro-session');
const { keyOf, collectionExists, packFor, publicCollection } = require('./elios-catalog');

const db = admin.firestore();
const ALLOWED_ORIGINS = new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr']);
const CATERINA = 'ctoni@eliosceramica.it';
const CC = ['jerome@leroyfactory.fr','coryne@leroyfactory.fr'];

function cors(req,res){const origin=String(req.headers.origin||'');res.set('Access-Control-Allow-Origin',ALLOWED_ORIGINS.has(origin)?origin:'https://leroyfactory.fr');res.set('Vary','Origin');res.set('Access-Control-Allow-Headers','Content-Type');res.set('Access-Control-Allow-Methods','POST, OPTIONS');res.set('Cache-Control','no-store');if(req.method==='OPTIONS'){res.status(204).send('');return true}return false}
function clean(v,max=180){return String(v??'').trim().slice(0,max)}
function esc(v){return clean(v,800).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function qty(v){const n=Number(v);return Number.isFinite(n)?n:null}
function validEmail(v){return /^\S+@\S+\.\S+$/.test(String(v||'').trim())}
function unitLabel(unit,value){const u=String(unit||'MQ').toUpperCase();if(['MQ','M2','M²'].includes(u))return 'm²';if(['PZ','PCE','PCS'].includes(u))return Number(value)===1?'pièce':'pièces';if(['ML','M'].includes(u))return 'ml';return u}
function fr(value,digits=3){return Number(value).toLocaleString('fr-FR',{maximumFractionDigits:digits})}
function uniqueStrings(values,validator=()=>true){const out=[],seen=new Set();values.forEach(v=>{const s=clean(v,180),key=s.toLowerCase();if(!s||!validator(s)||seen.has(key))return;seen.add(key);out.push(s)});return out}
function personName(p){return [p?.civilite,p?.prenom,p?.nom].map(x=>clean(x,80)).filter(Boolean).join(' ').trim()}
function phoneValue(v){if(typeof v==='string'||typeof v==='number')return clean(v,50);if(v&&typeof v==='object')return clean(v.telephone||v.tel||v.phone||v.numero||v.number,50);return ''}
function clientOrderContext(client){
  const emailValues=[client.email,client.mail,client.eMail];if(Array.isArray(client.emails))emailValues.push(...client.emails);if(Array.isArray(client.emailsAutres))emailValues.push(...client.emailsAutres);
  const phoneValues=[client.telephone,client.tel,client.phone];if(Array.isArray(client.telephones))client.telephones.forEach(v=>phoneValues.push(phoneValue(v)));
  const contacts=[],seenContacts=new Set();
  const addContact=(id,name,fonction,email,telephone)=>{name=clean(name,120);fonction=clean(fonction,100);email=clean(email,160).toLowerCase();telephone=clean(telephone,50);if(email)emailValues.push(email);if(telephone)phoneValues.push(telephone);if(!name)return;const key=`${name.toLowerCase()}|${email}|${telephone}`;if(seenContacts.has(key))return;seenContacts.add(key);contacts.push({id,name,fonction,email:validEmail(email)?email:'',telephone})};
  addContact('principal',client.contact||client.nomContact||'',client.fonction||'',client.email||'',client.telephone||'');
  (Array.isArray(client.interlocuteurs)?client.interlocuteurs:[]).forEach((p,index)=>addContact(`interlocuteur-${index}`,personName(p)||p?.contact||'',p?.fonction||p?.role||'',p?.email||'',phoneValue(p)));
  if(!contacts.length)addContact('societe',client.societe||'Contact société','',client.email||'',client.telephone||'');
  return {clientId:client.id,codeClient:clean(client.codeClient,30).toUpperCase(),societe:clean(client.societe||'Client professionnel',120),emails:uniqueStrings(emailValues,validEmail).map(v=>v.toLowerCase()),phones:uniqueStrings(phoneValues),contacts};
}
async function authenticatedClient(sessionToken){const result=await clientFromSessionToken(sessionToken,{renew:true});return result?.client||null}
function resolveContact(context,id){const wanted=clean(id,80);return context.contacts.find(c=>c.id===wanted)||context.contacts[0]||null}
function collectionName(key){return key==='roma'?'Roma':(publicCollection(key)?.collection||key.toUpperCase())}
function normalizedItem(raw,collection){
  const ref=clean(raw?.ref,30).toUpperCase();const format=clean(raw?.format,160);const orderOnly=Boolean(raw?.orderOnly);const pack=packFor(collection,{...raw,ref,format,orderOnly});
  if(!pack)throw new Error(`Référence non autorisée pour ${collectionName(collection)} : ${ref||format||'article inconnu'}.`);
  let requested=qty(raw?.requestedQty);if(requested===null||requested<=0||requested>100000)throw new Error(`Quantité incorrecte pour ${ref||format}.`);if(pack.unit==='PZ')requested=Math.ceil(requested);
  const boxes=Math.max(1,Math.ceil((requested-1e-9)/pack.perBox));if(boxes>999)throw new Error(`Nombre de cartons trop important pour ${ref||format}.`);const orderQty=Number((boxes*pack.perBox).toFixed(3));
  return {collection:pack.collection,collectionName:pack.collectionName,ref,color:clean(raw?.color,50),kind:clean(raw?.kind,100),format,finish:clean(raw?.finish,140),orderOnly,requestedQty:requested,boxes,orderQty,orderUnit:pack.unit,perBox:pack.perBox,pcsBox:pack.pcsBox,stock:qty(raw?.stock),stockUnit:clean(raw?.stockUnit,10)||null};
}
function itemMailRow(item){const requested=`${fr(item.requestedQty)} ${unitLabel(item.orderUnit,item.requestedQty)}`;const ordered=`${fr(item.orderQty)} ${unitLabel(item.orderUnit,item.orderQty)}`;const packaging=`1 carton = ${fr(item.perBox)} ${unitLabel(item.orderUnit,item.perBox)}${item.pcsBox?` (${item.pcsBox} pcs)`:''}`;return `<tr><td style="border:1px solid #ddd">${esc(item.ref||'Pièce spéciale')}</td><td style="border:1px solid #ddd">${esc(item.color)}</td><td style="border:1px solid #ddd">${esc(item.kind)}<br><small>${esc(item.format)} · ${esc(item.finish)}</small></td><td style="border:1px solid #ddd">${esc(requested)}</td><td style="border:1px solid #ddd">${esc(packaging)}</td><td style="border:1px solid #ddd"><strong>${item.boxes} carton${item.boxes>1?'s':''}<br>${esc(ordered)}</strong></td></tr>`}

exports.eliosOrder=onRequest({region:'us-central1',timeoutSeconds:60,memory:'256MiB',secrets:['SMTP_PASSWORD_JEROME']},async(req,res)=>{
  if(cors(req,res))return;if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
  try{
    const p=req.body||{};const client=await authenticatedClient(p.sessionToken);if(!client)return res.status(401).json({success:false,error:'Session professionnelle expirée. Merci de vous reconnecter.'});const context=clientOrderContext(client);
    if(clean(p.action,20).toLowerCase()==='context')return res.status(200).json({success:true,customer:context});
    const collection=keyOf(p.collection||'roma');if(!collectionExists(collection))return res.status(400).json({success:false,error:'Collection ELIOS non activée.'});
    const rawItems=Array.isArray(p.items)&&p.items.length?p.items:[p];if(rawItems.length<1||rawItems.length>20)return res.status(400).json({success:false,error:'Le panier doit contenir entre 1 et 20 références.'});
    let items;try{items=rawItems.map(raw=>normalizedItem(raw,collection))}catch(error){return res.status(400).json({success:false,error:error.message})}
    const contact=resolveContact(context,p.contactId);if(!contact)return res.status(400).json({success:false,error:'Aucun contact client disponible.'});
    const selectedEmail=clean(p.email||contact.email,160).toLowerCase();if(!selectedEmail||!context.emails.includes(selectedEmail))return res.status(400).json({success:false,error:'Sélectionnez une adresse e-mail enregistrée sur ce compte.'});
    const selectedPhone=clean(p.telephone||contact.telephone,50);if(selectedPhone&&!context.phones.includes(selectedPhone))return res.status(400).json({success:false,error:'Sélectionnez un numéro de téléphone enregistré sur ce compte.'});
    const note=clean(p.note,600),totalBoxes=items.reduce((sum,item)=>sum+item.boxes,0),series=collectionName(collection);const subject=`Commande ELIOS — ${series.toUpperCase()} — ${context.societe} — ${items.length} référence${items.length>1?'s':''}`;
    const html=`<div style="font-family:Arial,sans-serif;line-height:1.55;color:#1a2530"><p>Bonjour Caterina,</p><p>Merci de bien vouloir enregistrer la commande ELIOS <strong>${esc(series)}</strong> suivante pour <strong>${esc(context.societe)}</strong> :</p><table cellpadding="7" cellspacing="0" style="border-collapse:collapse;border:1px solid #ddd;width:100%"><thead><tr style="background:#f5f2ec"><th style="border:1px solid #ddd">Référence</th><th style="border:1px solid #ddd">Couleur</th><th style="border:1px solid #ddd">Produit</th><th style="border:1px solid #ddd">Besoin</th><th style="border:1px solid #ddd">Boîtage</th><th style="border:1px solid #ddd">Commande</th></tr></thead><tbody>${items.map(itemMailRow).join('')}</tbody></table><p><strong>Total :</strong> ${items.length} référence${items.length>1?'s':''} · ${totalBoxes} carton${totalBoxes>1?'s':''}</p><p><strong>Client :</strong> ${esc(context.societe)} — ${esc(context.codeClient)}<br><strong>Contact :</strong> ${esc(contact.name)}${contact.fonction?` — ${esc(contact.fonction)}`:''}<br><strong>E-mail :</strong> ${esc(selectedEmail)}${selectedPhone?`<br><strong>Téléphone :</strong> ${esc(selectedPhone)}`:''}</p>${note?`<p><strong>Note :</strong> ${esc(note)}</p>`:''}<p>Merci de nous confirmer la prise en compte et le délai.</p><p>Cordialement,<br><strong>Jérôme & Coryne — LE ROY FACTORY</strong></p></div>`;
    const smtpPass=process.env.SMTP_PASSWORD_JEROME;if(!smtpPass)throw new Error('Mot de passe SMTP indisponible.');const transporter=nodemailer.createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:'jerome@leroyfactory.fr',pass:smtpPass}});const info=await transporter.sendMail({from:'"Jérôme & Coryne - Le Roy Factory" <jerome@leroyfactory.fr>',to:CATERINA,cc:CC,replyTo:'jerome@leroyfactory.fr, coryne@leroyfactory.fr',subject,html});
    const requestRef=await db.collection('account_requests').add({requestType:'commande_elios',status:'envoyee',clientId:context.clientId,societe:context.societe,contact:contact.name,email:selectedEmail,telephone:selectedPhone,codeClient:context.codeClient,partenaire:'Elios Ceramica',collection:series,collectionKey:collection,submittedAt:admin.firestore.FieldValue.serverTimestamp(),demande:`Commande ELIOS ${series} — ${items.length} référence${items.length>1?'s':''} — ${totalBoxes} carton${totalBoxes>1?'s':''}`,commande:{items,totalBoxes,note},recipients:{to:CATERINA,cc:CC},mailMessageId:info?.messageId||null,source:'disponibilites-elios'});
    return res.status(200).json({success:true,requestId:requestRef.id,messageId:info?.messageId||null,collection:series,items,totalBoxes});
  }catch(error){console.error('ELIOS ORDER',error);return res.status(500).json({success:false,error:'Impossible d’envoyer la commande pour le moment.'})}
});
