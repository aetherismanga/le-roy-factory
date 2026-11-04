import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AQUAHOME} from '../shared/lrf-3d/aquahome-catalog.js';
import {aquahomeProfile} from '../shared/lrf-3d/aquahome-profiles.js';
import {topSelection,PRODUCT_BY_ID} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {cabinetFormat} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {BASIN_UNITS} from '../functions/neobath-anima/studio-adapter/basin-unit-data.js';
import {planTapContext} from '../functions/neobath-anima/studio-adapter/tap-drilling.js';
import {checkAnimaTapCompatibility} from '../functions/neobath-anima/studio-adapter/tap-compatibility.js';
import {chooseAnimaAutomaticTap,resolveAnimaTapSettings,matchAnimaWallTaps,normalizeAnimaProjectTaps,recommendedAnimaWallOutlet,validateAnimaTapInstallation} from '../functions/neobath-anima/studio-adapter/tap-installation.js';

const product=ref=>AQUAHOME.find(p=>p.reference===ref);
const options={products:AQUAHOME,profileForProduct:aquahomeProfile};
const cabinet=(id='host',u=150,extra={})=>({id,type:'cabinet',settings:{format:'pura-base-two',width:100,top:'tpgea12-b938-1-basin',topPlanId:'tpgea12-linear-top',basinColor:'white-matte',topPriceKey:'white-matte',finish:'rovere-alba',drawers:[0,0],...extra},placement:{wall:0,u,height:30}});
function contextForItem(item){
 const s=item.settings,form=item.type==='cabinet'?cabinetFormat(s.format):{base:0,height:0},selection=topSelection(s.top,s.width,s.format,s.basinLayout,s.topSpan||s.width,s.topPlanId,s.topLength,s);
 const context=planTapContext(selection,{surfaceY:form.base+form.height,cabinetDepth:(selection?.referenceDepth||46.2)/100});
 return {...context,topOffset:((s.topOffset||0)+(s.topShift||0))/100,origin:{u:item.placement.u/100,y:item.placement.height/100-form.base,z:.23+(item.placement.offset||0)/100}};
}
const wall=(id='wall-tap',u=150,height=100,extra={})=>({id,type:'tap',settings:{use:'basin-wall',tap:AQUAHOME.find(p=>p.use==='basin-wall').reference,...extra},placement:{wall:0,u,height}});
const wallContextForItem=item=>({outlet:{x:item.placement.u/100,y:item.placement.height/100,z:.18+(item.placement.offset||0)/100}});
const policyOptions={...options,contextForItem,wallContextForItem};
const complete=item=>{const s=item.settings;return {...item,settings:resolveAnimaTapSettings(s,contextForItem(item),options)};};

test('automatic source mixers fit the actual low integrated, raised vessel and semi-recessed geometries',()=>{
 for(const [top,expected]of [['tpgea12-b938-1-basin','basin'],['eclisse116-countertop-basin','basin-xl'],['eclisse116-s-semi-recessed-basin','basin'],['pf132690a-countertop-basin','basin-xl']]){
  const item=cabinet('host',150,{top}),context=contextForItem(item),chosen=chooseAnimaAutomaticTap(context,{},options);
  assert.ok(chosen,top);assert.equal(chosen.use,expected,top);assert.ok(AQUAHOME.includes(chosen));assert.equal(checkAnimaTapCompatibility(chosen,context,aquahomeProfile(chosen)).compatible,true);
  const normalized=resolveAnimaTapSettings(item.settings,context,options);assert.equal(normalized.tap,chosen.reference);assert.equal(normalized.tapMode,'auto');
 }
});

