const { onRequest } = require('firebase-functions/v2/https');
const { keyOf, collectionExists, allowedRef, publicCollection } = require('./elios-catalog');

const BOT = '@EliosCeramicaBot';
const ALLOWED_ORIGINS = new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr']);
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function applyCors(req,res){const origin=String(req.headers.origin||'');res.set('Access-Control-Allow-Origin',ALLOWED_ORIGINS.has(origin)?origin:'https://leroyfactory.fr');res.set('Vary','Origin');res.set('Access-Control-Allow-Headers','Content-Type');res.set('Access-Control-Allow-Methods','GET, OPTIONS');res.set('Cache-Control','no-store');if(req.method==='OPTIONS'){res.status(204).send('');return true}return false}
function textOf(message){return String(message?.message||'')}
function parseNumber(raw){const value=Number(String(raw||'').replace(',','.'));return Number.isFinite(value)?value:null}
function normalizeUnit(raw){const unit=String(raw||'').trim().toUpperCase().replace(/[^A-Z0-9²]/g,'');if(unit==='M2')return 'MQ';return unit||''}
function findAvailability(text){return text.match(/Totale\s+Disponibilit[aà]:\s*([\d.,]+)\s*([A-Z0-9²]{1,8})/i)||text.match(/Disponibilit[aà]:\s*([\d.,]+)\s*([A-Z0-9²]{1,8})/i)}
function findProduction(text){return text.match(/Totale\s+Disp\.\s+su\s+piano\s+produzione:\s*([\d.,]+)\s*([A-Z0-9²]{1,8})/i)}
function parseAvailability(messages){const text=messages.map(textOf).filter(Boolean).join('\n');const total=findAvailability(text);const production=findProduction(text);const description=text.match(/Descrizione:\s*([^\n]+)/i);return {stock:total?parseNumber(total[1]):null,stockUnit:total?normalizeUnit(total[2]):'',production:production?parseNumber(production[1]):0,productionUnit:production?normalizeUnit(production[2]):(total?normalizeUnit(total[2]):''),description:description?String(description[1]).trim():''}}
function messageId(message){const value=Number(message?.id||0);return Number.isFinite(value)?value:0}
function maxMessageId(messages,fallback=0){return messages.reduce((max,message)=>Math.max(max,messageId(message)),fallback)}
async function recentMessages(client,afterId=0,limit=14){const out=[];for await(const message of client.iterMessages(BOT,{limit}))if(messageId(message)>afterId)out.push(message);return out}
function buttonsOf(message){return Array.isArray(message?.buttons)?message.buttons.flat().filter(Boolean):[]}
function safeFailureReason(error){const message=String(error?.message||'');if(/Aucun produit ELIOS trouvé/i.test(message))return 'product_not_found';if(/Aucun bouton produit reçu/i.test(message))return 'product_button_missing';if(/Bouton Disponibilit/i.test(message))return 'availability_button_missing';if(/Stock ELIOS non détecté/i.test(message))return 'stock_not_parsed';if(/Secrets Telegram/i.test(message))return 'service_configuration';return 'upstream_error'}
async function queryReference(client,ref){
  const sent=await client.sendMessage(BOT,{message:ref});const sentId=messageId(sent);await wait(1800);
  let messages=await recentMessages(client,sentId,14);
  if(messages.some(message=>/Nessun\s+Prodotto\s+Trovato/i.test(textOf(message))))throw new Error(`Aucun produit ELIOS trouvé pour ${ref}.`);
  const productMessage=messages.find(message=>buttonsOf(message).some(button=>String(button?.text||'').toUpperCase().includes(ref.toUpperCase())))||messages.find(message=>buttonsOf(message).length>0);
  if(!productMessage)throw new Error(`Aucun bouton produit reçu pour ${ref}.`);
  const matchingButton=buttonsOf(productMessage).find(button=>String(button?.text||'').toUpperCase().includes(ref.toUpperCase()));
  if(matchingButton)await productMessage.click({text:text=>String(text||'').toUpperCase().includes(ref.toUpperCase())});else await productMessage.click({i:0});
  const afterProductId=maxMessageId(messages,messageId(productMessage));await wait(1600);messages=await recentMessages(client,afterProductId,14);
  const availabilityMessage=messages.find(message=>buttonsOf(message).some(button=>/^Disponibilit/i.test(String(button?.text||''))));
  if(!availabilityMessage)throw new Error(`Bouton Disponibilità introuvable pour ${ref}.`);
  const beforeAvailabilityId=maxMessageId(messages,messageId(availabilityMessage));await availabilityMessage.click({text:text=>/^Disponibilit/i.test(String(text||''))});await wait(1900);
  messages=await recentMessages(client,beforeAvailabilityId,16);const parsed=parseAvailability(messages);if(parsed.stock===null)throw new Error(`Stock ELIOS non détecté pour ${ref}.`);
  return {ref,searchRef:ref,description:parsed.description,stock:parsed.stock,stockUnit:parsed.stockUnit,production:parsed.production,productionUnit:parsed.productionUnit,verified:true};
}
async function fetchStock(ref){const apiId=Number(process.env.TELEGRAM_API_ID);const apiHash=String(process.env.TELEGRAM_API_HASH||'').trim();const session=String(process.env.TELEGRAM_SESSION||'').trim();if(!Number.isInteger(apiId)||!apiHash||!session)throw new Error('Secrets Telegram absents ou invalides.');const {TelegramClient}=await import('teleproto');const {StringSession}=await import('teleproto/sessions/index.js');const client=new TelegramClient(new StringSession(session),apiId,apiHash,{connectionRetries:5});try{await client.connect();return await queryReference(client,ref)}finally{try{await client.disconnect()}catch(_){}}}
function displayName(key){if(key==='roma')return 'Roma';return publicCollection(key)?.collection||key.toUpperCase()}

exports.eliosStock=onRequest({region:'us-central1',timeoutSeconds:60,memory:'512MiB',maxInstances:1,concurrency:1,secrets:['TELEGRAM_API_ID','TELEGRAM_API_HASH','TELEGRAM_SESSION']},async(req,res)=>{
  if(applyCors(req,res))return;if(req.method!=='GET')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
  const collection=keyOf(req.query.collection||'roma');const ref=String(req.query.ref||'').trim().toUpperCase();
  if(!collectionExists(collection))return res.status(400).json({success:false,error:'Collection ELIOS non activée.'});
  if(!ref)return res.status(400).json({success:false,error:'Référence ELIOS manquante.'});
  if(!allowedRef(collection,ref))return res.status(400).json({success:false,error:'Référence non autorisée pour cette collection.'});
  const cacheKey=`${collection}:${ref}`;
  try{const cached=cache.get(cacheKey);if(cached&&Date.now()-cached.time<CACHE_MS)return res.status(200).json({success:true,cached:true,collection:displayName(collection),product:cached.product,updatedAt:cached.updatedAt});const product=await fetchStock(ref);const updatedAt=new Date().toISOString();cache.set(cacheKey,{time:Date.now(),product,updatedAt});return res.status(200).json({success:true,cached:false,collection:displayName(collection),product,updatedAt})}catch(error){const reason=safeFailureReason(error);console.error('ELIOS STOCK',collection,ref,reason,error);return res.status(502).json({success:false,error:'Impossible de récupérer le stock ELIOS pour cette référence pour le moment.',reason})}
});
