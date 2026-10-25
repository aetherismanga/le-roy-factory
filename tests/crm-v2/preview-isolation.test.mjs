import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildPreview,transformSource,previewCsp} from '../../scripts/build-crm-preview.mjs';
import {createClientSaver} from '../../assets/js/crm-client-save-core.mjs';
import * as sdk from '../../assets/js/crm-preview-sdk.mjs';

test('local edit keeps exact document ID, LRF code, associated partners and histories',async()=>{
  const target=sdk.doc(sdk.db,'clients','demo-client-montpellier');
  const before=(await sdk.getDoc(target)).data();
  await sdk.runTransaction(sdk.db,async tx=>{
    const current=(await tx.get(target)).data();
    tx.update(target,{telephone:'0400000999',...{partenaires:current.partenaires}});
  });
  const after=(await sdk.getDoc(target)).data();
  assert.equal(after.telephone,'0400000999');
  assert.equal(after.codeClient,before.codeClient);
  assert.deepEqual(after.partenaires,before.partenaires);
  assert.deepEqual(after.comptes_rendus,before.comptes_rendus);
  assert.equal((await sdk.getDoc(target)).id,'demo-client-montpellier');
});

test('failed multi-document transaction leaves all fake records intact',async()=>{
  const target=sdk.doc(sdk.db,'clients','demo-client-nimes');
  const before=(await sdk.getDoc(target)).data();
  await assert.rejects(sdk.runTransaction(sdk.db,async tx=>{
    tx.update(target,{societe:'must not commit'});
    tx.update(sdk.doc(sdk.db,'clients','missing-fictional-id'),{telephone:'00'});
  }));
  assert.deepEqual((await sdk.getDoc(target)).data(),before);
});

test('local writes update filtered snapshots and remain confined to fixtures',async()=>{
  const q=sdk.query(sdk.collection(sdk.db,'clients'),sdk.where('type','==','prospect'));
  const rows=await sdk.getDocs(q);
  assert.ok(rows.size>=2);assert.ok(rows.docs.every(x=>x.data().type==='prospect'));
  const target=sdk.doc(sdk.db,'clients','demo-prospect-nice');
  await sdk.updateDoc(target,{comptes_rendus:sdk.arrayUnion({date:'2026-10-25',text:'Compte-rendu de test'})});
  assert.equal((await sdk.getDoc(target)).data().comptes_rendus.at(-1).text,'Compte-rendu de test');
  assert.ok(sdk.previewRuntime.writes.every(x=>!x.path.includes('http')));
});

test('demo accounts have independent stable fictitious UIDs and no usable token',async()=>{
  const jerome=sdk.selectPreviewActor('jerome');
  assert.equal(sdk.getAgentProfile().name,'Jérôme');
  const coryne=sdk.selectPreviewActor('coryne');
  assert.equal(sdk.getAgentProfile().name,'Coryne');
  assert.notEqual(jerome.uid,coryne.uid);
  await assert.rejects(coryne.getIdToken(),/aucun jeton réel/);
  assert.equal(sdk.getAgentProfile({uid:'real',email:'jerome@leroyfactory.fr'}),null);
  sdk.selectPreviewActor('jerome');
});

