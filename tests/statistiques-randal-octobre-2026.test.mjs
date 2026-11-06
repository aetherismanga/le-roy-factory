import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = name => readFileSync(new URL(`../assets/js/${name}`, import.meta.url), 'utf8');
const cents = value => Math.round(value * 100);
const sum = (rows, key) => rows.reduce((total, row) => total + cents(row[key]), 0);

function evaluate(name, globals = {}) {
  const context = vm.createContext({ Intl, Date, ...globals });
  const source = read(name)
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export /gm, '')
    .replace(/^if\(document\.readyState===.*$/gm, '');
  vm.runInContext(source, context, { filename: name });
  return expression => vm.runInContext(expression, context);
}

const snapshot = evaluate('statistiques-randal-octobre-2026-data.js')('RANDAL_STATS_2026_10_25');
const historical = evaluate('statistiques-randal-fin-2025-data.js')('RANDAL_FIN_2025_STATS');
const globals = {
  RANDAL_STATS_2026_10_25: snapshot,
  RANDAL_FIN_2025_STATS: historical,
  MI_JUIN_2025_STATS: {}, FIN_2025_STATS: {},
  ELIOS_STATS_CLIENTS: [], VIEW_STATS_CLIENTS_2026_07: []
};
const periods = evaluate('statistiques-periods.js', globals)('STATS_PERIODS');
const load = (file, extra = {}) => evaluate(file, { ...globals, STATS_PERIODS: periods, ...extra });

test('le relevé contient 72 comptes uniques et se rapproche des totaux Excel au centime', () => {
  assert.equal(snapshot.clients.length, 72);
  assert.equal(new Set(snapshot.clients.map(row => row.factory)).size, 72);
  assert.equal(sum(snapshot.clients, 'ca2026'), 16003133);
  assert.equal(sum(snapshot.clients, 'ca2025'), 19814652);
  assert.equal(cents(snapshot.ca), 16003133);
  assert.equal(cents(snapshot.prev), 19814652);
  const ceraStone = snapshot.clients.find(row => row.factory === 'PRO00374');
  assert.equal(cents(ceraStone.ca2025), 1109952);
  assert.equal(ceraStone.postalCode, '06700');
  assert.equal(ceraStone.dept, '06');
  assert.equal(snapshot.clients.find(row => row.factory === 'PRO00991').ca2026, -294);
  assert.equal(snapshot.clients.find(row => row.factory === 'PRO00621').dept, '2B');
});

test('le cumul annuel garde la date réelle du relevé et préserve 2025', () => {
  const randal = periods['randal-pro'].periods;
  for (const key of ['2026-10', '2026-12']) {
    assert.equal(randal[key].dateTo, '2026-10-25');
    assert.equal(randal[key].previousDateTo, '2025-10-25');
    assert.equal(randal[key].incomplete, true);
    assert.equal(cents(randal[key].ca), 16003133);
    assert.equal(cents(randal[key].prev), 19814652);
  }
  assert.equal(randal['2026-12'].sourceKey, '2026-10');
  assert.equal(cents(randal['2025-12'].ca), 23693296);
  assert.equal(randal['2025-12'].incomplete, false);
});

test('les tableaux mensuels, annuels et les commissions lisent le même relevé', () => {
  const core = load('statistiques-core.js');
  const commissions = load('statistiques-commissions.js');
  const annual = load('statistiques-ux-fix.js');
  const rowSets = [
    core("detailRowsFor('randal-pro','2026-10')"),
    core("detailRowsFor('randal-pro','2026-12')"),
    commissions("detailRows('randal-pro','2026-10')"),
    commissions("detailRows('randal-pro','2026-12')"),
    annual("annualRowsForPartner('randal-pro',2026)")
  ];
  for (const rows of rowSets) {
    assert.equal(rows.length, 72);
    assert.equal(sum(rows, 'ca2026'), 16003133);
    assert.equal(sum(rows, 'ca2025'), 19814652);
  }
  assert.equal(sum(core("detailRowsFor('randal-pro','2025-12')"), 'ca2025'), 23693296);
  assert.equal(cents(core("aggregatePeriods()['2026-12'].ca")), 71480093);
});

test('la plage personnalisée respecte le 25 octobre, sans inventer une fin de mois', () => {
  const fields = { 'stats-date-from': { value: '2026-01-01' }, 'stats-date-to': { value: '2026-10-25' } };
  const core = load('statistiques-core.js', { document: { getElementById: id => fields[id] } });
  assert.equal(core("resolveRangeForPartner('randal-pro').endKey"), '2026-10');
  assert.equal(cents(core("resolveRangeForPartner('randal-pro').ca")), 16003133);
  fields['stats-date-to'].value = '2026-10-31';
  assert.equal(core("resolveRangeForPartner('randal-pro')"), null);
});

test('regrouper deux codes sur une fiche CRM conserve les montants et les autres comptes', () => {
  const core = load('statistiques-core.js');
  core(`currentPartner='randal-pro';currentPeriodKey='2026-12';periodMode='annual';
    crmClients=[{id:'sup-caro',societe:'SUP CARO',codesPartenairesMulti:{'randal-pro':['PRO00507','PRO00791']}}]`);
  const rows = core('groupedRows()');
  assert.equal(rows.length, 71);
  const grouped = rows.find(row => row.client?.id === 'sup-caro');
  assert.equal(cents(grouped.current), 2530024);
  assert.equal(rows.reduce((total, row) => total + cents(row.current), 0), 16003133);
});
