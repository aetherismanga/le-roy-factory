const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { requireAgent } = require('./auth');

const db = admin.firestore();
const DOC = db.collection('internalSettings').doc('siteControl');
const ALLOWED_ORIGINS = ['https://leroyfactory.fr', 'https://www.leroyfactory.fr'];
const DEVICES = new Set(['desktop-chrome', 'iphone-webkit', 'android-chrome']);
const SCOPES = new Set(['all', 'navigation', 'accueil', 'selections', 'elios', 'configurateurs', 'catalogues', 'contact']);
const INTENSITIES = new Set(['quick', 'normal', 'full']);
const CADENCES = new Set(['hourly', '6h', '12h', 'daily', 'weekdays', 'weekly']);

const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  runs: 1,
  devices: ['desktop-chrome', 'iphone-webkit', 'android-chrome'],
  scope: 'all',
  intensity: 'normal',
  schedule: {
    enabled: true,
    cadence: 'daily',
    time: '07:00',
    weekday: 1
  }
});

function cors(req, res) {
  const origin = String(req.headers.origin || '');
  res.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : 'https://leroyfactory.fr');
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

function cleanTime(value) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return '07:00';
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function normalizeConfig(raw = {}) {
  const sourceSchedule = raw.schedule && typeof raw.schedule === 'object' ? raw.schedule : {};
  const devices = Array.isArray(raw.devices) ? raw.devices.filter((d) => DEVICES.has(String(d))) : [];
  const cadence = CADENCES.has(String(sourceSchedule.cadence)) ? String(sourceSchedule.cadence) : DEFAULT_CONFIG.schedule.cadence;
  return {
    enabled: raw.enabled !== false,
    runs: clampInt(raw.runs, 1, 20, DEFAULT_CONFIG.runs),
    devices: devices.length ? [...new Set(devices)] : [...DEFAULT_CONFIG.devices],
    scope: SCOPES.has(String(raw.scope)) ? String(raw.scope) : DEFAULT_CONFIG.scope,
    intensity: INTENSITIES.has(String(raw.intensity)) ? String(raw.intensity) : DEFAULT_CONFIG.intensity,
    schedule: {
      enabled: sourceSchedule.enabled !== false,
      cadence,
      time: cleanTime(sourceSchedule.time),
      weekday: clampInt(sourceSchedule.weekday, 1, 7, DEFAULT_CONFIG.schedule.weekday)
    }
  };
}

function iso(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function publicPayload(data = {}) {
  const config = normalizeConfig(data.config || data);
  const manual = data.manualRequest && typeof data.manualRequest === 'object' ? data.manualRequest : null;
  return {
    success: true,
    config,
    manualRequest: manual && manual.id ? {
      id: String(manual.id).slice(0, 100),
      requestedAt: iso(manual.requestedAt)
    } : null,
    updatedAt: iso(data.updatedAt)
  };
}

exports.siteControl = onRequest({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB' }, async (req, res) => {
  if (cors(req, res)) return;

  try {
    if (req.method === 'GET') {
      const snap = await DOC.get();
      if (!snap.exists) return res.status(200).json(publicPayload({ config: DEFAULT_CONFIG }));
      return res.status(200).json(publicPayload(snap.data() || {}));
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
    }

    const agent = await requireAgent(req, res);
    if (!agent) return;

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const action = String(body.action || 'save');
    if (!['save', 'run'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action inconnue.' });
    }

    const currentSnap = await DOC.get();
    const current = currentSnap.exists ? (currentSnap.data() || {}) : {};
    const config = normalizeConfig(body.config || current.config || DEFAULT_CONFIG);
    const update = {
      config,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: agent.uid || '',
      updatedByEmail: agent.email || ''
    };

    let requestId = null;
    if (action === 'run') {
      requestId = crypto.randomUUID();
      update.manualRequest = {
        id: requestId,
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        requestedBy: agent.uid || ''
      };
    }

    await DOC.set(update, { merge: true });
    return res.status(200).json({
      success: true,
      action,
      requestId,
      config
    });
  } catch (error) {
    console.error('[siteControl]', error);
    return res.status(500).json({ success: false, error: 'Impossible de mettre à jour le contrôle du site.' });
  }
});
