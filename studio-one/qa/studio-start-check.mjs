import assert from 'node:assert/strict';
import {initialDraft,normalizeDraft,draftProject} from '../src/commerce/guided.js';
import {quoteProject} from '../src/commerce/pricing.js';
import {defaultBathroomProject} from '../src/bathroom-presets.js';
import {makeModel} from '../src/model.js';
import {decorateAsset,decorationVisible} from '../src/decor.js';
import {buildPreview,previewStructure,applyPreviewSettings,FINISHES} from '../src/commerce/preview-model.js';
import {disposeObject} from '../src/composition.js';

const fresh=initialDraft();assert.equal(fresh.top,'bare');
assert.equal(defaultBathroomProject().items.find(i=>i.type==='cabinet').settings.top,'bare');
assert.equal(quoteProject(draftProject(fresh)).publicTTC,51500);
assert.equal(quoteProject(draftProject(fresh)).rows.length,1);
const saved={...fresh,top:'tampa',basinColor:'black',basinLayout:'center'};
assert.equal(normalizeDraft(saved).top,'tampa');
assert.equal(draftProject(saved).items[0].settings.basinColor,'black');

for(const format of ['two','three','one-xl','two-xl']){
 const asset=makeModel({format,width:.8,includeMirror:false}),settings={format,width:80,top:'sella',decor:true};
 decorateAsset(asset,'cabinet',settings);const group=asset.root.getObjectByName('Accessoires_decoratifs');assert(group.visible&&group.getObjectByName('Flacon'));
 const nodes=group.children.slice();
 for(const top of ['bare','plain','neris','sella','torne','tampa','bare']){
  decorateAsset(asset,'cabinet',{...settings,top});assert.equal(group.visible,!['bare','plain'].includes(top));assert.deepEqual(group.children,nodes,'Toggling decor never duplicates meshes');
 }
 decorateAsset(asset,'cabinet',{...settings,decor:false});assert(!group.visible);
 decorateAsset(asset,'cabinet',{...settings,top:'plain',decor:false});assert(!group.visible);
 assert(decorationVisible('washstand',{decor:true}));assert(!decorationVisible('towel',{decor:false}));
 disposeObject(asset.root);
}

const base=draftProject({...fresh,top:'sella',column:true}),preview=buildPreview(base),asset=preview.items[0].asset,root=asset.root,front=asset.frontMeshes[0].geometry;
const updated=draftProject({...fresh,top:'torne',finish:'NOGAL',column:true,columnFinish:'WHITE'});
// Keep the same plumbing signature: a style or finish alone does not replace geometry.
updated.items[0].settings.basinLayout=base.items[0].settings.basinLayout;
assert.equal(previewStructure(base),previewStructure(updated));
applyPreviewSettings(preview,updated);assert.equal(preview.items[0].asset.root,root);assert.equal(preview.items[0].asset.frontMeshes[0].geometry,front);assert.equal(asset.getTop(),'torne');
assert.equal(asset.frontWood.color.getHexString(),FINISHES.find(f=>f.id==='NOGAL').hex.replace('#',''));
assert.notEqual(previewStructure(base),previewStructure(draftProject({...fresh,width:100,column:true})));
assert.notEqual(previewStructure(base),previewStructure(draftProject({...fresh,format:'three',column:true})));
assert.notEqual(previewStructure(base),previewStructure(draftProject({...fresh,column:false})));
disposeObject(preview.group);
console.log('PASS: bare defaults and quote, saved basin preservation, no-basin decoration for four models, reuse of real model on appearance changes');
