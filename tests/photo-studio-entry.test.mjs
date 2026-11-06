import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../configurateurs.html', import.meta.url), 'utf8');

test('Configurator entry preserves every original byte outside the two insertions', () => {
  const stripped = html
    .replace(/<style id="lrf-photo-studio-card-style">[\s\S]*?<\/style>\n/, '')
    .replace(/\n<article class="config-card lrf-photo-studio-card">[\s\S]*?<\/article>\n/, '');
  const blob = createHash('sha1').update(`blob ${Buffer.byteLength(stripped)}\0`).update(stripped).digest('hex');
  assert.equal(blob, '7acf8cb72a02f84729f3d37ef54fba8dbc5fb8d4');
});

test('New entry opens Photo Studio and reserves optimized image dimensions', () => {
  assert.equal((html.match(/class="config-card lrf-photo-studio-card"/g) || []).length, 1);
  const card = html.match(/<article class="config-card lrf-photo-studio-card">[\s\S]*?<\/article>/)[0];
  assert.match(card, /href="lrf-photo-studio\.html"/);
  assert.match(card, /Essayer dans ma pièce/);
  assert.match(card, /Donnez vie à vos projets/);
  assert.match(card, /width="960" height="540"/);
  assert.match(card, /srcset=/);
  assert.match(card, /Illustration du principe/);
  for (const width of [480, 960]) {
    assert.ok(statSync(new URL(`../assets/img/lrf-photo-studio/photo-studio-card-${width}.webp`, import.meta.url)).size < 50000);
  }
});
