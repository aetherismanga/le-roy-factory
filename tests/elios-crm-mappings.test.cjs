'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {applyVerifiedEliosLinks} = require('../functions/scripts/apply-elios-crm-mappings.cjs');

const partner = 'elios-ceramica';
const mappings = 'statistiques_lrf_mappings';
const salesPath = 'parametres/statistiques-elios';
const snapshotSha256 = 'a'.repeat(64);
const first = {factory:'00000081',sourceName:'Pierres et Grès',clientId:'firm-a',codeLRF:'LRF-00101',company:'Aurore Matériaux'};
const second = {factory:'00000474',sourceName:'Carrelages du Lac',clientId:'firm-b',codeLRF:'LRF-00102',company:'Maison Aigue'};
const request = (...links) => ({schema:1,snapshotSha256,links});
const mappingPath = factory => `${mappings}/${partner}__${factory}`;
const mapping = link => ({partner,factory:link.factory,clientId:link.clientId,codeLRF:link.codeLRF});

function fakeFirestore(edit = () => {}, beforeCommit = () => {}) {
  const docs = new Map(Object.entries({
    [salesPath]:{schema:1,snapshotSha256,rows:[first,second].map(link => ({elios:link.factory,name:link.sourceName,ca2026:47,ca2025:9}))},
    'clients/firm-a':{societe:first.company,codeClient:first.codeLRF},
    'clients/firm-b':{societe:second.company,codeClient:second.codeLRF},
  }));
  edit(docs);
  const creates = [];
  let transactions = 0;
  const doc = path => ({path});
  const snapshot = (path, fields) => ({
    ref:doc(path),id:path.split('/').at(-1),exists:docs.has(path),
    data:() => structuredClone(fields ? Object.fromEntries(Object.entries(docs.get(path)).filter(([key]) => fields.includes(key))) : docs.get(path)),
  });
  return {
    docs,creates,doc,get transactions() { return transactions; },
    collection:name => ({select:(...fields) => ({name,fields}),where:(field,op,value) => ({name,filter:{field,op,value}})}),
    async runTransaction(operation) {
      transactions++;
      const staged = [];
      const result = await operation({
        async get(ref) {
          assert.equal(staged.length,0,'reads must precede writes');
          if (ref.path) return snapshot(ref.path);
          if (ref.filter) assert.equal(ref.filter.op,'==');
          return {docs:[...docs.keys()].filter(path => path.startsWith(`${ref.name}/`)
            && (!ref.filter || docs.get(path)[ref.filter.field] === ref.filter.value))
            .map(path => snapshot(path,ref.fields))};
        },
        async getAll(...refs) {
          assert.equal(staged.length,0,'reads must precede writes');
          return refs.reverse().map(ref => snapshot(ref.path));
        },
        create(ref,data) {
          assert.match(ref.path,/^statistiques_lrf_mappings\/elios-ceramica__\d{8}$/);
          staged.push([ref.path,structuredClone(data)]);
        },
      });
      beforeCommit();
      assert.ok(staged.every(([path]) => !docs.has(path)),'creation must never replace a mapping');
      for (const [path,data] of staged) {
        docs.set(path,data);
        creates.push(path);
      }
      return result;
    },
  };
}

