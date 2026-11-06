import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {SOURCES} from '../scripts/build-photo-studio-catalogue.mjs';
import {preparePhotoStudioCatalogue} from '../scripts/build-photo-studio-site.mjs';

function fixture(t){
  const root=mkdtempSync(join(tmpdir(),'lrf-photo-studio-build-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  for(const path of SOURCES){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),readFileSync(new URL('../'+path,import.meta.url)));}
  return root;
}

test('dedicated build preparation regenerates catalogue from changed canonical SKUs',t=>{
  const root=fixture(t),path=join(root,'shared/lrf-3d/commercial-surfaces.json');
  const source=JSON.parse(readFileSync(path,'utf8'));
  source.products.push({...source.products.find(product=>product.key==='ELIOS|00Y2C00'),key:'ELIOS|PHOTO-STUDIO-BUILD-FIXTURE'});
  writeFileSync(path,JSON.stringify(source));
  const result=preparePhotoStudioCatalogue({root});
  const generated=JSON.parse(readFileSync(join(root,'assets/js/lrf-photo-studio/catalogue.json'),'utf8'));
  assert.ok(generated.products.some(product=>product.id==='ELIOS|PHOTO-STUDIO-BUILD-FIXTURE'));
  assert.equal(generated.sourceVersion,result.sourceVersion);
  assert.ok(generated.coverage.sameOriginReady);
});

test('dedicated build refuses an unmirrored canonical face before publication',t=>{
  const root=fixture(t),path=join(root,'assets/js/lrf-photo-studio/texture-cache.json');
  const cache=JSON.parse(readFileSync(path,'utf8'));
  const current=JSON.parse(readFileSync(new URL('../assets/js/lrf-photo-studio/catalogue.json',import.meta.url),'utf8'));
  const face=current.products[0].textureFaces[0];
  const original=Object.keys(cache.assets).find(url=>cache.assets[url].path===face);
  assert.ok(original);
  delete cache.assets[original];
  writeFileSync(path,JSON.stringify(cache));
  assert.throws(()=>preparePhotoStudioCatalogue({root}),/sans textures locales vérifiées/);
  const report=JSON.parse(readFileSync(join(root,'reports/photo-studio/coverage.json'),'utf8'));
  assert.equal(report.sameOriginReady,false);
});
