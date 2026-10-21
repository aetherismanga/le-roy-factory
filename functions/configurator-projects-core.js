'use strict';
const crypto = require('node:crypto');
const text = (value, max = 160) => String(value || '').trim().slice(0, max);
function failure(message, status = 400) { return Object.assign(new Error(message), {status}); }
function checkedData(raw, kind) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw failure('Composition manquante.');
  const encoded = JSON.stringify(raw);
  if (Buffer.byteLength(encoded) > 650000 || /"(?:sessionToken|accessToken|password|idToken)"\s*:/.test(encoded)) throw failure('Fichier de projet non autorisé ou trop volumineux.');
  const data = JSON.parse(encoded);
  if (kind === 'house') {
    if (data.schema !== 2 || !data.layout || !data.rooms || !data.exterior) throw failure('Plan de maison incompatible.');
  } else if (![1, 2].includes(data.version) || !Array.isArray(data.room?.points) || data.room.points.length < 3 || data.room.points.length > 12 || !Array.isArray(data.items) || data.items.length > 32) throw failure('Plan de salle de bains incompatible.');
  return data;
}
function thumbnail(value) { if (value === undefined || value === null || value === '') return null; if (typeof value !== 'string' || value.length > 120000 || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) throw failure('Aperçu du projet invalide.'); return value; }
function checkedInput(raw) {
  if (!raw || !/^project-[a-zA-Z0-9-]{6,80}$/.test(raw.id || '')) throw failure('Identifiant de projet invalide.');
  const kind = raw.kind === 'house' ? 'house' : 'bathroom';
  const customer = {name: text(raw.customer?.name), email: text(raw.customer?.email, 254), telephone: text(raw.customer?.telephone, 40), site: text(raw.customer?.site, 200)};
  if (customer.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(customer.email)) throw failure('Adresse du client invalide.');
  return {id: raw.id, title: text(raw.title, 120) || 'Mon projet RANDAL', kind, customer, thumbnail: thumbnail(raw.thumbnail), data: checkedData(raw.data, kind), revision: Number.isInteger(raw.revision) ? raw.revision : 0};
}
function assertEditable(record) {
  if (record && record.status !== 'draft') throw failure(record.status === 'validated' ? 'Projet validé : dupliquez-le pour créer une nouvelle composition.' : 'Envoi de commande en cours. Le projet est protégé.', 409);
}
function assertRevision(old, revision) {
  if (old && old.revision !== revision) throw failure('Ce projet a changé sur un autre poste. Ouvrez sa dernière version ou dupliquez votre travail.', 409);
}
function keyFor(owner, variant, id) { return crypto.createHash('sha256').update(owner + ':' + variant + ':' + id).digest('hex'); }
function publicRecord(record) { const {owner, sendOperation, sendStartedAt, ...safe} = record; return safe; }
module.exports = {text, failure, checkedInput, assertEditable, assertRevision, keyFor, publicRecord};
