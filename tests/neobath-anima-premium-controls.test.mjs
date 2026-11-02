import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import vm from 'node:vm';
import {initialDraft,draftProject} from '../functions/neobath-anima/studio-adapter/commerce/guided.js';
import {validateProject,encodeProject,decodeProject} from '../functions/neobath-anima/studio-adapter/projects.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';
import {topSelection,PRODUCT_BY_ID} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {MANUFACTURER_SURFACES} from '../functions/neobath-anima/studio-adapter/premium-materials.js';
import {basinColors} from '../functions/neobath-anima/studio-adapter/basins.js';
import {planSettings,premiumPlanChoices,premiumBasinChoices,renderPremiumPlanControls} from '../functions/neobath-anima/studio-adapter/premium-controls.js';
import {premiumAtelierPrelude,transformPremiumAtelier} from '../functions/neobath-anima/studio-adapter/premium-transform.mjs';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';

function project140(){
 const project=draftProject({...initialDraft(),width:100}),host=project.items.find(item=>item.type==='cabinet'),base=structuredClone(host);
 base.id='support-40';base.settings={...base.settings,format:'pura-base-door',width:40,top:'bare',drawers:[0]};base.placement.u+=70;project.items.push(base);return project;
}
function selectPlan(project,id='tfx1-linear-top',span=140){
 const host=project.items.find(item=>item.type==='cabinet'),choice=premiumPlanChoices(project,host).find(choice=>choice.product.id===id),context=choice?.contexts.find(context=>context.span===span);
 assert.ok(context,'real supported source plan must be selectable');host.settings=context.settings;return host;
}
class Element {
 constructor(document,tag){this.ownerDocument=document;this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.style={};this.textContent='';this.hidden=false;}
 append(...children){this.children.push(...children);for(const child of children)if(child&&typeof child==='object')child.parentNode=this;}
 replaceChildren(...children){this.children=[];this.append(...children);}
 setAttribute(name,value){this.attributes[name]=value;}
 focus(){this.ownerDocument.activeElement=this;}
}
function documentFixture(){const document={createElement:tag=>new Element(document,tag),getElementById:id=>all(document.head).find(el=>el.id===id)||null};document.head=new Element(document,'head');document.body=new Element(document,'body');return document;}
function all(node){return [node,...node.children.flatMap(child=>child&&typeof child==='object'?all(child):[])];}
function control(root,key){const found=all(root).find(el=>el.dataset.premiumControl===key);assert.ok(found,'control '+key+' exists');return found;}

test('bespoke length is independent from the actual stock supports and billed once per centimetre',()=>{
 const project=project140(),host=selectPlan(project);host.settings.topLength=147;host.settings.topShift=1.5;
 const restored=decodeProject(encodeProject(validateProject(project))),quote=quoteProject(restored);
 assert.deepEqual(restored.items.filter(item=>item.type==='cabinet').map(item=>item.settings.width),[100,40]);
 assert.equal(quote.rows.filter(row=>row.ref==='TFX1').length,1);
 assert.equal(quote.rows.find(row=>row.ref==='TFX1').publicTTC,Math.round(147*6.38*120));
 assert.match(quote.rows.find(row=>row.ref==='TFX1').detail,/débord.*G 2.*D 5/);
 for(const patch of [{topLength:247},{topLength:139},{topShift:4}]){const bad=structuredClone(project);Object.assign(bad.items[0].settings,patch);assert.throws(()=>validateProject(bad));}
 const fixed=structuredClone(project);Object.assign(fixed.items[0].settings,{top:'to140sx-integrated-top',topPlanId:'',basinColor:'white-matte',topPriceKey:'white-matte',topLength:147,topShift:0,topSurfaceId:''});assert.throws(()=>validateProject(fixed));
});

test('a basin keeps the explicitly selected Fenix or HPL top and its material source ID through restore and quote',()=>{
 for(const planId of ['tfx1-linear-top','tfx12-linear-top','thpl1-linear-top','thpl12-linear-top']){
  const project=draftProject({...initialDraft(),width:100}),host=selectPlan(project,planId,100),basin=premiumBasinChoices(project,host).find(choice=>choice.product.id==='vasca-a50');
  assert.ok(basin);host.settings=basin.settings;
  const selected=topSelection(host.settings.top,100,'two',host.settings.basinLayout,100,host.settings.topPlanId,host.settings.topLength);
  assert.equal(selected.top.id,planId);assert.equal(selected.basin.id,'vasca-a50');
  const restored=decodeProject(encodeProject(validateProject(project))),quote=quoteProject(restored);
  assert.equal(restored.items[0].settings.topPlanId,planId);assert.equal(quote.rows[1].ref,PRODUCT_BY_ID.get(planId).ref);assert.equal(quote.rows[2].ref,'VASCA A50');assert.ok(quote.publicTTC>0);
 }
});