test('bulk confirmation creates only standard records and can be replayed without rewriting them', async () => {
  const db = fakeFirestore(docs => {
    docs.set('clients/firm-b',{raisonSociale:` ${second.company}\r\n`,codeClient:'LRF-00103',codesLRF:[second.codeLRF]});
    docs.set(`${mappings}/old-${first.factory}`,mapping(first));
  });
  const original = structuredClone(db.docs);
  assert.deepEqual(await applyVerifiedEliosLinks(db,request(first,second)),{requested:2,created:2,alreadyLinked:0});
  assert.equal(db.transactions,1);
  for (const link of [first,second]) {
    const {updatedAt,...record} = db.docs.get(mappingPath(link.factory));
    assert.match(updatedAt,/^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(record,mapping(link));
  }
  for (const [path,data] of original) assert.deepEqual(db.docs.get(path),data);
  assert.deepEqual(await applyVerifiedEliosLinks(db,request(first,second)),{requested:2,created:0,alreadyLinked:2});
  assert.deepEqual(db.creates,[mappingPath(first.factory),mappingPath(second.factory)]);
});

test('invalid, duplicate, oversized or shortened source codes do not start a transaction', async () => {
  const db = fakeFirestore();
  for (const manifest of [request(),request(first,first),request({...first,factory:'81'}),request({...first,codeLRF:'LRF-101'}),
    request({...first,clientId:'other/firm-a'}),request(...Array.from({length:51},() => first)),{...request(first),snapshotSha256:'wrong'}]) {
    await assert.rejects(applyVerifiedEliosLinks(db,manifest),/manifeste/);
  }
  assert.equal(db.transactions,0);
  assert.deepEqual(db.creates,[]);
});

test('stale sales digest, missing code and altered source name abort the whole batch', async () => {
  const db = fakeFirestore();
  await assert.rejects(applyVerifiedEliosLinks(db,{...request(first,second),snapshotSha256:'b'.repeat(64)}),/diffère/);
  await assert.rejects(applyVerifiedEliosLinks(db,request(first,{...second,sourceName:'Carrelages du Lac '})),/désignation source/);
  await assert.rejects(applyVerifiedEliosLinks(db,request(first,{...second,factory:'00000475'})),/désignation source/);
  assert.deepEqual(db.creates,[]);
});

test('stale, missing, archived or non-unique destination fiches abort the whole batch', async () => {
  const edits = [
    docs => docs.delete('clients/firm-b'),
    docs => docs.set('clients/firm-b',{societe:'Nouvelle raison sociale',enseigne:second.company,codeClient:second.codeLRF}),
    docs => docs.set('clients/firm-b',{societe:second.company.toUpperCase(),codeClient:second.codeLRF}),
    docs => docs.set('clients/firm-b',{...docs.get('clients/firm-b'),archived:true}),
    docs => docs.set('clients/firm-b',{...docs.get('clients/firm-b'),duplicateOf:'firm-a'}),
    docs => docs.set('clients/firm-c',{societe:'Une autre fiche',codesLRF:['lrf-00102']}),
  ];
  for (const edit of edits) {
    const db = fakeFirestore(edit);
    await assert.rejects(applyVerifiedEliosLinks(db,request(first,second)),/fiche CRM/);
    assert.deepEqual(db.creates,[]);
  }
});

test('strong supplier-code conflicts and a different existing mapping are rejected without partial creates', async () => {
  const edits = [
    docs => docs.set('clients/firm-a',{...docs.get('clients/firm-a'),codesPartenairesMulti:{[partner]:['474']}}),
    docs => {
      docs.set('clients/firm-a',{...docs.get('clients/firm-a'),codeElios:'474'});
      docs.set('clients/firm-b',{...docs.get('clients/firm-b'),codeElios:'00000474'});
    },
    docs => docs.set(`${mappings}/older-${second.factory}`,mapping({...first,factory:'474'})),
    docs => docs.set(mappingPath(second.factory),mapping({...first,factory:second.factory})),
    docs => docs.set(mappingPath(second.factory),{...mapping(second),partner:'view-ceramica'}),
  ];
  for (const edit of edits) {
    const db = fakeFirestore(edit);
    await assert.rejects(applyVerifiedEliosLinks(db,request(first,second)),/attribution incompatible/);
    assert.deepEqual(db.creates,[]);
  }
});

test('backend transaction failures do not expose document paths or private values', async () => {
  const db = fakeFirestore(undefined,() => { throw Error(`${mappingPath(first.factory)} ${first.company}`); });
  await assert.rejects(applyVerifiedEliosLinks(db,request(first)),error => {
    assert.match(error.message,/enregistrement groupé/);
    assert.ok(!error.message.includes(first.factory));
    assert.ok(!error.message.includes(first.company));
    return true;
  });
  assert.deepEqual(db.creates,[]);
});
