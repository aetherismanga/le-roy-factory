'use strict';
const crypto = require('node:crypto');
const {RECIPIENT,ORIGINS,withIdentity,failure} = require('./fenice-request-core');
const text = (value, max, required = false, multiline = false) => {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string' || value.length > max || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) throw failure('Un champ contient une valeur invalide.');
  value = value.trim();
  if (required && !value) throw failure('Merci de compléter les champs obligatoires.');
  return value;
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const fr = value => Number(value).toLocaleString('fr-FR',{maximumFractionDigits:6});
const componentLabel = component => ({fondo:'Plaques / fond',angle:'Angles',piece:'Pièce spéciale',accessory:'Accessoire de pose'}[component] || 'Élément');

function calculateBoxes(variant, quantity, requestedUnit) {
  if (quantity === null) return {status:'unspecified'};
  if (!variant || !requestedUnit || ![variant.unit,'boîtes'].includes(requestedUnit)) throw failure('Unité incompatible avec le produit.');
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) throw failure('Quantité invalide.');
  if ((requestedUnit === 'boîtes' || ['piece','pieces','sac','sacs'].includes(norm(variant.unit))) && !Number.isSafeInteger(quantity)) throw failure('Indiquez un nombre entier de pièces, de sacs ou de boîtes.');
  const perBox = variant.packQuantity;
  if (typeof perBox !== 'number' || !Number.isFinite(perBox) || perBox <= 0) {
    if (requestedUnit === 'boîtes') throw failure('Le conditionnement de cette variante reste à confirmer.');
    return {status:'unknown'};
  }
  const boxes = requestedUnit === 'boîtes' ? quantity : Math.ceil(quantity / perBox - 1e-10);
  return {status:'known',boxes,quantity:Number((boxes * perBox).toFixed(6)),unit:variant.unit,perBox,packLabel:variant.packLabel || 'boîte'};
}

