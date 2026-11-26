'use strict';

const {createHash} = require('node:crypto');

const projectId = 'le-roy-factory';
const salesDocument = 'parametres/statistiques-elios';
const maxBytes = 500_000;
const isSha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function text(value, limit) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
}

function metrics(data, required, nullable = []) {
  const result = {};
  for (const field of [...required, ...nullable]) {
    const value = data?.[field];
    if (value === null && nullable.includes(field)) {
      result[field] = null;
      continue;
    }
    if (!Number.isFinite(value) || Math.abs(value) > 1e12) throw Error('Une mesure du relevé Elios est invalide.');
    result[field] = value;
  }
  return result;
}

function validateSnapshot(data) {
  if (data?.schema !== 1 || !validDate(data.dateFrom) || !validDate(data.dateTo) || !validDate(data.previousDateTo)) {
    throw Error('Les dates du relevé Elios sont invalides.');
  }
  if (data.dateFrom !== '2026-01-01' || data.dateTo <= '2026-08-31' || data.dateTo > '2026-12-31'
    || data.previousDateTo !== '2025' + data.dateTo.slice(4)) {
    throw Error('La période et son comparatif Elios sont incohérents.');
  }
  const source = data.source;
  if (!text(source?.filename, 240) || !text(source?.messageId, 120) || !isSha256(source?.sha256)) {
    throw Error('La provenance du relevé Elios est incomplète.');
  }
  if (!Array.isArray(data.rows) || !data.rows.length || data.rows.length > 1000) throw Error('Le relevé ne contient pas de comptes Elios valides.');
  const totals = metrics(data.totals, ['ca', 'prev', 'm2', 'm2Prev'], ['budget', 'pm', 'pmPrev']);
  const codes = new Set();
  const rows = data.rows.map(row => {
    if (typeof row?.elios !== 'string' || !/^\d{8}$/.test(row.elios) || codes.has(row.elios) || !text(row.name, 320)) {
      throw Error('Une référence de compte Elios est invalide ou en double.');
    }
    codes.add(row.elios);
    return {elios: row.elios, name: row.name,
      ...metrics(row, ['ca2026', 'ca2025', 'm22026', 'm22025'], ['pm2026', 'pm2025'])};
  });
  for (const [total, field] of [['ca', 'ca2026'], ['prev', 'ca2025'], ['m2', 'm22026'], ['m2Prev', 'm22025']]) {
    const sum = rows.reduce((acc, row) => acc + row[field], 0);
    if (Math.round(sum * 100) !== Math.round(totals[total] * 100)) {
      throw Error('Les lignes du relevé ne correspondent pas aux totaux Elios.');
    }
  }
  return {
    schema: 1, dateFrom: data.dateFrom, dateTo: data.dateTo, previousDateTo: data.previousDateTo,
    source: {filename: source.filename, messageId: source.messageId, sha256: source.sha256},
    totals, rows,
  };
}

async function downloadSnapshot(fileId, digest) {
  if (typeof fileId !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(fileId) || !isSha256(digest)) {
    throw Error('La référence du fichier et son empreinte sont requises.');
  }
  const {GoogleAuth} = require('google-auth-library');
  const auth = new GoogleAuth({scopes: ['https://www.googleapis.com/auth/drive.readonly']});
  const client = await auth.getClient();
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  let bytes;
  try {
    const {data: metadata} = await client.request({url, params: {fields: 'mimeType,size'}, timeout: 20000});
    if (metadata.mimeType !== 'application/json' || !/^\d+$/.test(metadata.size) || Number(metadata.size) > maxBytes) {
      throw Error('Format ou taille du fichier d’import invalide.');
    }
    const {data} = await client.request({url, params: {alt: 'media'}, responseType: 'arraybuffer', timeout: 30000});
    bytes = Buffer.from(data);
  } catch (error) {
    const status = error.response?.status;
    if (status) throw Error(`Lecture privée du fichier Elios refusée (HTTP ${status}).`);
    throw Error('Le fichier privé Elios est indisponible ou invalide.');
  }
  if (bytes.length > maxBytes || createHash('sha256').update(bytes).digest('hex') !== digest) {
    throw Error('Le fichier téléchargé diffère du relevé Elios validé.');
  }
  let parsed;
  try { parsed = JSON.parse(bytes.toString('utf8')); } catch { throw Error('Le relevé Elios n’est pas un JSON valide.'); }
  return validateSnapshot(parsed);
}

async function writeSnapshot(db, snapshot, digest) {
  const ref = db.doc(salesDocument);
  const status = await db.runTransaction(async transaction => {
    const prior = await transaction.get(ref);
    if (prior.exists && prior.get('dateTo') > snapshot.dateTo) throw Error('Un relevé Elios plus récent est déjà enregistré.');
    if (prior.exists && prior.get('snapshotSha256') === digest) return 'déjà présent';
    transaction.set(ref, {...snapshot, snapshotSha256: digest, importedAt: new Date().toISOString()});
    return 'importé';
  });
  const saved = await ref.get();
  if (!saved.exists || saved.get('snapshotSha256') !== digest || JSON.stringify(validateSnapshot(saved.data())) !== JSON.stringify(snapshot)) {
    throw Error('La relecture Firestore ne correspond pas au relevé Elios validé.');
  }
  return status;
}

async function verifyClientCoverage(db, rows) {
  const {reconcileEliosCrmSales} = await import('../../assets/js/elios-crm-reconciliation.mjs');
  const [clientDocuments, mappingDocuments] = await Promise.all([
    db.collection('clients').get(),
    db.collection('statistiques_lrf_mappings').where('partner', '==', 'elios-ceramica').get(),
  ]);
  const clients = clientDocuments.docs.map(doc => ({...doc.data(), id: doc.id}));
  const mappings = mappingDocuments.docs.map(doc => doc.data());
  const {byClientId, unmatched} = reconcileEliosCrmSales(rows, clients, mappings);
  return {
    shops: byClientId.size,
    linkedAccounts: rows.length - unmatched.length,
    unmatchedAccounts: unmatched.length,
    unmatchedWithSales: unmatched.filter(({row}) => row.ca2026 !== 0).length,
  };
}

async function main() {
  const digest = process.env.ELIOS_SNAPSHOT_SHA256;
  const snapshot = await downloadSnapshot(process.env.ELIOS_DRIVE_FILE_ID, digest);
  const admin = require('firebase-admin');
  const app = admin.initializeApp({projectId});
  try {
    const db = admin.firestore();
    const coverage = await verifyClientCoverage(db, snapshot.rows);
    const status = await writeSnapshot(db, snapshot, digest);
    console.log(`Relevé Elios ${status} dans le CRM et intégralement relu (${snapshot.rows.length} comptes, arrêté au ${snapshot.dateTo}).`);
    console.log('Vérification des fiches CRM : ' + JSON.stringify(coverage));
  } finally {
    await app.delete();
  }
}

if (require.main === module) main().catch(error => {
  console.error(error.message || 'Échec de l’import Elios.');
  process.exitCode = 1;
});

module.exports = {validateSnapshot, writeSnapshot};
