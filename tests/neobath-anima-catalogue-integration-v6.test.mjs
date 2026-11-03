import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {parse} from 'acorn';
import {draftProject,initialDraft} from '../functions/neobath-anima/studio-adapter/commerce/guided.js';
import {validateProject,encodeProject,decodeProject,continuousTopContext} from '../functions/neobath-anima/studio-adapter/projects.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';
import {furnitureAccessoryProposal,furnitureAccessoryOptions,resolveFurnitureAccessories} from '../functions/neobath-anima/studio-adapter/furniture-accessories.js';
import {normalizeStandaloneSettings,standalonePlanSettings,standaloneDimensions} from '../functions/neobath-anima/studio-adapter/standalone-worktop-data.js';
import {planSettings} from '../functions/neobath-anima/studio-adapter/premium-controls.js';
import {normalizeCabinetRoles} from '../functions/neobath-anima/studio-adapter/cabinet-role.js';
import {transformCatalogueExtras} from '../functions/neobath-anima/studio-adapter/catalogue-extras-transform.mjs';

function cabinetProject(width=100){const project=draftProject({...initialDraft(),width});project.room.height=260;project.room.points=[[0,0],[450,0],[450,400],[0,400]];const item=project.items.find(item=>item.type==='cabinet');item.placement={wall:0,u:150,height:30,offset:0};project.items=[item];return project;}
function worktopProject(settings){return {version:2,manufacturer:'neobath-anima',room:{points:[[0,0],[450,0],[450,400],[0,400]],height:260},items:[{id:'independent-top',type:'worktop',settings,placement:{wall:0,u:225,height:85,offset:0}}]};}
const clone=value=>structuredClone(value);

test('Bridge15 and Bridge35 survive real project save with their exact floor height and unchanged stock body',()=>{
 for(const [id,height]of[['bridge-100-15',15],['bridge100-accessory',35]]){
  const project=cabinetProject(),item=project.items[0],before=clone(item),proposal=furnitureAccessoryProposal(item.settings,{supportId:id,supportFinish:'black-matte',towelSide:'left',towelFinish:'chrome'},item.placement);Object.assign(item,proposal);
  assert.doesNotThrow(()=>validateProject(project));const restored=decodeProject(encodeProject(project)),saved=restored.items[0];assert.equal(saved.settings.supportId,id);assert.equal(saved.settings.supportFinish,'black-matte');assert.equal(saved.settings.supportSuspendedHeight,30);assert.equal(saved.placement.height,height);assert.equal(saved.settings.width,before.settings.width);assert.equal(saved.settings.format,before.settings.format);assert.equal(saved.settings.finish,before.settings.finish);assert.equal(saved.placement.u,before.placement.u);assert.equal(saved.settings.towelSide,'left');assert.equal(saved.settings.towelFinish,'chrome');
  const wrongHeight=clone(project);wrongHeight.items[0].placement.height=height+1;assert.throws(()=>validateProject(wrongHeight),/Bridge.*sol|hauteur/i);assert.throws(()=>encodeProject(wrongHeight));
  const wrongWidth=clone(project);wrongWidth.items[0].settings.supportId='bridge-80-15';assert.throws(()=>validateProject(wrongWidth),/structure Bridge.*largeur|profondeur/i);
 }
});

test('the real quote charges BRIDGE100 and chromeSIDEBAR once at Anima source prices, including a duplicate generic accessory',()=>{
 const project=cabinetProject(),initial=quoteProject(validateProject(project)),item=project.items[0];Object.assign(item,furnitureAccessoryProposal(item.settings,{supportId:'bridge100-accessory',towelSide:'right',towelFinish:'chrome',accessoryId:'sidebar-accessory'},item.placement));assert.doesNotThrow(()=>validateProject(project));
 const quoted=quoteProject(decodeProject(encodeProject(project))),bridge=quoted.rows.filter(row=>row.ref==='BRIDGE100'),bar=quoted.rows.filter(row=>row.ref==='SIDEBAR');assert.equal(bridge.length,1);assert.equal(bar.length,1);assert.equal(bridge[0].publicTTC,31440);assert.equal(bar[0].publicTTC,13800);assert.equal(quoted.publicTTC-initial.publicTTC,45240);assert.equal(quoted.rows[0].ref,'APUR-BA10052');assert.equal(quoted.missing.length,0);
});

