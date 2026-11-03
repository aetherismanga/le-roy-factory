import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BASIN_PRODUCTS} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {basinFormatLabel} from '../functions/neobath-anima/studio-adapter/basin-card.js';
import {initialDraft,draftProject} from '../functions/neobath-anima/studio-adapter/commerce/guided.js';
import {premiumPlanChoices,premiumBasinChoices,renderPremiumPlanControls} from '../functions/neobath-anima/studio-adapter/premium-controls.js';
import {standalonePlanSettings} from '../functions/neobath-anima/studio-adapter/standalone-worktop-data.js';
import {renderStandalonePlanControls} from '../functions/neobath-anima/studio-adapter/standalone-worktop-controls.js';
import {normalizeAutomaticWorktops} from '../functions/neobath-anima/studio-adapter/auto-fit-worktop.js';

class Element{
 constructor(document,tag){Object.assign(this,{ownerDocument:document,tagName:tag.toUpperCase(),children:[],dataset:{},attributes:{},style:{},textContent:'',className:'',hidden:false});}
 append(...children){this.children.push(...children);for(const child of children)if(child&&typeof child==='object')child.parentNode=this;}
 replaceChildren(...children){this.children=[];this.append(...children);}
 setAttribute(name,value){this.attributes[name]=String(value);}
}
const all=node=>[node,...node.children.flatMap(child=>child&&typeof child==='object'?all(child):[])];
function documentFixture(){const document={createElement:tag=>new Element(document,tag),getElementById:id=>all(document.head).find(node=>node.id===id)||null};document.head=new Element(document,'head');document.body=new Element(document,'body');return document;}

test('every basin format uses catalogue dimensions and identifies dimensions per cuve for doubles',()=>{
 for(const product of BASIN_PRODUCTS){
  const label=basinFormatLabel(product);
  assert.ok(label.includes('L '+product.width.toLocaleString('fr-FR')),product.ref);
  assert.ok(label.includes('P '+product.depth.toLocaleString('fr-FR')),product.ref);
  if(product.height)assert.ok(label.includes('H '+product.height.toLocaleString('fr-FR')),product.ref);
  else assert.ok(!label.includes('H '),'unconfirmed height must not be invented for '+product.ref);
  assert.equal(label.startsWith('Par cuve · '),product.basinCount===2&&product.ref!=='TWS110');
 }
 assert.equal(basinFormatLabel(BASIN_PRODUCTS.find(p=>p.ref==='VASCA A50')),'L 50 × P 30 cm');
 assert.equal(basinFormatLabel(BASIN_PRODUCTS.find(p=>p.ref==='ECLISSE114/S')),'L 54 × P 34 × H 12 cm');
 assert.equal(basinFormatLabel(BASIN_PRODUCTS.find(p=>p.ref==='TWS110')),'L 110 × P 30 cm');
});

function assertBasinCards(root,attribute){
 const cards=all(root).filter(node=>node.dataset[attribute]);assert.ok(cards.length>5);
 for(const card of cards){
  const product=BASIN_PRODUCTS.find(product=>product.id===card.dataset[attribute]);assert.ok(product);
  const format=card.children.find(node=>node.className==='anima-basin-format');assert.ok(format,product.ref);
  assert.equal(format.textContent,basinFormatLabel(product));
  assert.equal(card.children.find(node=>node.className==='anima-basin-reference').textContent,'Réf. '+product.ref);
  assert.ok(card.attributes['aria-label'].includes(basinFormatLabel(product)));
  assert.ok(card.children.some(node=>node.tagName==='IMG'||node.className==='anima-basin-photo-placeholder'));
 }
}

test('cabinet basin chooser gives each compatible basin a separate format, reference, image and price',()=>{
 const project=draftProject({...initialDraft(),width:100}),host=project.items.find(item=>item.type==='cabinet');
 host.settings=premiumPlanChoices(project,host).find(choice=>choice.product.id==='tfx1-linear-top').contexts.find(context=>context.span===100).settings;
 const document=documentFixture(),root=renderPremiumPlanControls(document.body,{project,host,onPatch:()=>true});
 assertBasinCards(root,'premiumBasin');
 for(const card of all(root).filter(node=>node.dataset.premiumBasin))assert.ok(card.children.find(node=>node.className==='anima-basin-price').textContent.startsWith('Supplément '));
});

test('independent worktop basin chooser also exposes real formats instead of height-only captions',()=>{
 const document=documentFixture(),settings=standalonePlanSettings({width:100},'tfx1-linear-top');
 const root=renderStandalonePlanControls(document.body,{item:{type:'worktop',settings},onPatch:()=>true});
 assertBasinCards(root,'standaloneBasin');
 const options=all(root).filter(node=>node.tagName==='OPTION'&&node.value!=='none'&&node.parentNode.dataset.standaloneControl==='basin');
 assert.ok(options.length>5);for(const option of options)assert.ok(option.textContent.includes(basinFormatLabel(BASIN_PRODUCTS.find(p=>p.id===option.value))));
 assert.ok(all(root).find(node=>node.dataset.standaloneBasin==='vasca-a50').children.some(node=>node.tagName==='IMG'),'catalogue image works before a global visuals registry is installed');
});

