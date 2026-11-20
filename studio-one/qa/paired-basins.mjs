import {PAIRED_FIXING_NOTE} from '../../shared/lrf-3d/paired-basin-placement.js';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeModel} from '../src/model.js';
import {itemDimensions} from '../src/composition.js';
import {draftProject,initialDraft,normalizeDraft} from '../src/commerce/guided.js';
import {quoteProject} from '../src/commerce/pricing.js';
import {orderText} from '../src/commerce/flow.js';
import {decodeProject,encodeProject} from '../src/projects.js';
import {buildPreview,applyPreviewSettings} from '../src/commerce/preview-model.js';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.00002,`${actual} ≠ ${expected}`);
const settings={...initialDraft(),width:140,basinLayout:'double'};
for(const [top,basinColor,ref,ttc,thickness,bowlWidth,bowlDepth] of [
 ['tampa','gloss','6236',80760],['tampa','matte','13000',108240],
 ['milo','matte','15012',40800,.02,.54,.30],['fiona','matte','15026',43700,.015,.50,.26]
]){
 const project=draftProject({...settings,top,basinColor});
 const restored=decodeProject(encodeProject(project)),cabinet=restored.items[0],quote=quoteProject(restored);
 assert.deepEqual(quote.rows.map(r=>r.ref),['13692 80@ROBLE','13692 80@ROBLE',ref]);
 assert.deepEqual(quote.rows.map(r=>r.publicTTC),[51500,51500,ttc]);
 assert.equal(quote.publicTTC,103000+ttc);
 assert.ok(orderText(restored).includes('Référence : '+ref));
 assert.equal(quote.rows.filter(r=>r.detail.includes(PAIRED_FIXING_NOTE)).length,1);
 assert.equal(orderText(restored).split(PAIRED_FIXING_NOTE).length-1,1);
 const preview=buildPreview(restored);applyPreviewSettings(preview,restored);
 const asset=preview.items[0].asset,group=asset.insets[top],plate=group.children[0];
 asset.root.removeFromParent();asset.root.updateMatrixWorld(true);
 assert.equal(asset.getTop(),top);assert.equal(asset.getTopDrawer(),'siphon');
 assert.equal(group.visible,true);assert.deepEqual(asset.getBasinCenters(top),[-.35,.35]);
 assert.equal(asset.faucets.filter(f=>f.visible).length,2);
 const sides=asset.cabinet.children.filter(o=>o.name.startsWith('Caisson_700x'));
 assert.equal(sides.length,2);assert.deepEqual(sides.map(o=>o.position.x),[-.35,.35]);
 for(const tier of asset.drawers){
  assert.equal(tier.children.length,2);
  tier.position.z=.2;asset.root.updateMatrixWorld(true);
  for(const drawer of tier.children)close(drawer.getObjectByName('Facade_onglet_45deg_19mm').getWorldPosition(new T.Vector3()).z,tier.getWorldPosition(new T.Vector3()).z+.2205);
 }
 if(!thickness)continue;
 // Local ray tests at each opening distinguish a moulded, hollow basin from a flat slab.
 group.updateWorldMatrix(true,true);
 const plateSize=new T.Box3().setFromObject(plate).getSize(new T.Vector3());
 close(plateSize.x,1.41);close(plateSize.y,thickness);close(plateSize.z,.46);
 close(itemDimensions('cabinet',cabinet.settings).width,1.41);
 for(const x of [-.35,.35]){
  const opening=new T.Raycaster(new T.Vector3(x+.04,1.2,.021),new T.Vector3(0,-1,0));
  assert.equal(opening.intersectObject(plate).length,0);
  const bowl=group.children.find(o=>o.name.startsWith('Cuve_')&&o.position.x===x);
  const size=new T.Box3().setFromObject(bowl).getSize(new T.Vector3());
  close(size.x,bowlWidth);close(size.z,bowlDepth);
  const hits=opening.intersectObject(bowl);assert.ok(hits.length&&hits[0].point.y<.76);
 }
 assert.equal(asset.ceramic.clearcoat,0);assert.equal(asset.getBasinCenters('bare').length,1);
}
for(const params of [{top:'tampa',basinColor:'black'},{top:'milo',basinColor:'gloss'},{top:'fiona',basinLayout:'center',basinColor:'matte'},{top:'sella'},{width:141,top:'bare'}]){
 assert.throws(()=>normalizeDraft({...settings,...params}));
}
assert.ok(!orderText(draftProject({...initialDraft(),width:70})).includes(PAIRED_FIXING_NOTE));
assert.equal(makeModel({width:.7}).setTop('milo'),true);
assert.equal(makeModel({width:.73}).setTop('milo'),false);
console.log('PASS · 140 cm · references, quote, transfer, order, two carcasses, double plumbing and solid-surface geometry');