function checkedRequest(body, catalogue) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 50000) throw failure('La demande est trop volumineuse.');
  if (body.societe_web) throw failure('Merci de patienter avant une nouvelle demande.',429);
  if (!Array.isArray(catalogue?.collections) || !catalogue.collections.length) throw failure('Le catalogue est momentanément indisponible.',503);
  const requestId = text(body.requestId,100,true);
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(requestId)) throw failure('Identifiant de demande invalide. Rechargez le formulaire.');
  if (!['private','professional'].includes(body.profile)) throw failure('Choisissez le type de demande.');
  const professional = body.profile === 'professional';
  const nom = text(body.nom,80,!professional), prenom = text(body.prenom,80,!professional);
  const contact = text(body.contact,180) || [prenom,nom].filter(Boolean).join(' ');
  if (!contact) throw failure('Renseignez votre nom et prénom.');
  const company = text(body.company,180,professional), email = text(body.email,180,true).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw failure('Adresse e-mail invalide.');
  const telephone = text(body.telephone,40,true);
  if (!/^[+()\d .-]+$/.test(telephone) || telephone.replace(/\D/g,'').length < 8 || telephone.replace(/\D/g,'').length > 15) throw failure('Numéro de téléphone invalide.');
  const codePostal = text(body.codePostal,5,true);
  if (!/^\d{5}$/.test(codePostal)) throw failure('Le code postal doit contenir cinq chiffres.');
  const ville = text(body.ville,120,!professional), secteur = text(body.secteur,160) || ville;
  if (!professional && !secteur) throw failure('Renseignez le secteur de votre projet.');
  const message = text(body.message,4000,false,true);
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) throw failure('Choisissez entre un et trente produits.');
  const items = body.items.map(line => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) throw failure('Produit invalide.');
    const collectionSlug = text(line.collectionSlug,100,true), colorId = text(line.colorId,160), variantId = text(line.variantId,180);
    const product = catalogue.collections.find(item => item.slug === collectionSlug);
    if (!product) throw failure('Cette collection n’est pas disponible dans le catalogue. Actualisez le formulaire.');
    const colors = Array.isArray(product.swatches) ? product.swatches : [];
    const color = colors.find(item => item.id === colorId);
    if (colorId && !color) throw failure('Ce coloris ne correspond pas à cette collection.');
    const variant = (product.variants || []).find(item => item.id === variantId);
    if (variantId && !variant) throw failure('Cette variante ne correspond pas à cette collection.');
    if (variant?.colorIds?.length && colorId && !variant.colorIds.includes(colorId)) throw failure('Cette variante n’est pas documentée pour le coloris choisi.');
    if (variant?.relatedCollectionSlug && variant.relatedCollectionSlug !== product.slug && colorId) throw failure('Choisissez cet élément dans sa collection associée pour préciser son coloris.');
    let requestedQuantity = line.requestedQuantity;
    if (requestedQuantity === '' || requestedQuantity === undefined) requestedQuantity = null;
    const requestedUnit = text(line.requestedUnit,30), reference = text(line.reference,220);
    if (!variant && (requestedQuantity !== null || requestedUnit)) throw failure('Choisissez une variante avant de renseigner sa quantité.');
    if (variant && requestedUnit && ![variant.unit,'boîtes'].includes(requestedUnit)) throw failure('Unité incompatible avec le produit.');
    const packaging = calculateBoxes(variant,requestedQuantity,requestedUnit);
    // Names, dimensions, units and carton totals come only from the server snapshot.
    // Any price, recipient, browser role or browser-calculated carton value is ignored.
    return {collectionSlug,name:String(product.name),colorId,color:color?.name || '',variantId,
      colorRequired:colors.length > 0,variantColorRequired:!!variant?.colorIds?.length,
      component:variant?.component || '',label:variant?.label || '',dimensions:variant?.dimensions || '',
      thickness:variant?.thickness || '',relatedCollectionSlug:variant?.relatedCollectionSlug || '',
      requestedQuantity,requestedUnit,reference,packaging};
  });
  return {requestId,profile:body.profile,nom,prenom,contact,company,email,telephone,codePostal,ville,secteur,message,items};
}

function validateProfessional(request) {
  if (request.profile !== 'professional') return;
  if (!request.company || request.items.some(item => !item.variantId || item.requestedQuantity === null || item.colorRequired && !item.colorId || item.variantColorRequired && !item.colorId)) throw failure('Complétez la société, les coloris, les variantes et les quantités pour votre demande professionnelle.');
}

