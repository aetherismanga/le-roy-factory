'use strict';
// Reads historical Git objects directly into memory. No purchase-price file is
// written to the checkout, a public directory, an artifact or the action logs.
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const {createRequire} = require('node:module');
const path = require('node:path');
const {priceMap, storagePath} = require('../functions/configurator-purchase-prices-core');
const ROOT = path.resolve(__dirname, '..');
const PROJECT = 'le-roy-factory';
const BUCKET = 'le-roy-factory.firebasestorage.app';
let migrationStage = 'initialize';
const SOURCES = Object.freeze([
  {variant: 'plan-pose', commit: '3dfd5c30b9ffb3abfb6aecc18793e3bf6f1d3a27', path: 'assets/js/lrf-plan-pose/catalogue.json'},
  {variant: 'randal-general', commit: '3dfd5c30b9ffb3abfb6aecc18793e3bf6f1d3a27', path: 'randal-general/src/commercial-surfaces.json'},
  {variant: 'studio-one', commit: '671bf8ecbc51e9d6da3ba288aa1b3c258a6cc08b', path: 'src/commercial-surfaces.json'}
]);

function extractPrices(catalogue, variant, sourceCommit) {
  const rows = values => Object.entries(priceMap(values)).map(([key, prices]) => ({key, ...prices}));
  const products = rows(catalogue.products), plinths = rows(catalogue.plinths);
  if (!products.length || !products.some(row => typeof row.purchaseHT === 'number')) throw new Error('Historical purchase catalogue is empty');
  return {version: 1, variant, sourceCommit, products, plinths};
}

async function migrate() {
  const requireFunctions = createRequire(path.join(ROOT, 'functions/package.json'));
  const admin = requireFunctions('firebase-admin');
  admin.initializeApp({credential: admin.credential.applicationDefault(), projectId: PROJECT, storageBucket: BUCKET});
  const bucket = admin.storage().bucket(BUCKET);
  // A private Firebase rule cannot protect an object exposed through bucket IAM.
  // Stop before writing if this bucket grants either public principal any role.
  migrationStage = 'check-bucket-iam';
  const [policy] = await bucket.iam.getPolicy({requestedPolicyVersion: 3});
  if ((policy.bindings || []).some(binding => (binding.members || []).some(member => ['allUsers', 'allAuthenticatedUsers'].includes(member)))) throw new Error('Bucket IAM must be private before migration');
  migrationStage = 'check-bucket-configuration';
  const [bucketMetadata] = await bucket.getMetadata();
  const uniform = bucketMetadata.iamConfiguration?.uniformBucketLevelAccess?.enabled === true;
  const results = [];
  for (const source of SOURCES) {
    migrationStage = source.variant + ':read-historical-source';
    const raw = execFileSync('git', ['show', source.commit + ':' + source.path], {cwd: ROOT, maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
    const payload = extractPrices(JSON.parse(raw.toString('utf8')), source.variant, source.commit);
    const bytes = Buffer.from(JSON.stringify(payload));
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const file = bucket.file(storagePath(source.variant));
    migrationStage = source.variant + ':check-existing-private-object';
    const [exists] = await file.exists();
    if (exists) {
      const [metadata] = await file.getMetadata();
      if (metadata.metadata?.firebaseStorageDownloadTokens) throw new Error('Existing purchase object has a download token');
      const [old] = await file.download();
      if (createHash('sha256').update(old).digest('hex') !== checksum) throw new Error('Existing private purchase catalogue differs; preserve it for review');
    } else {
      migrationStage = source.variant + ':save-private-object';
      await file.save(bytes, {
        resumable: false,
        validation: 'crc32c',
        preconditionOpts: {ifGenerationMatch: 0},
        ...(uniform ? {} : {predefinedAcl: 'private'}),
        metadata: {
          contentType: 'application/json; charset=utf-8',
          cacheControl: 'private, no-store, max-age=0',
          metadata: {sourceCommit: source.commit, sha256: checksum}
        }
      });
    }
    migrationStage = source.variant + ':verify-anonymous-storage-denied';
    const [publicObject] = await file.isPublic();
    if (publicObject) throw new Error('Purchase object must not be public');
    const url = 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/' + encodeURIComponent(file.name) + '?alt=media';
    const anonymous = await fetch(url, {headers: {Range: 'bytes=0-0'}, signal: AbortSignal.timeout(20000)});
    await anonymous.body?.cancel();
    if (![401, 403].includes(anonymous.status)) throw new Error('Firebase anonymous access must be rejected');
    results.push({variant: source.variant, products: payload.products.length, plinths: payload.plinths.length, sourceCommit: source.commit, anonymousAccessRejected: true});
  }
  console.log(JSON.stringify({success: true, privateCatalogues: results}));
}

if (require.main === module) migrate().catch(error => {
  // Details may contain request credentials or catalogue content. Keep logs bounded.
  const code = /^[A-Z0-9_-]{1,50}$/i.test(String(error?.code || '')) ? String(error.code) : 'validation-failed';
  console.error('Private purchase catalogue migration failed at ' + migrationStage + ' (' + code + '). No existing catalogue was overwritten.');
  process.exitCode = 1;
});
module.exports = {SOURCES, extractPrices};
