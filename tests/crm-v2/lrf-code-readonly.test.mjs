import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('opening sales analysis cannot automatically remove an existing LRF code',async()=>{
 const source=await readFile(new URL('../../assets/js/statistiques-lrf-multi.js',import.meta.url),'utf8');
 const body=source.match(/async function cleanupMistakenCode\(\)\{([\s\S]*?)\n\}/)[1];
 let writes=0;
 await vm.runInNewContext(`(async()=>{${body}})()`,{updateDoc(){writes++},clients:[{id:'exact',societe:'DM Home',codesLRF:['LRF-00309']}]});
 assert.equal(writes,0);
 assert.match(source,/clients\.push\(\{\.\.\.d\.data\(\),id:d\.id\}\)/);
});