test('all 18 actual countertop and recessed source basins receive an existing geometrically compatible mixer',()=>{
 assert.equal(BASIN_UNITS.length,18);
 for(const basin of BASIN_UNITS){
  const item=cabinet('host',150,{top:basin.id,basinColor:basin.prices[0].key}),context=contextForItem(item),chosen=chooseAnimaAutomaticTap(context,{},options);
  assert.ok(chosen,basin.ref);assert.ok(AQUAHOME.includes(chosen));assert.equal(checkAnimaTapCompatibility(chosen,context,aquahomeProfile(chosen)).compatible,true,basin.ref);
 }
});

test('compatible manual source references and finishes remain, while incompatible geometry selects a suitable mixer',()=>{
 const host=complete(cabinet('host',150,{top:'eclisse116-countertop-basin'})),compatible=AQUAHOME.filter(p=>p.use==='basin-xl'&&p.finish==='Noir mat').find(p=>checkAnimaTapCompatibility(p,contextForItem(host),aquahomeProfile(p)).compatible);assert.ok(compatible);
 const manual=resolveAnimaTapSettings({...host.settings,tap:compatible.reference,tapMode:'manual'},contextForItem(host),options);assert.equal(manual.tap,compatible.reference);assert.equal(manual.tapMode,'manual');
 const low=product('11340112703');assert.ok(low);assert.equal(checkAnimaTapCompatibility(low,contextForItem(host),aquahomeProfile(low)).compatible,false);
 const adapted=resolveAnimaTapSettings({...host.settings,tap:low.reference,tapMode:'manual'},contextForItem(host),options);assert.equal(product(adapted.tap).use,'basin-xl');assert.equal(product(adapted.tap).finish,'Noir mat');assert.equal(adapted.tapMode,'auto');
 const none=resolveAnimaTapSettings({...host.settings,tapMode:'none'},contextForItem(host),options);assert.equal(none.tap,null);assert.equal(none.tapMode,'none');
});

test('one real basin-wall mixer suppresses only its target, and moving/deleting it restores the prior compatible finish',()=>{
 const initial=complete(cabinet('host',150,{top:'eclisse116-countertop-basin'})),black=AQUAHOME.find(p=>p.use==='basin-xl'&&p.finish==='Noir mat'&&checkAnimaTapCompatibility(p,contextForItem(initial),aquahomeProfile(p)).compatible);initial.settings={...initial.settings,tap:black.reference,tapMode:'manual'};
 const project={items:[initial,wall()]},before=structuredClone(project),fitted=normalizeAnimaProjectTaps(project,policyOptions);assert.deepEqual(project,before);
 assert.deepEqual(fitted.items[0].settings.tapWallIds,['wall-tap']);assert.equal(fitted.items[0].settings.tap,null);assert.equal(fitted.items[0].settings.tapPreferredRef,black.reference);assert.equal(contextForItem(fitted.items[0]).holes.length,0);
 assert.equal(normalizeAnimaProjectTaps(fitted,policyOptions),fitted);
 for(const items of [[fitted.items[0]], [fitted.items[0],{...wall(),placement:{...wall().placement,u:300}}], [fitted.items[0],{...wall(),placement:{...wall().placement,height:150}}]]){
  const restored=normalizeAnimaProjectTaps({...fitted,items},policyOptions),s=restored.items[0].settings;assert.deepEqual(s.tapWallIds,[null]);assert.equal(s.tap,black.reference);assert.equal(s.tapMode,'manual');assert.equal(contextForItem(restored.items[0]).holes.length,1);
 }
});

test('wall association checks basin outlet, wall, height, source use and single-well ownership',()=>{
 const host=complete(cabinet()),other=complete(cabinet('other',300));
 for(const bad of [wall('bad',300),wall('bad',150,60),wall('bad',150,150),{...wall('bad'),placement:{wall:1,u:150,height:100}},wall('bad',150,100,{use:'bath',tap:AQUAHOME.find(p=>p.use==='bath').reference}),wall('bad',150,100,{tap:'unknown'}),{...wall('bad'),placement:{wall:0,u:150,height:100,offset:100}}]){
  const matches=matchAnimaWallTaps({items:[host,bad]},policyOptions);assert.deepEqual(matches.byHost.host,[null]);
 }
 const matches=matchAnimaWallTaps({items:[host,other,wall('wall-tap',150)]},policyOptions);assert.deepEqual(matches.byHost.host,['wall-tap']);assert.deepEqual(matches.byHost.other,[null]);assert.deepEqual(matches.byWall['wall-tap'],{hostId:'host',wellIndex:0});
 const repeated=matchAnimaWallTaps({items:[host,{...other,placement:{...host.placement}},wall()]},policyOptions);assert.equal(Object.keys(repeated.byWall).length,1);assert.equal(Object.values(repeated.byHost).flat().filter(Boolean).length,1);
});

