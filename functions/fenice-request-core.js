'use strict';
const crypto = require('node:crypto');
const RECIPIENT = 'jerome@leroyfactory.fr';
const ORIGINS = new Set(['https://leroyfactory.fr', 'https://www.leroyfactory.fr']);
const failure = (message, status = 400) => Object.assign(new Error(message), {status});
function text(value, max, required = false, multiline = false) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string' || value.length > max || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) throw failure('Un champ contient une valeur invalide.');
  value = value.trim();
  if (required && !value) throw failure('Merci de compléter les champs obligatoires.');
  return value;
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function checkedRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 50000) throw failure('La demande est trop volumineuse.');
  if (body.societe_web) throw failure('Merci de patienter avant une nouvelle demande.', 429);
  const requestId = text(body.requestId, 100, true);
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(requestId)) throw failure('Identifiant de demande invalide. Rechargez le formulaire.');
  const profile = body.profile;
  if (!['private','professional'].includes(profile)) throw failure('Choisissez le type de demande.');
  const professional = profile === 'professional';
  const nom = text(body.nom, 80, !professional), prenom = text(body.prenom, 80, !professional);
  const contact = text(body.contact, 180) || [prenom, nom].filter(Boolean).join(' ');
  if (!contact) throw failure('Renseignez votre nom et prénom.');
  const company = text(body.company, 180, professional), email = text(body.email, 180, true).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw failure('Adresse e-mail invalide.');
  const telephone = text(body.telephone, 40, true);
  if (!/^[+()\d .-]+$/.test(telephone) || telephone.replace(/\D/g, '').length < 8 || telephone.replace(/\D/g, '').length > 15) throw failure('Numéro de téléphone invalide.');
  const codePostal = text(body.codePostal, 5, true);
  if (!/^\d{5}$/.test(codePostal)) throw failure('Le code postal doit contenir cinq chiffres.');
  const ville = text(body.ville, 120, !professional), secteur = text(body.secteur, 160) || ville;
  if (!professional && !secteur) throw failure('Renseignez le secteur de votre projet.');
  const message = text(body.message, 4000, false, true);
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) throw failure('Choisissez entre un et trente produits.');
  const items = body.items.map(line => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) throw failure('Produit invalide.');
    const collectionSlug = text(line.collectionSlug, 100, true), name = text(line.name, 160, true), kind = line.kind;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(collectionSlug) || !['tile','plinth','piece'].includes(kind)) throw failure('Collection ou type de produit invalide.');
    const format = text(line.format, 100, professional && kind !== 'piece'), color = text(line.color, 160), reference = text(line.reference, 220), finish = text(line.finish, 160), packagingId = text(line.packagingId, 160);
    const requestedUnit = line.requestedUnit;
    if (!['m²','ml','pièces','boîtes'].includes(requestedUnit) || kind === 'tile' && requestedUnit === 'ml' || kind === 'plinth' && requestedUnit === 'm²' || kind === 'piece' && requestedUnit !== 'pièces') throw failure('Unité incompatible avec le produit.');
    let requestedQuantity = line.requestedQuantity;
    if (requestedQuantity === '' || requestedQuantity === undefined) requestedQuantity = null;
    if (requestedQuantity === null) { if (professional) throw failure('Renseignez la quantité de chaque produit.'); }
    else if (typeof requestedQuantity !== 'number' || !Number.isFinite(requestedQuantity) || requestedQuantity <= 0 || requestedQuantity > 100000 || ['pièces','boîtes'].includes(requestedUnit) && !Number.isSafeInteger(requestedQuantity)) throw failure('Quantité invalide.');
    let thicknessMm;
    if (line.thicknessMm !== undefined && line.thicknessMm !== '') { thicknessMm = Number(line.thicknessMm); if (!Number.isFinite(thicknessMm) || thicknessMm <= 0 || thicknessMm > 100) throw failure('Épaisseur invalide.'); }
    // Prices and a browser-calculated box count are deliberately not retained.
    return {collectionSlug, name, kind, format, color, reference, finish, packagingId, ...(thicknessMm === undefined ? {} : {thicknessMm}), requestedQuantity, requestedUnit};
  });
  return {requestId, profile, nom, prenom, contact, company, email, telephone, codePostal, ville, secteur, message, items};
}
function withIdentity(request, identity) {
  if (identity?.client) {
    const client = identity.client, code = String(client.codeClient || '').trim().toUpperCase();
    if (!/^LRF-\d{5}$/.test(code) || code === 'LRF-00001') throw failure('Session LRF invalide. Reconnectez-vous.', 401);
    return {...request, profile:'professional', company:text(String(client.societe || request.company),180,true), account:{type:'client',codeClient:code}};
  }
  if (identity?.agent) return {...request,profile:'professional',account:{type:'agent',email:String(identity.agent.email || '')}};
  return {...request, account:{type:'public'}};
}
const fr = value => Number(value).toLocaleString('fr-FR', {maximumFractionDigits:8});
async function requestMail(request, calculatePackaging) {
  const professional = request.profile === 'professional';
  const account = request.account.type === 'client' ? `Code LRF vérifié : ${request.account.codeClient}` : request.account.type === 'agent' ? `Administrateur vérifié : ${request.account.email}` : professional ? 'Professionnel non connecté — identité à confirmer' : 'Particulier — orientation vers un magasin revendeur';
  const blocks = [];
  for (const [index, item] of request.items.entries()) {
    let packaging = {status:'unknown'};
    if (item.requestedQuantity !== null && item.kind !== 'piece') packaging = await calculatePackaging(item);
    const summary = item.requestedQuantity === null ? 'Quantité à préciser' : packaging?.status === 'known' ? `${fr(packaging.boxes)} boîte${packaging.boxes > 1 ? 's' : ''} · ${fr(packaging.quantity)} ${packaging.unit} · ${fr(packaging.pieces)} pièce${packaging.pieces > 1 ? 's' : ''}` : item.kind === 'piece' ? `${fr(item.requestedQuantity)} pièce${item.requestedQuantity > 1 ? 's' : ''}` : 'Conditionnement à confirmer avec le fabricant';
    const factor = packaging?.status === 'known' && packaging.packaging ? `${fr(packaging.packaging.piecesPerBox)} pièces/boîte · ${fr(item.kind === 'tile' ? packaging.packaging.areaPerBox : packaging.packaging.linearMetresPerBox)} ${item.kind === 'tile' ? 'm²' : 'ml'}/boîte` : '';
    blocks.push([`PRODUIT ${index + 1} — ${item.name}${item.kind === 'plinth' ? ' — PLINTHES' : ''}`,`Format : ${item.format || 'à confirmer'}`,`Coloris : ${item.color || 'à confirmer'}`,`Finition / référence : ${item.reference || item.finish || 'à confirmer'}`,`Besoin saisi : ${item.requestedQuantity === null ? 'à préciser' : fr(item.requestedQuantity)+' '+item.requestedUnit}`,`Commande par boîtes : ${summary}`,factor && `Boîtage fabricant : ${factor}`].filter(Boolean).join('\n'));
  }
  const title = professional ? 'DEMANDE PROFESSIONNELLE' : 'DEMANDE DE REVENDEUR';
  const subject = `[LA FENICE — ${title}] ${request.company || request.contact} — ${request.codePostal} ${request.ville}`.trim();
  const mailText = ['DEMANDE LA FENICE',`Référence : ${request.requestId}`,account,'',`Contact : ${request.contact}`,`Société : ${request.company || '—'}`,`E-mail : ${request.email}`,`Téléphone : ${request.telephone}`,`Secteur : ${request.secteur || '—'}`,`Code postal : ${request.codePostal}`,`Ville : ${request.ville || '—'}`,'',...blocks.flatMap(block=>[block,'']),'PROJET / QUESTIONS',request.message || '—','',professional ? 'Demande professionnelle à étudier par LE ROY FACTORY. Références, disponibilité et conditions à confirmer ; cette demande ne constitue pas une commande validée.' : 'Merci d’orienter le particulier vers un revendeur adapté au secteur indiqué. Références, disponibilité et conditions à confirmer par LE ROY FACTORY. Cette demande ne constitue pas une commande validée.'].join('\n');
  return {from:{name:'Demandes La Fenice · LE ROY FACTORY',address:RECIPIENT},to:RECIPIENT,replyTo:request.email,subject,text:mailText,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#29272a"><h2>${esc(title)} LA FENICE</h2><div style="white-space:pre-wrap">${esc(mailText)}</div></div>`};
}
function createFeniceRequestHandler({verifyIdentity, reserve, complete, fail, send, calculatePackaging = async()=>({status:'unknown'})}) {
  return async (req, res) => {
    const origin = String(req.headers?.origin || '');
    res.set('Cache-Control','private, no-store'); res.set('Vary','Origin'); res.set('X-Content-Type-Options','nosniff');
    if (ORIGINS.has(origin)) res.set('Access-Control-Allow-Origin',origin);
    res.set('Access-Control-Allow-Headers','Content-Type, Authorization'); res.set('Access-Control-Allow-Methods','POST, OPTIONS');
    if (!ORIGINS.has(origin)) return res.status(403).json({success:false,error:'Origine non autorisée.'});
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({success:false,error:'Méthode non autorisée.'});
    let request, claimed = false;
    try {
      let raw;
      try { raw = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { throw failure('Demande JSON invalide.'); }
      request = withIdentity(checkedRequest(raw), await verifyIdentity(req,raw));
      // Recheck professional requirements after the server has applied the real account.
      if (request.profile === 'professional' && request.items.some(item => item.requestedQuantity === null || item.kind !== 'piece' && !item.format)) throw failure('Complétez les formats et quantités pour votre demande professionnelle.');
      const hash = crypto.createHash('sha256').update(JSON.stringify(request)).digest('hex');
      const reservation = await reserve(request.requestId,hash,req);
      if (reservation === 'sent') return res.json({success:true,delivered:true,requestId:request.requestId,duplicate:true});
      claimed = true;
      const mail = await requestMail(request, calculatePackaging), result = await send(mail);
      if (!Array.isArray(result?.accepted) || !result.accepted.some(address => String(address).toLowerCase() === RECIPIENT)) throw failure('Le serveur de messagerie n’a pas confirmé la réception. Réessayez.',503);
      // SMTP acceptance is authoritative. A status-write failure must not invite a duplicate send.
      await complete(request.requestId,result?.messageId || '').catch(()=>{});
      return res.json({success:true,delivered:true,requestId:request.requestId});
    } catch (error) {
      if (claimed && request) await fail(request.requestId).catch(()=>{});
      const status = Number.isInteger(error.status) ? error.status : 503;
      return res.status(status).json({success:false,error:error.status ? error.message : 'Impossible de confirmer l’envoi de la demande. Réessayez avec la même référence.'});
    }
  };
}
module.exports = {RECIPIENT,ORIGINS,checkedRequest,withIdentity,requestMail,createFeniceRequestHandler,failure};
