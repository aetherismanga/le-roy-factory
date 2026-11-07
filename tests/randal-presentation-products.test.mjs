import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationProducts} from '../shared/lrf-3d/randal-presentation-products.js';
import * as studio from '../studio-one/src/commerce/guided.js';
import * as general from '../randal-general/src/commerce/guided.js';
import {CATALOG as studioCatalog} from '../studio-one/src/commerce/catalog.js';
import {CATALOG as generalCatalog} from '../randal-general/src/commerce/catalog.js';
import {quoteProject as studioQuote} from '../studio-one/src/commerce/pricing.js';
import {quoteProject as generalQuote} from '../randal-general/src/commerce/pricing.js';
import {defaultTop} from '../randal-general/src/configuration.js';
import {checkedProject as studioChecked} from '../studio-one/src/commerce/flow.js';
import {checkedProject as generalChecked} from '../randal-general/src/commerce/flow.js';

for(const [name,adapter,C,quote,checked]of [['studio',studio,studioCatalog,studioQuote,studioChecked],['general',general,generalCatalog,generalQuote,generalChecked]]){
 const products=createPresentationProducts({...adapter,catalog:C});
 test(name+': every enabled product choice uses an accepted manufacturer reference',()=>{
  const project=adapter.draftProject(adapter.initialDraft()),fields=products.fields(project);
  assert.deepEqual(fields.groups.map(g=>g.id),['cabinet','column','mirror']);
  for(const field of fields.groups.flatMap(g=>g.fields))for(const choice of field.choices){if(choice.disabled)continue;const value=field.key==='mirror'&&!choice.value?null:['width','mirrorSize'].includes(field.key)?Number(choice.value):choice.value,next=products.apply(project,{[field.key]:value});assert.doesNotThrow(()=>checked(next),field.key+' '+value);assert.equal(quote(next).missing.length,0,field.key+' '+value);}
 });
 test(name+': finishes preserve room, surfaces, tap and unrelated project data',()=>{
  const project=adapter.draftProject(adapter.initialDraft());project.title='Client test';project.siteReference='Chantier 12';project.items[0].settings.tap='verified-existing-tap';project.custom={keep:true};
  const field=products.fields(project).groups[0].fields.find(f=>f.key==='finish'),choice=field.choices.find(c=>!c.disabled&&c.value!==field.value),before=structuredClone(project);assert.ok(choice);
  const next=products.apply(project,{finish:choice.value});assert.deepEqual(project,before);assert.deepEqual(next.room,project.room);assert.deepEqual(next.floor,project.floor);assert.deepEqual(next.walls,project.walls);assert.deepEqual(next.layouts,project.layouts);assert.equal(next.items[0].settings.tap,'verified-existing-tap');assert.deepEqual(next.items.slice(1),project.items.slice(1));assert.equal(next.title,'Client test');assert.deepEqual(next.custom,{keep:true});
 });
 test(name+': add, resize and remove real mirrors; LED follows the selected model',()=>{
  const project=adapter.draftProject(adapter.initialDraft());const next=products.apply(project,{mirror:'zen'}),mirror=next.items.find(i=>i.type==='mirror');assert.equal(mirror.settings.led,true);assert.equal(mirror.placement.wall,project.items[0].placement.wall);assert.equal(quote(next).missing.length,0);
  const basic=products.apply(next,{mirror:'basic'});assert.equal(basic.items.find(i=>i.type==='mirror').settings.led,false);assert.equal(quote(basic).missing.length,0);
  assert.equal(products.apply(basic,{mirror:null}).items.some(i=>i.type==='mirror'),false);
 });
 test(name+': mirror LED state survives a size change and resets on a new model',()=>{
  let project=products.apply(adapter.draftProject(adapter.initialDraft()),{mirror:'zen'});project.items.find(i=>i.type==='mirror').settings.led=false;
  project=products.apply(project,{mirrorSize:1});assert.equal(project.items.find(i=>i.type==='mirror').settings.led,false);
  project=products.apply(project,{mirror:'round'});assert.equal(project.items.find(i=>i.type==='mirror').settings.led,false);assert.equal(quote(project).missing.length,0);
 });
 test(name+': added items never overwrite an unrelated item with the same suggested ID',()=>{
  const project=adapter.draftProject(adapter.initialDraft()),other={id:'randal-presentation-mirror',type:'mirror',settings:{mirrorModel:'basic',width:60,height:80,led:false,mirrorFinish:'Noir'},placement:{wall:1,u:125,height:155}};project.items.push(other);
  const next=products.apply(project,{mirror:'zen'});assert.deepEqual(next.items.find(i=>i.id===other.id),other);assert.equal(new Set(next.items.map(i=>i.id)).size,next.items.length);assert.equal(next.items.filter(i=>i.type==='mirror').length,2);
 });
 test(name+': invalid dimensions and unknown references are rejected without mutation',()=>{
  const project=adapter.draftProject(adapter.initialDraft()),before=structuredClone(project);assert.throws(()=>products.apply(project,{width:999}));assert.throws(()=>products.apply(project,{format:'invented'}));assert.deepEqual(project,before);
 });
 test(name+': opening direction and custom placement survive finish changes',()=>{
  let project=adapter.draftProject(adapter.initialDraft());const columns=products.fields(project).groups.find(g=>g.id==='column').fields[0],choice=columns.choices.find(c=>!c.disabled&&c.value!=='none');assert.ok(choice);project=products.apply(project,{columnModel:choice.value});const col=project.items.find(i=>i.type==='column');col.settings.hingeSide='right';col.placement.u+=15;const field=products.fields(project).groups.find(g=>g.id==='column').fields.find(f=>f.key==='columnFinish'),finish=field.choices.find(c=>!c.disabled&&c.value!==field.value);assert.ok(finish);const next=products.apply(project,{columnFinish:finish.value}),updated=next.items.find(i=>i.id===col.id);assert.equal(updated.settings.hingeSide,'right');assert.deepEqual(updated.placement,col.placement);
 });
}

test('Studio width picker only lists real basin-compatible widths',()=>{
 const products=createPresentationProducts({...studio,catalog:studioCatalog}),project=studio.draftProject({...studio.initialDraft(),top:'sella'}),width=products.fields(project).groups[0].fields.find(f=>f.key==='width');
 assert.ok(width.choices.length<15);assert.ok(width.choices.every(c=>!c.disabled));assert.ok(width.choices.some(c=>c.value==='80'));
});

test('Every existing RANDAL model and compatible accessory retains valid public references',()=>{
 let verified=0;
 for(const [adapter,C,quote,checked,isGeneral]of [[studio,studioCatalog,studioQuote,studioChecked,false],[general,generalCatalog,generalQuote,generalChecked,true]]){
  const products=createPresentationProducts({...adapter,catalog:C});
  for(const model of C.models){const draft={...adapter.initialDraft(model.collection),format:model.id,...(isGeneral?{width:model.widths[0],finish:model.finishes[0],top:defaultTop(model.id)}:{})},project=adapter.draftProject(draft);
   for(const field of products.fields(project).groups.flatMap(g=>g.fields))for(const choice of field.choices){if(choice.disabled)continue;const value=field.key==='mirror'&&!choice.value?null:['width','mirrorSize'].includes(field.key)?Number(choice.value):choice.value,next=products.apply(project,{[field.key]:value});assert.doesNotThrow(()=>checked(next));assert.equal(quote(next).missing.length,0,model.id+' '+field.key+' '+value);verified++;}
  }
 }
 assert.ok(verified>500);
});
