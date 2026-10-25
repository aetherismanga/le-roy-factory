import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const files=[
  'assets/js/tournees-v6.js','assets/js/tournees-route-fix.js',
  'assets/js/tournees-owner-actions.js','assets/js/clients-export.js',
  'documents-clients.html'
];
for(const file of files){
  test(`${file}: actual snapshot mappings ignore a conflicting stored legacy id`,()=>{
    const source=readFileSync(new URL(`../../${file}`,import.meta.url),'utf8');
    const mappings=[...source.matchAll(/\.docs\.map\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\(\s*(\{[^}]+\})\s*\)\s*\)/g)];
    assert.ok(mappings.length>0,'At least one live Firestore mapping found');
    for(const [,name,expression] of mappings){
      const value=vm.runInNewContext(`(${expression})`,{[name]:{id:'actual-document-id',data:()=>({id:'legacy-wrong-id',codeClient:'LRF-12345',societe:'Fixture fictive'})}});
      assert.equal(value.id,'actual-document-id');
      assert.equal(value.codeClient,'LRF-12345');
      assert.equal(value.societe,'Fixture fictive');
    }
  });
}
test('active route override also saves reports through transactional shared operation',async()=>{
  const source=readFileSync(new URL('../../assets/js/tournees-route-fix.js',import.meta.url),'utf8');
  const body=source.slice(source.indexOf('function bindReports()'),source.indexOf('\nasync function drawMap'));
  const calls=[],text={value:'Visite fictive'},state={textContent:''},row={dataset:{clientId:'actual-document-id',date:'2026-10-23'}};
  const button={disabled:false,parentElement:{querySelector:selector=>selector==='textarea'?text:state},closest:()=>row};
  const context={document:{querySelectorAll:selector=>selector==='.tour-cr-save'?[button]:[]},clean:value=>value.trim(),localStorage:{getItem:()=> 'Test'},crypto:{randomUUID:()=> 'report-fixture'},Date,plan:{id:'tour-fixture'},db:{},doc:()=>{},runTransaction:()=>{},saveClientReport:async args=>calls.push(args)};
  vm.runInNewContext(body,context);context.bindReports();await button.onclick();
  assert.equal(calls.length,1);assert.equal(calls[0].targetId,'actual-document-id');
  assert.equal(calls[0].report.tourId,'tour-fixture');
  assert.equal(text.value,'');assert.match(state.textContent,/Enregistré/);
});

