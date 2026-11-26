'use strict';
const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
const {clientFromSessionToken} = require('./pro-session');
const {getAgentFromRequest} = require('./auth');
const {VERSION, text, failure, checkedInput, assertEditable, assertRevision, keyFor, publicRecord} = require('./configurator-projects-core');
const {orderDocument} = require('./configurator-projects-document.cjs');
const db = admin.firestore(), COLLECTION = 'configurator_projects', TO = 'jerome@leroyfactory.fr';
const ORIGINS = new Set(['https://leroyfactory.fr', 'https://www.leroyfactory.fr', 'https://studio-one-beta-test-v2.vercel.app', 'https://randal-catalogue-general-3d.vercel.app']);
async function account(req) {
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!bearer) throw failure('Connectez votre compte client LRF pour synchroniser et envoyer ce projet.', 401);
  const agent = bearer.includes('.') ? await getAgentFromRequest(req) : null;
  if (agent) return {owner: 'admin:' + agent.uid, store: 'LE ROY FACTORY', code: '', email: agent.email};
  const session = await clientFromSessionToken(bearer, {renew: true});
  const c = session?.client;
  if (!c) throw failure('Votre session LRF a expiré. Reconnectez le compte sur le site.', 401);
  if (!(c.partenaires || []).some(p => ['randal', 'randalpro'].includes(String(p).toLowerCase().replace(/[^a-z]/g, '')))) throw failure('Votre compte ne dispose pas de l’accès RANDAL.', 403);
  return {owner: 'client:' + c.id, store: text(c.societe) || 'Magasin', code: c.codeClient, email: text(c.email, 254)};
}
function projectRef(a, variant, id) {
  if (!/^project-[a-zA-Z0-9-]{6,80}$/.test(id || '')) throw failure('Projet non reconnu.');
  return db.collection(COLLECTION).doc(keyFor(a.owner, variant, id));
}
async function savedProject(a, variant, input) {
  const raw = checkedInput(input), ref = projectRef(a, variant, raw.id), year = new Date().getUTCFullYear();
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref), tombstone = await tx.get(db.collection('configurator_project_tombstones').doc(keyFor(a.owner, variant, raw.id))), old = snap.exists ? snap.data() : null;
    if (tombstone.exists) throw failure('Ce projet a été supprimé définitivement. Importez ou dupliquez une copie sous un nouveau numéro.', 410);
    assertEditable(old); assertRevision(old, raw.revision);
    let number = old?.number;
    if (!number) { const counter = db.collection('configurator_counters').doc(String(year)), c = await tx.get(counter), n = (c.data()?.value || 0) + 1; number = 'LRF-' + year + '-' + String(n).padStart(6, '0'); tx.set(counter, {value: n}); }
    const now = new Date().toISOString();
    const record = {...raw, thumbnail: raw.thumbnail || old?.thumbnail || null, variant, owner: a.owner, account: {store: a.store, code: a.code}, number, status: 'draft', revision: (old?.revision || 0) + 1, createdAt: old?.createdAt || now, date: now, updatedAt: now};
    tx.set(ref, record); return publicRecord(record);
  });
}
function transport() {
  if (!process.env.SMTP_PASSWORD_JEROME) throw Object.assign(failure('Le service d’envoi LRF est indisponible. Votre projet reste sauvegardé.', 503), {code: 'SMTP_NOT_CONFIGURED'});
  return nodemailer.createTransport({host: 'ssl0.ovh.net', port: 465, secure: true, auth: {user: TO, pass: process.env.SMTP_PASSWORD_JEROME}, connectionTimeout: 15000, socketTimeout: 30000});
}
async function prepareMail(record, a, recipient, order, summary) {
  const title = text(record.title, 100).replace(/[\r\n]/g, ' '), store = a.store.replace(/[\r\n]/g, ' '), code = a.code || 'ADMIN';
  const subject = `${store} · ${code} — ${order ? 'COMMANDE' : 'PROJET'} ${record.number} — ${title}`;
  const envelope = {format: 'lrf-project', version: 1, variant: record.variant, record: {...publicRecord(record), status: 'draft', revision: 0}};
  const json = {filename: record.number + '.lrf3d.json', content: JSON.stringify(envelope, null, 2), contentType: 'application/json'};
  if (record.variant === 'randal-general' && summary !== undefined) {
    const {rows, attachment} = await orderDocument(record, a, summary, order);
    const body = [
      order ? 'Commande RANDAL — Catalogue Général' : 'Projet RANDAL — Catalogue Général',
      `Magasin  ${a.store} · ${code}`,
      `Dossier  ${record.number} · ${record.title}`,
      record.customer.name && `Client / chantier  ${record.customer.name}`,
      record.customer.site && `Référence chantier  ${record.customer.site}`,
      record.customer.email && `E-mail  ${record.customer.email}`,
      record.customer.telephone && `Téléphone  ${record.customer.telephone}`,
    ].filter(Boolean);
    body.push('', 'Composition', ...rows.map(row => `${row.quantity} × ${row.name} — Réf. ${row.reference}${row.details ? '\n    ' + row.details : ''}`), '',
      'Le PDF joint présente le descriptif et le rendu 3D de la composition.',
      'Le fichier de configuration permet de reprendre le projet dans Mes projets → Importer.');
    return {from: {name: 'Projets RANDAL · LE ROY FACTORY', address: TO}, to: recipient, ...(a.email ? {replyTo: a.email} : {}), subject, text: body.join('\n'), attachments: [attachment, json]};
  }
  const body = [`MAGASIN : ${a.store}`, `NUMÉRO LRF : ${code}`, `PROJET : ${record.number}`, `NOM : ${record.title}`, `CLIENT / CHANTIER : ${record.customer.name || 'À renseigner'}`, `E-MAIL CLIENT : ${record.customer.email || 'Non renseigné'}`, `TÉLÉPHONE : ${record.customer.telephone || 'Non renseigné'}`, `RÉFÉRENCE CHANTIER : ${record.customer.site || ''}`, '', order ? 'Commande transmise par le compte LRF vérifié. Le projet est désormais verrouillé ; une duplication reste possible.' : 'Copie du projet en pièce jointe. Pour la reprendre sur un autre poste : Mes projets → Importer, puis nommer la copie.', '', 'Les références, tarifs et disponibilités restent à contrôler dans le dossier commercial LRF. Le fichier contient la configuration et ne contient aucun identifiant de connexion.'].join('\n');
  return {from: {name: 'Projets RANDAL · LE ROY FACTORY', address: TO}, to: recipient, ...(a.email ? {replyTo: a.email} : {}), subject, text: body, attachments: [json]};
}
async function deliver(mail) {
  const result = await transport().sendMail(mail);
  if (!result.accepted?.length) throw Object.assign(failure('Le serveur de messagerie n’a pas accepté l’envoi. Votre projet reste sauvegardé.', 503), {code: 'EENVELOPE'});
  return text(result.messageId, 200);
}
function explicitlyRejected(error) {
  return ['EAUTH', 'EENVELOPE', 'EMESSAGE', 'SMTP_NOT_CONFIGURED'].includes(error.code) || error.responseCode >= 400;
}
function deliveryNotConfirmed() {
  return failure('Transmission non confirmée. Le projet reste protégé. Contactez l’administrateur avec son numéro avant un nouvel envoi.', 503);
}
async function reserveMailQuota(tx, a) {
  const limit = db.collection('configurator_mail_limits').doc(keyFor(a.owner, 'mail', String(Math.floor(Date.now() / 3600000))));
  const count = (await tx.get(limit)).data()?.count || 0;
  if (count >= 12) throw failure('Douze envois par heure maximum. Réessayez plus tard.', 429);
  tx.set(limit, {count: count + 1, expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 86400000)});
}
function deliverableReceipt(receipt, alreadyDelivered) {
  return {success: true, delivered: true, number: receipt.number, documentAttached: receipt.documentAttached === true,
    ...(alreadyDelivered ? {alreadyDelivered} : {})};
}
async function sendLocalToAdministrator(record, a, order, summary) {
  const receipts = db.collection('configurator_local_mail_receipts');
  const orderRef = receipts.doc(keyFor(a.owner, record.variant, 'order:' + record.id));
  const ref = order ? orderRef : receipts.doc(keyFor(a.owner, record.variant, 'project:' + record.id));
  // One order per verified account, configurator and project, across retries and devices.
  // Draft copies can be resent after editing, without being sent twice when unchanged.
  const fingerprint = order ? '' : crypto.createHash('sha256')
    .update(JSON.stringify({title: record.title, customer: record.customer, data: record.data})).digest('hex');
  const mail = await prepareMail(record, a, TO, order, summary);
  const documentAttached = mail.attachments[0].contentType === 'application/pdf';
  const pending = {status: 'sending', number: record.number, fingerprint, startedAt: new Date().toISOString()};
  const prior = await db.runTransaction(async tx => {
    const orderReceipt = (await tx.get(orderRef)).data();
    if (orderReceipt?.status === 'sent') return deliverableReceipt(orderReceipt, 'order');
    if (orderReceipt?.status === 'sending') throw failure('Une transmission de cette commande est déjà en cours ou doit être vérifiée.', 409);
    if (!order) {
      const copyReceipt = (await tx.get(ref)).data();
      if (copyReceipt?.status === 'sent' && copyReceipt.fingerprint === fingerprint) return deliverableReceipt(copyReceipt, 'project');
      if (copyReceipt?.status === 'sending') throw failure('Un envoi de ce projet est déjà en cours ou doit être vérifié.', 409);
    }
    await reserveMailQuota(tx, a);
    tx.set(ref, pending);
    return null;
  });
  if (prior) return prior;
  let messageId;
  try {
    messageId = await deliver(mail);
  } catch (error) {
    // A server rejection is retryable. A timeout after SMTP DATA may have delivered the mail.
    if (!explicitlyRejected(error)) throw deliveryNotConfirmed();
    await ref.delete();
    throw error;
  }
  const receipt = {...pending, status: 'sent', documentAttached, messageId, sentAt: new Date().toISOString()};
  await ref.set(receipt);
  return deliverableReceipt(receipt);
}
exports.randalProjects = onRequest({region: 'us-central1', timeoutSeconds: 90, memory: '256MiB', secrets: ['SMTP_PASSWORD_JEROME']}, async (req, res) => {
  const origin = String(req.headers.origin || '');
  if (ORIGINS.has(origin)) res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin'); res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.set('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.set('Cache-Control', 'private, no-store');
  res.set('X-LRF-Randal-Projects-Version', VERSION);
  if (req.method === 'OPTIONS') return res.status(ORIGINS.has(origin) ? 204 : 403).send('');
  if (req.method !== 'POST' || origin && !ORIGINS.has(origin)) return res.status(403).json({success: false, error: 'Origine non autorisée.'});
  try {
    const a = await account(req), b = req.body || {}, variant = b.variant;
    if (!['studio-one', 'randal-general'].includes(variant)) throw failure('Configurateur inconnu.');
    const requiresDocument = b.action === 'local-order-with-document';
    if (requiresDocument && variant !== 'randal-general') throw failure('Action inconnue.');
    if (requiresDocument && !b.orderSummary) throw failure('Le descriptif et le visuel de la composition sont manquants.', 422);
    // Local-only projects are never written to Firestore. Authentication, rate
    // limiting and SMTP delivery stay server-side, and the attached project is
    // validated before it is forwarded to its recipient.
    if (requiresDocument || ['local-administrator', 'local-email', 'local-order'].includes(b.action)) {
      const raw = checkedInput(b.record);
      const order = requiresDocument || b.action === 'local-order';
      const suggestedNumber = text(b.record?.number, 60);
      const number = /^(?:LOCAL-[a-zA-Z0-9-]{6,54}|LRF-[0-9]{4}-[0-9]{6})$/.test(suggestedNumber)
        ? suggestedNumber : 'LOCAL-' + raw.id.slice(8, 20).toUpperCase();
      if (order && !raw.customer.name) throw failure('Renseignez le client avant de finaliser la commande.');
      const recipient = b.action === 'local-email' ? text(b.recipient, 254) : TO;
      if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient)) throw failure('Adresse e-mail du destinataire invalide.');
      const record = {...raw, number, variant, account: {store: a.store, code: a.code}, date: new Date().toISOString(), status: 'draft'};
      if (variant === 'randal-general' && recipient.toLowerCase() === TO) {
        return res.json(await sendLocalToAdministrator(record, a, order, b.orderSummary));
      }
      await db.runTransaction(tx => reserveMailQuota(tx, a));
      await deliver(await prepareMail(record, a, recipient, order));
      return res.json({success: true, delivered: true, number});
    }
    if (b.action === 'list') {
      const snap = await db.collection(COLLECTION).where('owner', '==', a.owner).limit(100).get();
      const deleted = await db.collection('configurator_project_tombstones').where('owner', '==', a.owner).limit(1000).get();
      return res.json({success: true, projects: snap.docs.map(d => d.data()).filter(p => p.variant === variant).sort((x, y) => y.updatedAt.localeCompare(x.updatedAt)).map(publicRecord), deletedIds: deleted.docs.map(d => d.data()).filter(p => p.variant === variant).map(p => p.id)});
    }
    if (b.action === 'save') return res.json({success: true, record: await savedProject(a, variant, b.record)});
    const ref = projectRef(a, variant, b.id);
    if (b.action === 'delete') {
      await db.runTransaction(async tx => {const current = (await tx.get(ref)).data(); if (current) {assertEditable(current); assertRevision(current, b.revision);} tx.delete(ref); tx.set(db.collection('configurator_project_tombstones').doc(keyFor(a.owner, variant, b.id)), {id: b.id, owner: a.owner, variant, deletedAt: new Date().toISOString()});});
      return res.json({success: true});
    }
    const snap = await ref.get();
    if (!snap.exists) throw failure('Projet introuvable sur votre compte.', 404);
    const record = snap.data();
    if (b.action === 'email' || b.action === 'administrator') {
      const recipient = b.action === 'administrator' ? TO : text(b.recipient, 254);
      if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient)) throw failure('Adresse e-mail du destinataire invalide.');
      if (variant === 'randal-general' && recipient.toLowerCase() === TO) {
        if (record.status === 'validated') return res.json({...deliverableReceipt({number: record.number, documentAttached: record.orderDocumentAttached}, 'order'), record: publicRecord(record)});
        assertEditable(record);
        return res.json({...await sendLocalToAdministrator(record, a, false, b.orderSummary), record: publicRecord(record)});
      }
      await db.runTransaction(tx => reserveMailQuota(tx, a));
      await deliver(await prepareMail(record, a, recipient, false));
      return res.json({success: true, record: publicRecord(record), delivered: true});
    }
    if (b.action === 'order') {
      const mail = record.status === 'validated' ? null : await prepareMail(record, a, TO, true, b.orderSummary);
      const op = crypto.randomUUID();
      const current = await db.runTransaction(async tx => {
        const r = (await tx.get(ref)).data();
        if (!r) throw failure('Projet introuvable sur votre compte.', 404);
        if (r.status === 'validated') return r;
        assertEditable(r); assertRevision(r, b.revision); assertRevision(r, record.revision);
        if (!r.customer?.name) throw failure('Renseignez le client avant de finaliser la commande.');
        const sending = {...r, status: 'sending', sendOperation: op, sendStartedAt: new Date().toISOString()}; tx.set(ref, sending); return sending;
      });
      if (current.status === 'validated') return res.json({success: true, record: publicRecord(current), delivered: true, documentAttached: current.orderDocumentAttached === true});
      let messageId;
      try { messageId = await deliver(mail); }
      catch (e) {
        // A rejected message is safe to retry. A transport timeout after DATA may
        // already have been accepted: retain the lock to prevent a double order.
        if (explicitlyRejected(e)) await ref.update({status: 'draft', sendOperation: admin.firestore.FieldValue.delete()});
        else throw deliveryNotConfirmed();
        throw e;
      }
      // If recording the accepted send fails, keep 'sending' protected for administrator review.
      const documentAttached = mail.attachments[0].contentType === 'application/pdf';
      const final = {...current, status: 'validated', revision: current.revision + 1, validatedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), orderMessageId: messageId, orderDocumentAttached: documentAttached}; delete final.sendOperation; delete final.sendStartedAt;
      await ref.set(final); return res.json({success: true, record: publicRecord(final), delivered: true, documentAttached});
    }
    throw failure('Action inconnue.');
  } catch (e) { console.warn('RANDAL project operation:', e.status || 503, e.code || 'request-failed'); return res.status(e.status || 503).json({success: false, error: e.status ? e.message : 'Le service projets LRF est indisponible. Votre copie locale est conservée.'}); }
});
