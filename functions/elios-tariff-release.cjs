'use strict';

const { createHash } = require('node:crypto');

const REVISION = '2026-10-20';
const PREFIX = 'private-tariffs/elios/';
const PDF_NAME = 'ELIOS-Tarifs-nets-2026-10-20.pdf';
const PDF_PATH = PREFIX + PDF_NAME;
const RATE_PATH = PREFIX + 'elios-rates-2026-10-20.json';
const RATE_SHA256 = '5002189a20075fa5b073a758f5c7725904006a38dd7fcc09c7c31b2917235cd4';
let cache;
let pending;

async function readPrivateObject(bucket, path, maxBytes) {
  const file = bucket.file(path);
  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size);
  if (!(size > 0 && size <= maxBytes) || metadata.metadata?.firebaseStorageDownloadTokens) {
    throw Error('Invalid private Elios release object');
  }
  const [bytes] = await bucket.file(path, {generation: metadata.generation}).download({validation:'crc32c'});
  if (bytes.length !== size) throw Error('Invalid private Elios release length');
  return bytes;
}

async function readEliosRelease(bucket) {
  if (cache && cache.until > Date.now()) return cache.data;
  if (!pending) {
    pending = (async () => {
      const bytes = await readPrivateObject(bucket, RATE_PATH, 1024 * 1024);
      if (createHash('sha256').update(bytes).digest('hex') !== RATE_SHA256) throw Error('Invalid Elios rate data checksum');
      const data = JSON.parse(bytes.toString('utf8'));
      if (data.revision !== REVISION || !data.elios?.['azulimood|5x15|standard'] ||
          !data.eliosExact || !data.purchase) throw Error('Invalid Elios tariff release');
      cache = {data, until: Date.now() + 60000};
      return data;
    })().finally(() => { pending = null; });
  }
  return pending;
}

async function readEliosPdf(bucket) {
  const bytes = await readPrivateObject(bucket, PDF_PATH, 2 * 1024 * 1024);
  const release = await readEliosRelease(bucket);
  if (bytes.subarray(0, 5).toString() !== '%PDF-' ||
      createHash('sha256').update(bytes).digest('hex') !== release.pdfSha256) {
    throw Error('Invalid Elios PDF');
  }
  return bytes;
}

module.exports = {REVISION, PDF_NAME, PDF_PATH, RATE_PATH, readEliosRelease, readEliosPdf};