test('a double basin may keep one suitable deck mixer beside one wall mixer',()=>{
 const pairId=[...PRODUCT_BY_ID.values()].find(p=>p.category==='basin'&&p.basinCount===2&&p.compatibleTopIds?.includes('tpgea12-linear-top'))?.id;assert.ok(pairId);
 const item=cabinet('double',200,{width:120,topSpan:240,topLength:240,topOffset:0,top:pairId}),context=contextForItem(item);assert.equal(context.top.wells.length,2);
 const target=recommendedAnimaWallOutlet(context,0),project={items:[item,wall('one',target.x*100,target.y*100)]},fitted=normalizeAnimaProjectTaps(project,policyOptions),result=fitted.items[0],next=contextForItem(result);
 assert.deepEqual(result.settings.tapWallIds,['one',null]);assert.equal(next.holes.length,1);assert.equal(next.holes[0].wellIndex,1);assert.ok(result.settings.tap);const check=checkAnimaTapCompatibility(product(result.settings.tap),next,aquahomeProfile(product(result.settings.tap)));assert.equal(check.compatible,true);assert.equal(check.placements[0].wellIndex,1);
 const broken={...next,holes:[{...next.holes[0],wellIndex:0}]};assert.equal(checkAnimaTapCompatibility(product(result.settings.tap),broken,aquahomeProfile(product(result.settings.tap))).compatible,false);
});

test('explicit none, read-only and position locks are preserved and malformed wall links are rejected',()=>{
 const host=complete(cabinet());host.settings.tapMode='none';host.settings.tap=null;const draft={items:[host,wall()]};assert.equal(normalizeAnimaProjectTaps(draft,{...policyOptions,readOnly:true}),draft);
 const fitted=normalizeAnimaProjectTaps(draft,policyOptions);assert.equal(fitted.items[0].settings.tapMode,'none');assert.equal(fitted.items[0].settings.tap,null);
 for(const project of [{items:[{...host,locked:true},wall()]},{locked:true,items:[host,wall()]}])assert.equal(normalizeAnimaProjectTaps(project,policyOptions),project);
 for(const settings of [{tapMode:'wall'},{tapWallIds:['x','x']},{tapWallIds:[1]},{tapWallIds:['missing']},{tapPreferredRef:{}}])assert.throws(()=>validateAnimaTapInstallation(settings,{project:draft,hostId:host.id,wellCount:1}));
 assert.throws(()=>validateAnimaTapInstallation({tapWallIds:['wall-tap']},{project:{items:[host,{...wall(),settings:{use:'bath'}}]},hostId:host.id,wellCount:1}));
});


test('imported source-valid IDs cannot collide with inherited dictionary properties',()=>{
 for(const id of ['constructor','toString','__proto__']){
  const host=cabinet(id),fixture=wall(id+'-wall'),project={items:[host,fixture]},matches=matchAnimaWallTaps(project,policyOptions);
  assert.deepEqual(matches.byHost[id],[fixture.id]);assert.deepEqual(matches.byWall[fixture.id],{hostId:id,wellIndex:0});
  const other=wall(id);const another=cabinet('ordinary');const result=matchAnimaWallTaps({items:[another,other]},policyOptions);assert.deepEqual(result.byHost.ordinary,[id]);
 }
});
