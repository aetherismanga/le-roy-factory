const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { requireAgent } = require('./auth');

if (!admin.apps.length) admin.initializeApp();

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_SCOPES = new Set(['expo-clients', 'merchandising', 'client-documents']);
const ALLOWED_ORIGINS = new Set([
  'https://leroyfactory.fr',
  'https://www.leroyfactory.fr',
  'https://aetherismanga.github.io'
]);
const UPTREND_IMPORT_SHA256 = 'e5fd7b6492327091e971120c22b3734cdd298c3cae9c7a8e4c8a885080e0a761';
const UPTREND_STORAGE_PATH = 'private-tariffs/uptrend/uptrend2026.pdf';

function applyCors(req, res) {
  const origin = String(req.headers.origin || '');
  if (ALLOWED_ORIGINS.has(origin)) res.set('Access-Control-Allow-Origin', origin);
  else res.set('Access-Control-Allow-Origin', 'https://leroyfactory.fr');
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

function cleanSegment(value, fallback = 'general') {
  const cleaned = String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  return cleaned || fallback;
}

function cleanFileName(value) {
  const input = String(value || 'document').trim();
  const dot = input.lastIndexOf('.');
  const ext = dot > 0 ? input.slice(dot).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12) : '';
  const base = dot > 0 ? input.slice(0, dot) : input;
  return `${cleanSegment(base, 'document').slice(0, 100)}${ext}`;
}

exports.crmFilesUpload = onRequest({
  timeoutSeconds: 120,
  memory: '512MiB',
  maxInstances: 5
}, async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });

  // Import ponctuel UPTREND : seul le PDF validé localement par son SHA-256 exact
  // peut être écrit, et uniquement vers le chemin privé fixe ci-dessous.
  const importBody = req.body || {};
  if (importBody.uptrendImport === true) {
    try {
      let base64 = String(importBody.base64 || '').trim();
      const comma = base64.indexOf(',');
      if (base64.startsWith('data:') && comma >= 0) base64 = base64.slice(comma + 1);
      const data = Buffer.from(base64, 'base64');
      const digest = crypto.createHash('sha256').update(data).digest('hex');
      if (!data.length || digest !== UPTREND_IMPORT_SHA256) {
        return res.status(403).json({ success: false, error: 'Fichier UPTREND non autorisé.' });
      }
      const bucket = admin.storage().bucket();
      await bucket.file(UPTREND_STORAGE_PATH).save(data, {
        resumable: false,
        validation: 'md5',
        metadata: {
          contentType: 'application/pdf',
          cacheControl: 'private, no-store, max-age=0'
        }
      });
      return res.status(200).json({ success: true, path: UPTREND_STORAGE_PATH, size: data.length, sha256: digest });
    } catch (error) {
      console.error('uptrendImport:', error);
      return res.status(500).json({ success: false, error: 'Import UPTREND impossible.' });
    }
  }

  const agent = await requireAgent(req, res);
  if (!agent) return;

  try {
    const body = req.body || {};
    const scope = String(body.scope || '').trim();
    const parentId = cleanSegment(body.parentId, 'general');
    const originalName = String(body.fileName || 'document').trim().slice(0, 180);
    const fileName = cleanFileName(originalName);
    const contentType = String(body.contentType || 'application/octet-stream').trim().slice(0, 120);
    let base64 = String(body.base64 || '').trim();

    if (!ALLOWED_SCOPES.has(scope)) {
      return res.status(400).json({ success: false, error: 'Dossier de destination invalide.' });
    }
    if (!base64) return res.status(400).json({ success: false, error: 'Fichier vide.' });

    const comma = base64.indexOf(',');
    if (base64.startsWith('data:') && comma >= 0) base64 = base64.slice(comma + 1);

    const data = Buffer.from(base64, 'base64');
    if (!data.length) return res.status(400).json({ success: false, error: 'Fichier vide.' });
    if (data.length > MAX_BYTES) {
      return res.status(413).json({ success: false, error: 'Fichier trop volumineux. Maximum 20 Mo par fichier.' });
    }

    const token = crypto.randomUUID();
    const unique = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}-${fileName}`;
    const path = `${scope}/${parentId}/${unique}`;
    const bucket = admin.storage().bucket();
    const object = bucket.file(path);

    await object.save(data, {
      resumable: false,
      validation: 'md5',
      metadata: {
        contentType,
        cacheControl: 'private, max-age=0, no-transform',
        metadata: {
          firebaseStorageDownloadTokens: token,
          uploadedBy: agent.email
        }
      }
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(path)}?alt=media&token=${encodeURIComponent(token)}`;

    return res.status(200).json({
      success: true,
      file: {
        name: originalName,
        url,
        type: contentType,
        size: data.length,
        path,
        uploadedAt: new Date().toISOString(),
        uploadedBy: agent.email
      }
    });
  } catch (error) {
    console.error('crmFilesUpload:', error);
    return res.status(500).json({ success: false, error: 'Impossible de stocker le fichier.' });
  }
});