test('undocumented Bridge variants and the documented whiteSideBar remain on quotation instead of inheriting a known tariff',()=>{
 const bridgeProject=cabinetProject(),bridge=bridgeProject.items[0];Object.assign(bridge,furnitureAccessoryProposal(bridge.settings,{supportId:'bridge-100-15'},bridge.placement));assert.doesNotThrow(()=>validateProject(bridgeProject));const bridgeQuote=quoteProject(bridgeProject);assert.equal(bridgeQuote.publicTTC,null);assert.equal(bridgeQuote.missing.length,1);assert.equal(bridgeQuote.missing[0].productId,'bridge-100-15');assert.equal(bridgeQuote.missing[0].ref,'À confirmer');assert.equal(bridgeQuote.missing[0].publicTTC,null);assert.match(bridgeQuote.missing[0].detail,/100.*H 15.*P 43.5/);assert.ok(bridgeQuote.rows[0].publicTTC>0);
 const whiteProject=cabinetProject();Object.assign(whiteProject.items[0].settings,{towelSide:'left',towelFinish:'white-matte'});assert.doesNotThrow(()=>validateProject(whiteProject));const whiteQuote=quoteProject(whiteProject);assert.equal(whiteQuote.publicTTC,null);assert.equal(whiteQuote.missing.length,1);assert.equal(whiteQuote.missing[0].ref,'SIDEBAR');assert.match(whiteQuote.missing[0].note,/blanche.*tarif.*confirmer/i);assert.notEqual(whiteQuote.missing[0].publicTTC,13800);
});

test('SideBar clearance is checked against the wall and the neighbouring cabinet without resizing the stock SKU',()=>{
 const edge=cabinetProject(),item=edge.items[0];item.placement.u=50;Object.assign(item.settings,{towelSide:'right',towelFinish:'black-matte'});assert.doesNotThrow(()=>validateProject(edge));const outside=clone(edge);outside.items[0].settings.towelSide='left';assert.throws(()=>validateProject(outside),/porte-serviette dépasse.*mur/i);assert.equal(outside.items[0].settings.width,100);
 const adjacent=cabinetProject(),first=adjacent.items[0],second=clone(first);second.id='adjacent-body';second.settings={...second.settings,width:80};second.placement={...second.placement,u:240};adjacent.items.push(second);first.settings.towelSide='left';assert.doesNotThrow(()=>validateProject(adjacent));const blocked=clone(adjacent);blocked.items[0].settings.towelSide='right';assert.throws(()=>validateProject(blocked),/porte-serviette traverse/i);assert.throws(()=>encodeProject(blocked));
 const clearHeight=clone(blocked);clearHeight.items[1].placement.height=100;assert.doesNotThrow(()=>validateProject(clearHeight),'a neighbour above the bar is not a false side collision');
});

test('a standalone Fenix top is saved as one worktop without a cabinet and charged once for its actual length',()=>{
 const settings=standalonePlanSettings({width:140},'tfx1-linear-top');assert.ok(settings);const project=worktopProject(settings);assert.doesNotThrow(()=>validateProject(project));const restored=decodeProject(encodeProject(project)),item=restored.items[0],quoted=quoteProject(restored);assert.equal(restored.items.length,1);assert.equal(item.type,'worktop');assert.equal(item.settings.width,140);assert.equal(item.settings.topLength,140);assert.equal(item.settings.topSpan,140);assert.equal(item.settings.format,'worktop');assert.equal(item.settings.mounting,'wall');assert.equal(item.placement.height,85);assert.equal(standaloneDimensions(item.settings).width,1.4);assert.equal(quoted.rows.length,1);assert.equal(quoted.rows[0].ref,'TFX1');assert.equal(quoted.publicTTC,107184);assert.equal(quoted.rows.some(row=>/^APUR|ARIB/.test(row.ref)),false);assert.match(quoted.rows[0].detail,/fixation\/support non inclus/);
 item.settings.tap='FLIP-CHROME';const withTap=quoteProject(restored);assert.equal(withTap.publicTTC,quoted.publicTTC);assert.deepEqual(withTap.excluded,[{id:'independent-top-tap',type:'attached-tap',reference:'FLIP-CHROME'}]);
});

test('a standalone custom depth stays on quotation and invalid independent geometry cannot be saved',()=>{
 const source=standalonePlanSettings({width:140},'tfx1-linear-top');assert.ok(source);const custom=worktopProject(normalizeStandaloneSettings({...source,topDepth:60}));assert.doesNotThrow(()=>validateProject(custom));assert.equal(decodeProject(encodeProject(custom)).items[0].settings.topDepth,60);const quote=quoteProject(custom);assert.equal(quote.publicTTC,null);assert.equal(quote.missing.length,1);assert.equal(quote.missing[0].ref,'TFX1');assert.match(quote.missing[0].note,/Profondeur sur mesure/);assert.equal(standaloneDimensions(custom.items[0].settings).depth,.6);
 for(const patch of[{topDepth:19},{topDepth:91},{width:241,topLength:241,topSpan:241},{topSpan:139},{mounting:'floating-without-wall'}]){const invalid=worktopProject({...source,...patch});assert.throws(()=>validateProject(invalid),JSON.stringify(patch));assert.throws(()=>encodeProject(invalid),JSON.stringify(patch));}
});

