import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../assets/data/fenice-catalogue.json',import.meta.url)));
const seo=JSON.parse(readFileSync(new URL('../assets/data/fenice-seo-pages.json',import.meta.url)));
const root=new URL('../',import.meta.url);
test('La Fenice merges the official catalogues without duplicate collection identities',()=>{
 assert.equal(data.catalogues.length,17);
 assert.equal(data.collections.length,82);
 for(const key of ['id','slug'])assert.equal(new Set(data.collections.map(p=>p[key])).size,data.collections.length);
 const cats=new Set(data.catalogues.map(c=>c.id));
 for(const p of data.collections){
  assert.ok(p.name&&p.formats&&p.images?.length,p.name);
  assert.ok(p.sources.some(s=>s.page>0),p.name+' has a catalogue page');
  assert.ok(p.catalogueIds.every(id=>cats.has(id)),p.name+' catalogue membership');
 }
});
test('each collection has a local lightweight cover and indexable page',()=>{
 for(const p of data.collections){
  assert.ok(existsSync(new URL(p.coverImage,root)),p.name+' cover');
  for(const image of p.images){const url=typeof image==='string'?image:image.url;assert.ok(url.startsWith('https://')||existsSync(new URL(url,root)),p.name+' image');}
  const html=readFileSync(new URL('la-fenice-'+p.slug+'.html',root),'utf8');
  assert.match(html,/<h1[ >]/);
  assert.ok(html.includes('https://leroyfactory.fr/la-fenice-'+p.slug+'.html'));
 }
 assert.equal(seo.pages.length,91);
});
test('Home products keep their piece quantities and do not become tiles',()=>{
 const home=data.collections.filter(p=>p.unit==='pièce');
 assert.equal(home.length,5);
 assert.ok(home.every(p=>p.productType==='Mobilier et vasques'));
});
test('public catalogue and SEO never include professional price values',()=>{
 const walk=v=>{if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){assert.ok(!/^(proPrice|purchasePrice|purchaseHT|prixAchat|amount|price|tarifHT)$/i.test(k),k);walk(x);}};
 walk(data);walk(seo);
 for(const p of seo.pages){const html=readFileSync(new URL(p.path,root),'utf8');assert.doesNotMatch(html,/"@type"\s*:\s*"Offer"/);}
});
