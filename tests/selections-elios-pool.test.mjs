import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const file = path => new URL('../' + path, import.meta.url);
const read = path => readFileSync(file(path), 'utf8');

function load(page) {
  const context = vm.createContext({window: {}, document: {
    readyState: 'loading', addEventListener() {}, querySelector() {return null;},
    createElement() {return {dataset: {}};}, head: {appendChild() {}}
  }});
  const paths = [...read(page).matchAll(/<script[^>]+src="([^"?]+)[^"]*"/g)].map(match => match[1]);
  for (const path of paths.filter(path => /^assets\/js\/(?:inspirations-elios-(?:data|thickness-overrides|cersaie-2026|pricing|selection-media)|elios-selection-model)\.js$/.test(path))) {
    vm.runInContext(read(path), context);
  }
  return context.window;
}

for (const page of ['univers.html', 'univers-ios.html']) {
  test(page + ': one Pool group preserves access to all 12 original series', () => {
    const w = load(page), catalogue = w.ELIOS_CATALOGUE;
    assert.equal(catalogue.length, 52);
    const pools = catalogue.filter(w.LRF_ELIOS_SELECTION_MODEL.isPool);
    assert.equal(pools.length, 12);
    const grouped = w.LRF_ELIOS_SELECTION_MODEL.groupPools(catalogue);
    assert.equal(grouped.length, 41);
    assert.equal(grouped.filter(p => p.slug === 'pool-surfaces').length, 1);
    assert.equal(grouped.find(p => p.slug === 'pool-surfaces').groupSize, 12);
    assert(!grouped.some(w.LRF_ELIOS_SELECTION_MODEL.isPool));
    for (const product of catalogue.filter(p => !w.LRF_ELIOS_SELECTION_MODEL.isPool(p))) assert(grouped.includes(product));
    for (const product of catalogue) assert(w.ELIOS_SELECTION_MEDIA.galleries[product.slug].length >= 2, product.slug + ' needs a real gallery');
    for (const product of pools) {
      for (const color of product.colors) {
        const photos = w.ELIOS_SELECTION_MEDIA.variants[product.slug][color];
        assert(photos?.length, product.slug + ' / ' + color);
        for (const path of photos) assert(existsSync(file(path)), path);
      }
    }
  });
}

test('all 70 added catalogue images retain their verified original bytes', () => {
  const report = JSON.parse(read('reports/elios-pool-media-20261028.json'));
  assert.equal(report.assets.length, 70);
  assert.equal(report.poolColors, 35);
  for (const asset of report.assets) {
    const bytes = readFileSync(file(asset.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
  }
  const media = load('univers.html').ELIOS_SELECTION_MEDIA;
  for (const url of report.brokenUrls) assert(!Object.values(media.galleries).flat().includes(url));
});

test('Pool cards contain no separate price and private prices use the normal verified table', () => {
  const pool = read('assets/js/inspirations-elios-pool-integrated.js');
  assert(!pool.includes('const PRICE'));
  assert(!pool.includes('pool-card-meta'));
  assert(!pool.includes('<th>Tarif PRO</th>'));
  assert(pool.includes("LRF_AGENT_TARIFFS?.canAccess?.('elios-ceramica')"));
  const core = read('assets/js/inspirations-v2.js');
  assert(core.includes("api.getPrice('elios-ceramica',p,f)"));
  assert(core.includes('class="formats-table"'));
});
