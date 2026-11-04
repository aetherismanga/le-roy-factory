import test from 'node:test';
import assert from 'node:assert/strict';
import {changedFields,assertUnchanged,reconcileList,safeDocumentUrl,localDate,matchesClientSearch} from '../assets/js/client-form-core.mjs';
test('unchanged fields do not overwrite an edit made on another device',()=>{
  const base={societe:'A',notes:'Avant'},draft={societe:'A',notes:'Avant'};
  assert.deepEqual(changedFields(base,draft),{});
  assert.doesNotThrow(()=>assertUnchanged({...base,notes:'Autre appareil'},base,changedFields(base,draft)));
});
test('concurrent edits of the same field are rejected, identical retry accepted',()=>{
  assert.throws(()=>assertUnchanged({notes:'C'},{notes:'A'},{notes:'B'}),/modifiée ailleurs/);
  assert.doesNotThrow(()=>assertUnchanged({notes:'B'},{notes:'A'},{notes:'B'}));
});
test('new reports survive concurrent additions and edits without resurrection',()=>{
  const old={id:'1',text:'old'},edited={id:'1',text:'edited'},remote={id:'2'},added={id:'3'};
  assert.deepEqual(reconcileList([edited,remote],[old],[old,added]),[edited,remote,added]);
  assert.deepEqual(reconcileList([old,remote],[old],[]),[remote]);
});
test('unsafe document protocols are never made clickable',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,test','#','http://example.org/a'])assert.equal(safeDocumentUrl(url),'');
  assert.equal(safeDocumentUrl('https://example.org/a.pdf'),'https://example.org/a.pdf');
});
test('search supports accented names, every phone, contacts and LRF codes',()=>{
  const c={societe:'Céramique',codePostal:'34160',codeClient:'LRF-00123',telephones:['04 67 11 22 33'],contacts:[{prenom:'Jérôme',nom:'Hugol'}]};
  for(const q of ['ceramique','34160','LRF00123','0467112233','jerome hugol'])assert.equal(matchesClientSearch(c,q),true,q);
  assert.equal(matchesClientSearch(c,'absent'),false);
});
test('date uses the device calendar instead of UTC date',()=>assert.equal(localDate(new Date(2026,10,5,0,1)),'2026-11-05'));
