'use strict';
const crypto = require('node:crypto');
const {convert,estimateLine} = require('./cerastone-quantities');
const RECIPIENT = 'jerome@leroyfactory.fr';
const ORIGINS = new Set(['https://cera-stone-atelier.ccjacou.chatgpt.site','https://www.cera-stone.fr','https://cera-stone.fr','http://terminal.local:4173']);
const failure = (message, status = 400) => Object.assign(new Error(message), {status});
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function text(value, max, required = false, multiline = false) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string' || value.length > max || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) throw failure('Un champ contient une valeur invalide.');
  value = value.trim();
  if (required && !value) throw failure('Merci de compléter les champs obligatoires.');
  return value;
}
function checkedRequest(body, registry) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 60000) throw failure('La demande est trop volumineuse.');
  if (body.website) throw failure('Merci de patienter avant une nouvelle demande.', 429);
  if (body.consent !== true) throw failure('Confirmez votre accord pour être recontacté.');
  const requestId = text(body.requestId, 100, true);
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(requestId)) throw failure('Référence de demande invalide.');
  const firstName = text(body.firstName, 80), lastName = text(body.lastName, 80);
  const name = text(body.name, 180) || [firstName,lastName].filter(Boolean).join(' ');
  if (!name) throw failure('Renseignez votre nom et prénom.');
  const email = text(body.email, 180, true).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw failure('Adresse e-mail invalide.');
  const phone = text(body.phone, 40, true);
  if (!/^[+()\d .-]+$/.test(phone) || phone.replace(/\D/g,'').length < 8 || phone.replace(/\D/g,'').length > 15) throw failure('Numéro de téléphone invalide.');
  const postalCode = text(body.postalCode, 5, true);
  if (!/^\d{5}$/.test(postalCode)) throw failure('Le code postal doit contenir cinq chiffres.');
  const city = text(body.city, 120), project = text(body.project, 180);
  const message = text(body.message, 5000, false, true);
  if (!Array.isArray(body.items) || body.items.length > 100) throw failure('La sélection est limitée à cent articles.');
  if (!body.items.length && message.length < 10) throw failure('Sélectionnez un article ou décrivez votre projet.');
  const seen = new Set();
  const items = body.items.map(line => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) throw failure('Article invalide.');
    const id = text(line.id, 100, true), product = registry[id];
    if (!product || seen.has(id)) throw failure('Un article de la sélection n’est pas disponible. Actualisez la sélection.');
    seen.add(id);
    const quantity = line.quantity, unit = line.unit;
    let packing;
    try { packing = convert(product, quantity, unit); } catch { throw failure('Vérifiez les quantités et les unités de votre sélection.'); }
    // Product names, references, prices and browser-calculated box counts are
    // never trusted: only the immutable server registry identifies the article.
    return {id,quantity,unit,packing};
  });
  return {requestId,name,firstName,lastName,email,phone,postalCode,city,project,message,items,source:'cerastone',consent:true};
}
const fr = value => Number(value).toLocaleString('fr-FR',{maximumFractionDigits:6});
function requestMail(request, registry) {
  let estimateTotal=0,pricedCount=0,hasDemoPrice=false;
  const rows = request.items.map((line,index) => {
    const p = registry[line.id], real = p.internal || {}, q = line.packing;
    const description = real.description || [real.manufacturer,real.collection,real.color,p.format,p.finish].filter(Boolean).join(' · ');
    const packed = q.status === 'known' ? `${fr(q.boxes)} ${p.packLabel||'boîte'}(s) — ${fr(q.quantity)} ${q.unit}${q.pieces&&q.unit!=='pièces' ? ' — '+fr(q.pieces)+' pièce(s)' : ''}` : q.status === 'piece' ? `${fr(q.quantity)} ${p.salesLabel || 'pièce(s)'}` : 'Conditionnement à confirmer avant chiffrage ; aucun arrondi inventé.';
    const price=estimateLine(p,line.quantity,line.unit);
    if(price){estimateTotal+=price.total;pricedCount++;hasDemoPrice||=price.demo;}
    const money=value=>value.toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
    return [
      `${index+1}. ${p.code} — ${description}`,
      real.reference ? `Référence fabricant : ${real.reference}` : 'Identification : collection, coloris, format et finition ; code usine à confirmer si nécessaire.',
      `Type : ${p.kind} | Format : ${p.format || 'à préciser'} | Finition : ${p.finish || 'à préciser'}`,
      `Besoin du client : ${fr(line.quantity)} ${line.unit}`,
      `Quantité au conditionnement : ${packed}`,
      price ? `Tarif TTC affiché : ${money(price.unitPrice)} / ${p.priceLabel||price.priceUnit}${price.demo?' — TARIF DE DÉMONSTRATION':''}. Estimation ligne TTC : ${money(price.total)}.` : 'Tarif : à chiffrer par le magasin.',
      q.status === 'known' ? `Boîtage fabricant déclaré : ${fr(q.factor)} ${q.unit}/${p.packLabel||'boîte'}${q.piecesPerBox ? ' ; '+q.piecesPerBox+' pièces/'+(p.packLabel||'boîte') : ''}` : '',
      p.kind === 'ambiance' ? 'Ambiance photographique : valider le carreau et le format exacts avec le client avant devis.' : '',
      p.source?.url ? `Source de vérification : ${p.source.url}` : ''
    ].filter(Boolean).join('\n');
  });
  const subject = `[CeraStone — demande de chiffrage] ${request.name} — ${request.postalCode}${request.city?' '+request.city:''}`;
  const mailText = [
    'DEMANDE ISSUE DU NOUVEAU SITE CERASTONE',`Référence de suivi : ${request.requestId}`,
    'Destinataire provisoire : Jérôme · LE ROY FACTORY, pour le magasin CeraStone.','',
    `Client : ${request.name}`,`E-mail : ${request.email}`,`Téléphone : ${request.phone}`,
    `Secteur du projet : ${request.postalCode} ${request.city}`,`Projet : ${request.project || 'à préciser'}`,'',
    ...rows.flatMap(row => [row,'']),
    pricedCount ? `ESTIMATION ${pricedCount<request.items.length?'PARTIELLE ':''}TTC : ${estimateTotal.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})} — hors livraison.${hasDemoPrice?' Comprend des tarifs de démonstration à confirmer.':''}` : 'ESTIMATION : à chiffrer par le magasin.',
    '', 'MESSAGE DU CLIENT',request.message || '—','',
    'Le client a accepté la transmission de sa demande et de ses coordonnées pour être recontacté.',
    'Demande de prix et de conseil uniquement. Les références, le conditionnement, la disponibilité et les tarifs TTC restent à valider lors du devis.'
  ].join('\n');
  return {from:{name:'CeraStone · demandes clients',address:RECIPIENT},to:RECIPIENT,replyTo:request.email,subject,text:mailText,html:`<div style="font-family:Arial,sans-serif;color:#292923;line-height:1.6"><h2>CeraStone · demande de chiffrage</h2><div style="white-space:pre-wrap">${esc(mailText)}</div></div>`};
}
function createCerastoneRequestHandler({registry,reserve,complete,fail,send}) {
  return async (req,res) => {
    const origin = String(req.headers?.origin || '');
    res.set('Cache-Control','private, no-store');res.set('Vary','Origin');res.set('X-Content-Type-Options','nosniff');
    if (ORIGINS.has(origin)) res.set('Access-Control-Allow-Origin',origin);
    res.set('Access-Control-Allow-Headers','Content-Type');res.set('Access-Control-Allow-Methods','POST, OPTIONS');
    if (!ORIGINS.has(origin)) return res.status(403).json({success:false,error:'Origine non autorisée.'});
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({success:false,error:'Méthode non autorisée.'});
    let request, claimed = false, smtpAccepted = false;
    try {
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { throw failure('Demande JSON invalide.'); }
      request = checkedRequest(body,registry);
      const payloadHash = crypto.createHash('sha256').update(JSON.stringify(request)).digest('hex');
      const reservation = await reserve(request.requestId,payloadHash,req);
      if (reservation === 'sent') return res.json({success:true,delivered:true,requestId:request.requestId,duplicate:true});
      claimed = true;
      const result = await send(requestMail(request,registry));
      smtpAccepted = Array.isArray(result?.accepted) && result.accepted.some(address => String(address).toLowerCase() === RECIPIENT);
      if (!smtpAccepted) throw failure('La messagerie n’a pas confirmé la réception. Réessayez.',503);
      // SMTP acceptance is authoritative: never invite a duplicate after a
      // bookkeeping failure. A still-sending reservation remains protected.
      await complete(request.requestId,result.messageId || '').catch(()=>{});
      return res.json({success:true,delivered:true,requestId:request.requestId});
    } catch (error) {
      if (claimed && request && !smtpAccepted) await fail(request.requestId).catch(()=>{});
      const status = Number.isInteger(error.status) ? error.status : 503;
      return res.status(status).json({success:false,error:error.status ? error.message : 'L’envoi n’a pas pu être confirmé. Réessayez avec la même référence.'});
    }
  };
}
module.exports = {RECIPIENT,ORIGINS,failure,checkedRequest,requestMail,createCerastoneRequestHandler};
