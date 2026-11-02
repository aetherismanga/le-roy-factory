import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';
import {TOP_OPTIONS,topSelection,CATALOGUE} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {CABINET_FORMATS,topAvailable} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {initialDraft,normalizeDraft,draftProject} from '../functions/neobath-anima/studio-adapter/commerce/guided.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';
import {validateProject,encodeProject,decodeProject} from '../functions/neobath-anima/studio-adapter/projects.js';
import {transformCommonStudioSource,studioBody,brandCSS} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';

const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const visual=JSON.parse(read('assets/data/neobath-anima-visuals.json'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const ids=html=>new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]));

test('every compatible source plan and basin survives the original guided project round trip',()=>{
  const errors=[];let count=0;
  for(const option of TOP_OPTIONS){
    const width=[80,100,120,60].find(w=>topAvailable(option.id,w,'two'));
    if(!width)continue;
    try{
      const draft=normalizeDraft({...initialDraft(),width,top:option.id});
      const project=validateProject(draftProject(draft));
      assert.deepEqual(decodeProject(encodeProject(project)),project);
      const q=quoteProject(project);assert.ok(q.rows.length>=1);
      assert.equal(q.rows[0].ref,CATALOGUE.products.find(p=>p.id===CABINET_FORMATS[0].productsByWidth[width].id)?.ref);
      const selected=topSelection(option.id,width,'two');
      if(selected?.product?.prices?.length)assert.ok(selected.product.prices.some(p=>p.key===draft.basinColor));
      count++;
    }catch(error){errors.push({id:option.id,message:error.message});}
  }
  assert.ok(count>100,`Only ${count} source top modes checked`);assert.deepEqual(errors,[]);
});

test('every stock furniture width retains exact Anima identifiers and dimensions in a Studio One project',()=>{
  let count=0;
  for(const format of CABINET_FORMATS)for(const width of format.allowedWidths){
    const project=validateProject(draftProject({...initialDraft(),format:format.id,width}));
    const cabinet=project.items.find(i=>i.type==='cabinet'),source=format.productsByWidth[width];
    assert.equal(cabinet.settings.format,format.id);assert.equal(cabinet.settings.width,width);
    assert.equal(cabinet.placement.height,Math.round(format.base*100));
    assert.equal(quoteProject(project).rows[0].ref,source.ref||'À confirmer');
    assert.ok(!['three','one-xl','two-xl'].includes(cabinet.settings.format));
    count++;
  }
  assert.equal(count,40); // Two separately selectable columns complete the 42 source modules.
});

