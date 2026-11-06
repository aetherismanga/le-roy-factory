import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compressModel } from './compress-photo-studio-model.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DIRECTORY = resolve(ROOT, 'assets/vendor/lrf-photo-studio');
const APPROVED_HOSTS = new Set(['huggingface.co', 'cdn.jsdelivr.net', 'raw.githubusercontent.com']);

export function verifyBytes(bytes, entry) {
  return bytes.byteLength === entry.bytes
    && createHash('sha256').update(bytes).digest('hex') === entry.sha256;
}

/** Downloads public model assets at build time; never called by an upload/API. */
export async function fetchPhotoStudioModel({ directory = DEFAULT_DIRECTORY, verifyOnly = false, manifest, fetchImpl = fetch } = {}) {
  const vendorDirectory = resolve(directory);
  manifest ??= JSON.parse(await readFile(resolve(DEFAULT_DIRECTORY, 'manifest.json'), 'utf8'));
  if (manifest.schema !== 'lrf-photo-studio-model-assets' || !Array.isArray(manifest.files) || !manifest.files.length) {
    throw new Error('Invalid Photo Studio asset manifest.');
  }
  const results = [];
  for (const entry of manifest.files) {
    const url = new URL(entry.source);
    if (url.protocol !== 'https:' || !APPROVED_HOSTS.has(url.hostname) || url.username || url.password
      || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new Error('Unapproved Photo Studio model asset.');
    }
    if (entry.transform && (entry.transform !== 'weight-only-q8-v1'
      || !Number.isSafeInteger(entry.sourceBytes) || !/^[a-f0-9]{64}$/.test(entry.sourceSha256))) {
      throw new Error('Unapproved Photo Studio model transformation.');
    }
    const destination = resolve(vendorDirectory, entry.path);
    if (isAbsolute(entry.path) || !destination.startsWith(vendorDirectory + sep)) throw new Error('Invalid model asset path.');
    let present = false;
    try { present = verifyBytes(await readFile(destination), entry); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (present) { results.push({ path: entry.path, bytes: entry.bytes, status: 'verified' }); continue; }
    if (verifyOnly) throw new Error(`Missing or modified Photo Studio asset: ${entry.path}`);
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(120000), redirect: 'follow' });
    if (!response.ok) throw new Error(`Unable to fetch Photo Studio asset ${entry.path}: HTTP ${response.status}`);
    let bytes = new Uint8Array(await response.arrayBuffer());
    if (entry.transform) {
      if (!verifyBytes(bytes, { bytes: entry.sourceBytes, sha256: entry.sourceSha256 })) throw new Error('Photo Studio original model hash/size mismatch.');
      bytes = compressModel(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)).bytes;
    }
    if (!verifyBytes(bytes, entry)) throw new Error(`Photo Studio asset hash/size mismatch: ${entry.path}`);
    await mkdir(dirname(destination), { recursive: true });
    const temporary = destination + `.download-${process.pid}`;
    try { await writeFile(temporary, bytes, { flag: 'wx' }); await rename(temporary, destination); }
    finally { await rm(temporary, { force: true }); }
    results.push({ path: entry.path, bytes: entry.bytes, status: 'downloaded-and-verified' });
  }
  return { schema: manifest.schema, revision: manifest.revision, totalBytes: results.reduce((sum, asset) => sum + asset.bytes, 0), files: results };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directoryIndex = process.argv.indexOf('--directory');
  const directory = directoryIndex >= 0 ? process.argv[directoryIndex + 1] : undefined;
  if (directoryIndex >= 0 && !directory) throw new Error('--directory requires a path.');
  const result = await fetchPhotoStudioModel({ directory, verifyOnly: process.argv.includes('--verify-only') });
  console.log(JSON.stringify(result));
}
