import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const script = 'assets/js/inspirations-elios-cersaie-2026.js';
const slugs = ['dynasty', 'stone-icon', 'montblanc', 'terraforma'];

for (const page of ['univers.html', 'univers-ios.html']) {
  test(page + ' loads all four new collections before the product snapshot', () => {
    const html = read(page);
    const paths = [...html.matchAll(/<script[^>]+src="([^"?]+)[^"]*"/g)].map(match => match[1]);
    assert(paths.includes(script), 'The public page must actually load the new data');
    assert(paths.indexOf(script) < paths.indexOf('assets/js/inspirations-v2.js'));
    const context = vm.createContext({
      window: {},
      document: {readyState: 'loading', addEventListener() {}, querySelector() {return null;},
        createElement() {return {dataset: {}};}, head: {appendChild() {}}}
    });
    for (const path of paths.filter(path => /^assets\/js\/inspirations-elios-(?:data|thickness-overrides|cersaie-2026|pricing)\.js$/.test(path))) {
      vm.runInContext(read(path), context);
    }
    const {ELIOS_CATALOGUE: products, ELIOS_IMAGE_DATA: images} = context.window;
    assert.equal(products.length, 52);
    assert.equal(new Set(products.map(product => product.slug)).size, 52);
    assert.equal(products.filter(product => product.slug.startsWith('pool-')).length, 12);
    for (const slug of slugs) {
      const product = products.find(product => product.slug === slug);
      assert(product, 'Missing ' + slug);
      assert(product.gallery.length >= 6);
      for (const key of product.gallery) assert(images[key], 'Missing gallery image ' + key);
      assert.equal(product.badge, 'Nouveauté Cersaie 2026');
    }
    assert.equal(products.find(product => product.slug === 'azuli-mood').badge, 'Nouveauté Cersaie 2026');
    vm.runInContext(read(script), context);
    assert.equal(products.length, 52, 'Repeated loading must not duplicate products');
  });
}

test('all 27 original catalogue photos are present and match their source hashes', () => {
  const manifest = JSON.parse(read('reports/elios-selection-cersaie-20261028.json'));
  const photos = Object.values(manifest.collections).flat();
  assert.equal(photos.length, 27);
  for (const photo of photos) {
    const bytes = readFileSync(new URL('../' + photo.path, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), photo.sha256);
    assert(Math.min(photo.width, photo.height) >= 800);
    assert(Math.max(photo.width, photo.height) >= 1100);
  }
});