test('real photographs exist for every selectable Anima module, plan, basin and mirror',()=>{
  const missing=[];
  for(const product of CATALOGUE.products.filter(p=>['module','worktop','basin','mirror'].includes(p.category))){
    const asset=visual.products[product.id];
    if(!asset?.image){missing.push(product.id);continue;}
    assert.match(asset.image,/^https:\/\/leroyfactory\.fr\/assets\/img\/neobath-anima-2026\//);
    const path=new URL(asset.image).pathname.slice(1),bytes=readFileSync(new URL(path,root));
    assert.ok(bytes.length>96,path);assert.equal(bytes.toString('ascii',0,4),'RIFF',path);
    assert.equal(bytes.toString('ascii',8,12),'WEBP',path);
    assert.equal(asset.upscaled,false,product.id);
    assert.ok(asset.sourcePdfPage||asset.source,product.id);
  }
  assert.deepEqual(missing,[]);
});

test('the original Studio One landing receives a real HD room photograph, not a product thumbnail',async()=>{
  const previous=globalThis.NEOBATH_ANIMA_VISUALS;
  globalThis.NEOBATH_ANIMA_VISUALS=visual;
  try{
    const runtime=await import('../functions/neobath-anima/studio-adapter/commerce/catalog.js?qa-runtime-visuals');
    const source=Object.values(visual.compositions).find(photo=>photo.image===runtime.CATALOG.hero);
    assert.ok(source,'Landing hero must be a manufacturer room photograph');
    assert.ok(source.width>=1200&&source.height>=1000,'Landing hero must retain native HD pixels');
  }finally{if(previous===undefined)delete globalThis.NEOBATH_ANIMA_VISUALS;else globalThis.NEOBATH_ANIMA_VISUALS=previous;}
});

test('the six finishes use sourced pixels and preserve the documented Rovere front orientation',()=>{
  assert.equal(Object.keys(visual.finishes).length,6);
  for(const finish of CATALOGUE.finishes){
    const v=visual.finishes[finish.id];assert.ok(v,finish.id);assert.equal(v.upscaled,false);
    for(const path of [v.texture,v.swatch,v.frontTexture,v.sideTexture].filter(Boolean))assert.ok(statSync(new URL(new URL(path).pathname.slice(1),root)).size>96,path);
  }
  assert.equal(visual.finishes['rovere-alba'].woodGrainDirection,'horizontal-on-pura-drawer-fronts');
  assert.notEqual(visual.finishes['rovere-alba'].frontTexture,visual.finishes['rovere-alba'].sideTexture);
  assert.ok(visual.facades.pura.image&&visual.facades.ribelle.image);
  assert.notEqual(visual.facades.pura.image,visual.facades.ribelle.image);
});

test('both private page templates retain every original Studio One control and remove the rejected interface',()=>{
  for(const path of ['studio-one/src/commerce/home.html','studio-one/src/atelier.html']){
    const original=read(path),body=studioBody(original);
    const originalBody=original.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1];
    for(const id of ids(originalBody))if(id!=='studio-logo-transparent')assert.ok(ids(body).has(id),`${path}: ${id}`);
    assert.ok(!body.includes('<script'));assert.ok(!body.includes('RANDAL STUDIO ONE'));
    assert.ok(!body.includes('Tout commence par un meuble.'));
    assert.ok(!body.includes('Votre atelier, vos projets.'));
    assert.ok(!body.includes('Basic réversible, Zen LED, Ilse LED'),'Original RANDAL mirror family names must not be relabelled Neobath');
    assert.match(body,/NEOBATH/);
  }
});

test('the source adaptation leaves a syntactically valid original 3D atelier',()=>{
  const adapted=transformCommonStudioSource(read('studio-one/src/app.js'),'app.js');
  parse(adapted,{ecmaVersion:'latest',sourceType:'module'});
  for(const marker of ['function restoreProject(','function collectProject(','function setWidth(','function selectTop(','new Composition(','new T.WebGLRenderer('])assert.ok(adapted.includes(marker),marker);
  assert.ok(!adapted.includes("makeModel({width:s.width/100,format:s.format")||adapted.includes("topAvailable(s.top,s.width,s.format"));
  assert.ok(!adapted.includes("cabinetHeightLabel(f)+' · P 46 cm'"),'Wall cabinets must retain their actual 22cm depth');
});

test('the published private artifacts prove the real Studio One entry points, styles and renderer were reused',()=>{
  const path='functions/neobath-anima/studio-dist/',release=JSON.parse(read(path+'release.json'));
  assert.equal(release.engine,'studio-one');assert.equal(release.provenance.originalInterface,true);assert.equal(release.provenance.originalRenderer,true);
  assert.deepEqual(release.provenance.entries,['studio-one/src/commerce/home.js','studio-one/src/app.js']);
  for(const entry of [...release.provenance.entries,'studio-one/src/model.js','studio-one/src/composition.js'])assert.equal(release.provenance.sourceHashes[entry],digest(readFileSync(new URL(entry,root))),entry);
  assert.ok(read(path+'accueil.css').startsWith(read('studio-one/src/commerce/home.css')));
  assert.ok(read(path+'atelier.css').includes(read('studio-one/dist/style.css')));
  assert.ok(read(path+'atelier.css').includes(read('studio-one/src/mobile.css')));
  assert.ok(read(path+'accueil.css').endsWith(brandCSS));
  for(const [name,hash]of Object.entries(release.assets))assert.equal(digest(readFileSync(new URL(path+name,root))),hash,name);
  assert.ok(!Object.keys(release.provenance.sourceHashes).some(p=>p==='functions/neobath-anima/app-source.mjs'));
});
