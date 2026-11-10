import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { randomBytes, createCipheriv, publicEncrypt } from 'node:crypto';
import { reportPartners } from '../assets/js/crm-report-partners.mjs';
const require = createRequire(import.meta.url);
const admin = require('../functions/node_modules/firebase-admin');
const { GoogleAuth } = require('../functions/node_modules/google-auth-library');
const client = await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
const { data: database } = await client.request({ url: 'https://firestore.googleapis.com/v1/projects/le-roy-factory/databases/(default)' });
if (database.type !== 'FIRESTORE_NATIVE' || database.databaseEdition === 'ENTERPRISE') throw Error('Unexpected CRM database edition');
console.log(JSON.stringify({database:database.name,type:database.type,edition:database.databaseEdition||'STANDARD_LEGACY'}));
admin.initializeApp({projectId:'le-roy-factory'});
const db = admin.firestore();
const reports = [];
for (const collection of ['clients','comptes_rendus']) {
  const snapshot = await db.collection(collection).get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (collection === 'clients') {
      for (const field of ['comptes_rendus','comptesRendus']) {
        for (const [index,raw] of (Array.isArray(data[field]) ? data[field] : []).entries()) {
          if (raw && typeof raw==='object' && reportPartners(raw).length>1) reports.push({path:doc.ref.path,societe:data.societe||'',field,index,raw});
        }
      }
    } else if (reportPartners(data).length>1) reports.push({path:doc.ref.path,raw:data});
  }
}
const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
const encrypted=Buffer.concat([cipher.update(JSON.stringify({reports})),cipher.final()]);
const payload=Buffer.from(JSON.stringify({key:publicEncrypt({key:readFileSync(new URL('./crm-report-audit-public.pem',import.meta.url)),oaepHash:'sha256'},key).toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')})).toString('base64');
for(let i=0;i<payload.length;i+=3500)console.log('CRM_REPORT_AUDIT_CHUNK '+(i/3500)+' '+payload.slice(i,i+3500));
console.log('CRM_REPORT_AUDIT_SUMMARY '+JSON.stringify({multiFactoryEntries:reports.length,documents:new Set(reports.map(r=>r.path)).size}));
