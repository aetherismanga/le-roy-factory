'use strict';

const admin = require('firebase-admin');
const {PDF_PATH, RATE_PATH, REVISION, readEliosPdf, readEliosRelease} = require('../elios-tariff-release.cjs');

const bucketName = 'le-roy-factory.firebasestorage.app';

async function prepare() {
  admin.initializeApp({projectId:'le-roy-factory', storageBucket:bucketName});
  const bucket = admin.storage().bucket();
  const [policy] = await bucket.iam.getPolicy({requestedPolicyVersion:3});
  if (policy.bindings?.some(binding => binding.members?.some(member => ['allUsers','allAuthenticatedUsers'].includes(member)))) {
    throw Error('Elios release requires private bucket IAM');
  }
  for (const path of [PDF_PATH, RATE_PATH]) {
    const file = bucket.file(path);
    const [current] = await file.getMetadata();
    if (current.metadata?.firebaseStorageDownloadTokens) {
      await bucket.file(path, {generation:current.generation}).setMetadata({
        metadata:{firebaseStorageDownloadTokens:null},
        cacheControl:'private, no-store, max-age=0'
      }, {preconditionOpts:{ifMetagenerationMatch:current.metageneration}});
    }
    const [latest] = await file.getMetadata();
    if (latest.metadata?.firebaseStorageDownloadTokens || (await file.isPublic())[0]) throw Error('Elios object must be private');
    const response = await fetch('https://firebasestorage.googleapis.com/v0/b/'+bucketName+'/o/'+encodeURIComponent(path)+'?alt=media',{signal:AbortSignal.timeout(20000)});
    await response.body?.cancel();
    if (![401,403].includes(response.status)) throw Error('Anonymous Elios storage must be denied');
  }
  const [rates,pdf] = await Promise.all([readEliosRelease(bucket),readEliosPdf(bucket)]);
  console.log(JSON.stringify({revision:REVISION,references:Object.keys(rates.purchase).length,pdfBytes:pdf.length,anonymousAccessDenied:true}));
}

prepare().catch(error => {
  console.error('Private Elios release verification failed ('+(error.code||error.name)+').');
  process.exitCode=1;
});
