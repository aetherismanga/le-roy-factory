import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {parse} from 'acorn';
import {runInNewContext} from 'node:vm';
import * as T from 'three';
import {BASIN_UNITS,normalizeBasinUnitSettings,basinUnitSelection,basinUnitDimensions,basinUnitConstructionSettings} from '../functions/neobath-anima/studio-adapter/basin-unit-data.js';
import {renderBasinUnitChooser,renderBasinUnitControls} from '../functions/neobath-anima/studio-adapter/basin-unit-controls.js';
import {basinUnitHostSettings} from '../functions/neobath-anima/studio-adapter/basin-unit-install.js';
import {draftProject,initialDraft} from '../functions/neobath-anima/studio-adapter/commerce/guided.js';
import {validateProject,encodeProject,decodeProject} from '../functions/neobath-anima/studio-adapter/projects.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';
import {transformCommonStudioSource,transformSharedStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
const root=resolve('.'),studio=join(root,'studio-one/src'),adapter=join(root,'functions/neobath-anima/studio-adapter');mkdirSync('node_modules/.cache',{recursive:true});const dir=mkdtempSync(join(root,'node_modules/.cache/anima-basin-unit-'));
const aliases=new Map(['configuration','basins','mirrors','column','tops','finishes'].map(name=>[join(studio,name+'.js'),join(adapter,name+'.js')]));
await build({stdin:{contents:`export * from ${JSON.stringify(join(adapter,'basin-unit.js'))};export {Composition,itemDimensions} from ${JSON.stringify(join(studio,'composition.js'))};export {makeRoom} from ${JSON.stringify(join(studio,'room.js'))};export {makeStandaloneWorktop} from ${JSON.stringify(join(adapter,'standalone-worktop.js'))};export {resolveProductPlacement,productPreviewTransform} from ${JSON.stringify(join(root,'shared/lrf-3d/product-placement-drag.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'unit.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'anima-basin-unit-native',setup(b){b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));b.onResolve({filter:/^@anima-adapter\//},a=>({path:join(adapter,a.path.slice('@anima-adapter/'.length))}));b.onResolve({filter:/^\./},a=>{const target=aliases.get(resolve(a.resolveDir,a.path));return target?{path:target}:undefined;});b.onLoad({filter:/\.(js|mjs)$/},a=>{const rel=a.path.slice(root.length+1);if(rel==='studio-one/src/composition.js')return {contents:transformCommonStudioSource(readFileSync(a.path,'utf8'),'composition.js'),loader:'js',resolveDir:dirname(a.path)};if(rel==='shared/lrf-3d/product-placement-drag.js')return {contents:transformSharedStudioSource(readFileSync(a.path,'utf8'),rel),loader:'js',resolveDir:dirname(a.path)};});}}]});
const M=await import(pathToFileURL(join(dir,'unit.mjs')).href);after(()=>rmSync(dir,{recursive:true,force:true}));
const box=object=>{object.updateWorldMatrix(true,true);return new T.Box3().setFromObject(object);};
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<.0001,message+': '+actual+' versus '+expected);
const byRef=ref=>BASIN_UNITS.find(p=>p.ref===ref);

test('separate basin units admit only manufactured catalogue bowls and strict priced finishes or complete NCS',()=>{
 assert.equal(BASIN_UNITS.length,18);for(const p of BASIN_UNITS){const s=normalizeBasinUnitSettings({basinProductId:p.id});assert.equal(basinUnitSelection(s).basin.id,p.id);assert.equal(s.basinPriceKey,p.prices[0].key);}
 assert.throws(()=>normalizeBasinUnitSettings({basinProductId:'vasca-a50'}),/plan compatible/);
 assert.throws(()=>normalizeBasinUnitSettings({basinProductId:byRef('ECLISSE116').id,basinColor:'invented'}),/Finition/);
 const ncs=byRef('B571'),key=ncs.prices.find(p=>/ncs/i.test(p.key)).key;
 assert.throws(()=>normalizeBasinUnitSettings({basinProductId:ncs.id,basinColor:key}),/NCS complet/);
 assert.equal(normalizeBasinUnitSettings({basinProductId:ncs.id,basinColor:key,ncsCode:'s 2010-g10y'}).ncsCode,'S 2010-G10Y');
});

test('all 18 real basin shells have their stock width, depth and height without a slab or detached siphon',()=>{
 for(const p of BASIN_UNITS){const asset=M.makeBasinUnit({basinProductId:p.id}),bounds=box(asset.root),size=bounds.getSize(new T.Vector3()),dimensions=basinUnitDimensions(asset.settings);near(size.x,dimensions.width,p.ref+' width');near(size.y,dimensions.height,p.ref+' height');near(size.z,dimensions.depth,p.ref+' depth');near(bounds.min.y,0,p.ref+' shell bottom');
  const decks=[];asset.root.traverse(o=>{if(o.userData.animaSurfaceRole==='deck')decks.push(o);});assert.equal(decks.length,0,p.ref+' has no hidden plan mesh');assert.equal(asset.root.getObjectByName('Siphons_Anima'),undefined);assert.equal(asset.spec.sourceProductId,p.id);assert.deepEqual(asset.getTapPositions(),[]);asset.dispose();}
});

test('material edits preserve shell placement and dimensions after scene translation and rotation',()=>{
 const p=byRef('ECLISSE114'),asset=M.makeBasinUnit({basinProductId:p.id}),wrapper=new T.Group();wrapper.position.set(1.35,.70,-2.4);wrapper.rotation.y=Math.PI/2;wrapper.add(asset.root);const before=box(asset.root).clone(),positions=asset.tops.bowlMeshes.map(o=>o.position.clone());
 assert.equal(asset.setSettings({...asset.settings,basinPriceKey:'bronze-matte',basinColor:'bronze-matte'}),true);const afterBox=box(asset.root);near(before.min.y,afterBox.min.y,'world bottom');near(before.max.y,afterBox.max.y,'world rim');near(before.min.x,afterBox.min.x,'world X');near(before.min.z,afterBox.min.z,'world Z');assert.ok(asset.ceramic.transmission>0);assert.deepEqual(asset.tops.bowlMeshes.map(o=>o.position.toArray()),positions.map(p=>p.toArray()));asset.dispose();
});

test('native scene can place, move, encode and restore basin units with the same shell height anchor',()=>{
 const data=draftProject(initialDraft()),room=M.makeRoom(data.room,0),composition=new M.Composition(room),p=byRef('ECLISSE116'),settings=normalizeBasinUnitSettings({basinProductId:p.id}),asset=M.makeBasinUnit(settings),added=composition.add('basin-unit',asset,settings,{wall:0,u:200,height:70,offset:20});assert.ok(added.item,added.error);near(box(asset.root).min.y,.70,'placed shell bottom');assert.equal(composition.move(added.item.id,{u:230,height:75,offset:25}).error,undefined);near(box(asset.root).min.y,.75,'moved shell bottom');
 const project={...data,items:composition.snapshot()},restored=decodeProject(encodeProject(validateProject(project)));assert.equal(restored.items[0].type,'basin-unit');assert.equal(restored.items[0].settings.basinProductId,p.id);assert.equal(restored.items[0].placement.height,75);const quote=quoteProject(restored);assert.equal(quote.rows.length,1);assert.equal(quote.rows[0].ref,p.ref);assert.ok(!quote.rows.some(row=>/TPGEA|THPL|TFX/.test(row.ref)));asset.dispose();room.dispose();
});

class Element{constructor(d,t){this.ownerDocument=d;this.tagName=t.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.style={};this.textContent='';}append(...c){this.children.push(...c);for(const n of c)if(n&&typeof n==='object')n.parentNode=this;}setAttribute(k,v){this.attributes[k]=v;}focus(){this.ownerDocument.activeElement=this;}replaceChildren(...c){this.children=[];this.append(...c);}}
const all=n=>[n,...n.children.flatMap(c=>c&&typeof c==='object'?all(c):[])];function doc(){const d={createElement:t=>new Element(d,t),getElementById:id=>all(d.head).find(n=>n.id===id)};d.head=new Element(d,'head');d.body=new Element(d,'body');return d;}
test('basin catalogue exposes all 18 illustrated formats, native drag binding and an explicit integrated-bowl route',()=>{
 const d=doc(),picked=[],bound=[];let integrated=0;const gallery=renderBasinUnitChooser(d.body,{onChoose:s=>picked.push(s),onCard:(button,s)=>bound.push([button,s]),onIntegrated:()=>integrated++}),cards=all(gallery).filter(n=>n.dataset.basinUnitProduct);assert.equal(cards.length,18);assert.equal(bound.length,18);for(const card of cards){assert.ok(card.children.some(n=>n.tagName==='IMG'));card.onclick();assert.equal(picked.at(-1).basinProductId,card.dataset.basinUnitProduct);}all(gallery).find(n=>n.dataset.basinUnitControl==='integrated').onclick();assert.equal(integrated,1);
 const p=byRef('ECLISSE116'),patches=[],panel=renderBasinUnitControls(d.body,{item:{settings:normalizeBasinUnitSettings({basinProductId:p.id}),placement:{wall:0,u:100,height:70,offset:0}},onPatch:s=>patches.push(s),onPosition:()=>true}),colours=all(panel).filter(n=>n.dataset.basinFinish);assert.equal(colours.length,p.prices.length);colours.find(n=>n.dataset.basinFinish==='fume-matte').onclick();assert.equal(patches.at(-1).basinPriceKey,'fume-matte');
});

test('placing an independent vessel on an actual support consumes only the matching source settings',()=>{
 const project=draftProject({...initialDraft(),width:100}),host=project.items.find(i=>i.type==='cabinet'),unit=normalizeBasinUnitSettings({basinProductId:byRef('ECLISSE114').id,basinColor:'bronze-matte',basinBottom:'tvl',basinSupport:true}),next=basinUnitHostSettings(project,host,unit);assert.ok(next);assert.equal(next.top,unit.basinProductId);assert.equal(next.basinColor,'bronze-matte');assert.equal(next.basinBottom,'tvl');assert.equal(next.basinSupport,true);assert.equal(next.basinPriceKey,unit.basinPriceKey);validateProject({...project,items:project.items.map(i=>i.id===host.id?{...i,settings:next}:i)});
});

test('production palette insertion, native selection and inspector route preserve the Studio One handlers',()=>{
 const source=transformCommonStudioSource(readFileSync('studio-one/src/app.js','utf8'),'app.js'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});const fn=name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(n,name);return source.slice(n.start,n.end);};assert.match(fn('__animaMountBasinEntry'),/insertBefore\(b,mirror\)/);assert.match(fn('openInspector'),/if\(target==='basin-unit'\)target='basin'/);assert.match(fn('refreshInspector'),/__animaRenderBasinUnitInspector\(body\)/);assert.match(fn('makeSceneAsset'),/type==='basin-unit'/);assert.match(fn('restoreProject'),/'basin-unit','worktop'/);
 const context={composition:{selected:null,room:{walls:[{length:4}]}},__animaBasinUnitSettings:normalizeBasinUnitSettings,__animaBasinUnitDimensions:basinUnitDimensions,__animaMakeBasinUnit:()=>({root:{}})};runInNewContext(fn('__animaBasinUnitAddition')+';result=__animaBasinUnitAddition(0,{basinProductId:'+JSON.stringify(byRef('ECLISSE116').id)+'});',context);assert.equal(context.result.preferred.height,70);assert.equal(context.result.preferred.u,200);
});

test('native basin product drag snaps to a compatible actual slab and uses the correct countertop or recessed preview level',()=>{
 const data=draftProject(initialDraft()),room=M.makeRoom(data.room,0),composition=new M.Composition(room),settings={width:100,top:'tpgea12-linear-top',topPlanId:'tpgea12-linear-top',basinColor:'white-matte',topPriceKey:'white-matte'},asset=M.makeStandaloneWorktop(settings),added=composition.add('worktop',asset,settings,{wall:0,u:180,height:82,offset:0});assert.ok(added.item,added.error);
 const project={...data,items:composition.snapshot()};
 for(const ref of ['ECLISSE116','ECLISSE116/S']){const basin=byRef(ref),s=normalizeBasinUnitSettings({basinProductId:basin.id}),dimensions=basinUnitDimensions(s),construction=basinUnitConstructionSettings(s),product={type:'basin-unit',settings:s,dimensions,isFloor:false,installProduct:{type:'basin',basinId:basin.id,sourceBasin:basin,sourceSettings:construction,project}};
  const meta=asset.tops.root.userData.animaTop,point=asset.root.localToWorld(new T.Vector3(0,meta.topSurface,meta.zOffset+.02)),ray=new T.Ray(point.clone().add(new T.Vector3(0,2,0)),new T.Vector3(0,-1,0)),resolved=M.resolveProductPlacement({ray,composition,product});assert.ok(resolved.placement,resolved.error);assert.equal(resolved.options.basinTargetId,added.item.id);assert.equal(resolved.options.basinSettings.top,basin.id);
  const transform=M.productPreviewTransform(room,product,resolved.placement),expected=point.y+(basin.subtype==='semi-recessed'?.025:dimensions.height)-dimensions.height/2;near(transform.position.y,expected,ref+' ghost shell centre');
  const ghost=M.createBasinUnitGhost(s),bounds=box(ghost.root);near(bounds.getCenter(new T.Vector3()).y,0,ref+' centred free ghost');let released=0;ghost.root.traverse(o=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>released++);});for(const material of ghost.materials)material.dispose();for(const geometry of ghost.geometries)geometry.dispose();assert.ok(released>0,'cancelled ghost disposes actual shell geometry');
 }
 asset.dispose();room.dispose();
});
