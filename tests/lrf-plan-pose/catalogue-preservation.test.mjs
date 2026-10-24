import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {mergeCatalogue} from '../../assets/js/lrf-plan-pose/catalogue.mjs';
const base=JSON.parse(readFileSync(new URL('../../assets/js/lrf-plan-pose/catalogue.json',import.meta.url))),review=JSON.parse(readFileSync(new URL('../../assets/js/lrf-plan-pose/catalogue-review.json',import.meta.url)));
test('la revue complète les images absentes sans remplacer les HD ELIOS et VIEW déjà intégrées',()=>{
 const merged=mergeCatalogue(base,review);
 for(const p of base.products.filter(p=>p.preview))assert.deepEqual(merged.products.find(m=>m.key===p.key),p);
 for(const collection of ['Quercia','Corso','Golden Stone']){const entries=base.products.filter(p=>p.collection===collection);assert.ok(entries.length,collection);for(const p of entries)assert.deepEqual(merged.products.find(m=>m.key===p.key),p);}
 for(const [key,patch]of Object.entries(review.previews)){const original=base.products.find(p=>p.key===key);if(original&&!original.preview)assert.equal(merged.products.find(p=>p.key===key).preview,patch.preview);}
 const coco=base.products.filter(p=>/coco/i.test(p.collection));for(const p of coco)assert.deepEqual(merged.products.find(m=>m.key===p.key),p);
});
test('une référence de revue dupliquée ne remplace pas une référence du catalogue',()=>{const p={key:'HD',preview:'https://fabricant/hd.webp',textureFaces:['face1','face2']},m=mergeCatalogue({products:[p]},{products:[{key:'HD',preview:'sample.webp'}],previews:{HD:{preview:'sample.webp'}}});assert.equal(m.products.length,1);assert.deepEqual(m.products[0],p);});
