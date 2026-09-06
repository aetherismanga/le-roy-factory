const { onRequest } = require('firebase-functions/v2/https');

const BOT = '@EliosCeramicaBot';
const ALLOWED_ORIGINS = new Set([
  'https://leroyfactory.fr',
  'https://www.leroyfactory.fr'
]);

// Références ROMA imprimées dans le Catalogue Général ELIOS 2026, pp. 156–157.
// La liste blanche empêche l'endpoint d'être utilisé pour interroger arbitrairement EliosBOT.
const ROMA_REFS = new Set([
  '0852040','0852005','0852640','0852605','0854240','0854205',
  '0856140','0856105','0856100','0856170','0854640','0854605','0854600','0854670',
  '085M140','085M105','085M100','085M170',
  '0852042','0852007','0852642','0852607','0854242','0854207',
  '0856C40','0856C05','0854642','0854607','0854602','0854672','085M141','085M106',
  '085H140','085H105','085H100','085H170',
  '085B140','085B105','085B100','085B170','085BC40','085BC05','085BC00','085BC70'
]);

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();
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
  const value = Number(String(raw || '').replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function parseAvailability(messages) {
  const text = messages.map(textOf).filter(Boolean).join('\n');
  const total = text.match(/Totale\s+Disponibilit[aà]:\s*([\d.,]+)\s*MQ/i)
    || text.match(/Disponibilit[aà]:\s*([\d.,]+)\s*MQ/i);
  const production = text.match(/Totale\s+Disp\.\s+su\s+piano\s+produzione:\s*([\d.,]+)\s*MQ/i);
  const description = text.match(/Descrizione:\s*([^\n]+)/i);
  return {
    stock: total ? parseNumber(total[1]) : null,
    production: production ? parseNumber(production[1]) : 0,
    description: description ? String(description[1]).trim() : ''
  };
}

function messageId(message) {
  const value = Number(message?.id || 0);
  return Number.isFinite(value) ? value : 0;
}

function maxMessageId(messages, fallback = 0) {
  return messages.reduce((max, message) => Math.max(max, messageId(message)), fallback);
}

async function recentMessages(client, afterId = 0, limit = 14) {
  const out = [];
  for await (const message of client.iterMessages(BOT, { limit })) {
    if (messageId(message) > afterId) out.push(message);
  }
  return out;
}

function buttonsOf(message) {
  return Array.isArray(message?.buttons) ? message.buttons.flat().filter(Boolean) : [];
}

async function queryReference(client, ref) {
  const sent = await client.sendMessage(BOT, { message: ref });
  const sentId = messageId(sent);
  await wait(1800);

  let messages = await recentMessages(client, sentId, 14);
  const noProduct = messages.some(message => /Nessun\s+Prodotto\s+Trovato/i.test(textOf(message)));
  if (noProduct) throw new Error(`Aucun produit ELIOS trouvé pour ${ref}.`);

  const productMessage = messages.find(message =>
    buttonsOf(message).some(button => String(button?.text || '').toUpperCase().includes(ref.toUpperCase()))
  ) || messages.find(message => buttonsOf(message).length > 0);

  if (!productMessage) throw new Error(`Aucun bouton produit reçu pour ${ref}.`);

  const matchingButton = buttonsOf(productMessage).find(button => String(button?.text || '').toUpperCase().includes(ref.toUpperCase()));
  if (matchingButton) {
    await productMessage.click({ text: text => String(text || '').toUpperCase().includes(ref.toUpperCase()) });
  } else {
    await productMessage.click({ i: 0 });
  }

  const afterProductId = maxMessageId(messages, messageId(productMessage));
  await wait(1600);
  messages = await recentMessages(client, afterProductId, 14);

  const availabilityMessage = messages.find(message =>
    buttonsOf(message).some(button => /^Disponibilit/i.test(String(button?.text || '')))
  );
  if (!availabilityMessage) throw new Error(`Bouton Disponibilità introuvable pour ${ref}.`);

  const beforeAvailabilityId = maxMessageId(messages, messageId(availabilityMessage));
  await availabilityMessage.click({ text: text => /^Disponibilit/i.test(String(text || '')) });
  await wait(1900);

  messages = await recentMessages(client, beforeAvailabilityId, 16);
  const parsed = parseAvailability(messages);
  if (parsed.stock === null) throw new Error(`Stock ELIOS non détecté pour ${ref}.`);

  return {
    ref,
    searchRef: ref,
    description: parsed.description,
    stock: parsed.stock,
    production: parsed.production,
    verified: true
  };
}

async function fetchStock(ref) {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = String(process.env.TELEGRAM_API_HASH || '').trim();
  const session = String(process.env.TELEGRAM_SESSION || '').trim();

  if (!Number.isInteger(apiId) || !apiHash || !session) {
    throw new Error('Secrets Telegram absents ou invalides.');
  }

  const { TelegramClient } = await import('teleproto');
  const { StringSession } = await import('teleproto/sessions/index.js');
  const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 5 });

  try {
    await client.connect();
    return await queryReference(client, ref);
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
  if (req.method !== 'GET') return res.status(405).json({ success:false, error:'Méthode non autorisée.' });

  const collection = String(req.query.collection || 'ROMA').trim().toUpperCase();
  const ref = String(req.query.ref || '').trim().toUpperCase();
  if (collection !== 'ROMA') return res.status(400).json({ success:false, error:'Test disponible uniquement pour ROMA.' });
  if (!ref) return res.status(400).json({ success:false, error:'Référence ELIOS manquante.' });
  if (!ROMA_REFS.has(ref)) return res.status(400).json({ success:false, error:'Référence non autorisée pour le test ROMA.' });

  try {
    const cached = cache.get(ref);
    if (cached && Date.now() - cached.time < CACHE_MS) {
      return res.status(200).json({ success:true, cached:true, collection:'ROMA', product:cached.product, updatedAt:cached.updatedAt, source:'EliosBOT / Telegram' });
    }

    const product = await fetchStock(ref);
    const updatedAt = new Date().toISOString();
    cache.set(ref, { time:Date.now(), product, updatedAt });
    return res.status(200).json({ success:true, cached:false, collection:'ROMA', product, updatedAt, source:'EliosBOT / Telegram' });
  } catch (error) {
    console.error('ELIOS STOCK', ref, error);
    return res.status(502).json({ success:false, error:'Impossible d’interroger EliosBOT pour cette référence pour le moment.' });
  }
});
