import test from 'node:test';
import assert from 'node:assert/strict';
import {saveReport, registerDocument, setDocumentArchive} from '../../assets/js/crm-records-core.mjs';

const clone=value=>structuredClone(value);
function fixture(records,{failCommit=false}={}) {
  const recordsMap=new Map(Object.entries(clone(records))),writes=[];
  const sdk={
    db:{}, doc:(_db,collection,id)=>`${collection}/${id}`,
    async runTransaction(_db,callback) {
      const staged=[];
      await callback({
        async get(ref){assert.equal(staged.length,0,'All transaction reads precede writes');return {id:ref.split('/').pop(),exists:()=>recordsMap.has(ref),data:()=>clone(recordsMap.get(ref))};},
        update(ref,data){staged.push(['update',ref,clone(data)]);},
        set(ref,data){staged.push(['set',ref,clone(data)]);}
      });
      if(failCommit)throw new Error('Simulated transaction failure');
      staged.forEach(([op,ref,data])=>recordsMap.set(ref,op==='update'?{...recordsMap.get(ref),...data}:data));
      writes.push(...staged);
    }
  };
  return {...sdk,records:recordsMap,writes};
}
const original={date:'2026-10-22',author:'Test',text:'Visite fictive',source:'legacy',custom:'preserved'};
test('history creation preserves client ID/code and existing legacy history',async()=>{
  const f=fixture({'clients/a':{codeClient:'LRF-12345',comptesRendus:[original]}});
  await saveReport({...f,targetId:'a',report:{id:'new',text:'Nouveau'}});
  assert.equal(f.records.get('clients/a').codeClient,'LRF-12345');
  assert.deepEqual(f.records.get('clients/a').comptesRendus,[{id:'new',text:'Nouveau'},original]);
  assert.equal(f.records.size,1);
});
test('editing finds original report after another entry shifts its array index',async()=>{
  const other={text:'Concurrent'},changed={...original,text:'Corrigé'};
  const f=fixture({'clients/a':{comptes_rendus:[other,original]}});
  await saveReport({...f,targetId:'a',editing:{clientId:'a',crIndex:0,crField:'comptes_rendus',raw:original},report:changed});
  assert.deepEqual(f.records.get('clients/a').comptes_rendus,[other,changed]);
});
test('concurrent changes or ambiguous legacy reports refuse stale edits',async()=>{
  for(const list of [[{...original,text:'Changed elsewhere'}],[original,original]]) {
    const f=fixture({'clients/a':{comptes_rendus:list}});
    await assert.rejects(saveReport({...f,targetId:'a',editing:{clientId:'a',raw:original},report:{text:'Overwrite'}}),/changé|ambigu/);
    assert.equal(f.writes.length,0);
  }
});
test('report move uses one transaction; failed commit leaves both clients intact',async()=>{
  const records={'clients/a':{codeClient:'LRF-00001',comptes_rendus:[original]},'clients/b':{codeClient:'LRF-00002',comptesRendus:[]}};
  const f=fixture(records,{failCommit:true});
  await assert.rejects(saveReport({...f,targetId:'b',editing:{clientId:'a',raw:original},report:{...original,text:'Moved'}}),/Simulated/);
  assert.deepEqual(Object.fromEntries(f.records),records);
  const success=fixture(records);
  await saveReport({...success,targetId:'b',editing:{clientId:'a',raw:original},report:original});
  assert.deepEqual(success.records.get('clients/a').comptes_rendus,[]);
  assert.deepEqual(success.records.get('clients/b').comptesRendus,[original]);
});
test('archived target clients reject new history without changing data',async()=>{
  const f=fixture({'clients/a':{archived:true,comptes_rendus:[original]}});
  await assert.rejects(saveReport({...f,targetId:'a',report:{text:'new'}}),/archivée/);
  assert.equal(f.writes.length,0);
});

const metadata={clientId:'a',name:'fictif.pdf',url:'https://example.com/fictif.pdf',path:'test/fictif.pdf',type:'application/pdf',size:123,note:'',uploadedBy:'Test',uploadedAt:'2026-10-23T09:00:00Z'};
test('document registration writes catalog and client references atomically, and retry is idempotent',async()=>{
  const f=fixture({'clients/a':{codeClient:'LRF-12345',documents:[]}});
  await registerDocument({...f,documentId:'document',metadata});
  await registerDocument({...f,documentId:'document',metadata});
  assert.equal(f.records.get('clients/a').documents.length,1);
  assert.equal(f.records.get('clients/a').documents[0].documentId,'document');
  assert.equal(f.records.get('clients/a').codeClient,'LRF-12345');
  assert.deepEqual(f.records.get('clientDocuments/document'),metadata);
  const failed=fixture({'clients/a':{documents:[]}},{failCommit:true});
  await assert.rejects(registerDocument({...failed,documentId:'document',metadata}));
  assert.equal(failed.records.has('clientDocuments/document'),false);
  assert.deepEqual(failed.records.get('clients/a').documents,[]);
});
test('archive and restore keep file and metadata while syncing both modules',async()=>{
  const f=fixture({'clients/a':{codeClient:'LRF-12345',documents:[{nom:metadata.name,url:metadata.url,path:metadata.path} ]},'clientDocuments/document':metadata});
  await setDocumentArchive({...f,documentId:'document',archived:true,author:'Test',now:'2026-10-23'});
  assert.equal(f.records.get('clientDocuments/document').archived,true);
  assert.equal(f.records.get('clients/a').documents[0].archived,true);
  assert.equal(f.records.get('clientDocuments/document').url,metadata.url);
  await setDocumentArchive({...f,documentId:'document',archived:false,author:'Test',now:'2026-10-23'});
  assert.equal(f.records.get('clientDocuments/document').archived,false);
  assert.equal(f.records.get('clients/a').documents[0].archived,false);
  assert.equal(f.records.get('clients/a').documents.length,1);
  assert.equal(f.records.size,2);
});

