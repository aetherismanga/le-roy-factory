import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {CABINET_FORMATS,cabinetFormat} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {puraCabinetModels,matchingCabinetFacade,cabinetModelPhoto,renderAnimaCabinetGallery,renderAnimaCabinetControls} from '../functions/neobath-anima/studio-adapter/cabinet-controls.js';
import {renderPremiumPlanControls,premiumPlanChoices,premiumBasinChoices,worktopFamily} from '../functions/neobath-anima/studio-adapter/premium-controls.js';
import {transformAnimaCabinetUI} from '../functions/neobath-anima/studio-adapter/cabinet-ui-transform.mjs';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {initialDraft,draftProject} from '../functions/neobath-anima/studio-adapter/commerce/guided.js';
import {PRODUCT_BY_ID,topSelection} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {validateProject} from '../functions/neobath-anima/studio-adapter/projects.js';
class Element{
 constructor(document,tag){this.ownerDocument=document;this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.style={};this.textContent='';this.hidden=false;}
 append(...children){this.children.push(...children);for(const child of children)if(child&&typeof child==='object')child.parentNode=this;}
 replaceChildren(...children){this.children=[];this.append(...children);}
 setAttribute(name,value){this.attributes[name]=value;}
 focus(){this.ownerDocument.activeElement=this;}
}
const all=node=>[node,...node.children.flatMap(child=>child&&typeof child==='object'?all(child):[])];
function documentFixture(){const document={createElement:tag=>new Element(document,tag),getElementById:id=>all(document.head).find(element=>element.id===id)||null};document.head=new Element(document,'head');document.body=new Element(document,'body');return document;}
const find=(root,key,value)=>all(root).find(element=>element.dataset[key]===value);
function customProject(){const project=draftProject({...initialDraft(),width:100}),host=project.items.find(item=>item.type==='cabinet'),choice=premiumPlanChoices(project,host).find(choice=>choice.product.id==='tfx1-linear-top');host.settings=choice.contexts.find(context=>context.span===100).settings;return {project,host};}

test('the initial visual catalogue presents exactly five Pura stock shapes without duplicate under-basin models with the correct opening photos',()=>{
 const document=documentFixture(),picked=[],bound=[],root=renderAnimaCabinetGallery(document.body,{onChoose:id=>picked.push(id),onCard:(button,form)=>bound.push(form.id)}),cards=all(root).filter(element=>element.dataset.animaCabinetModel);
 assert.equal(cards.length,5);assert.ok(cards.every(card=>cabinetFormat(card.dataset.animaCabinetModel).subtype!=='vanity'));assert.deepEqual([...bound].sort(),puraCabinetModels().map(form=>form.id).sort());assert.ok(cards.every(card=>cabinetFormat(card.dataset.animaCabinetModel).facade==='PURA'));
 assert.ok(!all(root).some(element=>element.tagName==='SELECT'));
 for(const card of cards){const form=cabinetFormat(card.dataset.animaCabinetModel),visual=cabinetModelPhoto(form,80),image=card.children.find(element=>element.tagName==='IMG');assert.equal(image.src,visual.src);assert.ok(image.alt.includes(visual.product.ref));assert.equal(visual.product.drawers,form.trueDrawers);assert.equal(visual.product.doors,form.doors);card.onclick();assert.equal(picked.at(-1),form.id);}
});

test('Ribelle is a facade option of the chosen model and stock widths never create a fictional cabinet',()=>{
 for(const form of puraCabinetModels()){const opposite=matchingCabinetFacade(form,'RIBELLE');assert.ok(opposite);for(const key of ['subtype','height','depth','trueDrawers','doors'])assert.equal(opposite[key],form[key]);}
 const document=documentFixture(),changes=[],widths=[],compositions=[],settings={format:'pura-doors',width:80},root=renderAnimaCabinetControls(document.body,{settings,onModel:id=>changes.push(id),onWidth:width=>widths.push(width),onComposition:width=>compositions.push(width)}),facades=all(root).find(element=>element.className==='anima-cabinet-facades');
 assert.deepEqual(facades.children.map(card=>card.dataset.animaCabinetModel),['pura-doors','ribelle-doors']);facades.children[1].onclick();assert.deepEqual(changes,['ribelle-doors']);
 const widthCards=all(root).filter(element=>element.dataset.animaCabinetWidth);assert.deepEqual(widthCards.map(card=>Number(card.dataset.animaCabinetWidth)),cabinetFormat(settings.format).allowedWidths);widthCards[0].onclick();assert.deepEqual(widths,[80]);
 find(root,'animaCompositionWidth','true').value='180';find(root,'animaCompositionApply','true').onclick();assert.deepEqual(compositions,[180]);assert.ok(!widths.includes(180));
});

