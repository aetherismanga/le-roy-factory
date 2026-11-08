import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { REPORT_PARTNERS, canonicalReportPartner, normalizeReportPartners, reportPartners, reportPartnerLabel, reportPartnerChoices, reportMatchesPartner, withReportPartners } from '../assets/js/crm-report-partners.mjs';
import { normalizeClientHistory } from '../assets/js/analyse-client-history.js';
import { reportFingerprint, unchangedReportIndex } from '../assets/js/crm-report-core.mjs';

test('Randal spelling, case, Pro, legacy IDs and unique typos identify one partner', () => {
  const variants = ['Randal', 'RANDAL', 'Randall', 'RANDALL PRO', 'randal-pro', 'Randal Group', 'Rnad al', 'Randalll'];
  for (const value of variants) assert.equal(canonicalReportPartner(value), 'Randal', value);
  assert.deepEqual(normalizeReportPartners(variants), ['Randal']);
});

test('all report partners share canonical names while the three bath brands stay distinct', () => {
  const examples = new Map([
    ['helios', 'Elios Ceramica'], ['ELIOS CÉRAMICA', 'Elios Ceramica'], ['VIEW', 'View Ceramica'],
    ['view-ceramica', 'View Ceramica'], ['LA-FENICE', 'La Fenice'], ['OPALE', 'OPAL'],
    ['Aqua Home', 'Aquahome'], ['Neo-Bath', 'Neobath'], ['Coibat', 'Koibath'], ['Koi Bath', 'Koibath'],
    ['Bio Pietra', 'Biopietra'], ['PECCHIOLLI', 'Pecchioli Firenze'], ['Petracer’s', "Petracer's"],
    ['Revi Glass', 'Reviglass'], ['Reitano', 'Reitano Rubinetterie'], ['UPTREND', 'Uptrend'], ['bilt', 'BILT']
  ]);
  for (const [alias, name] of examples) assert.equal(canonicalReportPartner(alias), name, alias);
  assert.deepEqual(normalizeReportPartners('Opale, Aquahome, Coibat'), ['OPAL', 'Aquahome', 'Koibath']);
  assert.equal(new Set(REPORT_PARTNERS).size, REPORT_PARTNERS.length);
});

test('multi-partner reports yield individual filters and match each selected partner once', () => {
  const multi = { usine: 'Elios Ceramica, View, RANDALL PRO, randal; Randal' };
  const reports = [multi, { factory: 'RANDAL' }, { partenaire: 'View Ceramica' }];
  assert.deepEqual(reportPartnerChoices(reports, []), ['Elios Ceramica', 'Randal', 'View Ceramica']);
  assert.deepEqual(reportPartners(multi), ['Elios Ceramica', 'View Ceramica', 'Randal']);
  assert.equal(reports.filter(cr => reportMatchesPartner(cr, 'Randal')).length, 2);
  assert.equal(reports.filter(cr => reportMatchesPartner(cr, 'VIEW')).length, 2);
  assert.equal(reportMatchesPartner(multi, 'BILT'), false);
  assert.equal(reportMatchesPartner(multi, ''), true);
  assert.deepEqual(normalizeReportPartners('Elios / View + Randal & Neobath; OPAL et Aquahome'), ['Elios Ceramica', 'View Ceramica', 'Randal', 'Neobath', 'OPAL', 'Aquahome']);
});

test('unknown labels survive and casing duplicates disappear without merging other companies', () => {
  assert.deepEqual(normalizeReportPartners(['Atelier Soleil', 'ATELIER SOLEIL', 'Pierre et Bain', 'Randal Services']), ['Atelier Soleil', 'Pierre et Bain', 'Randal Services']);
  for (const value of ['Atelier Soleil', 'Pierre et Bain', 'Randal Services', 'ACME']) assert.equal(canonicalReportPartner(value), '');
  assert.equal(reportMatchesPartner({ usine: 'ATELIER SOLEIL' }, 'Atelier Soleil'), true);
  assert.equal(reportMatchesPartner({ usine: 'Randal Services' }, 'Randal'), false);
});

