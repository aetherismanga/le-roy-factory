import assert from 'node:assert/strict';
import test from 'node:test';
import { eliosSearchCode, matchesEliosClientCode, reconcileEliosCrmSales, salesDate, salesEuro } from '../assets/js/elios-crm-reconciliation.mjs';
import { eliosClientDetails, eliosClientMetric, eliosLinkedSearch, eliosUnmatchedSearch } from '../assets/js/elios-crm-revenue-ui.js';

const partner = 'elios-ceramica';
const row = (elios,name,ca2026,ca2025=0) => ({elios,name,ca2026,ca2025});
const client = (id,societe,extra={}) => ({id,societe,...extra});
const link = (factory,clientId,codeLRF='') => ({partner,factory,clientId,codeLRF});

test('verified codes win over names and multiple assigned accounts sum once at supplier precision', () => {
  const a = client('a','Maison Verte',{codesPartenairesMulti:{[partner]:['0007','8','0008']},codeElios:'007'});
  const b = client('b','Rive Verte');
  const sales = [row('00000007','Rive Verte',100.33,1.0049),row('0008','Maison Verte',-100.33,1.0049)];
  const result = reconcileEliosCrmSales(sales,[a,b]);
  assert.deepEqual(result.unmatched,[]);
  assert.equal(result.byClientId.has('b'),false);
  const group = result.byClientId.get('a');
  assert.equal(group.ca2026,0);
  assert.equal(group.ca2025,2.01);
  assert.deepEqual(group.accounts.map(account => [account.code,account.method]),[['00000007','code'],['0008','code']]);
  assert.equal(matchesEliosClientCode(result,'a',eliosSearchCode('0000008')),true);
  assert.equal(matchesEliosClientCode(result,'a',eliosSearchCode('8')),true);
  assert.equal(matchesEliosClientCode(result,'b',eliosSearchCode('0000008')),false);
  assert.equal(eliosSearchCode('Rive Verte'),'');
});

test('manual alias is safe when unique and legacy linked accounts resolve to their canonical client', () => {
  const clients = [
    client('current','Les Pierres Vertes',{codeClient:'LRF-11111',codesLRF:['LRF-22222']}),
    client('old','Les Pierres Vertes',{archived:true,duplicateOf:'current',codeElios:'0017'}),
    client('second','Les Pierres Bleues',{codeClient:'LRF-33333',codeElios:'24'})
  ];
  const sales = [row('000017','Pierres 1',25),row('0018','Pierres 2',30),row('0019','Pierres 3',40),row('24','Pierres 4',50)];
  const result = reconcileEliosCrmSales(sales,clients,[
    link('18','old','LRF-22222'),
    link('19','','LRF-11111'),
    link('24','current','LRF-11111')
  ]);
  assert.equal(result.byClientId.get('current').ca2026,95);
  assert.deepEqual(result.unmatched.map(({row,reason})=>[row.elios,reason]),[['24','conflict']]);
});

test('exact unique names can reconcile a client; duplicate, ambiguous, generic, and missing links stay visible for review', () => {
  const clients = [
    client('a','Création Atelier SARL'),
    client('b','Réseau Dalle'),
    client('c','Réseau Dalle SAS'),
    client('e','Carrelage')
  ];
  const sales = [
    row('1','CREATION ATELIER SAS',20),row('2','Réseau Dalle',30),row('3','Carrelage',40),
    row('004','Sans lien',50),row('4','Autre ligne',60),row('5','Sans correspondance',70)
  ];
  const result = reconcileEliosCrmSales(sales,clients);
  assert.equal(result.byClientId.get('a').accounts[0].method,'name');
  assert.deepEqual(result.unmatched.map(({reason}) => reason),
    ['ambiguous-name','no-match','duplicate-source-code','duplicate-source-code','no-match']);
});

