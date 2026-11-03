import test from 'node:test';
import assert from 'node:assert/strict';
import {interestFor,nextActionFor,summaryFor,selectClients} from '../assets/js/analyse-client-report-model.mjs';
test('access page does not imply a product interest or a project',()=>{
 assert.equal(interestFor({topPage:'Accès PRO'}),'');
 assert.equal(interestFor({topPage:'RANDAL — STUDIO ONE 3D | LE ROY FACTORY'}),'Configurateur Studio One');
 assert.match(nextActionFor({sessions:2,topPage:'Accès PRO'}),/Identifier le besoin/);
 assert.doesNotMatch(summaryFor({sessions:2,orderViews:0}),/commande|commercialement/);
});
test('client filtering normalizes accents, includes inactive on request and removes retired client',()=>{
 const clients=[{id:'1',societe:'Céramique Sud',lastSeenAt:100},{id:'2',societe:'Autre',lastSeenAt:0},{id:'3',societe:'Retiré',codeClient:'LRF-00001',lastSeenAt:200}];
 assert.deepEqual(selectClients(clients,{query:'ceramique'}).map(c=>c.id),['1']);
 assert.deepEqual(selectClients(clients,{status:'inactive'}).map(c=>c.id),['2']);
 assert.equal(selectClients(clients,{status:'all'}).length,2);
});
test('proposed followups are conditional on the available signals',()=>{
 assert.match(nextActionFor({stockViews:1}),/Confirmer le besoin/);
 assert.match(nextActionFor({tariffViews:1}),/Demander si/);
 assert.match(nextActionFor({orderViews:1}),/Vérifier le suivi/);
});
