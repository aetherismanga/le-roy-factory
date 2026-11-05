// One scoped, idempotent CRM data migration. No CRM rows or backups go to GitHub logs/artifacts.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {addressKey,normalizeAddress,department,geocodeCandidate,communeCandidate,validateStoredLocation} from '../../assets/js/crm-map-location.mjs';
import {active,norm,clean,matchingBusinesses,unvisitedPayload} from './crm-map-import-core.mjs';
const require=createRequire(import.meta.url), admin=require('firebase-admin');
admin.initializeApp({projectId:'le-roy-factory'});
const db=admin.firestore(), runId='map-repair-20261105-v1';
const directory=JSON.parse(readFileSync(new URL('../data/crm-prospect-directory-20261105.json',import.meta.url),'utf8'));
const corrections=JSON.parse(readFileSync(new URL('../data/crm-address-corrections-20261105.json',import.meta.url),'utf8'));
const prospectCollection='crm_map_prospects';
const report={runId,existing:0,correctedAddresses:0,geocoded:0,approximate:0,pending:0,matchedExisting:0,duplicateCandidates:0,imported:0,importPending:0,concurrentSkipped:0,verifiedNoCode:0,byDepartment:{}};
let lastRequest=0;
async function search(c,query) {
  const wait=Math.max(0,1050-(Date.now()-lastRequest));
  if(wait)await new Promise(r=>setTimeout(r,wait));lastRequest=Date.now();
  const u=new URL('https://data.geopf.fr/geocodage/search');
  u.searchParams.set('q',query);u.searchParams.set('postcode',normalizeAddress(c).cp);u.searchParams.set('limit','5');u.searchParams.set('index','address');
  const response=await fetch(u,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('IGN HTTP '+response.status);
  return (await response.json()).features||[];
}
async function locate(c) {
  const a=normalizeAddress(c);
  if(!/^\d{5}$/.test(a.cp)||!a.ville)return null;
  try {
    let features=await search(c,`${a.adresse} ${a.cp} ${a.ville}`.trim());
    let result=features.map(f=>geocodeCandidate(f,c)).find(Boolean);
    if(!result && a.adresse){
      features=await search(c,`${a.cp} ${a.ville}`);
      result=features.map(f=>geocodeCandidate(f,c)).find(p=>p?.precision==='municipality');
    }
    if(result)return result;
  } catch { /* Resolve only the exact official commune below. */ }
  try {
    const u=new URL('https://geo.api.gouv.fr/communes');u.searchParams.set('codePostal',a.cp);
    u.searchParams.set('fields','nom,code,centre,codesPostaux,codeDepartement');
    const response=await fetch(u,{signal:AbortSignal.timeout(15000)});
    if(response.ok)return (await response.json()).map(commune=>communeCandidate(commune,c)).find(Boolean)||null;
  } catch { /* Leave the unverified address in the private review list. */ }
  return null;
}
function positionPatch(c,position) {
  const now=new Date().toISOString();
  if(!position)return {geoStatus:'needs_review',geoValidation:{version:2,addressKey:addressKey(c),checkedAt:now,reason:'Adresse et commune à vérifier'}};
  return {lat:position.lat,lon:position.lon,lng:position.lon,latitude:position.lat,longitude:position.lon,
    departement:position.department,geoStatus:'validated',geoValidation:{...position,version:2,addressKey:addressKey(c),checkedAt:now}};
}
const snapshot=await db.collection('clients').get();
let rows=snapshot.docs.map(d=>({...d.data(),id:d.id}));
for(const row of rows.filter(active)) {
  report.existing++;
  const originalKey=addressKey(row), a=normalizeAddress(row), patch={};
  const correction=corrections.find(c=>c.aliases.some(alias=>norm(alias)===norm(row.societe))
    && rows.filter(active).filter(r=>c.aliases.some(alias=>norm(alias)===norm(r.societe))).length===1);
  if(correction) {
    for(const key of ['adresse','codePostal','ville','departement'])patch[key]=correction[key];
    patch.geoAddressSources=[...new Set([...(row.geoAddressSources||[]),correction.source])];
  } else {
    // Recover missing localities only from a verified directory entry matched by
    // phone/address and without a conflicting municipality; names alone do not qualify.
    const matches=directory.records.filter(c=>matchingBusinesses(c,[row]).length);
    if(matches.length===1 && (!a.cp||!a.ville)) {
      const c=matches[0];
      if(!a.cp)patch.codePostal=c.codePostal;
      if(!a.ville)patch.ville=c.ville;
      if(!a.adresse)patch.adresse=c.adresse;
    }
    if(a.cp && a.cp!==clean(row.codePostal))patch.codePostal=a.cp;
    if(a.ville && a.ville!==clean(row.ville))patch.ville=a.ville;
  }
  const proposed={...row,...patch};
  if(validateStoredLocation(proposed))continue;
  const position=await locate(proposed);
  Object.assign(patch,positionPatch(proposed,position));
  const changed=await db.runTransaction(async tx=>{
    const ref=db.collection('clients').doc(row.id),fresh=await tx.get(ref);
    if(!fresh.exists||!active({...fresh.data(),id:row.id})||addressKey(fresh.data())!==originalKey)return false;
    const backup=db.collection('crm_map_repairs').doc(runId).collection('before').doc(row.id);
    const prior=await tx.get(backup);
    if(!prior.exists)tx.create(backup,{clientId:row.id,before:fresh.data(),savedAt:new Date().toISOString()});
    tx.update(ref,patch);return true;
  });
  if(!changed){report.concurrentSkipped++;continue;}
  Object.assign(row,patch);
  if(correction)report.correctedAddresses++;
  if(position){report.geocoded++;if(position.precision==='municipality')report.approximate++;}
  else report.pending++;
  if(report.existing%25===0)console.log('CRM_MAP_REPAIR_PROGRESS '+JSON.stringify({processed:report.existing,geocoded:report.geocoded,pending:report.pending}));
}
// Refresh after the repair and immediately before every create. Imports never
// overwrite an existing client's status, codes, visits, commercial data or files.
rows=(await db.collection('clients').get()).docs.map(d=>({...d.data(),id:d.id}));
rows.push(...(await db.collection(prospectCollection).get()).docs.map(d=>({...d.data(),id:d.id})));
const importedIds=[];
for(const candidate of directory.records) {
  const matches=matchingBusinesses(candidate,rows);
  if(matches.length){report.matchedExisting++;continue;}
  const sameSource=rows.some(r=>r.prospectionIdentity===addressKey(candidate)+'|'+norm(candidate.societe));
  if(sameSource){report.duplicateCandidates++;continue;}
  const hash=createHash('sha256').update(addressKey(candidate)+'|'+norm(candidate.societe)).digest('hex').slice(0,32);
  // A separate private collection keeps discovery prospects outside every
  // historical client-code allocator, including tabs that have not reloaded.
  const ref=db.collection(prospectCollection).doc('prospect_map_'+hash);
  const formNorm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const identityKey=createHash('sha256').update([candidate.societe,candidate.codePostal,candidate.adresse||candidate.ville].map(formNorm).join('|')).digest('hex');
  const identityRef=db.collection('crmMapProspectIdentities').doc(identityKey);
  const position=candidate.verifiedLocation?.addressKey===addressKey(candidate)?candidate.verifiedLocation:await locate(candidate);
  const now=new Date().toISOString(), payload={...unvisitedPayload(candidate,now),...positionPatch(candidate,position),prospectionIdentity:addressKey(candidate)+'|'+norm(candidate.societe)};
  const created=await db.runTransaction(async tx=>{
    const [existing,identity,phoneMatches]=await Promise.all([
      tx.get(ref),tx.get(identityRef),tx.get(db.collection('clients').where('telephone','==',candidate.telephone))
    ]);
    if(existing.exists||identity.exists||matchingBusinesses(candidate,phoneMatches.docs.map(d=>({...d.data(),id:d.id}))).length)return false;
    tx.create(ref,payload);
    tx.create(identityRef,{clientId:ref.id,createdAt:now});return true;
  });
  if(!created){report.matchedExisting++;continue;}
  rows.push({...payload,id:ref.id});importedIds.push(ref.id);report.imported++;
  if(!position)report.importPending++;
  const dep=department(candidate.codePostal,candidate.ville);
  report.byDepartment[dep]=(report.byDepartment[dep]||0)+1;
}
for(const id of importedIds) {
  const data=(await db.collection(prospectCollection).doc(id).get()).data();
  if([data.codeClient,data.codeLRF,data.codeLrf,data.code_lrf,...(data.codesLRF||[])].some(v=>clean(v)))throw Error('Imported prospect received an unexpected code');
  if(data.type!=='prospect'||data.visiteStatus!=='non_visite'||data.autoAssignLrfCode!==false)throw Error('Imported prospect state mismatch');
  report.verifiedNoCode++;
}
const finalRows=(await db.collection('clients').get()).docs.map(d=>({...d.data(),id:d.id})).filter(active);
finalRows.push(...(await db.collection(prospectCollection).get()).docs.map(d=>({...d.data(),id:d.id})).filter(active));
report.finalActive=finalRows.length;report.finalLocated=finalRows.filter(validateStoredLocation).length;
report.finalPending=finalRows.length-report.finalLocated;
await db.collection('crm_map_repairs').doc(runId).set({...report,completedAt:new Date().toISOString()},{merge:true});
console.log('CRM_MAP_REPAIR_COUNTS '+JSON.stringify(report));
