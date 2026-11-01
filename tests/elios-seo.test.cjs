const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const search=require('../assets/js/elios-discovery-search.js'),{loadCatalogue}=require('../scripts/elios-public-source.cjs');
const scope={window:{}};vm.runInNewContext(fs.readFileSync('assets/js/elios-discovery-data.js','utf8'),scope);globalThis.LRF_ELIOS_SEARCH_META=scope.window.LRF_ELIOS_SEARCH_META;
const metadata=globalThis.LRF_ELIOS_SEARCH_META;
for(const q of ['40x60','40 60','40 × 60','4060','carrelage imitation travertin 40x60','caro 4060 Elios Roma'])test('Roma found with '+q,()=>assert.equal(search.matches({slug:'roma'},q),true));
for(const q of ['60x60','6060','60 60'])test('61 × 61 Roma found in nominal '+q,()=>assert.equal(search.matches({slug:'roma'},q),true));
test('exact decimal query does not match a different actual size',()=>{assert.equal(search.matches({slug:'roma'},'40,6x60,9'),true);assert.equal(search.matches({slug:'roma'},'40,6x60,4'),false)});
test('near family never fabricates incompatible formats',()=>{assert.equal(search.matches({slug:'quercia'},'40x60'),false);assert.equal(search.family('61x61'),'60x60');assert.equal(search.family('40,6x60,9'),'40x60');assert.equal(search.family('45x65'),'45x65')});
test('all 52 public source collections are represented without changing dimensions',()=>{const {window:w}=loadCatalogue();assert.equal(w.ELIOS_CATALOGUE.length,52);assert.equal(Object.keys(metadata).length,52);for(const p of w.ELIOS_CATALOGUE)assert.deepEqual([...metadata[p.slug].formats],[...p.formats],p.slug)});
test('only confirmed travertine and polish appear for those intents',()=>{assert.equal(search.matches({slug:'roma'},'travertin'),true);assert.equal(search.matches({slug:'sedimenti'},'travertin'),false);assert.equal(search.matches({slug:'mysterium'},'poli 60x120'),true);assert.equal(search.matches({slug:'azuli-mood'},'poli'),false);assert.equal(search.matches({slug:'dynasty'},'poli'),false)});
test('public search export never contains prices, stock, auth or clients',()=>{const forbidden=/^(?:price|purchase|tariff|stock|token|password|clients?|customers?|refs|reference)/i;function visit(x){if(!x||typeof x!=='object')return;for(const [k,v]of Object.entries(x)){assert.equal(forbidden.test(k),false,k);visit(v)}}visit(metadata)});
test('SEO source reads cannot call network, current data or pricing services',()=>{const source=fs.readFileSync('scripts/elios-public-source.cjs','utf8');assert.ok(!source.includes('fetch('));assert.ok(!source.includes('https.get('));assert.ok(!source.includes('process.env'))});

test('Allure exposes an exact named image and its original for each of its nine colours',()=>{
 const {window:w}=loadCatalogue(),product=w.ELIOS_CATALOGUE.find(p=>p.slug==='allure');
 const html=fs.readFileSync('elios-allure.html','utf8');
 const encode=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 assert.equal(product.colors.length,9);
 for(const color of product.colors){
  const images=w.ELIOS_COLOR_MEDIA?.variants?.allure?.[color];
  assert.ok(images?.length,'Missing exact Allure colour '+color);
  const src=images[0],asset=w.ELIOS_COLOR_MEDIA.assets?.[src]||{};
  const original=asset.original||src,thumbnail=asset.thumbnail||src;
  assert.ok(html.includes('coloris '+encode(color)),color+' caption');
  assert.ok(html.includes('href="'+encode(original.startsWith('assets/')?'/'+original:original)+'"'),color+' original');
  assert.ok(html.includes('src="'+encode(thumbnail.startsWith('assets/')?'/'+thumbnail:thumbnail)+'"'),color+' thumbnail');
 }
});

test('every added collection visual preserves its preview and original in the public page',()=>{
 const {window:w}=loadCatalogue(),media=w.ELIOS_COLOR_MEDIA;
 const encode=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const publicUrl=src=>src.startsWith('assets/')?'/'+src:src;
 assert.ok(media&&Object.keys(media.variants||{}).length,'New colour media source is loaded');
 for(const [slug,variants] of Object.entries(media.variants||{})){
  const html=fs.readFileSync('elios-'+slug+'.html','utf8');
  for(const [color,images] of Object.entries(variants))for(const src of images){
   const asset=media.assets?.[src]||{},original=asset.original||src,thumbnail=asset.thumbnail||src;
   assert.ok(html.includes('href="'+encode(publicUrl(original))+'"'),slug+' '+color+' original');
   assert.ok(html.includes('src="'+encode(publicUrl(thumbnail))+'"'),slug+' '+color+' preview');
   for(const file of [original,thumbnail])if(file.startsWith('assets/'))assert.ok(fs.existsSync(file),file);
  }
 }
});
