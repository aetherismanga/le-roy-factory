'use strict';
const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {getAgentFromRequest} = require('./auth');
const {readEliosRelease}=require('./elios-tariff-release.cjs');
const {storagePath, createPurchasePricesHandler} = require('./configurator-purchase-prices-core');

async function readPrices(variant) {
  const file = admin.storage().bucket('le-roy-factory.firebasestorage.app').file(storagePath(variant));
  const [metadata] = await file.getMetadata();
  if (Number(metadata.size) > 2 * 1024 * 1024 || metadata.metadata?.firebaseStorageDownloadTokens) throw new Error('Invalid private catalogue metadata');
  const [bytes] = await file.download({validation: 'crc32c'});
  const original=JSON.parse(bytes.toString('utf8'));
  const {purchase}=await readEliosRelease(admin.storage().bucket());
  for(const field of ['products','plinths']){
    const retained=original[field].filter(row=>!row.key.startsWith('ELIOS|'));
    const revised=Object.entries(purchase).filter(([key])=>key.includes('|plinth|')===(field==='plinths'));
    original[field]=[...retained,...revised.map(([key,row])=>({key,purchaseHT:row.purchaseHT,purchasePaletteHT:null}))];
  }
  return original;
}

exports.getConfiguratorPurchasePrices = onRequest({region: 'us-central1', timeoutSeconds: 30, memory: '256MiB'}, createPurchasePricesHandler({getAgentFromRequest, readPrices}));