test('surface IDs are manufacturer IDs bound to their plan family, and NCS requires an exact code',()=>{
 const project=draftProject({...initialDraft()}),host=selectPlan(project,'tfx1-linear-top',80);
 const fenix=MANUFACTURER_SURFACES.filter(surface=>surface.family==='fenix');assert.equal(fenix.length,11);
 for(const surface of fenix){host.settings.topSurfaceId=surface.id;assert.doesNotThrow(()=>validateProject(project));}
 for(const id of ['invented-fenix',MANUFACTURER_SURFACES.find(surface=>surface.family==='hpl').id]){host.settings.topSurfaceId=id;assert.throws(()=>validateProject(project));}
 selectPlan(project,'tpgea12-linear-top',80);Object.assign(host.settings,{topSurfaceId:'geacril-ncs',topPriceKey:'ncs-matte',basinColor:'ncs-matte'});
 assert.throws(()=>validateProject(project));host.settings.topSurfaceNcs='S 2010-G10Y';assert.doesNotThrow(()=>validateProject(project));
 assert.deepEqual(decodeProject(encodeProject(project)),project);
});

test('the actual native DOM surface and custom dimension handlers update only source settings and reject floating plans',()=>{
 const project=project140(),host=selectPlan(project),document=documentFixture(),parent=document.body,patches=[];
 const root=renderPremiumPlanControls(parent,{project,host,onPatch:settings=>{validateProject({...project,items:project.items.map(item=>item.id===host.id?{...item,settings}:item)});patches.push(settings);return true;}});
 const surface=MANUFACTURER_SURFACES.find(surface=>surface.id==='fenix-blu-shaba');assert.ok(surface);
 all(root).find(el=>el.dataset.premiumSurface===surface.id).onclick();assert.equal(patches.at(-1).topSurfaceId,surface.id);assert.equal(patches.at(-1).topPriceKey,'fenix');
 control(root,'length').value='147';control(root,'shift').value='0';control(root,'dimensions').onclick();assert.equal(patches.at(-1).topLength,147);assert.equal(patches.at(-1).topSpan,140);
 const count=patches.length;control(root,'length').value='247';control(root,'dimensions').onclick();assert.equal(patches.length,count);assert.ok(all(root).some(el=>el.attributes.role==='alert'&&el.textContent.includes('validation usine')));
 const kind=control(root,'basin-kind');kind.value='integrated';kind.onchange();const basin=all(root).find(el=>el.dataset.premiumBasin==='vasca-a50');assert.ok(basin);basin.onclick();assert.equal(patches.at(-1).topPlanId,'tfx1-linear-top');assert.equal(patches.at(-1).top,'vasca-a50');
});

test('premium DOM hides dormant NCS fields and shows the chosen surface instead of a generic family photo',()=>{
 for(const [planId,surfaceId] of [['tfx1-linear-top','fenix-blu-shaba'],['thpl1-linear-top','hpl-rovere-valweg'],['tgrs1a-linear-top','gres-pietra-piasentina-grigio']]){
  const project=draftProject({...initialDraft(),width:100}),host=selectPlan(project,planId,100);host.settings.topSurfaceId=surfaceId;
  const document=documentFixture(),root=renderPremiumPlanControls(document.body,{project,host,onPatch:()=>true}),surface=MANUFACTURER_SURFACES.find(surface=>surface.id===surfaceId),image=all(root).find(element=>element.dataset.premiumPlanImage===surfaceId);
  assert.ok(image);assert.equal(image.src,surface.swatch||surface.texture);assert.ok(image.alt.includes(surface.name));
  assert.equal(control(root,'ncs').parentNode.parentNode.hidden,true);
  const style=document.getElementById('anima-premium-controls-style').textContent;
  assert.match(style,/\.anima-premium \[hidden\]\{display:none!important\}/);
  assert.match(style,/\.anima-premium select,\.anima-premium input\{[^}]*min-height:44px[^}]*font:14px/);
  assert.match(style,/\.anima-premium button\{min-height:44px/);
 }
 const project=draftProject({...initialDraft(),width:100}),host=selectPlan(project,'tk100-integrated-top',100),document=documentFixture(),root=renderPremiumPlanControls(document.body,{project,host,onPatch:()=>true});
 assert.ok(all(root).some(element=>element.dataset.premiumPlanImage==='tk100-integrated-top'));
});

