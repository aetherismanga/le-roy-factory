import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parse} from 'acorn';
import {automaticWorktopSettings,normalizeAutomaticWorktops,preferredWorktopContext,worktopFitsAutomatically} from '../functions/neobath-anima/studio-adapter/auto-fit-worktop.js';
import {topSelection} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {cabinetFormat} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {continuousTopContext,continuousTopCompatible,validateProject} from '../functions/neobath-anima/studio-adapter/projects.js';
import {normalizeCabinetRoles} from '../functions/neobath-anima/studio-adapter/cabinet-role.js';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';

const cabinet=(id,width,u,settings={})=>({id,type:'cabinet',settings:{format:'pura-base-two',width,top:'bare',finish:'rovere-alba',drawers:[0,0],...settings},placement:{wall:0,u,height:30}});
const project=items=>({version:2,room:{points:[[0,0],[600,0],[600,450],[0,450]],height:260},items});
const slab=(id,width,u,settings={})=>cabinet(id,width,u,{top:'tpgea12-linear-top',topPlanId:'tpgea12-linear-top',topSpan:width,topLength:width,topOffset:0,topShift:0,...settings});
const selection=s=>topSelection(s.top,s.width,s.format,s.basinLayout,s.topSpan,s.topPlanId,s.topLength,s);

test('custom plan selection defaults to the largest valid stock support group; manual and stock choices retain their format',()=>{
 const contexts=[{span:120,offset:0},{span:180,offset:30},{span:240,offset:60}],choice={product:{configurableWidth:true},contexts};
 assert.equal(preferredWorktopContext(choice,{width:120}),contexts[2]);
 assert.equal(preferredWorktopContext(choice,{width:120,topAutoFit:false}),contexts[0]);
 assert.equal(preferredWorktopContext(choice,{width:120,topLength:140}),contexts[0]);
 assert.equal(preferredWorktopContext({...choice,product:{width:121}},{width:120}),contexts[0]);
 assert.equal(preferredWorktopContext({contexts:[]},{}),null);
});

test('120 + 60 cm composition receives one 180 cm slab without stretching either stock caisson',()=>{
 const draft=project([slab('left',120,120),cabinet('right',60,210)]),before=structuredClone(draft),fitted=normalizeAutomaticWorktops(draft),host=fitted.items[0];
 assert.deepEqual(draft,before);assert.equal(host.settings.topLength,180);assert.equal(host.settings.topSpan,180);assert.equal(host.settings.topOffset,30);assert.equal(host.settings.topAutoFit,true);
 assert.deepEqual(continuousTopContext(fitted,host).ids,['left','right']);
 assert.deepEqual(fitted.items.map(item=>[item.settings.width,item.settings.format,item.placement]),before.items.map(item=>[item.settings.width,item.settings.format,item.placement]));
 assert.equal(fitted.items[1].settings.top,'bare');validateProject(fitted);assert.equal(normalizeAutomaticWorktops(fitted),fitted);
});

test('automatic extension keeps the basin over its original stock vanity and adjusts the siphon context',()=>{
 const draft=normalizeCabinetRoles(project([slab('left',120,120,{top:'tpgea12-b938-1-basin',basinLayout:'center',basinColor:'white-matte'}),cabinet('right',60,210)]));
 validateProject(draft);const prior=selection(draft.items[0].settings),fitted=normalizeAutomaticWorktops(draft),host=fitted.items[0],after=selection(host.settings);
 assert.equal(host.settings.topLength,180);assert.equal(host.settings.topOffset,30);assert.equal(host.settings.basinOffsetX,-30);
 assert.equal(host.placement.u+host.settings.topOffset+after.positions[0]*100,draft.items[0].placement.u+prior.positions[0]*100);
 assert.equal(cabinetFormat(host.settings.format).subtype,'vanity');assert.equal(cabinetFormat(fitted.items[1].settings.format).subtype,'base');validateProject(fitted);
});

test('automatic plans follow removal or separation of a support, while deliberate dimensions and dragged plans stay manual',()=>{
 let fitted=normalizeAutomaticWorktops(project([slab('left',120,120,{topAutoFit:true}),cabinet('right',60,210)]));
 const separated={...fitted,items:fitted.items.map(item=>item.id==='right'?{...item,placement:{...item.placement,u:230}}:item)},shortened=normalizeAutomaticWorktops(separated);
 assert.equal(shortened.items[0].settings.topSpan,120);assert.equal(shortened.items[0].settings.topLength,120);assert.equal(shortened.items[0].settings.topOffset,0);
 for(const custom of [{topAutoFit:false},{topLength:140},{topLength:140,topShift:5}]){
  const draft=project([slab('left',120,120,custom),cabinet('right',60,210)]);assert.equal(normalizeAutomaticWorktops(draft),draft);assert.equal(worktopFitsAutomatically(draft.items[0].settings),false);
 }
});

