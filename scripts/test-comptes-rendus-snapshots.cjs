'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('a slower previous Firestore snapshot cannot duplicate or replace the current reports', async () => {
  const html = fs.readFileSync(path.join(__dirname, '../comptes-rendus.html'), 'utf8');
  const body = html.match(/onSnapshot\(collection\(db,"clients"\),async snap=>\{([\s\S]*?)\n      \},err=>/)[1];
  let resolveCity;
  const delayedCity = new Promise(resolve => { resolveCity = resolve; });
  const element = () => ({ children: [], value: '', appendChild(child) { this.children.push(child); }, replaceChildren(fragment) { this.children = [...fragment.children]; } });
  const clientSelect = element(), renders = [];
  const context = vm.createContext({
    document: { createElement: element, createDocumentFragment: element }, clientSelect,
    villeFromCP: () => delayedCity, detectUsine: () => 'RANDAL', refreshUsineChoices() {},
    render: () => renders.push(context.inspect().reports.map(item => item.clientId))
  });
  vm.runInContext(`let allCRs=[],clientCache=new Map(),crSnapshotVersion=0;
    this.update=async snap=>{${body}};
    this.inspect=()=>({reports:allCRs,clients:[...clientCache.keys()]});`, context);
  const snapshot = (id, city, text) => ({ docs: [{ id, data: () => ({ societe: id, ville: city, code_postal: '34000', comptes_rendus: [{ date: '2026-11-02', text }] }) }] });
  const older = context.update(snapshot('older', '', 'Ancien état'));
  await context.update(snapshot('current', 'Montpellier', 'Mail groupé STUDIO ONE'));
  assert.deepEqual([...context.inspect().reports].map(item => item.clientId), ['current']);
  resolveCity('Montpellier');
  await older;
  assert.deepEqual([...context.inspect().reports].map(item => item.clientId), ['current']);
  assert.deepEqual([...context.inspect().clients], ['current']);
  assert.deepEqual(clientSelect.children.map(option => option.value), ['', 'current']);
  assert.deepEqual(renders.map(ids => [...ids]), [['current']]);
});