function requestMail(request) {
  const professional = request.profile === 'professional';
  const account = request.account.type === 'client' ? `Code LRF vérifié : ${request.account.codeClient}` : request.account.type === 'agent' ? `Administrateur vérifié : ${request.account.email}` : professional ? 'Professionnel non connecté — identité à confirmer' : 'Particulier — orientation vers un magasin revendeur';
  const blocks = request.items.map((item,index) => {
    const packaging = item.packaging;
    const packLabel = packaging.packLabel || 'boîte';
    const boxes = packaging.status === 'known' ? `${fr(packaging.boxes)} ${packLabel}${packaging.boxes>1?'s':''} · ${fr(packaging.quantity)} ${packaging.unit}` : packaging.status === 'unspecified' ? 'Quantité à préciser' : 'Conditionnement à confirmer avec le fabricant';
    const details = [item.dimensions,item.thickness].filter(Boolean).map(value => Array.isArray(value) ? value.join(' · ') : String(value)).join(' · ');
    return [`PRODUIT ${index+1} — ${item.name}`,`Coloris / mélange : ${item.color || 'à confirmer'}`,`Élément : ${item.label || componentLabel(item.component)}${details?' · '+details:''}`,item.relatedCollectionSlug && `Série associée fabricant : ${item.relatedCollectionSlug}`,`Précision / référence : ${item.reference || '—'}`,`Besoin saisi : ${item.requestedQuantity === null ? 'à préciser' : fr(item.requestedQuantity)+' '+item.requestedUnit}`,`Commande par conditionnements : ${boxes}`,packaging.status === 'known' && `Boîtage fabricant : ${fr(packaging.perBox)} ${packaging.unit}/${packLabel}`].filter(Boolean).join('\n');
  });
  const title = professional ? 'DEMANDE PROFESSIONNELLE' : 'DEMANDE DE REVENDEUR';
  const subject = `[BIOPIETRA — ${title}] ${request.company || request.contact} — ${request.codePostal} ${request.ville}`.trim();
  const mailText = ['DEMANDE BIOPIETRA',`Référence : ${request.requestId}`,account,'',`Contact : ${request.contact}`,`Société : ${request.company || '—'}`,`E-mail : ${request.email}`,`Téléphone : ${request.telephone}`,`Secteur : ${request.secteur || '—'}`,`Code postal : ${request.codePostal}`,`Ville : ${request.ville || '—'}`,'',...blocks.flatMap(block=>[block,'']),'PROJET / QUESTIONS',request.message || '—','',professional ? 'Demande professionnelle à étudier par LE ROY FACTORY. Références, coloris, disponibilité et conditions à confirmer ; cette demande ne constitue pas une commande validée.' : 'Merci d’orienter le particulier vers un revendeur adapté au secteur indiqué. Références, disponibilité et conditions à confirmer par LE ROY FACTORY. Cette demande ne constitue pas une commande validée.'].join('\n');
  return {from:{name:'Demandes Biopietra · LE ROY FACTORY',address:RECIPIENT},to:RECIPIENT,replyTo:request.email,subject,text:mailText,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#29272a"><h2>${esc(title)} BIOPIETRA</h2><div style="white-space:pre-wrap">${esc(mailText)}</div></div>`};
}

function createBiopietraRequestHandler({catalogue,verifyIdentity,reserve,complete,fail,send}) {
  return async (req,res) => {
    const origin = String(req.headers?.origin || '');
    res.set('Cache-Control','private, no-store');res.set('Vary','Origin');res.set('X-Content-Type-Options','nosniff');
    if (ORIGINS.has(origin)) res.set('Access-Control-Allow-Origin',origin);
    res.set('Access-Control-Allow-Headers','Content-Type, Authorization');res.set('Access-Control-Allow-Methods','POST, OPTIONS');
    if (!ORIGINS.has(origin)) return res.status(403).json({success:false,error:'Origine non autorisée.'});
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({success:false,error:'Méthode non autorisée.'});
    let request,claimed=false;
    try {
      let raw;
      try { raw=typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { throw failure('Demande JSON invalide.'); }
      request=withIdentity(checkedRequest(raw,typeof catalogue === 'function' ? await catalogue() : catalogue),await verifyIdentity(req,raw));
      validateProfessional(request);
      const hash=crypto.createHash('sha256').update(JSON.stringify(request)).digest('hex');
      const reservation=await reserve(request.requestId,hash,req);
      if (reservation === 'sent') return res.json({success:true,delivered:true,requestId:request.requestId,duplicate:true});
      claimed=true;
      const result=await send(requestMail(request));
      if (!Array.isArray(result?.accepted) || !result.accepted.some(address => String(address).toLowerCase() === RECIPIENT)) throw failure('Le serveur de messagerie n’a pas confirmé la réception. Réessayez.',503);
      await complete(request.requestId,result?.messageId || '').catch(()=>{});
      return res.json({success:true,delivered:true,requestId:request.requestId});
    } catch(error) {
      if (claimed && request) await fail(request.requestId).catch(()=>{});
      return res.status(Number.isInteger(error.status) ? error.status : 503).json({success:false,error:error.status ? error.message : 'Impossible de confirmer l’envoi de la demande. Réessayez avec la même référence.'});
    }
  };
}
module.exports={RECIPIENT,checkedRequest,calculateBoxes,requestMail,validateProfessional,createBiopietraRequestHandler};
