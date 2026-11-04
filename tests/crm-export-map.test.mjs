import test from 'node:test';
import assert from 'node:assert/strict';
import { activeExportClient, spreadsheetText, escapeCsvCell } from '../assets/js/crm-export-core.mjs';
import { activeMapClient, mapText, mapPhone } from '../assets/js/crm-map-core.mjs';

test('export and map exclude archives and aliases while retaining a self-canonical client',()=>{
  for(const client of [
    {id:'a',archived:true}, {id:'a',archive:true},
    {id:'a',canonicalClientId:'b'}, {id:'a',duplicateOf:'b'}
  ]){
    assert.equal(activeExportClient(client),false);
    assert.equal(activeMapClient(client,client.id),false);
  }
  for(const client of [{id:'a'}, {id:'a',canonicalClientId:'a'}, {id:'a',duplicateOf:'a'}]){
    assert.equal(activeExportClient(client),true);
    assert.equal(activeMapClient(client,client.id),true);
  }
});

test('spreadsheet formula prefixes including hidden whitespace are made literal',()=>{
  for(const input of ['=1+1','+SUM(1;2)','-1+2','@SUM(1;2)',' \t=HYPERLINK("https://example.org")','\r\n+123','\u200b=1']){
    assert.equal(spreadsheetText(input),`'${input}`);
  }
  assert.equal(spreadsheetText('Magasin du Sud'),'Magasin du Sud');
  assert.equal(spreadsheetText('04 67 00 00 00'),'04 67 00 00 00');
  assert.equal(escapeCsvCell('Société; "Sud"'),'"Société; ""Sud"""');
  assert.equal(escapeCsvCell('=1+1'),"'=1+1");
});

test('map popup text and phone links cannot introduce HTML or attributes',()=>{
  assert.equal(mapText('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(mapText("O'Brien & Fils"),'O&#039;Brien &amp; Fils');
  assert.equal(mapPhone('+33 4 67" onclick="alert(1)'),'+334671');
  assert.equal(mapText(123),'123');
});
