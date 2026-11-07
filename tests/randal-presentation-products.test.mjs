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

const adapters=[['studio',studio,studioCatalog,studioQuote,studioChecked],['general',general,generalCatalog,generalQuote,generalChecked]];
for(const [name,adapter,C,quote,checked]of adapters){
 const products=createPresentationProducts({...adapter,catalog:C});
 test(name+': clicking a second cabinet edits only that exact item and its basin',()=>{
  const project=adapter.draftProject(adapter.initialDraft()),first=project.items[0],second=structuredClone(first);second.id='second-cabinet';second.placement={...first.placement,wall:1,u:150};project.items.push(second);
  const context={itemId:second.id,part:'cabinet'},state=products.fields(project,context);assert.equal(state.primary,second.id);assert.deepEqual(state.groups.map(g=>g.id),['cabinet']);
  const field=state.groups[0].fields.find(f=>f.key==='finish'),choice=field.choices.find(c=>!c.disabled&&c.value!==field.value),before=structuredClone(project);const changed=products.apply(project,{finish:choice.value},context);
  assert.deepEqual(changed.items.find(i=>i.id===first.id),first);assert.equal(changed.items.find(i=>i.id===second.id).settings.finish,choice.value);assert.deepEqual(changed.items.find(i=>i.id===second.id).placement,second.placement);assert.deepEqual(project,before);assert.doesNotThrow(()=>checked(changed));assert.equal(quote(changed).missing.length,0);
  const basins=products.fields(changed,{...context,part:'basin'});assert.deepEqual(basins.groups.map(g=>g.id),['basin']);assert.ok(basins.groups[0].fields.some(f=>f.key==='top'));assert.ok(!basins.groups[0].fields.some(f=>f.key==='finish'));
  const basinChoice=basins.groups[0].fields.find(f=>f.key==='top').choices.find(c=>!c.disabled&&c.value==='neris');assert.ok(basinChoice);const basinChanged=products.apply(changed,{top:basinChoice.value},{...context,part:'basin'});assert.equal(basinChanged.items.find(i=>i.id===second.id).settings.top,'neris');assert.deepEqual(basinChanged.items.find(i=>i.id===first.id),first);assert.doesNotThrow(()=>checked(basinChanged));assert.equal(quote(basinChanged).missing.length,0);
 });
 test(name+': standalone columns and mirrors edit their own authentic references without adding a cabinet',()=>{
  const draft={...adapter.initialDraft(),column:true,mirror:'ilse'},project=adapter.draftProject(draft),standalone={...project,items:project.items.filter(i=>i.type==='column'||i.type==='mirror')};
  for(const type of ['column','mirror']){
   const item=standalone.items.find(i=>i.type===type),context={itemId:item.id,part:type},fields=products.fields(standalone,context);assert.deepEqual(fields.groups.map(g=>g.id),[type]);
   const field=fields.groups[0].fields.find(f=>f.key===(type==='column'?'columnFinish':'mirrorSize')),choice=field.choices.find(c=>!c.disabled&&c.value!==field.value);assert.ok(choice);
   const next=products.apply(standalone,{[field.key]:field.key==='mirrorSize'?Number(choice.value):choice.value},context);assert.equal(next.items.some(i=>i.type==='cabinet'),false);assert.deepEqual(next.items.find(i=>i.type!==type),standalone.items.find(i=>i.type!==type));assert.doesNotThrow(()=>checked(next));assert.equal(quote(next).missing.length,0);
  }
 });
 test(name+': clicking a second column or mirror never changes the first',()=>{
  const project=adapter.draftProject({...adapter.initialDraft(),column:true,mirror:'zen'});
  for(const type of ['column','mirror']){
   const original=project.items.find(i=>i.type===type),second=structuredClone(original);second.id='second-'+type;second.placement={...original.placement,wall:1,u:200};const input={...project,items:[...project.items,second]},context={itemId:second.id,part:type};
   const field=products.fields(input,context).groups[0].fields.find(f=>f.key===(type==='column'?'columnFinish':'mirrorSize')),choice=field.choices.find(c=>!c.disabled&&c.value!==field.value);assert.ok(choice);const next=products.apply(input,{[field.key]:field.key==='mirrorSize'?Number(choice.value):choice.value},context);assert.deepEqual(next.items.find(i=>i.id===original.id),original);assert.deepEqual(next.items.find(i=>i.id===second.id).placement,second.placement);assert.doesNotThrow(()=>checked(next));assert.equal(quote(next).missing.length,0);
  }
 });
 test(name+': basin, color, layout, top finish and drawer choices all retain valid native project and quote references',()=>{
  let verified=0;const baseDraft=adapter.initialDraft();
  for(const width of name==='studio'?[60,80,100,120]:C.models.find(m=>m.id===baseDraft.format).widths){
   const source=adapter.draftProject({...baseDraft,width}),cabinet=source.items.find(i=>i.type==='cabinet'),context={itemId:cabinet.id,part:'basin'},tops=products.fields(source,context).groups[0].fields.find(f=>f.key==='top');
   for(const top of tops.choices){if(top.disabled)continue;const selected=products.apply(source,{top:top.value},context);assert.equal(selected.items[0].settings.width,width,'choosing a basin never resizes the cabinet');
    const colors=products.fields(selected,context).groups[0].fields.find(f=>f.key==='basinColor')?.choices||[{value:selected.items[0].settings.basinColor}];
    for(const color of colors){if(color.disabled)continue;const colored=products.apply(selected,{basinColor:color.value},context);
     for(const field of products.fields(colored,context).groups[0].fields)for(const choice of field.choices){if(choice.disabled)continue;const next=products.apply(colored,{[field.key]:choice.value},context);assert.doesNotThrow(()=>checked(next),top.value+' '+field.key+' '+choice.value);assert.equal(quote(next).missing.length,0,top.value+' '+field.key+' '+choice.value);assert.deepEqual(next.room,source.room);assert.deepEqual(next.floor,source.floor);assert.deepEqual(next.walls,source.walls);verified++;}
    }
   }
  }
  assert.ok(verified>200,'many real basin combinations are verified');
 });
 test(name+': unknown or wrong-family context cannot change a different product',()=>{
  const project=adapter.draftProject({...adapter.initialDraft(),mirror:'zen'}),mirror=project.items.find(i=>i.type==='mirror');assert.throws(()=>products.fields(project,{itemId:'missing'}));assert.throws(()=>products.apply(project,{finish:C.finishes[0].id},{itemId:mirror.id,part:'mirror'}));assert.throws(()=>products.apply(project,{invented:'value'},{itemId:project.items[0].id,part:'basin'}));
 });
}

test('Contextual basin choices cover every General cabinet family, including compact and countertop models',()=>{
 const products=createPresentationProducts({...general,catalog:generalCatalog});let verified=0;
 for(const model of generalCatalog.models){
  const draft={...general.initialDraft(model.collection),format:model.id,width:model.widths[0],finish:model.finishes[0],top:defaultTop(model.id)},project=general.draftProject(draft),context={itemId:project.items[0].id,part:'basin'};
  const topField=products.fields(project,context).groups[0].fields.find(f=>f.key==='top');assert.ok(topField.choices.length,model.id);
  for(const choice of topField.choices){if(choice.disabled)continue;const selected=products.apply(project,{top:choice.value},context);assert.equal(generalQuote(selected).missing.length,0,model.id+' '+choice.value);
   for(const field of products.fields(selected,context).groups[0].fields)for(const option of field.choices){if(option.disabled)continue;const next=products.apply(selected,{[field.key]:option.value},context);assert.doesNotThrow(()=>generalChecked(next),model.id+' '+field.key+' '+option.value);assert.equal(generalQuote(next).missing.length,0,model.id+' '+field.key+' '+option.value);verified++;}
  }
 }
 assert.ok(verified>500);
});
