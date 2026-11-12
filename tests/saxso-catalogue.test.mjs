import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {normalizeCatalogueSearch, quantity, restoreSelection, palletEstimate, buildQuote} from '../assets/js/saxso-selection.mjs';
import {variantPresentation,variantMedia,preferredMediaGroup,nativeImageLayout} from '../assets/js/saxso-catalogue.js';

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


test('the selected reference keeps its own product, format and matter instead of a nearby page photograph', () => {
  const collection={name:'Sakkara',cover:{url:'cover.jpg'},images:[{url:'unrelated-cutout.jpg',width:323,height:190,page:35},{url:'terrace.jpg',width:1600,height:1000}]};
  const variant={label:'Sakkara Grey Sablé, Brossé 60x90 ép. 2 cm',productPhoto:{url:'grey-brushed.jpg',width:323,height:190},materialPhoto:{url:'grey-matter.jpg',width:1800,height:1800,label:'Nuance Grey — matière de référence'}};
  const illustration={url:'format.svg',kind:'illustration',width:1600,height:1200};
  const media=variantMedia(collection,variant,illustration);
  assert.deepEqual(media.map(item=>[item.group,item.url]),[['product','grey-brushed.jpg'],['format','format.svg'],['material','grey-matter.jpg'],['ambience','terrace.jpg']]);
  assert.equal(media[2].label,'Nuance Grey — matière de référence');
  assert.equal(preferredMediaGroup(variant,media),'format','small source pictures must not become the enlarged default');
  assert.equal(preferredMediaGroup(variant,variantMedia(collection,{...variant,productPhoto:{url:'exact-hd.jpg',width:2000,height:1200}},illustration)),'product');
  assert.deepEqual(variantMedia({name:'Matière',images:[]},{label:'Plinthe 8x60 ép. 1 cm'}),[],'no unrelated collection cover is substituted for a missing reference');
});
test('format labels keep exact dimensions and thickness, including skirting and coping references', () => {
  assert.equal(variantPresentation({label:'Plinthe Travertin 8x60 ép. 1 cm'}).format,'8x60 · ép. 1 cm');
  assert.equal(variantPresentation({label:'Margelle 35x100 ép. 4 cm',finish:'Adouci',format:'35 × 100 × 4 cm'}).format,'35 × 100 × 4 cm');
  assert.equal(variantPresentation({label:'Margelle 35x100 ép. 4 cm',finish:'Adouci'}).finish,'Adouci');
});
test('inspection never stretches a low-resolution source and caps magnification at three times the fitted view', () => {
  assert.deepEqual(nativeImageLayout(323,190,1600,900,3),{width:323,height:190,scale:1});
  assert.deepEqual(nativeImageLayout(4000,3000,1000,750,1),{width:1000,height:750,scale:.25});
  assert.deepEqual(nativeImageLayout(4000,3000,1000,750,3),{width:3000,height:2250,scale:.75});
  assert.deepEqual(nativeImageLayout(4000,3000,1000,750,99),nativeImageLayout(4000,3000,1000,750,3));
});

test('a multi-colour source board stays hidden until the selected native material crop is ready',()=>{
  const variant={label:'Galets Rose calibre 15–25 mm',materialPhoto:{url:'colour-board.jpg',width:937,height:752,cropRect:[250,100,200,150],label:'Galets Rose',note:'Nuance de référence, calibre selon la référence.'}};
  assert.deepEqual(variantMedia({name:'Galets',images:[]},variant),[]);
  const detail={...variant.materialPhoto,url:'data:image/svg+xml,cropped',width:200,height:150,kind:'photo',cropApplied:true};
  const media=variantMedia({name:'Galets',images:[]},variant,null,detail);
  assert.equal(media.length,1);assert.equal(media[0].group,'material');
  assert.equal(media[0].url,detail.url);assert.equal(media[0].width,200);
  assert.equal(media[0].label,'Galets Rose');assert.equal(media[0].note,variant.materialPhoto.note);
  assert.deepEqual(nativeImageLayout(media[0].width,media[0].height,1400,800,3),{width:200,height:150,scale:1});
});
