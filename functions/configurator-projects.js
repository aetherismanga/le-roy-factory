'use strict';
const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
const {clientFromSessionToken} = require('./pro-session');
const {getAgentFromRequest} = require('./auth');
const {text, failure, checkedInput, assertEditable, assertRevision, keyFor, publicRecord} = require('./configurator-projects-core');
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
async function send(record, a, recipient, order) {
  const title = text(record.title, 100).replace(/[\r\n]/g, ' '), store = a.store.replace(/[\r\n]/g, ' '), code = a.code || 'ADMIN';
  const subject = `${store} · ${code} — ${order ? 'COMMANDE' : 'PROJET'} ${record.number} — ${title}`;
  const envelope = {format: 'lrf-project', version: 1, variant: record.variant, record: {...publicRecord(record), status: 'draft', revision: 0}};
  const body = [`MAGASIN : ${a.store}`, `NUMÉRO LRF : ${code}`, `PROJET : ${record.number}`, `NOM : ${record.title}`, `CLIENT / CHANTIER : ${record.customer.name || 'À renseigner'}`, `E-MAIL CLIENT : ${record.customer.email || 'Non renseigné'}`, `TÉLÉPHONE : ${record.customer.telephone || 'Non renseigné'}`, `RÉFÉRENCE CHANTIER : ${record.customer.site || ''}`, '', order ? 'Commande transmise par le compte LRF vérifié. Le projet est désormais verrouillé ; une duplication reste possible.' : 'Copie du projet en pièce jointe. Pour la reprendre sur un autre poste : Mes projets → Importer, puis nommer la copie.', '', 'Les références, tarifs et disponibilités restent à contrôler dans le dossier commercial LRF. Le fichier contient la configuration et ne contient aucun identifiant de connexion.'].join('\n');
  const result = await transport().sendMail({from: {name: 'Projets RANDAL · LE ROY FACTORY', address: TO}, to: recipient, ...(a.email ? {replyTo: a.email} : {}), subject, text: body, attachments: [{filename: record.number + '.lrf3d.json', content: JSON.stringify(envelope, null, 2), contentType: 'application/json'}]});
  if (!result.accepted?.length) throw failure('Le serveur de messagerie n’a pas accepté l’envoi. Votre projet reste sauvegardé.', 503);
  return text(result.messageId, 200);
}
exports.randalProjects = onRequest({region: 'us-central1', timeoutSeconds: 90, memory: '256MiB', secrets: ['SMTP_PASSWORD_JEROME']}, async (req, res) => {
  const origin = String(req.headers.origin || '');
  if (ORIGINS.has(origin)) res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin'); res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.set('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.set('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') return res.status(ORIGINS.has(origin) ? 204 : 403).send('');
  if (req.method !== 'POST' || origin && !ORIGINS.has(origin)) return res.status(403).json({success: false, error: 'Origine non autorisée.'});
  try {
    const a = await account(req), b = req.body || {}, variant = b.variant;
    if (!['studio-one', 'randal-general'].includes(variant)) throw failure('Configurateur inconnu.');
    // Local-only projects are never written to Firestore. Authentication, rate
    // limiting and SMTP delivery stay server-side, and the attached project is
    // validated before it is forwarded to its recipient.
    if (['local-administrator', 'local-email', 'local-order'].includes(b.action)) {
      const raw = checkedInput(b.record);
      const suggestedNumber = text(b.record?.number, 60);
      const number = /^(?:LOCAL-[a-zA-Z0-9-]{6,54}|LRF-[0-9]{4}-[0-9]{6})$/.test(suggestedNumber)
        ? suggestedNumber : 'LOCAL-' + raw.id.slice(8, 20).toUpperCase();
      if (b.action === 'local-order' && !raw.customer.name) throw failure('Renseignez le client avant de finaliser la commande.');
      const recipient = b.action === 'local-email' ? text(b.recipient, 254) : TO;
      if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient)) throw failure('Adresse e-mail du destinataire invalide.');
      const limit = db.collection('configurator_mail_limits').doc(keyFor(a.owner, 'mail', String(Math.floor(Date.now() / 3600000))));
      await db.runTransaction(async tx => {const n = (await tx.get(limit)).data()?.count || 0; if (n >= 12) throw failure('Douze envois par heure maximum. Réessayez plus tard.', 429); tx.set(limit, {count: n + 1, expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 86400000)});});
      const record = {...raw, number, variant, account: {store: a.store, code: a.code}, date: new Date().toISOString(), status: 'draft'};
      await send(record, a, recipient, b.action === 'local-order');
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
      // Persistent rate limit prevents an authenticated session from becoming a mail relay.
      const limit = db.collection('configurator_mail_limits').doc(keyFor(a.owner, 'mail', String(Math.floor(Date.now() / 3600000))));
      await db.runTransaction(async tx => {const n = (await tx.get(limit)).data()?.count || 0; if (n >= 12) throw failure('Douze envois par heure maximum. Réessayez plus tard.', 429); tx.set(limit, {count: n + 1, expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 86400000)});});
      await send(record, a, recipient, false); return res.json({success: true, record: publicRecord(record), delivered: true});
    }
    if (b.action === 'order') {
      const op = crypto.randomUUID();
      const current = await db.runTransaction(async tx => {
        const r = (await tx.get(ref)).data(); if (r.status === 'validated') return r;
        assertEditable(r); assertRevision(r, b.revision);
        if (!r.customer?.name) throw failure('Renseignez le client avant de finaliser la commande.');
        const sending = {...r, status: 'sending', sendOperation: op, sendStartedAt: new Date().toISOString()}; tx.set(ref, sending); return sending;
      });
      if (current.status === 'validated') return res.json({success: true, record: publicRecord(current), delivered: true});
      let messageId;
      try { messageId = await send(current, a, TO, true); }
      catch (e) {
        // A rejected message is safe to retry. A transport timeout after DATA may
        // already have been accepted: retain the lock to prevent a double order.
        const rejected = ['EAUTH', 'EENVELOPE', 'EMESSAGE', 'SMTP_NOT_CONFIGURED'].includes(e.code) || e.responseCode >= 400;
        if (rejected) await ref.update({status: 'draft', sendOperation: admin.firestore.FieldValue.delete()});
        else throw failure('Transmission non confirmée. Le projet reste protégé ; contactez l’administrateur avec son numéro avant un nouvel envoi.', 503);
        throw e;
      }
      // If recording the accepted send fails, keep 'sending' protected for administrator review.
      const final = {...current, status: 'validated', revision: current.revision + 1, validatedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), orderMessageId: messageId}; delete final.sendOperation; delete final.sendStartedAt;
      await ref.set(final); return res.json({success: true, record: publicRecord(final), delivered: true});
    }
    throw failure('Action inconnue.');
  } catch (e) { console.warn('RANDAL project operation:', e.status || 503, e.code || 'request-failed'); return res.status(e.status || 503).json({success: false, error: e.status ? e.message : 'Le service projets LRF est indisponible. Votre copie locale est conservée.'}); }
});