test('build strips original auth config, remote SDKs, Google account scripts and real sales rows',async()=>{
  const folder=await mkdtemp(path.join(tmpdir(),'crm-isolation-'));
  try{
    const manifest=await buildPreview(folder);
    assert.ok(manifest.pages.includes('clients.html'));
    assert.ok(manifest.files.includes('assets/js/crm-preview-sdk.mjs'));
    assert.ok(!manifest.files.some(x=>/^(studio-one|randal-general|shared|functions)\//.test(x)));
    assert.ok(!manifest.files.includes('index.html'));
    const firebase=await readFile(path.join(folder,'assets/js/firebase.js'),'utf8');
    assert.ok(!firebase.includes('firebaseapp.com'));
    assert.ok(!firebase.includes('www.gstatic.com/firebasejs'));
    const client=await readFile(path.join(folder,'clients.html'),'utf8');
    assert.ok(client.includes('crm-preview-guard.js'));
    assert.ok(client.includes('Content-Security-Policy'));
    assert.ok(client.includes('viewport-fit=cover'));
    const walk=async directory=>{for(const entry of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())await walk(file);else if(/\.(?:js|mjs|html)$/.test(file)){const text=await readFile(file,'utf8');assert.ok(!/AIza[A-Za-z0-9_-]{30,}/.test(text),`API credential leaked in ${path.relative(folder,file)}`);assert.ok(!/https:\/\/www\.gstatic\.com\/firebasejs\//.test(text),`Remote SDK in ${file}`);}}};
    await walk(folder);
    const sales=await readFile(path.join(folder,'assets/js/statistiques-elios-data.js'),'utf8');
    assert.ok(sales.includes('DÉMO'));
    assert.ok(!sales.includes('317640.95'));
    const periods=await readFile(path.join(folder,'assets/js/statistiques-periods.js'),'utf8');assert.ok(periods.includes('DÉMO'));assert.ok(!periods.includes('162509.16'));
    const tours=await readFile(path.join(folder,'assets/js/tournees-v6.js'),'utf8');assert.ok(!tours.includes('SMCE Prestige'));assert.ok(!tours.includes('Alessio'));
    const analysis=await readFile(path.join(folder,'assets/js/lrf-analysis-live-fixes.js'),'utf8');assert.ok(!analysis.includes('LRF-00184'));assert.ok(!analysis.includes('57,60'));
    const mail=await readFile(path.join(folder,'assets/js/mails-groupes-reliability.js'),'utf8');assert.ok(!mail.includes('1a00f2bfea3bc399'));
    assert.ok(await readFile(path.join(folder,'review.html'),'utf8'));
    assert.ok((await readFile(path.join(folder,'assets/brand-v2/lrf-logo-officiel-2026.png'))).length>1000);
    const config=JSON.parse(await readFile(path.join(folder,'vercel.json'),'utf8'));
    assert.equal(config.git.deploymentEnabled,false);
    assert.equal(config.headers[0].headers.find(x=>x.key==='Content-Security-Policy').value,previewCsp);
    assert.match(previewCsp,/connect-src 'self'/);
    assert.match(previewCsp,/form-action 'none'/);
  }finally{await rm(folder,{recursive:true,force:true});}
});

test('source transformation is confined to output and substitutes private statistics export names',()=>{
  const original='export const ELIOS_STATS_CLIENTS=[{"name":"private-name","ca2026":123456}];';
  const output=transformSource(original,'assets/js/statistiques-elios-data.js');
  assert.ok(output.includes('export const ELIOS_STATS_CLIENTS='));
  assert.ok(!output.includes('private-name'));
  assert.ok(original.includes('private-name'));
});


test('actual PR121 client saver creates and edits through the preview adapter without losing relations',async()=>{
  const save=createClientSaver(sdk);
  const result=await save({draft:{societe:'DÉMO · Test création isolée',codePostal:'34000',type:'client',partenaires:['elios-ceramica','randal-pro'],comptes_rendus:[{date:'2026-10-25',text:'Historique conservé'}]}});
  assert.ok(result.created);assert.match(result.codeClient,/^LRF-\d{5}$/);
  const ref=sdk.doc(sdk.db,'clients',result.id),before=(await sdk.getDoc(ref)).data();
  const updated=await save({clientId:result.id,original:before,draft:{societe:before.societe,telephone:'0400000123'}});
  const after=(await sdk.getDoc(ref)).data();
  assert.equal(updated.created,false);assert.equal(after.codeClient,before.codeClient);
  assert.deepEqual(after.partenaires,before.partenaires);assert.deepEqual(after.comptes_rendus,before.comptes_rendus);
});

test('dangerous output locations are rejected before deletion',async()=>{
 await assert.rejects(buildPreview('/'),/Refus/);
 await assert.rejects(buildPreview(new URL('../../assets',import.meta.url).pathname),/seule la sortie/);
});