test('an independent inset Eclisse preserves its removable floor options, separate price lines and floor clearance',()=>{
 const settings=standalonePlanSettings({width:100},'tfx1-linear-top','eclisse116-s-semi-recessed-basin');assert.ok(settings);Object.assign(settings,{basinColor:'fume-matte',basinPriceKey:'fume-matte',basinBottom:'tvl',basinSupport:true});const project=worktopProject(settings);assert.doesNotThrow(()=>validateProject(project));const restored=decodeProject(encodeProject(project)),saved=restored.items[0].settings,quote=quoteProject(restored);assert.equal(saved.basinBottom,'tvl');assert.equal(saved.basinSupport,true);assert.equal(saved.basinPriceKey,'fume-matte');assert.deepEqual(quote.rows.map(row=>row.ref),['TFX1','ECLISSE116/S','TVL116','SUP116','MFR']);assert.equal(quote.rows[1].publicTTC,64800);assert.equal(quote.rows[2].publicTTC,22560);assert.equal(quote.rows[3].publicTTC,12600);assert.equal(quote.publicTTC,184440);
 const floor=clone(project);floor.items[0].placement.height=10;assert.throws(()=>validateProject(floor),/vasque.*traverse le sol/i);const ceiling=clone(project);ceiling.items[0].placement.height=260;assert.throws(()=>validateProject(ceiling),/dépasse.*hauteur/i);
});

test('the actual accessory apply helper aligns a continuous plan group atomically and restores its suspension without moving it',()=>{
 const adapted=transformCatalogueExtras('','app.js'),ast=parse(adapted,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='__animaApplyFurnitureAccessories');assert.ok(fn);
 function continuousProject(otherWidth){
  const project=cabinetProject(80),left=project.items[0],right=clone(left);left.id='left';right.id='right';left.placement={wall:0,u:140,height:42,offset:3};right.placement={wall:0,u:180+otherWidth/2,height:42,offset:3};Object.assign(left.settings,{finish:'rovere-alba',towelSide:'left',towelFinish:'chrome'});Object.assign(right.settings,{width:otherWidth,finish:'terra-rossa',towelSide:'right',towelFinish:'white-matte'});project.items.push(right);
  left.settings=planSettings(project,left,'tfx1-linear-top',{span:80+otherWidth,offset:otherWidth/2,ids:['left','right']});assert.ok(left.settings);assert.doesNotThrow(()=>validateProject(project));return project;
 }
 function harness(project){
  const state={project:clone(project),commits:0,messages:[]},context={composition:{selected:null},collectProject:()=>clone(state.project),__animaFurnitureAccessories:resolveFurnitureAccessories,__animaFurnitureOptions:furnitureAccessoryOptions,__animaFurnitureProposal:furnitureAccessoryProposal,__animaAccessoryContext:continuousTopContext,placementStatus:message=>state.messages.push(message),__animaCommitCabinetProject:next=>{const normalized=normalizeCabinetRoles(next);validateProject(normalized);state.commits++;state.project=clone(normalized);context.composition.selected=state.project.items.find(item=>item.id==='left');return true;}};
  context.composition.selected=state.project.items[0];vm.createContext(context);vm.runInContext(adapted.slice(fn.start,fn.end),context);return {state,context,apply(patch){const selected=context.composition.selected,proposal=furnitureAccessoryProposal(selected.settings,patch,selected.placement);return context.__animaApplyFurnitureAccessories(proposal.settings,proposal.placement);}};
 }
 const source=continuousProject(100),before=clone(source),run=harness(source);assert.equal(run.apply({supportId:'bridge-80-15',supportFinish:'black-matte'}),true);assert.equal(run.state.commits,1);assert.deepEqual(run.state.project.items.map(item=>[item.settings.supportId,item.placement.height,item.settings.supportSuspendedHeight]),[['bridge-80-15',15,42],['bridge-100-15',15,42]]);assert.match(run.state.messages.at(-1),/2 caissons supports/);
 for(let index=0;index<2;index++){const item=run.state.project.items[index],old=before.items[index];assert.deepEqual({...item.placement,height:old.placement.height},old.placement);for(const field of ['width','format','finish','towelSide','towelFinish','top','topSpan','topOffset','topLength','topSurfaceId'])assert.equal(item.settings[field],old.settings[field],field);}
 assert.equal(run.apply({supportId:''}),true);assert.equal(run.state.commits,2);for(let index=0;index<2;index++){const item=run.state.project.items[index],old=before.items[index];assert.deepEqual(item.placement,old.placement);assert.equal(item.settings.supportId,'');assert.equal(item.settings.supportSuspendedHeight,undefined);assert.equal(item.settings.towelSide,old.settings.towelSide);assert.equal(item.settings.towelFinish,old.settings.towelFinish);}
 const rejected=harness(continuousProject(60)),snapshot=clone(rejected.state.project);assert.equal(rejected.apply({supportId:'bridge-80-15'}),false);assert.equal(rejected.state.commits,0);assert.deepEqual(rejected.state.project,snapshot);assert.deepEqual(rejected.context.composition.selected,snapshot.items[0]);assert.match(rejected.state.messages.at(-1),/caisson du plan continu.*structure compatible/);
});
