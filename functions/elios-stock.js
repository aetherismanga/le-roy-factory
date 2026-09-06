const { onRequest } = require('firebase-functions/v2/https');

const BOT = '@EliosCeramicaBot';
const ALLOWED_ORIGINS = new Set([
  'https://leroyfactory.fr',
  'https://www.leroyfactory.fr'
]);

let cache = null;
const CACHE_MS = 60 * 1000;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function applyCors(req, res) {
  const origin = String(req.headers.origin || '');
  if (ALLOWED_ORIGINS.has(origin)) res.set('Access-Control-Allow-Origin', origin);
  else res.set('Access-Control-Allow-Origin', 'https://leroyfactory.fr');
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

function textOf(message) {
  return String(message?.message || '');
}

function parseNumber(raw) {
  const n = Number(String(raw || '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseStock(messages) {
  const text = messages.map(textOf).filter(Boolean).join('\n');
  const total = text.match(/Totale\s+Disponibilit[aà]:\s*([\d.,]+)\s*MQ/i)
    || text.match(/Disponibilit[aà]:\s*([\d.,]+)\s*MQ/i);
  const production = text.match(/Totale\s+Disp\.\s+su\s+piano\s+produzione:\s*([\d.,]+)\s*MQ/i);
  return {
    stock: total ? parseNumber(total[1]) : null,
    production: production ? parseNumber(production[1]) : 0
  };
}

async function recentMessages(client, limit = 8) {
  const out = [];
  for await (const message of client.iterMessages(BOT, { limit })) out.push(message);
  return out;
}

async function queryRomaAventino(client) {
  const searchRef = '085M140';

  await client.sendMessage(BOT, { message: searchRef });
  await wait(1800);

  let messages = await recentMessages(client, 8);
  const productMessage = messages.find(msg => Array.isArray(msg.buttons) && msg.buttons.flat().length);
  if (!productMessage) throw new Error('Aucun bouton produit reçu pour 085M140.');

  await productMessage.click({ i: 0 });
  await wait(1600);

  messages = await recentMessages(client, 8);
  const availabilityMessage = messages.find(msg =>
    Array.isArray(msg.buttons) && msg.buttons.flat().some(btn => /disponibil/i.test(String(btn?.text || '')))
  );
  if (!availabilityMessage) throw new Error('Bouton Disponibilità introuvable.');

  await availabilityMessage.click({ text: text => /disponibil/i.test(String(text || '')) });
  await wait(1900);

  messages = await recentMessages(client, 10);
  const parsed = parseStock(messages);
  if (parsed.stock === null) throw new Error('Stock ELIOS non détecté dans la réponse Telegram.');

  return {
    ref: '085M140P',
    searchRef,
    name: 'ROMA AVENTINO MOD 40 5X61MO',
    format: '40,5 × 61 MO',
    stock: parsed.stock,
    production: parsed.production,
    verified: true
  };
}

async function fetchRomaStock() {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = String(process.env.TELEGRAM_API_HASH || '').trim();
  const session = String(process.env.TELEGRAM_SESSION || '').trim();

  if (!Number.isInteger(apiId) || !apiHash || !session) {
    throw new Error('Secrets Telegram absents ou invalides.');
  }

  const { TelegramClient } = await import('teleproto');
  const { StringSession } = await import('teleproto/sessions/index.js');

  const client = new TelegramClient(
    new StringSession(session),
    apiId,
    apiHash,
    { connectionRetries: 5 }
  );

  try {
    await client.connect();
    const product = await queryRomaAventino(client);
    return {
      collection: 'ROMA',
      products: [product],
      updatedAt: new Date().toISOString(),
      source: 'EliosBOT / Telegram'
    };
  } finally {
    try { await client.disconnect(); } catch (_) {}
  }
}

exports.eliosStock = onRequest({
  region: 'us-central1',
  timeoutSeconds: 60,
  memory: '512MiB',
  maxInstances: 1,
  concurrency: 1,
  secrets: ['TELEGRAM_API_ID', 'TELEGRAM_API_HASH', 'TELEGRAM_SESSION']
}, async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });

  const collection = String(req.query.collection || 'ROMA').trim().toUpperCase();
  if (collection !== 'ROMA') return res.status(400).json({ success: false, error: 'Test disponible uniquement pour ROMA.' });

  try {
    if (cache && Date.now() - cache.time < CACHE_MS) {
      return res.status(200).json({ success: true, cached: true, ...cache.data });
    }

    const data = await fetchRomaStock();
    cache = { time: Date.now(), data };
    return res.status(200).json({ success: true, cached: false, ...data });
  } catch (err) {
    console.error('ELIOS STOCK', err);
    return res.status(502).json({ success: false, error: 'Impossible d’interroger EliosBOT pour le moment.' });
  }
});