test('explicit zero and negative balances remain visible while unknown and partial figures are distinguishable', () => {
  const clients = [client('active','Atelier des Dunes',{codeClient:'LRF-10000',codeElios:'20'}),client('none','Pavés et Jardins')];
  const sales = [row('20','Atelier & Fils',0,null),row('21','Autre account',-18.25),row('22','Partiel',null,null)];
  const matched = reconcileEliosCrmSales(sales,clients,[link('21','active','LRF-10000'),link('22','active','LRF-10000')]);
  const report = {...matched,dateFrom:'2026-01-01',dateTo:'2026-10-31',previousDateTo:'2025-10-31'};
  assert.equal(report.byClientId.get('active').ca2026,-18.25);
  assert.equal(report.byClientId.get('active').complete,false);
  assert.match(eliosClientMetric(report,'active'),/18,25.*31\/10\/2026.*partiel/);
  assert.equal(eliosClientMetric(report,'none'),'');
  assert.match(eliosClientDetails(report,'none'),/Aucun montant exploitable/);
  assert.match(eliosClientDetails(report,'active'),/Atelier &amp; Fils/);
  assert.equal(salesDate('2025-10-31'),'31/10/2025');
  assert.match(salesEuro(0),/^0,00/);
  assert.equal(salesEuro(null),'Non disponible');
});

test('unmatched Elios accounts surface by source name or full supplier code without a CRM action', () => {
  const clients = [client('active','Atelier des Marchés',{codeElios:'80'})];
  const sales = [row('000080','Atelier des Marchés',123.45),row('000081','Atelier des Dunes & Céramique',0),row('0000810','Pavés et Jardins',-18.25)];
  const report = {...reconcileEliosCrmSales(sales,clients),dateFrom:'2026-01-01',dateTo:'2026-09-30'};
  const entries = eliosUnmatchedSearch(report,'  dunes & ceramique  ');
  assert.match(entries,/Atelier des Dunes &amp; Céramique/);
  assert.match(entries,/01\/01\/2026 au 30\/09\/2026/);
  assert.match(entries,/Code Elios 000081 · Compte Elios à rapprocher/);
  assert.match(entries,/0,00.*€/);
  assert.doesNotMatch(entries,/<(?:a|button|input)\b|data-client-id/);
  assert.equal(eliosUnmatchedSearch(report,'81'),entries);
  assert.equal(eliosUnmatchedSearch(report,'000081'),entries);
  assert.match(eliosUnmatchedSearch(report,'810'),/18,25.*€/);
  assert.equal(eliosUnmatchedSearch(report,'00008'),'');
  assert.equal(eliosUnmatchedSearch(report,'000080'),'');
  assert.equal(eliosUnmatchedSearch(report,'Marchés'),'');
  assert.equal(eliosUnmatchedSearch(report,''),'');
  assert.equal(eliosUnmatchedSearch(null,'Dunes'),'');
});

test('a linked source designation finds its CRM fiche while numeric supplier searches stay exact', () => {
  const clients = [client('active','Dossier Atelier',{codeElios:'80'}),client('other','Bel Horizon',{codeElios:'810'})];
  const sales = [row('000080','Maison & Céramique',123.45),row('0000810','Pavés du secteur 80',18.25),row('000082','Maison & Grès',23.15)];
  const report = reconcileEliosCrmSales(sales,clients);
  assert.deepEqual([...eliosLinkedSearch(report,'maison ceramique')],['active']);
  assert.deepEqual([...eliosLinkedSearch(report,'Pavés')],['other']);
  assert.deepEqual([...eliosLinkedSearch(report,'000080')],['active']);
  assert.deepEqual([...eliosLinkedSearch(report,'80')],['active']);
  assert.equal(eliosLinkedSearch(report,'8').size,0);
  assert.equal(eliosLinkedSearch(report,'Maison & Grès').size,0);
  assert.equal(eliosLinkedSearch(report,'  ').size,0);
  assert.equal(eliosLinkedSearch(report,' & ').size,0);
  assert.equal(eliosLinkedSearch(null,'Maison').size,0);
});