test('legacy fields, arrays, tour partner IDs and whole-word text detection are supported', () => {
  for (const field of ['usine', 'factory', 'partenaire', 'partenaires', 'partners']) {
    assert.deepEqual(reportPartners({ [field]: ['randal-pro', 'elios-ceramica'] }), ['Randal', 'Elios Ceramica'], field);
  }
  assert.deepEqual(reportPartners({ notes: 'Présentation Elios puis Randall Pro et View Ceramica.' }), ['Elios Ceramica', 'Randal', 'View Ceramica']);
  assert.deepEqual(reportPartners({ text: 'Interview et review du magasin.' }), []);
  assert.deepEqual(reportPartners({ usine: 'BILT', text: 'Elios est aussi cité.' }), ['BILT']);
  assert.deepEqual(reportPartners({ usine: {}, partenaires: [] }), []);
});

test('reading does not mutate the report or invalidate the concurrent-edit guard', () => {
  const original = { id: 'visit-1', usine: 'RANDALL PRO', text: 'Texte exact conservé', tourId: 'tour-7', custom: { followUp: true } };
  const before = reportFingerprint(original);
  assert.equal(reportPartnerLabel(original), 'Randal');
  assert.equal(reportFingerprint(original), before);
  assert.equal(unchangedReportIndex([original], original), 0);
  const saved = withReportPartners(original, 'Randall Pro, View');
  assert.equal(saved.usine, 'Randal, View Ceramica');
  assert.equal(saved.text, original.text);
  assert.equal(saved.id, original.id);
  assert.equal(saved.tourId, original.tourId);
  assert.deepEqual(saved.custom, original.custom);
});

test('editing and clearing synchronizes legacy partner fields without reviving old aliases', () => {
  const original = { factory: 'RANDAL', partenaire: 'Randall', partenaires: ['randal-pro'], partners: ['randal-pro'] };
  const saved = withReportPartners(original, 'View');
  assert.deepEqual(reportPartners(saved), ['View Ceramica']);
  assert.equal(saved.factory, 'View Ceramica');
  assert.deepEqual(saved.partenaires, ['View Ceramica']);
  const cleared = withReportPartners(saved, '');
  assert.deepEqual(reportPartners(cleared), []);
  assert.deepEqual(cleared.partners, []);
  assert.equal(original.factory, 'RANDAL');
});

test('client history uses the same labels and retains visits and text', () => {
  const data = { comptes_rendus: [{ date: '2026-11-08', usine: 'RANDAL, View', text: 'Compte rendu inchangé' }] };
  const history = normalizeClientHistory('client-a', data);
  assert.equal(history.count, 1);
  assert.equal(history.items[0].usine, 'Randal, View Ceramica');
  assert.equal(history.items[0].text, data.comptes_rendus[0].text);
  assert.equal(data.comptes_rendus[0].usine, 'RANDAL, View');
});

test('the active page filter includes legacy, global and multi-partner reports under one choice', () => {
  const html = readFileSync(new URL('../comptes-rendus.html', import.meta.url), 'utf8');
  const start = html.indexOf('function refreshUsineChoices()');
  const end = html.indexOf('function render()', start);
  const list = { innerHTML: '' };
  const context = vm.createContext({
    reportPartnerChoices, reportMatchesPartner, esc: String,
    allCRs: [{ usine: 'Randal', date: '2026-11-08' }, { usine: 'RANDALL PRO', date: '2026-11-07' }],
    globalCRs: [{ usine: 'Elios Ceramica, Randal Pro, View', date: '2026-11-06' }],
    filterUsine: { value: 'Randal', innerHTML: '' }, filterAgent: { value: '' }, filterDate: { value: '' },
    searchInput: { value: '' }, sortSelect: { value: 'date-desc' }, $: () => list,
    isoDate: value => value, compareRecent: (a, b) => b.date.localeCompare(a.date), compareOld: (a, b) => a.date.localeCompare(b.date)
  });
  assert.ok(start >= 0 && end > start);
  vm.runInContext(html.slice(start, end), context);
  vm.runInContext('refreshUsineChoices()', context);
  assert.equal((context.filterUsine.innerHTML.match(/value="Randal"/g) || []).length, 1);
  assert.doesNotMatch(context.filterUsine.innerHTML, /value="(?:RANDAL|RANDALL PRO|Randal Pro|Elios Ceramica,)/);
  assert.equal(vm.runInContext('filteredSorted().length', context), 3);
  context.filterUsine.value = 'View Ceramica';
  assert.equal(vm.runInContext('filteredSorted().length', context), 1);
  assert.equal(context.allCRs.length + context.globalCRs.length, 3);
});
