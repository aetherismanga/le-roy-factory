import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveShowroomHDGallery} from '../shared/lrf-3d/showroom-hd-gallery.js';
import {COLLECTIONS,formatsForColor} from '../shared/lrf-3d/surface-catalog.js';
import {surfaceAssetURL} from '../shared/lrf-3d/texture-loader.js';

const elios={id:'elios-ceramica',name:'Elios Ceramica'};
test('a clicked wall keeps its exact original HD image first and strips non-media fields',()=>{
 const exact='/manufacturer-materials/elios/wp-content/uploads/2024/10/creta_BISCOTTO_tacca_z.jpg';
 const gallery=resolveShowroomHDGallery(elios,{id:'elios-creta',name:'Creta',selectedColor:'biscotto',surfaceRecipe:{collection:'Creta',colorId:'biscotto'},hdImage:exact,hdImages:[{url:exact,label:'Biscotto'},{url:'https://example.com/native-other.webp',label:'Autre face',kind:'tile',formats:'120x120',purchasePrice:42}],image:'https://example.com/thumb.webp'});
 assert.equal(gallery[0].url,exact);assert.equal(gallery.filter(item=>item.url===exact).length,1,'duplicate images are shown once');
 assert.equal(gallery[0].kind,'tile');assert.deepEqual(gallery.find(item=>item.label==='Autre face').formats,['120x120']);
 assert(!JSON.stringify(gallery).includes('purchasePrice'));assert(!JSON.stringify(gallery).includes(':42'));
});

test('Yosemite uses the native manufacturer sample and never reconstructed editor faces',()=>{
 const collection={id:'elios-yosemite',name:'Yosemite',selectedColor:'honey',image:'https://example.com/ambience.jpg'},gallery=resolveShowroomHDGallery(elios,collection),honey=COLLECTIONS.Yosemite.colors.find(c=>c.id==='honey');
 assert.equal(gallery[0].url,surfaceAssetURL(honey.manufacturerSample));assert.equal(gallery[0].color,'Honey');
 assert.equal(gallery[0].native,true);assert.deepEqual(gallery[0].formats,formatsForColor('Yosemite','honey').map(f=>f.label||f.id));
 assert(gallery.every(item=>!/reconstruct|generated|synthetic/i.test(item.url)));
 const unknown=resolveShowroomHDGallery(elios,{...collection,selectedColor:'unknown-retired-color'});
 assert.equal(unknown.length,1,'unknown colour cannot become the first other colour');assert.equal(unknown[0].url,collection.image);
});

test('VIEW gallery reads genuine fullUrl fields and keeps exact original colour names',()=>{
 const source=readFileSync(new URL('../assets/js/inspirations-view-selection-media.js',import.meta.url),'utf8'),data=JSON.parse(source.match(/const media = (\{.*?\});/s)[1]);
 const gallery=resolveShowroomHDGallery({name:'View Ceramica'},{id:'view-ardenne',name:'ARDENNE'}),full=data.galleries.ardenne[0];
 assert.equal(gallery[0].url,new URL(full.fullUrl,'https://leroyfactory.fr/').href);assert.equal(gallery[0].preview,new URL(full.thumbnail,'https://leroyfactory.fr/').href);
 const color=data.galleries.ardenne.find(item=>item.color==='Grigio');assert(gallery.some(item=>item.url===new URL(color.fullUrl,'https://leroyfactory.fr/').href&&item.color==='Grigio'));
 assert(!gallery.some(item=>item.url.includes('-preview.')),'native dialog never promotes preview files by filename guessing');
 const retired=resolveShowroomHDGallery({name:'View Ceramica'},{id:'view-ardenne',name:'ARDENNE',selectedColor:'retired-unlisted-colour',image:'https://example.com/own-collection-preview.webp'});
 assert.deepEqual(retired,[{url:'https://example.com/own-collection-preview.webp',label:'ARDENNE',kind:'ambience'}],'unknown VIEW colour never becomes another named colour from the public gallery');
});

test('La Fenice and BioPietra use only their own reviewed original media fields',()=>{
 const fenice=JSON.parse(readFileSync(new URL('../assets/data/fenice-catalogue.json',import.meta.url))).collections.find(c=>c.id==='fenice-allure');
 const gallery=resolveShowroomHDGallery({name:'La Fenice'},{id:fenice.id,name:fenice.name});
 assert.equal(gallery[0].url,new URL(fenice.swatches[0].original,'https://leroyfactory.fr/').href);assert.equal(gallery[0].color,fenice.swatches[0].name);
 assert(!gallery.some(item=>item.label.includes('Fenix')||item.url.includes('/ELIOS_')),'homonymous collections from another brand never enter the gallery');
 const bio=JSON.parse(readFileSync(new URL('../assets/data/biopietra-catalogue.json',import.meta.url))).collections.find(c=>c.id==='biopietra-borgo-antico'),bioGallery=resolveShowroomHDGallery({name:'BioPietra'},{id:bio.id,name:bio.name});
 assert.equal(bioGallery[0].url,bio.images[0].url);assert(bioGallery.every(item=>bio.images.some(source=>source.url===item.url)));
});

test('unknown collections keep their own image and unsafe URLs are rejected',()=>{
 assert.deepEqual(resolveShowroomHDGallery({name:'Elios Ceramica'},{id:'not-found',name:'Not Found',image:'https://example.com/native.jpg'}),[{url:'https://example.com/native.jpg',label:'Not Found',kind:'ambience'}]);
 assert.deepEqual(resolveShowroomHDGallery(elios,{id:'unknown',name:'Unknown',hdImage:'javascript:alert(1)',gallery:[{url:'data:text/html,harmful'}]}),[]);
 assert.deepEqual(resolveShowroomHDGallery(elios,null),[]);
});


test('distinct native images with the same label remain individually identifiable without losing a face',()=>{
 const images=[{url:'https://example.com/face-one.jpg',label:'Sauge',kind:'tile'},{url:'https://example.com/face-two.jpg',label:'Sauge',kind:'tile'},{url:'https://example.com/room.jpg',label:'Sauge',kind:'ambience'}];
 const gallery=resolveShowroomHDGallery({name:'Test'},{id:'test',name:'Test',hdImages:images});
 assert.deepEqual(gallery.map(entry=>entry.url),images.map(entry=>entry.url),'every distinct reviewed source remains in its original order');assert.deepEqual(gallery.map(entry=>entry.kind),images.map(entry=>entry.kind));
 assert.equal(new Set(gallery.map(entry=>entry.label)).size,3);assert.match(gallery[0].label,/matière 1 \/ 3$/);assert.match(gallery[1].label,/matière 2 \/ 3$/);assert.match(gallery[2].label,/ambiance 3 \/ 3$/);
});