test('gaps, levels, depth, locks, other slabs and catalogue length limits prevent invalid support extension',()=>{
 for(const change of [item=>item.placement.u++,item=>item.placement.height++,item=>item.placement.rotation=90,item=>item.locked=true,item=>item.settings.top='tpc60-cover']){
  const draft=project([slab('left',120,120),cabinet('right',60,210)]);change(draft.items[1]);assert.equal(normalizeAutomaticWorktops(draft),draft);
 }
 const draft=project([slab('left',120,120),cabinet('middle',120,240),cabinet('right',120,360)]),fitted=normalizeAutomaticWorktops(draft);
 assert.equal(fitted.items[0].settings.topLength,240);assert.deepEqual(continuousTopContext(fitted,fitted.items[0]).ids,['left','middle']);validateProject(fitted);
 const fixed=project([cabinet('left',120,120,{top:'tpc120-cover'}),cabinet('right',60,210)]);assert.equal(normalizeAutomaticWorktops(fixed),fixed);
 const occupied=project([slab('left',120,120),cabinet('covered',60,210),slab('other-owner',60,270,{topSpan:120,topLength:120,topOffset:-30,topAutoFit:false})]);
 assert.equal(normalizeAutomaticWorktops(occupied),occupied,'a bare caisson under another continuous slab is occupied');
});

test('invalid inferred bowl repositioning never changes the original project; auto-fit flag has a strict type',()=>{
 const s=slab('left',120,120,{top:'tpgea12-b938-1-basin'}).settings;
 assert.equal(automaticWorktopSettings(s,{span:60,offset:0}),null);
 const draft=project([slab('left',120,120,{topAutoFit:'true'})]);assert.throws(()=>validateProject(draft),/ajustement/);
});

test('production synchronization atomically commits auto-fit once without recursive collect/render loops',()=>{
 const source=transformCommonStudioSource(readFileSync('studio-one/src/app.js','utf8'),'app.js'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 const sync=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='__animaSyncContinuousTops');assert.ok(sync);
 const data=project([slab('left',120,120),cabinet('right',60,210)]),context={composition:{items:data.items,snapshot(){return structuredClone(this.items);}},roomConfig:data.room,cloneRoom:structuredClone,projectWorkspace:{locked:false},restoring:false,__animaNormalizeAutomaticWorktops:normalizeAutomaticWorktops,__animaValidPlan:()=>true,cabinetFormat,commits:0};
 context.__animaCommitCabinetProject=next=>{context.commits++;context.composition.items=next.items;runInNewContext('__animaSyncContinuousTops()',context);return true;};
 runInNewContext('let __animaFittingWorktopSupports=false;'+source.slice(sync.start,sync.end)+';__animaSyncContinuousTops();__animaSyncContinuousTops();',context);
 assert.equal(context.commits,1);assert.equal(context.composition.items[0].settings.topLength,180);
 assert.match(source,/'topShift','topAutoFit','topDepth'/);
});


test('independent cabinet slabs allow edge contact but reject overlapping extensions or already covered supports',()=>{
 const left=slab('left',120,120,{topAutoFit:false}),right=slab('right',60,210,{topAutoFit:false}),draft=project([left,right]);
 assert.equal(continuousTopCompatible(draft,left.id,left.settings.top,120,0),true);validateProject(draft);
 const overlap=structuredClone(draft);overlap.items[0].settings.topLength=140;
 assert.equal(continuousTopCompatible(overlap,left.id,left.settings.top,120,0),false);assert.throws(()=>validateProject(overlap));
 for(const patch of [{wall:1},{height:60},{offset:65}]){
  const apart=structuredClone(overlap);Object.assign(apart.items[1].placement,patch);assert.equal(continuousTopCompatible(apart,left.id,left.settings.top,120,0),true);validateProject(apart);
 }
 const shared=project([slab('first',120,120,{topSpan:180,topLength:180,topOffset:30}),cabinet('shared-support',60,210),slab('other',60,270,{topSpan:120,topLength:120,topOffset:-30})]);
 assert.equal(continuousTopCompatible(shared,'first','tpgea12-linear-top',180,30),false);
 assert.throws(()=>validateProject(shared),'the bare support may not be claimed by two separate slabs');
});


test('automatic extension preserves every bowl, never only the average of a double basin layout',()=>{
 const owner=slab('owner',100,150,{top:'tpgea12-b855-2-basin',topSpan:180,topLength:180,topOffset:40,basinLayout:'double',basinColor:'white-matte',topAutoFit:true});
 const draft=normalizeCabinetRoles(project([owner,cabinet('middle',80,240),cabinet('added',60,310)]));validateProject(draft);
 const before=selection(draft.items[0].settings),centres=before.positions.map(x=>150+40+x*100);
 assert.deepEqual(centres,[145,235]);
 assert.equal(automaticWorktopSettings(draft.items[0].settings,{span:240,offset:70}),null,'a shared translation cannot preserve two different-width quarter positions');
 assert.equal(normalizeAutomaticWorktops(draft),draft,'the saved double cutouts remain unchanged after another support is added');
 assert.deepEqual(selection(draft.items[0].settings).positions.map(x=>150+40+x*100),centres);
 const single=project([slab('left',120,120,{topDepth:60,topAutoFit:true}),cabinet('right',60,210)]),fitted=normalizeAutomaticWorktops(single);
 assert.equal(fitted.items[0].settings.topLength,180);assert.equal(fitted.items[0].settings.topDepth,60,'width fitting preserves a deliberately chosen depth');validateProject(fitted);
});
