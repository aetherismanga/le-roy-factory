import test from 'node:test';
import assert from 'node:assert/strict';
import {activeClients,csvCell} from '../../assets/js/crm-export-core.mjs';

test('exports exclude both legacy and current archive flags without modifying records',()=>{
  const records=[{id:'a',archived:false},{id:'b',archive:true},{id:'c',archived:true},{id:'d'}];
  assert.deepEqual(activeClients(records).map(record=>record.id),['a','d']);
  assert.equal(records.length,4);
});
test('spreadsheet formulas, hidden prefix and international phone are exported as literal text',()=>{
  for(const value of ['=1+1','+33123456789','-1+2','@SUM(A1)','  =HYPERLINK("https://example.com")','\t=1','\n=1']){
    const exported=csvCell(value);
    assert.match(exported,/^"?'/);
  }
});
test('CSV preserves quoted multiline values and ordinary client text',()=>{
  assert.equal(csvCell('Client fictif'),'Client fictif');
  assert.equal(csvCell('Société; "Test"'),'"Société; ""Test"""');
  assert.equal(csvCell('Note\nsuite'),'"Note\nsuite"');
  assert.equal(csvCell('LRF-01234'),'LRF-01234');
});
