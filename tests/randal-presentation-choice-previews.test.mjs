import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationProducts} from '../shared/lrf-3d/randal-presentation-products.js';
import {presentationAssetURL,presentationMaterialPreview,presentationChoicePreview} from '../shared/lrf-3d/randal-presentation-choice-previews.js';
import {RANDAL_FLOORS,RANDAL_WALLS} from '../shared/lrf-3d/randal-presentation-catalog.js';
import {COLLECTIONS} from '../shared/lrf-3d/surface-catalog.js';
import {resolveSurfaceTexture} from '../shared/lrf-3d/surface-texture-selection.js';
import {surfaceAssetURL} from '../shared/lrf-3d/texture-loader.js';
import {FINISHES as studioFinishes} from '../studio-one/src/finishes.js';
import {CATALOG as studioCatalog} from '../studio-one/src/commerce/catalog.js';
import {CATALOG as generalCatalog} from '../randal-general/src/commerce/catalog.js';
import * as studio from '../studio-one/src/commerce/guided.js';
import * as general from '../randal-general/src/commerce/guided.js';
import {defaultTop} from '../randal-general/src/configuration.js';

const fieldOf=(products,project,key,context={})=>products.fields(project,context).groups.flatMap(g=>g.fields).find(f=>f.key===key);

test('all eight Studio finishes and columns show their own official manufacturer sample',()=>{
 const products=createPresentationProducts({...studio,catalog:studioCatalog,finishes:studioFinishes}),project=studio.draftProject({...studio.initialDraft(),column:true});
 for(const key of ['finish','columnFinish']){
  const field=fieldOf(products,project,key);assert.equal(field.choices.length,8);
  for(const choice of field.choices){const finish=studioFinishes.find(f=>f.id===choice.value);assert.equal(choice.preview.type,'image');assert.equal(choice.preview.src,'assets/'+finish.swatch);assert.match(choice.preview.alt,new RegExp(finish.name));}
 }
 const changed=products.apply(project,{finish:'NOGAL'}),before=fieldOf(products,project,'finish'),after=fieldOf(products,changed,'finish');
 assert.notEqual(before.value,after.value);assert.notEqual(before.choices.find(c=>c.value===before.value).preview.src,after.choices.find(c=>c.value===after.value).preview.src);
 assert.equal(after.choices.find(c=>c.value===after.value).preview.src,'assets/finishes/20261022/nogal-swatch.webp');
});

test('every General collection uses exact native finish metadata, with real wood imagery and named solid swatches',()=>{
 const products=createPresentationProducts({...general,catalog:generalCatalog}),collections=new Set();
 for(const model of generalCatalog.models){
  collections.add(model.collection);const project=general.draftProject({...general.initialDraft(model.collection),format:model.id,width:model.widths[0],finish:model.finishes[0],top:defaultTop(model.id)}),field=fieldOf(products,project,'finish');
  assert.deepEqual(field.choices.map(c=>c.value),model.finishes);
  for(const choice of field.choices){const finish=generalCatalog.finishes.find(f=>f.id===choice.value);assert.deepEqual(choice.preview,presentationMaterialPreview(finish));assert.ok(choice.preview,choice.value);if(finish.kind==='Bois')assert.equal(choice.preview.type,'image',choice.value);if(choice.preview.type==='color')assert.equal(choice.preview.hex,finish.hex);}
 }
 assert.equal(collections.size,11);
});

test('basin colours, metal mirror frames and counter finishes expose only the selected native sample',()=>{
 for(const [adapter,C,finishes] of [[studio,studioCatalog,studioFinishes],[general,generalCatalog,generalCatalog.finishes]]){
  const products=createPresentationProducts({...adapter,catalog:C,finishes}),project=adapter.draftProject({...adapter.initialDraft(),top:'neris',mirror:'round'}),basin=fieldOf(products,project,'basinColor',{itemId:project.items.find(i=>i.type==='cabinet').id,part:'basin'});
  assert.ok(basin.choices.length>1);for(const choice of basin.choices)assert.equal(choice.preview.hex,C.vesselColors.find(c=>c.code===choice.value).hex);
  const frame=fieldOf(products,project,'mirrorFinish');assert.deepEqual(frame.choices.map(c=>c.preview.hex),['#222728','#bd9b60','#94735b','#bec7ca']);
  if(C.topFinishes){const top=fieldOf(products,project,'topFinish',{itemId:project.items.find(i=>i.type==='cabinet').id,part:'basin'});assert.ok(top.choices.length>1);for(const choice of top.choices)assert.deepEqual(choice.preview,presentationMaterialPreview(C.finishes.find(f=>f.id===choice.value)));}
 }
});

test('floors and walls preview the same manufacturer sources as the scene, including the corrected Slate sample',()=>{
 for(const choice of [...RANDAL_FLOORS,...RANDAL_WALLS]){
  const preview=presentationChoicePreview(choice);assert.ok(preview,choice.id);assert.equal(preview.alt.includes(choice.name),true);
  if(choice.collection==='Peinture'){assert.equal(preview.type,'color');assert.equal(preview.hex,COLLECTIONS.Peinture.colors.find(c=>c.id===choice.color).hex);continue;}
  const resolved=resolveSurfaceTexture(choice.collection,choice.color,'max',choice),expected=choice.texture?.file||resolved.files[0];assert.equal(preview.type,'image');assert.equal(preview.src,surfaceAssetURL(expected));
  if(choice.collection==='Stone Icon')assert.match(preview.caption,/04S6903/);
  if(choice.decor){assert.match(preview.src,/allure-.*-panel-native\.jpg/);assert.match(preview.caption,/Panneau décor fabricant/);}
 }
 assert.equal(presentationChoicePreview(RANDAL_FLOORS.find(c=>c.id==='slate-beige')).src,'assets/randal-presentation/slate-gold-elios.jpg');
 assert.equal(RANDAL_WALLS.filter(c=>c.collection==='Peinture').length,7);
});

test('unavailable and unknown samples never borrow another finish or colour image',()=>{
 assert.equal(presentationMaterialPreview(null),null);assert.equal(presentationMaterialPreview({id:'unknown',name:'Inconnue'}),null);assert.equal(presentationMaterialPreview({id:'unknown',hex:'not-a-colour'}),null);
 assert.equal(presentationChoicePreview(null),null);assert.equal(presentationChoicePreview({id:'unknown',collection:'Allure',color:'unknown'}),null);assert.equal(presentationChoicePreview({id:'unknown',collection:'unknown',color:'honey'}),null);
 const products=createPresentationProducts({...studio,catalog:studioCatalog,finishes:[studioFinishes[0]]}),project=studio.draftProject(studio.initialDraft()),field=fieldOf(products,project,'finish'),alba=field.choices.find(c=>c.value==='ALBA');
 assert.equal(alba.preview.type,'color');assert.equal(alba.preview.hex,studioCatalog.finishes.find(f=>f.id==='ALBA').hex);assert.notEqual(alba.preview.src,field.choices.find(c=>c.value==='ROBLE').preview.src);
 for(const value of ['/assets/exact.webp','assets/exact.webp','https://example.test/exact.webp','data:image/svg+xml,test'])assert.equal(presentationAssetURL(value),value);
 assert.equal(presentationAssetURL('finishes/exact.webp'),'assets/finishes/exact.webp');assert.equal(presentationAssetURL(undefined),'');
});
