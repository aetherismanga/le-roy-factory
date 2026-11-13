import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as T from 'three';
import {transformOriginalModel} from '../functions/neobath-anima/studio-adapter/model-transform.mjs';
import {basinColors} from '../functions/neobath-anima/studio-adapter/basins.js';
import {BASIN_PRODUCTS} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {renderBasinFinishPalette} from '../functions/neobath-anima/studio-adapter/basin-finish-controls.js';
import {renderPremiumPlanControls,premiumPlanChoices,premiumBasinChoices} from '../functions/neobath-anima/studio-adapter/premium-controls.js';
import {renderStandalonePlanControls} from '../functions/neobath-anima/studio-adapter/standalone-worktop-controls.js';
import {standalonePlanSettings} from '../functions/neobath-anima/studio-adapter/standalone-worktop-data.js';
import {draftProject,initialDraft} from '../functions/neobath-anima/studio-adapter/commerce/guided.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),studio=join(root,'studio-one/src'),adapter=join(root,'functions/neobath-anima/studio-adapter');
mkdirSync(join(root,'node_modules/.cache'),{recursive:true});const dir=mkdtempSync(join(root,'node_modules/.cache/anima-colours-v11-'));
const aliases=new Map(['model','configuration','finishes','tops','basins','column','mirrors'].map(name=>[join(studio,name+'.js'),join(adapter,name+'.js')]));
await build({stdin:{contents:`export * from ${JSON.stringify(join(adapter,'model.js'))};export * from ${JSON.stringify(join(adapter,'standalone-worktop.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'model.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'anima-colour-factories',setup(b){b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));b.onResolve({filter:/^\./},a=>{const target=aliases.get(resolve(a.resolveDir,a.path));return target?{path:target}:undefined;});b.onLoad({filter:/studio-one[\\/]src[\\/]model\.js$/},a=>({contents:transformOriginalModel(readFileSync(a.path,'utf8')),loader:'js',resolveDir:dirname(a.path)}));}}]});
const M=await import(pathToFileURL(join(dir,'model.mjs')).href);after(()=>rmSync(dir,{recursive:true,force:true}));
function dispose(root){const geometries=new Set(),materials=new Set();root.traverse(n=>{if(n.isMesh){geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
const eclisse=BASIN_PRODUCTS.filter(p=>/^ECLISSE11[456](?:\/S)?$/.test(p.ref||''));
const settings=(id,key)=>({top:id,topPlanId:'tfx1-linear-top',basinColor:key,basinPriceKey:key,basinLayout:'center',topSpan:100,topLength:100,topOffset:0,topShift:0});

test('all six Eclisse factory assemblies start in their selected resin finish without a later painter',()=>{
 assert.equal(eclisse.length,6);
 for(const p of eclisse)for(const key of ['white-matte','fume-matte','bronze-matte']){
  const s=settings(p.id,key),asset=M.makeModel({width:1,format:'two',includeMirror:false,basinTop:p.id,...s});
  try{const expected=basinColors(p.id,100,'two','center',100,s.topPlanId,100,s).find(c=>c.id===key);assert.equal(asset.ceramic.userData.animaBasinAppearance.id,key,p.ref);assert.equal(asset.ceramic.color.getHexString(),new T.Color(expected.hex).getHexString());assert.ok(asset.tops.bowlMeshes.every(mesh=>mesh.material===asset.ceramic));assert.equal(asset.ceramic.metalness,0);assert.equal(asset.ceramic.transparent,false,'physical transmission retains a closed depth-tested shell');assert.equal(asset.ceramic.opacity,1);if(key==='white-matte')assert.equal(asset.ceramic.transmission,0);else {assert.ok(asset.ceramic.transmission>.75);assert.equal(asset.ceramic.ior,1.49);assert.equal(asset.ceramic.userData.animaBasinAppearance.colorAccuracy,'visual-approximation');}}
  finally{dispose(asset.root);}
 }
});

test('changing Eclisse colour repaints the current shell and never recolours its separate worktop',()=>{
 const id='eclisse114-countertop-basin',s=settings(id,'fume-matte'),asset=M.makeModel({width:1,format:'two',includeMirror:false,basinTop:id,...s});
 try{const shell=asset.tops.root;for(const key of ['bronze-matte','white-matte','fume-matte']){const planHex=asset.planMaterial.color.getHexString();assert.equal(asset.setTop(id,settings(id,key)),true);assert.equal(asset.tops.root,shell,'a colour change reuses the one structural bowl');assert.equal(asset.ceramic.userData.animaBasinAppearance.id,key);assert.equal(asset.planMaterial.color.getHexString(),planHex);asset.setSurface({topSurfaceId:'fenix-blu-shaba'});assert.equal(asset.ceramic.userData.animaBasinAppearance.id,key,'a worktop finish cannot reset the resin');}}
 finally{dispose(asset.root);}
});

test('independent and cabinet basins use the same smoke and bronze material identity',()=>{
 const id='eclisse115-countertop-basin';for(const key of ['fume-matte','bronze-matte']){const s=settings(id,key),cabinet=M.makeModel({width:1,format:'two',includeMirror:false,basinTop:id,...s}),standalone=M.makeStandaloneWorktop({...standalonePlanSettings({width:100},s.topPlanId,id),...s});try{assert.equal(standalone.ceramic.color.getHexString(),cabinet.ceramic.color.getHexString());assert.equal(standalone.ceramic.transmission,cabinet.ceramic.transmission);assert.equal(standalone.ceramic.attenuationColor.getHexString(),cabinet.ceramic.attenuationColor.getHexString());}finally{dispose(cabinet.root);standalone.dispose();}}
});

class Element{constructor(d,t){this.ownerDocument=d;this.tagName=t.toUpperCase();this.children=[];this.dataset={};this.style={};this.attributes={};this.textContent='';}append(...nodes){this.children.push(...nodes);for(const n of nodes)n.parentNode=this;}replaceChildren(...nodes){this.children=[];this.append(...nodes);}setAttribute(k,v){this.attributes[k]=String(v);}}
const all=n=>[n,...n.children.flatMap(all)];
function documentFixture(){const d={createElement:t=>new Element(d,t),getElementById:id=>all(d.head).find(n=>n.id===id)||null};d.head=new Element(d,'head');d.body=new Element(d,'body');return d;}

test('visible basin palettes expose only the manufacturer-priced colours and click the exact finish key',()=>{
 const id='eclisse116-countertop-basin',colours=basinColors(id,100,'two','center',100,'tfx1-linear-top',100),d=documentFixture(),picks=[];
 const palette=renderBasinFinishPalette(d.body,{colours,selected:'bronze-matte',onChoose:key=>picks.push(key)}),buttons=all(palette).filter(n=>n.dataset.basinFinish);
 assert.deepEqual(buttons.map(b=>b.dataset.basinFinish),['white-matte','fume-matte','bronze-matte']);assert.equal(buttons.filter(b=>b.attributes['aria-pressed']==='true').length,1);assert.equal(buttons.find(b=>b.attributes['aria-pressed']==='true').dataset.basinFinish,'bronze-matte');for(const b of buttons){b.onclick();assert.equal(picks.at(-1),b.dataset.basinFinish);}
});

test('cabinet and independent inspector palettes retain the source price colour and clear optional bottoms for opaque white',()=>{
 const project=draftProject({...initialDraft(),width:100}),host=project.items.find(i=>i.type==='cabinet');host.settings=premiumPlanChoices(project,host).find(c=>c.product.id==='tfx1-linear-top').contexts[0].settings;host.settings={...premiumBasinChoices(project,host).find(c=>c.product.id==='eclisse116-countertop-basin').settings,basinColor:'fume-matte',basinPriceKey:'fume-matte',basinBottom:'tvl',basinSupport:true};
 for(const kind of ['cabinet','standalone']){const d=documentFixture(),patches=[],s=kind==='cabinet'?host.settings:{...standalonePlanSettings({width:100},'tfx1-linear-top','eclisse116-countertop-basin'),basinColor:'fume-matte',basinPriceKey:'fume-matte',basinBottom:'tvl',basinSupport:true};const rendered=kind==='cabinet'?renderPremiumPlanControls(d.body,{project,host,onPatch:next=>{patches.push(next);return true;}}):renderStandalonePlanControls(d.body,{item:{type:'worktop',settings:s},onPatch:next=>{patches.push(next);return true;}});const buttons=all(rendered).filter(n=>n.dataset.basinFinish);assert.deepEqual(buttons.map(b=>b.dataset.basinFinish),['white-matte','fume-matte','bronze-matte']);buttons.find(b=>b.dataset.basinFinish==='white-matte').onclick();assert.equal(patches.at(-1).basinPriceKey,'white-matte');assert.equal(patches.at(-1).basinBottom,'none');assert.equal(patches.at(-1).basinSupport,false);}
});
