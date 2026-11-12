import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {normalizeCatalogueSearch, quantity, restoreSelection, palletEstimate, buildQuote} from '../assets/js/saxso-selection.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalogue = JSON.parse(readFileSync(root+'assets/data/saxso-catalogue.json','utf8'));
const customer = {company:'Magasin test',name:'Client test',email:'client@example.com',delivery:'Vendargues',pallets:4};
test('SAXSO public catalogue contains documented choices, existing native assets and no price data', () => {
  assert.equal(catalogue.language,'fr');assert.equal(catalogue.year,2026);assert.equal(catalogue.minimumPallets,4);
  assert.equal(catalogue.provenance.priceDataIncluded,false);assert.ok(catalogue.collections.length>=40);
  assert.ok(existsSync(root+catalogue.pdf));
  const ids = new Set();let choices=0;
  for(const collection of catalogue.collections) {
    assert.ok(collection.variants.length, collection.id);
    assert.ok(existsSync(root+collection.cover.url));
    assert.ok(existsSync(root+collection.cover.preview));
    for(const image of collection.images) {assert.ok(existsSync(root+image.url));assert.ok(existsSync(root+image.preview));}
    for(const variant of collection.variants) {
      assert.ok(!ids.has(variant.id));ids.add(variant.id);choices++;
      assert.ok(variant.page>=collection.page&&variant.page<=collection.endPage);
      assert.ok(variant.reference);assert.ok(variant.label);
      assert.ok(!Object.keys(variant).some(k=>/price|tariff|discount|prix|remise/i.test(k)));
      assert.ok(variant.perPallet===null||variant.perPallet>0);
    }
  }
  assert.ok(choices>=700);
});
test('saved selections resolve only known references and valid quantities', () => {
  const v=catalogue.collections[0].variants[0];
  assert.deepEqual(restoreSelection([{id:v.id,quantity:'2,5'},{id:'invented',quantity:10},{id:v.id,quantity:-3}],catalogue),[{id:v.id,quantity:2.5}]);
  for(const value of ['',0,-1,'abc',Infinity,1000001])assert.equal(quantity(value),null);
});
test('dimension searches accept multiplication signs and spaces', () => {
  const reference = normalizeCatalogueSearch('Luserna Gris 15x31 ép. 2/4 cm');
  for (const search of ['15x31', '15×31', '15 × 31', '15 X31', '15x 31', '15 ✕ 31']) {
    assert.ok(reference.includes(normalizeCatalogueSearch(search)), search);
  }
  assert.equal(normalizeCatalogueSearch('60 × 60 × 2'), '60x60x2');
  assert.equal(normalizeCatalogueSearch('Extérieur'), 'exterieur');
});
test('saved selections preserve every documented article beyond one hundred lines', () => {
  const saved = catalogue.collections.flatMap(c => c.variants.map(v => ({id:v.id, quantity:2.5})));
  assert.ok(saved.length > 100);
  assert.deepEqual(restoreSelection(saved, catalogue), saved);
});
test('quote preserves exact reference, source page, quantity and the four pallet minimum', () => {
  const c=catalogue.collections[0],v=c.variants[0],selection=[{id:v.id,quantity:50}];
  const q=buildQuote({catalogue,selection,customer});
  assert.equal(q.to,'export@saxso.it');assert.equal(q.cc,'jerome@leroyfactory.fr');
  assert.ok(q.body.includes(v.reference));assert.ok(q.body.includes(`page ${v.page}`));
  assert.ok(q.body.includes('50 '+v.unit));assert.ok(q.body.includes('Minimum de commande : 4 palettes.'));
  for(const pallets of [0,1,3,3.9,NaN])assert.throws(()=>buildQuote({catalogue,selection,customer:{...customer,pallets}}));
  assert.throws(()=>buildQuote({catalogue,selection:[],customer}));
  assert.throws(()=>buildQuote({catalogue,selection:[{id:'unknown',quantity:4}],customer}));
  assert.equal(palletEstimate(selection,catalogue).known,50/v.perPallet);
});
