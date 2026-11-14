import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const fingerprint = process.argv[2]?.toUpperCase();
const output = resolve(process.argv[3] || 'release-output/domain-association/assetlinks.json');
if (!/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(fingerprint || '')) throw new Error('Supply the SHA-256 certificate fingerprint from Play App Signing (colon-separated). Do not confuse it with the upload key.');
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify([{relation:['delegate_permission/common.handle_all_urls'],target:{namespace:'android_app',package_name:'fr.leroyfactory.crm',sha256_cert_fingerprints:[fingerprint]}}],null,2)+'\n', {flag:'wx'});
console.log('Prepared locally; nothing deployed: '+output);