test('the production source handler validates before painting and preserves the full journal settings contract',()=>{
 const project=draftProject({...initialDraft(),width:100}),host=selectPlan(project,'tfx1-linear-top',100),ast=parse(premiumAtelierPrelude,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='__animaPremiumApply');
 const events=[],keys=['top','topPlanId','topSpan','topOffset','topLength','topShift','topSurfaceId','topSurfaceNcs','topPriceKey','basinColor'],state={...host.settings};
 const model={setTop:(id,s)=>{events.push(['top',id,s.topSurfaceId]);return true;},setSurface:s=>events.push(['surface',s.topSurfaceId]),setTopDrawer:()=> 'siphon'};
 const item={...host,dimensions:{width:1,height:.53,depth:.465}},context={composition:{selected:item,resize:()=>{events.push(['resize']);return null;}},state,model,CABINET_KEYS:keys,collectProject:()=>({...project,items:project.items.map(raw=>raw.id===item.id?{...raw,settings:item.settings}:raw)}),validateProject,itemDimensions:()=>item.dimensions,paintAsset:()=>events.push(['paint']),saveCabinetState:()=>{},renderComposition:()=>{},refreshWidthUI:()=>{},refreshBasinUI:()=>{},refreshInspector:()=>{},invalidate:()=>{},scheduleProjectCheckpoint:()=>events.push(['checkpoint']),placementStatus:()=>{}};
 vm.createContext(context);vm.runInContext(premiumAtelierPrelude.slice(fn.start,fn.end)+'\nglobalThis.apply=__animaPremiumApply;',context);
 const next={...host.settings,topSurfaceId:'fenix-blu-shaba',topLength:107};assert.equal(context.apply(next),true);assert.equal(item.settings.topSurfaceId,next.topSurfaceId);assert.equal(state.topLength,107);assert.ok(events.some(event=>event[0]==='checkpoint'));
 const before=events.length;assert.equal(context.apply({...next,topSurfaceId:'unknown-surface'}),false);assert.equal(item.settings.topSurfaceId,next.topSurfaceId);assert.ok(!events.slice(before).some(event=>event[0]==='resize'));
 const source=transformCommonStudioSource(readFileSync('studio-one/src/app.js','utf8'),'app.js');parse(source,{ecmaVersion:'latest',sourceType:'module'});assert.match(source,/setPlanSettings:__animaPremiumApply/);assert.ok(!source.includes('for(const option of TOP_OPTIONS){'));assert.match(source,/'topSurfaceId','topSurfaceNcs'/);
});

test('all six Eclisse SKUs offer Opaco492 and Fumé/Bronze540 with exact quote, restore and native card controls',()=>{
 const products=[...PRODUCT_BY_ID.values()].filter(product=>/^ECLISSE11[456](?:\/S)?$/.test(product.ref||''));
 assert.equal(products.length,6);let checked=0;
 for(const product of products)for(const [key,price] of [['white-matte',492],['fume-matte',540],['bronze-matte',540]]){
  assert.deepEqual(product.prices.map(entry=>[entry.key,entry.price]),[['white-matte',492],['fume-matte',540],['bronze-matte',540]]);
  const project=draftProject({...initialDraft(),width:100}),host=selectPlan(project,'tfx1-linear-top',100),choice=premiumBasinChoices(project,host).find(choice=>choice.product.id===product.id);
  assert.ok(choice,product.ref+' must be selectable on its compatible real Fenix top');
  host.settings={...choice.settings,basinColor:key,basinPriceKey:key};
  const restored=decodeProject(encodeProject(validateProject(project))),quote=quoteProject(restored),line=quote.rows.find(row=>row.productId===product.id);
  assert.equal(line.publicTTC,price*120);assert.equal(quote.rows.filter(row=>row.ref==='TFX1').length,1);
  assert.equal(restored.items[0].settings.basinPriceKey,key);assert.equal(restored.items[0].settings.topPlanId,'tfx1-linear-top');
  const appearance=basinColors(product.id,100,'two','center',100,'tfx1-linear-top',100).find(color=>color.id===key);
  assert.ok(appearance);if(key!=='white-matte')assert.equal(appearance.colorAccuracy,'visual-approximation');
  const document=documentFixture(),patches=[],root=renderPremiumPlanControls(document.body,{project,host,onPatch:next=>{patches.push(next);return true;}}),select=control(root,'basin-color');
  assert.deepEqual(select.children.map(option=>option.value),['white-matte','fume-matte','bronze-matte']);
  assert.match(select.children[0].textContent,/590,40/);assert.match(select.children[1].textContent,/648,00/);assert.match(select.children[2].textContent,/648,00/);
  select.value=key;select.onchange();assert.equal(patches.at(-1).basinPriceKey,key);
  const card=all(root).find(element=>element.dataset.premiumBasin===product.id);assert.ok(card);assert.ok(card.children.some(child=>child.textContent?.includes(key==='white-matte'?'590,40':'648,00')));
  const note=all(root).find(element=>element.dataset.basinColorAccuracy==='visual-approximation');
  if(key==='white-matte')assert.equal(note,undefined);else {assert.ok(note);assert.match(note.textContent,/indicatif.*non calibrée/);}
  checked++;
 }
 assert.equal(checked,18);
});
