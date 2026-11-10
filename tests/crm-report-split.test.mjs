import test from 'node:test';
import assert from 'node:assert/strict';
import {hash,reportHash,planKey,separateReport} from '../scripts/crm-report-split-core.mjs';
import {migrateReportSeparation} from '../scripts/crm-report-split-store.mjs';
const raw={id:'visit-original',date:'2026-11-06',author:'Coryne',usine:'RANDALL PRO, View',text:'Randal : meuble.\nView : Corso.',notes:'Randal : meuble.\nView : Corso.',tourId:'tour-1'};
function planFor(report=raw,path='clients/A',transfer=false){
  return {sourcePathHash:hash(path),originalHash:reportHash(report),parts:[
    {partner:'Randal',paragraphs:[[[0,16]]]},
    {partner:'View Ceramica',paragraphs:[[[17,report.text.length]]],...transfer?{targetPathHash:hash('clients/B')}:{}}
  ]};
}
function fakeDB(initial){
 const docs=new Map(Object.entries(initial).map(([path,data])=>[path,structuredClone(data)]));
 let writes=0;
 const snapshot=path=>({ref:{path},exists:docs.has(path),data:()=>structuredClone(docs.get(path))});
 return {docs,get writes(){return writes;},doc:path=>({path}),collection:name=>({doc:id=>({path:name+'/'+id}),get:async()=>({docs:[...docs.keys()].filter(path=>path.startsWith(name+'/')).map(snapshot)})}),
 runTransaction:async callback=>{
   const staged=[];let hasWrites=false;
   const result=await callback({get:async ref=>{assert.equal(hasWrites,false,'all reads precede writes');return snapshot(ref.path);},set:(ref,data)=>{hasWrites=true;staged.push([ref.path,data]);},update:(ref,patch)=>{hasWrites=true;staged.push([ref.path,{...docs.get(ref.path),...patch}]);}});
   staged.forEach(([path,data])=>{docs.set(path,structuredClone(data));writes++;});return result;
 }};
}
test('separation scopes text and aliases, retains date, author and source references, and uses distinct IDs',()=>{
 const parts=separateReport(raw,planFor(),planKey('clients/A',raw),'2026-11-10');
 assert.deepEqual(parts.map(p=>p.report.usine),['Randal','View Ceramica']);
 assert.equal(parts[0].report.text,'Randal : meuble.');assert.equal(parts[1].report.text,'View : Corso.');
 assert.equal(parts[0].report.notes,parts[0].report.text);
 assert.equal(parts[1].report.date,raw.date);assert.equal(parts[1].report.author,raw.author);assert.equal(parts[1].report.tourId,raw.tourId);
 assert.notEqual(parts[0].report.id,parts[1].report.id);assert.equal(parts[0].report.id,raw.id);
 assert.throws(()=>separateReport({...raw,text:'Changed'},planFor(),'key','now'),/changed/);
 assert.throws(()=>separateReport(raw,{...planFor(),parts:[{partner:'Randal, View',paragraphs:[[[0,5]]]},{partner:'View',paragraphs:[[[0,5]]]}]},'key','now'),/one factory/);
});
test('migration archives and replaces legacy mirrors atomically, retains other visits and is idempotent',async()=>{
 const other={id:'other',text:'Unrelated visit',usine:'BILT'};
 const db=fakeDB({'clients/A':{societe:'A',comptes_rendus:[raw,other],comptesRendus:[raw,other]}}),key=planKey('clients/A',raw),plans={[key]:planFor()};
 const summary=await migrateReportSeparation(db,plans,{at:'2026-11-10'});
 assert.equal(summary.applied,1);assert.equal(summary.createdFactoryReports,2);assert.equal(summary.remainingMultiFactoryReports,0);
 const after=db.docs.get('clients/A');assert.equal(after.comptes_rendus.length,3);assert.deepEqual(after.comptes_rendus,after.comptesRendus);assert.deepEqual(after.comptes_rendus[2],other);
 const backup=db.docs.get('crm_report_archives/factory-split-'+key);assert.deepEqual(backup.original,raw);assert.deepEqual(backup.before[0].reports.comptes_rendus,[raw,other]);
 const writes=db.writes;const second=await migrateReportSeparation(db,plans);assert.equal(second.alreadySeparated,1);assert.equal(db.writes,writes);
});
test('a reviewed client transfer reads both histories and appends only the corresponding factory report',async()=>{
 const db=fakeDB({'clients/A':{societe:'A',comptes_rendus:[raw]},'clients/B':{societe:'B',comptesRendus:[{id:'existing',usine:'BILT',text:'Existing'}]}});
 const key=planKey('clients/A',raw);await migrateReportSeparation(db,{[key]:planFor(raw,'clients/A',true)});
 assert.equal(db.docs.get('clients/A').comptes_rendus.length,1);
 const target=db.docs.get('clients/B').comptesRendus;assert.equal(target.length,2);assert.equal(target[1].usine,'View Ceramica');assert.doesNotMatch(target[1].text,/Randal/);
});
test('unreviewed or concurrently changed multi-factory data aborts before any write',async()=>{
 for(const [value,plans] of [[raw,{}],[{...raw,text:'Edited by other agent'},{[planKey('clients/A',raw)]:planFor()}]]){
  const db=fakeDB({'clients/A':{comptes_rendus:[value]}});
  await assert.rejects(migrateReportSeparation(db,plans),/unreviewed/);assert.equal(db.writes,0);
 }
});
