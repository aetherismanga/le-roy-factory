import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const release=JSON.parse(read('assets/data/seo-reach-pages.json'));
const sitemap=read('sitemap.xml');
test('every new public guide has one H1, unique canonical, description and valid structured data',()=>{
 assert.ok(release.pages.length>=21);const canonical=new Set();
 for(const page of release.pages){const s=read(page.file);assert.equal((s.match(/<h1\b/g)||[]).length,1,page.file);assert.ok(s.includes('href="https://leroyfactory.fr/'+page.file+'"'),page.file);assert.match(s,/<meta name="description" content="[^"]+"/);assert.ok(!s.includes('noindex'));assert.match(s,/<img[^>]+assets\/img\/logo03lrf\.png/);canonical.add(page.file);assert.ok(sitemap.includes('<loc>https://leroyfactory.fr/'+page.file+'</loc>'));
  for(const m of s.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)){const d=JSON.parse(m[1]);assert.ok(!d['@graph'].some(n=>n['@type']==='LocalBusiness'),'No fictitious city offices');}
 }assert.equal(canonical.size,release.pages.length);
});
test('the sitemap preserves all existing pages and uses absolute image URLs',()=>{
 const before=execFileSync('git',['show','9d92a2312b5976c088cb018caa223330f15fb131:sitemap.xml'],{encoding:'utf8'});
 for(const m of before.matchAll(/<loc>(.*?)<\/loc>/g))assert.ok(sitemap.includes('<loc>'+m[1]+'</loc>'),m[1]);
 for(const m of sitemap.matchAll(/<image:loc>(.*?)<\/image:loc>/g))assert.match(m[1],/^https?:\/\//);
 assert.ok(!sitemap.includes('suivi-referencement.html'));
});
test('existing public page scripts and application destinations are preserved',()=>{
 for(const file of ['index.html','configurateurs.html','configurateur-salle-de-bain-3d.html','catalogues.html','fabricants-carrelage-salle-de-bain.html','opal-catalogue-interactif.html','neobath-catalogues-interactifs.html']){
  const before=execFileSync('git',['show','9d92a2312b5976c088cb018caa223330f15fb131:'+file],{encoding:'utf8'});
  const scripts=s=>[...s.matchAll(/<script\b([^>]*)>(.*?)<\/script\s*>/gs)].filter(m=>!m[1].includes('application/ld+json')).map(m=>m[0]);assert.deepEqual(scripts(read(file)),scripts(before),file);
 }
});
test('agent metrics require the existing verified agent gate and remain outside search results',()=>{
 const html=read('suivi-referencement.html'),firebase=read('assets/js/firebase.js'),js=read('assets/js/seo-dashboard.js');
 assert.ok(html.includes('noindex,nofollow,noarchive'));assert.ok(firebase.includes('"suivi-referencement.html"'));assert.ok(js.includes('verifiedAgentProfile(next)'));assert.ok(js.includes("doc(db,'parametres','seoSearchConsole')"));
 assert.ok(!js.includes('localStorage.setItem'));assert.ok(!js.includes('sessionStorage.setItem'));assert.ok(read('parametres.html').includes('href="suivi-referencement.html"'));assert.ok(read('dashboard.html').includes('href="suivi-referencement.html"'));
});
