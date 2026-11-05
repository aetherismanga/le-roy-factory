import assert from 'node:assert/strict';
import test from 'node:test';
import {matchingBusinesses,unvisitedPayload} from '../functions/scripts/crm-map-import-core.mjs';
const store={societe:'CARRELAGES MERIDIONAUX',codePostal:'30300',ville:'Beaucaire',adresse:'55 avenue de Farciennes',telephone:'0466592433'};
test('same store is held when its phone, trading name or address already exists',()=>{
  assert.equal(matchingBusinesses(store,[{...store,societe:'Carrelages méridionaux SARL'}]).length,1);
  assert.equal(matchingBusinesses(store,[{...store,societe:'Autre enseigne',telephone:'+33 4 66 59 24 33'}]).length,1);
  assert.equal(matchingBusinesses(store,[{...store,societe:'Autre enseigne',telephone:'0102030405'}]).length,1);
});
test('central telephone and chain name cannot merge branches in different towns',()=>{
  assert.equal(matchingBusinesses(store,[{...store,codePostal:'34000',ville:'Montpellier'}]).length,0);
  assert.equal(matchingBusinesses(store,[{...store,ville:'Jonquières-Saint-Vincent'}]).length,0);
  assert.doesNotThrow(()=>matchingBusinesses(store,[{...store,contacts:[null]}]));
});
test('archived aliases do not become duplicate imports when active canonical store matches',()=>{
  assert.equal(matchingBusinesses(store,[{...store,archived:true},{...store,id:'canonical'}]).length,1);
});
test('new imported prospects have no LRF identity and never claim a visit',()=>{
  const p=unvisitedPayload({...store,verifiedLocation:{lat:44,lon:4}},'2026-11-05');
  assert.equal(p.type,'prospect');assert.equal(p.nonVisite,true);assert.equal(p.visiteStatus,'non_visite');assert.equal(p.autoAssignLrfCode,false);
  assert.equal(p.codeClient,'');assert.equal(p.codeLRF,'');assert.deepEqual(p.codesLRF,[]);assert.deepEqual(p.comptes_rendus,[]);assert.equal(p.verifiedLocation,undefined);
});