test('native plan assignment fits the connected composition and manual dimensions can explicitly return to automatic',()=>{
 const project=draftProject({...initialDraft(),width:100}),host=project.items.find(item=>item.type==='cabinet'),adjacent=structuredClone(host);
 host.settings={...host.settings,top:'bare',topPlanId:'',topSpan:100,topLength:100,topOffset:0,topShift:0};
 adjacent.id='right-40';adjacent.settings={...host.settings,format:'pura-base-door',width:40,topSpan:40,topLength:40,drawers:[0]};adjacent.placement.u+=70;project.items.push(adjacent);
 let patches=[],document=documentFixture(),root=renderPremiumPlanControls(document.body,{project,host,onPatch:next=>{patches.push(next);return true;}});
 const control=key=>all(root).find(node=>node.dataset.premiumControl===key);
 control('family').value='fenix';control('family').onchange();
 assert.equal(patches.at(-1).topSpan,140);assert.equal(patches.at(-1).topLength,140);assert.equal(patches.at(-1).topAutoFit,true);
 host.settings={...patches.at(-1),topAutoFit:false,topLength:146};
 patches=[];document=documentFixture();root=renderPremiumPlanControls(document.body,{project,host,onPatch:next=>{patches.push(next);return true;}});
 control('fit-composition').onclick();assert.equal(patches.at(-1).topLength,140);assert.equal(patches.at(-1).topAutoFit,true);
 control('length').value='148';control('shift').value='0';control('dimensions').onclick();assert.equal(patches.at(-1).topLength,148);assert.equal(patches.at(-1).topAutoFit,false);
});

test('moving a basin keeps automatic slab sizing and does not commit unsubmitted slab dimensions',()=>{
 const project=draftProject({...initialDraft(),width:100}),host=project.items.find(item=>item.type==='cabinet');
 host.settings=premiumPlanChoices(project,host).find(choice=>choice.product.id==='tfx1-linear-top').contexts.find(context=>context.span===100).settings;
 host.settings=premiumBasinChoices(project,host).find(choice=>choice.product.id==='vasca-a50').settings;
 const patches=[],document=documentFixture(),root=renderPremiumPlanControls(document.body,{project,host,onPatch:next=>{patches.push(next);return true;}}),control=key=>all(root).find(node=>node.dataset.premiumControl===key);
 assert.equal(host.settings.topAutoFit,true);control('length').value='120';control('basinOffsetX').value='1';control('basinOffsetZ').value='0';control('basin-position-xy').onclick();
 assert.equal(patches.at(-1).topAutoFit,true);assert.equal(patches.at(-1).topLength,100);assert.equal(patches.at(-1).basinOffsetX,1);
 // Old saved projects predate the flag; a deliberate overhang remains manual
 // when choosing another basin instead of being silently resized on mutation.
 delete host.settings.topAutoFit;host.settings.topLength=107;host.settings.topShift=1;
 const legacy=premiumBasinChoices(project,host).find(choice=>choice.product.id==='vasca-b50').settings;
 assert.equal(legacy.topAutoFit,false);assert.equal(legacy.topLength,107);assert.equal(legacy.topShift,1);
});

test('changing a bespoke plan thickness preserves manual length and offset through automatic synchronization',()=>{
 const project=draftProject({...initialDraft(),width:120}),host=project.items.find(item=>item.type==='cabinet');
 host.settings=premiumPlanChoices(project,host).find(choice=>choice.product.id==='tfx1-linear-top').contexts.find(context=>context.span===120).settings;
 Object.assign(host.settings,{topLength:140,topShift:2,topAutoFit:false});
 const patches=[],document=documentFixture(),root=renderPremiumPlanControls(document.body,{project,host,onPatch:next=>{patches.push(next);return true;}});
 all(root).find(node=>node.dataset.premiumPlan==='tfx12-linear-top').onclick();
 assert.equal(patches.at(-1).topPlanId,'tfx12-linear-top');assert.equal(patches.at(-1).topAutoFit,false);assert.equal(patches.at(-1).topLength,140);assert.equal(patches.at(-1).topShift,2);
 host.settings=patches.at(-1);const restored=normalizeAutomaticWorktops(project).items.find(item=>item.id===host.id).settings;
 assert.equal(restored.topLength,140);assert.equal(restored.topAutoFit,false);assert.equal(restored.topShift,2);
});