test('plan and basin pictures are visible before choosing an individual model, with no fake bowl on a plan-only card',()=>{
 const project=draftProject(initialDraft()),host=project.items.find(item=>item.type==='cabinet'),document=documentFixture(),root=renderPremiumPlanControls(document.body,{project,host,onPatch:()=>true}),plans=all(root).filter(element=>element.dataset.premiumPlan);
 assert.ok(plans.length>=7);assert.ok(all(root).some(element=>element.dataset.premiumPlanFamily==='integrated'&&element.children.some(child=>child.tagName==='IMG')));
 for(const card of plans.filter(card=>card.dataset.premiumPlanFamily&&card.dataset.premiumPlanFamily!=='integrated'&&card.dataset.premiumPlanFamily!=='furniture')){assert.ok(card.children.some(child=>child.dataset.premiumPlanDiagram));assert.ok(!card.children.some(child=>child.tagName==='IMG'));}
 const custom=customProject(),customDocument=documentFixture(),customRoot=renderPremiumPlanControls(customDocument.body,{...custom,onPatch:()=>true});assert.ok(all(customRoot).some(element=>element.dataset.premiumBasin));assert.ok(all(customRoot).filter(element=>element.dataset.premiumBasin).every(card=>card.children.some(child=>child.tagName==='IMG')));
});

test('custom depth and basin XY submit physical centimetres, while rejected inputs remain in place',()=>{
 const {project,host}=customProject(),choice=premiumBasinChoices(project,host).find(choice=>choice.product.id==='vasca-a50');assert.ok(choice);host.settings=choice.settings;
 const document=documentFixture(),patches=[],errors=[],root=renderPremiumPlanControls(document.body,{project,host,onPatch:settings=>{patches.push(settings);return true;},onError:message=>errors.push(message)});
 const depth=find(root,'premiumControl','depth');depth.value='50';find(root,'premiumControl','dimensions').onclick();assert.equal(patches.at(-1).topDepth,50);assert.equal(patches.at(-1).topPlanId,'tfx1-linear-top');
 const count=patches.length;depth.value='120';find(root,'premiumControl','dimensions').onclick();assert.equal(patches.length,count);assert.equal(depth.value,'120');assert.match(errors.at(-1),/profondeur/);
 const x=find(root,'premiumControl','basinOffsetX'),z=find(root,'premiumControl','basinOffsetZ');x.value='0';z.value='0';find(root,'premiumControl','basin-position-xy').onclick();assert.equal(patches.at(-1).basinOffsetX,0);assert.equal(patches.at(-1).basinOffsetZ,0);validateProject({...project,items:project.items.map(item=>item.id===host.id?{...item,settings:patches.at(-1)}:item)});
});

