import test from 'node:test';
import assert from 'node:assert/strict';
import { historyDateMillis, normalizeClientHistory, loadClientHistory } from '../assets/js/analyse-client-history.js';

test('French and ISO report dates sort by visit date, without inventing invalid dates', () => {
  const result = normalizeClientHistory('client-a', { comptes_rendus: [
    { date:'01/11/2026', auteur:'Coryne', notes:'Premier échange' },
    { date:'2026-11-03', author:'Jérôme', text:'Dernier échange', usine:'Randal' },
    { date:'31/02/2026', text:'Date à vérifier' }
  ] });
  assert.equal(result.latest.text, 'Dernier échange');
  assert.equal(result.items[1].author, 'Coryne');
  assert.equal(result.items[2].at, 0);
  assert.equal(historyDateMillis('31/02/2026'), 0);
  assert.equal(result.count, 3);
});

test('legacy fields are preserved and the existing editor precedence prevents duplicates', () => {
  const legacy = normalizeClientHistory('exact-id', { comptesRendus: [
    { date:'2026-11-02', auteur:'Coryne', texte:'Besoin à confirmer', partenaire:'View' }
  ] });
  assert.equal(legacy.sourceField, 'comptesRendus');
  assert.equal(legacy.latest.usine, 'View Ceramica');
  assert.equal(legacy.latest.clientId, 'exact-id');
  assert.equal(normalizeClientHistory('exact-id', { comptes_rendus:[], comptesRendus:[{text:'Ancienne copie'}] }).count, 0);
});

test('undated reports use stored timestamps, retain text literally, and encode the exact document ID', () => {
  const result = normalizeClientHistory('client avec espace', { comptes_rendus: [
    { text:'<script>literal</script>', created_at:{seconds:1793692800, nanoseconds:123000000} }
  ] });
  assert.equal(result.latest.at, 1793692800123);
  assert.equal(result.latest.text, '<script>literal</script>');
  assert.equal(result.createUrl, 'comptes-rendus.html?new=1&client=client%20avec%20espace');
  assert.equal(result.historyUrl, 'comptes-rendus.html?client=client%20avec%20espace');
});

test('invalid document IDs reject before initializing Firebase or reading data', async () => {
  await assert.rejects(loadClientHistory('clients/a'), TypeError);
  await assert.rejects(loadClientHistory(''), TypeError);
  await assert.rejects(loadClientHistory('..'), TypeError);
});
