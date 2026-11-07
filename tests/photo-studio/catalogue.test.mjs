import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SOURCES,buildCatalogue,adaptCommercial,parseFormat} from '../../scripts/build-photo-studio-catalogue.mjs';
import {filterProducts,resolveSavedProduct,normalizeSearch} from '../../assets/js/lrf-photo-studio/catalogue.mjs';
const input=Object.fromEntries(SOURCES.map(path=>[path,readFileSync(new URL('../../'+path,import.meta.url),'utf8')]));
const catalogue=buildCatalogue(input);
test('all canonical exact SKUs retain identities; no collisions and coverage balances',()=>{
 const canonical=JSON.parse(input['shared/lrf-3d/commercial-surfaces.json']).products;
 for(const p of canonical){const adapted=catalogue.allProducts.find(row=>row.id===p.key);assert.ok(adapted,p.key);for(const k of ['reference','color','collection','format','finish'])assert.equal(adapted[k],p[k]||'',p.key+' '+k);}
 assert.equal(new Set(catalogue.allProducts.map(p=>p.id)).size,catalogue.allProducts.length);
 for(const c of catalogue.coverage.manufacturers)assert.equal(c.records,c.eligible+c.withoutTexture+c.withoutDimensionsOrUsage+c.unsupportedLayout+c.other);
 assert.ok(catalogue.coverage.manufacturers.find(c=>c.manufacturer==='LA FENICE'));
});
test('at least five existing genuine Elios and View variants, never price fields or artificial textures',()=>{
 for(const brand of ['ELIOS','VIEW'])assert.ok(catalogue.products.filter(p=>p.manufacturer===brand).length>=5);
 const forbidden=/price|prix|purchase|tariff|cost|tokenSecret/i;
 const walk=value=>{if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){assert.ok(!forbidden.test(key),key);walk(item);}};
 walk(catalogue.products);
 for(const p of catalogue.products){assert.ok(p.photoStudioEligible);assert.ok(p.usage.includes('floor'));assert.ok(p.widthMm>0&&p.heightMm>0);assert.ok(p.textureFaces.length);assert.ok(['manufacturer-face','reference-verified-manufacturer-face','manufacturer-catalogue-full-face'].includes(p.textureProvenance.kind));assert.equal(p.patternType,'tiles');}
});
test('unknown colors, missing format, reconstructed texture and nonrectangular shapes remain excluded',()=>{
 const c=JSON.parse(input['shared/lrf-3d/manufacturer-surfaces.json']),p=JSON.parse(input['shared/lrf-3d/commercial-surfaces.json']).products.find(p=>p.key==='ELIOS|00Y2C00');
 for(const patch of [{color:'Unknown',colorId:'unknown'},{format:'61x61'},{reference:'wrong'}]){const row=adaptCommercial([{...p,...patch}],c,'fixture')[0];assert.equal(row.photoStudioEligible,false);}
 const reconstructed=structuredClone(c);const color=reconstructed.find(c=>c.name==='Quercia').colors.find(c=>c.id==='white');color.textureProvenance={kind:'ai-reconstruction',generated:true};color.textureVariantsByReference={};
 assert.equal(adaptCommercial([p],reconstructed,'fixture')[0].photoStudioEligible,false);
});
test('usual format writing is searchable without commercial substitution',()=>{
 assert.equal(normalizeSearch('60 × 60'),'60x60');assert.equal(normalizeSearch('23,4 x 119,5'),'23.4x119.5');
 const matches=filterProducts(catalogue.products,{query:'60 × 60'});assert.ok(matches.length);assert.ok(matches.every(p=>p.format==='60x60'));
 const sameSize=filterProducts(catalogue.products,{query:'61x61'});assert.equal(sameSize.length,0);
 assert.deepEqual(parseFormat('23,4 × 119,5 cm'),{widthMm:234,heightMm:1195});assert.equal(parseFormat('Sur mesure'),null);
});
test('exact saved identity is never silently replaced',()=>{
 assert.equal(resolveSavedProduct('deleted|reference',catalogue.products),null);
 const p=catalogue.products[0];assert.equal(resolveSavedProduct(p.id,catalogue.products),p);
});
test('a new source SKU appears at build; test source stays in memory only',()=>{
 const original=JSON.parse(input['shared/lrf-3d/commercial-surfaces.json']);const known=original.products.find(p=>p.key==='ELIOS|00Y2C00');
 original.products.push({...known,key:'ELIOS|PHOTO-STUDIO-BUILD-FIXTURE'});
 const updated=buildCatalogue({...input,'shared/lrf-3d/commercial-surfaces.json':JSON.stringify(original)});
 assert.ok(updated.products.some(p=>p.id==='ELIOS|PHOTO-STUDIO-BUILD-FIXTURE'));
 assert.notEqual(updated.sourceVersion,catalogue.sourceVersion);
 assert.ok(!catalogue.products.some(p=>p.id==='ELIOS|PHOTO-STUDIO-BUILD-FIXTURE'));
});
test('build output is deterministic for the same canonical inputs',()=>{
 assert.equal(JSON.stringify(buildCatalogue(input)),JSON.stringify(catalogue));
 const generated=JSON.parse(readFileSync(new URL('../../assets/js/lrf-photo-studio/catalogue.json',import.meta.url),'utf8'));assert.equal(generated.sourceVersion,catalogue.sourceVersion);assert.deepEqual(generated.products,catalogue.products);
});
test('all eligible textures are byte-for-byte same-origin assets and preserve the tile aspect',()=>{
 const cache=JSON.parse(input['assets/js/lrf-photo-studio/texture-cache.json']).assets;
 const byPath=new Map(Object.values(cache).map(value=>[value.path,value]));
 for(const p of catalogue.products){assert.equal(p.sameOriginTextures,true,p.id);for(const url of new Set([...p.textureFaces,...p.workingTextureFaces])){assert.ok(url.startsWith('/assets/img/lrf-photo-studio/textures/'));const entry=byPath.get(url);assert.ok(entry,url);const bytes=readFileSync(new URL('../../'+url.slice(1),import.meta.url));assert.equal(bytes.length,entry.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);let [w,h]=entry.resolution;if(p.textureRotation%180===90)[w,h]=[h,w];assert.ok(Math.abs(Math.log((w/h)/(p.widthMm/p.heightMm)))<.12,p.id);}}
});

test('audited Slate full catalogue faces admit only their verified 60x120 variants',()=>{
 const slate=catalogue.products.filter(p=>p.manufacturer==='ELIOS'&&p.collection==='Slate');assert.equal(slate.length,10);assert.equal(new Set(slate.flatMap(p=>p.textureFaces)).size,30);
 for(const p of slate){assert.equal(p.format,'60x120');assert.ok(p.reference);assert.equal(p.limitedTextureDefinition,true);assert.equal(p.textureProvenance.kind,'manufacturer-catalogue-full-face');assert.equal(p.textureProvenance.expectedFaces.length,5);assert.equal(p.textureRotation,90);assert.ok(p.textureProvenance.pdfXrefs.every(x=>x>0));assert.equal(p.textureProvenance.manufacturer,'Elios Ceramica');}
 assert.ok(!catalogue.products.some(p=>p.collection==='Slate'&&p.format!=='60x120'));
 const damaged=JSON.parse(input['tools/configurator-materials/elios-faces.json']);damaged.collections.slate.river[0].xref=0;
 const blocked=buildCatalogue({...input,'tools/configurator-materials/elios-faces.json':JSON.stringify(damaged)});
 assert.ok(!blocked.products.some(p=>p.collection==='Slate'&&p.color==='River'));
});