test('production Anima source isolates plans from cabinet controls and routes actual top taps before renovation',()=>{
 let source=transformCommonStudioSource(readFileSync('studio-one/src/app.js','utf8'),'app.js');if(!source.includes('function __animaRenderCabinetControls('))source=transformAnimaCabinetUI(source);const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 assert.ok(!source.includes("if(['furniture','basin'].includes(editTarget)&&composition?.selected?.type==='cabinet')renderCabinetSizeControls"));assert.match(source,/basin:'Plans et vasques'/);assert.match(source,/if\(type==='cabinet'\)\{__animaOpenCabinetChooser/);assert.match(source,/function refreshWidthUI\(\)\{__animaCabinetSidebar\(\);/);
 const fn=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='handleObjectTap'),events=[],context={composition:{items:[{id:'cabinet-1',type:'cabinet'}]},tileEditing:true,selectedTile:{},highlightIndividualTile:()=>{},renovation:{tap:()=>{events.push('renovation');return true;}},selectItem:id=>events.push(['select',id]),openInspector:target=>events.push(['inspector',target])};vm.createContext(context);vm.runInContext(source.slice(fn.start,fn.end)+'\nglobalThis.tap=handleObjectTap;',context);context.tap({itemId:'cabinet-1',editTarget:'basin'});assert.deepEqual(events,[['select','cabinet-1'],['inspector','basin']]);
});


test('every initial family photo selects its own exact source plan through a synchronously rerendering patch handler',()=>{
 const expected={fenix:'tfx1-linear-top',hpl:'thpl1-linear-top',gres:'tgrs1a-linear-top',geacril:'tpgea12-linear-top','geacril-stone':'txt12-linear-top',integrated:'tk80-integrated-top',furniture:'tpc80-cover'};
 for(const [family,planId] of Object.entries(expected)){
  const project=draftProject(initialDraft()),host=project.items.find(item=>item.type==='cabinet'),document=documentFixture();let root;
  const render=()=>{document.body.replaceChildren();root=renderPremiumPlanControls(document.body,{project,host,onPatch:settings=>{host.settings=settings;validateProject(project);render();return true;}});};render();
  const card=find(root,'premiumPlanFamily',family);assert.ok(card);assert.equal(card.dataset.premiumPlan,planId);assert.match(card.attributes['aria-label'],/^Choisir /);card.onclick();
  assert.equal(host.settings.topPlanId,planId);assert.equal(worktopFamily(PRODUCT_BY_ID.get(host.settings.topPlanId)),family);assert.equal(find(root,'premiumControl','family').value,family);
 }
});

test('dimension edits commit depth and basin XY together; basin-only edits keep unsubmitted slab dimensions',()=>{
 for(const action of ['dimensions','basin-position-xy']){
  const {project,host}=customProject(),choice=premiumBasinChoices(project,host).find(choice=>choice.product.id==='vasca-a50');assert.ok(choice);host.settings=choice.settings;
  const document=documentFixture(),patches=[],root=renderPremiumPlanControls(document.body,{project,host,onPatch:settings=>{validateProject({...project,items:project.items.map(item=>item.id===host.id?{...item,settings}:item)});patches.push(settings);return true;}});
  find(root,'premiumControl','depth').value='80';find(root,'premiumControl','length').value='110';find(root,'premiumControl','shift').value='1';find(root,'premiumControl','basinOffsetX').value='1';find(root,'premiumControl','basinOffsetZ').value='-16.9';find(root,'premiumControl',action).onclick();
  if(action==='dimensions'){
   assert.equal(patches.length,1,'dimensions must commit one valid combined edit');assert.equal(patches[0].topDepth,80);assert.equal(patches[0].topLength,110);assert.equal(patches[0].topShift,1);assert.equal(patches[0].basinOffsetX,1);assert.equal(patches[0].basinOffsetZ,-16.9);assert.equal(patches[0].topAutoFit,false);
  }else{
   assert.equal(patches.length,0,'a position outside the unchanged slab must be rejected');
   find(root,'premiumControl','basinOffsetZ').value='0';find(root,'premiumControl',action).onclick();assert.equal(patches.length,1);
   assert.equal(patches[0].topLength,host.settings.topLength);assert.equal(patches[0].topDepth,host.settings.topDepth);assert.equal(patches[0].topShift,host.settings.topShift);assert.equal(patches[0].topAutoFit,host.settings.topAutoFit);assert.equal(patches[0].basinOffsetX,1);
  }
 }
});

test('adding a new basin to an existing deep plan keeps the bowl above the actual cabinet',()=>{
 const {project,host}=customProject();host.settings.topDepth=80;validateProject(project);
 const selection=topSelection(host.settings.top,host.settings.width,host.settings.format,host.settings.basinLayout,host.settings.topSpan,host.settings.topPlanId,host.settings.topLength,host.settings),expectedOffset=-(80-selection.referenceDepth)/2;
 const choices=premiumBasinChoices(project,host),choice=choices.find(choice=>choice.product.id==='vasca-a50');assert.ok(choice,'a supported deep plan must still offer its compatible A50 basin');assert.equal(choice.settings.topDepth,80);assert.equal(choice.settings.basinOffsetZ,expectedOffset);
 validateProject({...project,items:project.items.map(item=>item.id===host.id?{...item,settings:choice.settings}:item)});
 const document=documentFixture(),patches=[],root=renderPremiumPlanControls(document.body,{project,host,onPatch:settings=>{patches.push(settings);return true;}});find(root,'premiumBasin','vasca-a50').onclick();assert.equal(patches[0].basinOffsetZ,expectedOffset);assert.equal(patches[0].topDepth,80);
});

test('a configured vanity highlights its single canonical base shape and changing shape keeps Ribelle',()=>{
 const document=documentFixture(),picked=[],settings={format:'ribelle-two',width:80},root=renderAnimaCabinetControls(document.body,{settings,onModel:id=>picked.push(id)}),gallery=all(root).find(element=>element.dataset.animaCabinetGallery==='true'),cards=all(gallery).filter(element=>element.dataset.animaCabinetModel);
 assert.equal(cards.length,5);assert.equal(cards.filter(card=>card.attributes['aria-pressed']==='true').length,1);assert.equal(cards.find(card=>card.attributes['aria-pressed']==='true').dataset.animaCabinetModel,'pura-base-two');
 const one=cards.find(card=>card.dataset.animaCabinetModel==='pura-base-one');assert.ok(one);one.onclick();assert.deepEqual(picked,['ribelle-base-one']);
 assert.ok(all(root).some(element=>element.textContent==='Sous-vasque · passage de siphon adapté à votre vasque'));
});

test('every illustrated basin card exposes its actual source choice to left-button drag binding',()=>{
 const {project,host}=customProject(),document=documentFixture(),bound=[],patches=[],root=renderPremiumPlanControls(document.body,{project,host,onPatch:settings=>{patches.push(settings);return true;},onBasinCard:(button,choice)=>bound.push({button,choice})}),cards=all(root).filter(element=>element.dataset.premiumBasin);
 assert.ok(cards.length>8);assert.equal(bound.length,cards.length);assert.deepEqual(bound.map(binding=>binding.button),cards);
 for(const {button,choice} of bound){assert.equal(button.dataset.premiumBasin,choice.product.id);assert.equal(choice.settings.top,choice.product.id);assert.ok(button.children.some(element=>element.tagName==='IMG'));}
 const first=bound[0];first.button.onclick();assert.equal(patches.at(-1).top,first.choice.product.id);
});

test('base cabinet choices become real under-basin references only when a basin is installed, then restore full storage',()=>{
 for(const format of ['pura-base-two','pura-base-one','pura-base-doors']){
  const project=draftProject(initialDraft()),host=project.items.find(item=>item.type==='cabinet');host.settings={...host.settings,format,width:80,top:'bare'};
  const plan=premiumPlanChoices(project,host).find(choice=>choice.product.id==='tfx1-linear-top');assert.ok(plan);host.settings=plan.contexts[0].settings;assert.equal(cabinetFormat(host.settings.format).subtype,'base');assert.equal(host.settings.topDrawer,'full');
  const basin=premiumBasinChoices(project,host).find(choice=>choice.product.id==='vasca-a50');assert.ok(basin,format);host.settings=basin.settings;assert.equal(cabinetFormat(host.settings.format).subtype,'vanity');assert.equal(host.settings.topDrawer,'siphon');validateProject(project);
  const document=documentFixture(),patches=[],root=renderPremiumPlanControls(document.body,{project,host,onPatch:settings=>{patches.push(settings);host.settings=settings;validateProject(project);return true;}}),kind=find(root,'premiumControl','basin-kind');kind.value='none';kind.onchange();assert.equal(cabinetFormat(patches.at(-1).format).subtype,'base');assert.equal(patches.at(-1).topDrawer,'full');assert.equal(patches.at(-1).width,80);
 }
});

test('smoked Eclisse offers independent source tablet and support options and clears them on opaque finish',()=>{
 for(const id of ['eclisse116-countertop-basin','eclisse115-countertop-basin','eclisse114-countertop-basin','eclisse116-s-semi-recessed-basin','eclisse115-s-semi-recessed-basin','eclisse114-s-semi-recessed-basin']){
  const {project,host}=customProject(),choice=premiumBasinChoices(project,host).find(choice=>choice.product.id===id);assert.ok(choice,id);host.settings={...choice.settings,basinColor:'fume-matte',basinPriceKey:'fume-matte'};
  const document=documentFixture();let root;const render=()=>{document.body.replaceChildren();root=renderPremiumPlanControls(document.body,{project,host,onPatch:settings=>{host.settings=settings;validateProject(project);render();return true;}});};render();
  const suffix=PRODUCT_BY_ID.get(id).ref.match(/(114|115|116)/)[1],bottom=find(root,'premiumControl','basin-bottom'),support=find(root,'premiumControl','basin-support');assert.ok(bottom,id);assert.ok(support,id);assert.match(bottom.children[1].textContent,new RegExp('TVL'+suffix));assert.match(bottom.children[1].textContent,/225,60/);assert.match(support.children[1].textContent,new RegExp('SUP'+suffix));assert.match(support.children[1].textContent,/126,00/);
  bottom.value='tvl';bottom.onchange();assert.equal(host.settings.basinBottom,'tvl');assert.equal(host.settings.basinSupport,false);
  const nextSupport=find(root,'premiumControl','basin-support');nextSupport.value='with';nextSupport.onchange();assert.equal(host.settings.basinBottom,'tvl');assert.equal(host.settings.basinSupport,true);
  const colour=find(root,'premiumControl','basin-color');colour.value='white-matte';colour.onchange();assert.equal(host.settings.basinBottom,'none');assert.equal(host.settings.basinSupport,false);assert.equal(find(root,'premiumControl','basin-bottom'),undefined);
 }
});
