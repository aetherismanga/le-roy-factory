import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {vesselLayoutOptions,basinCenters,integratedOptions} from '../../shared/lrf-3d/integrated-basins.js';
import {PLUMBING,matchingDrain} from '../../shared/lrf-3d/plumbing-catalog.js';
import {METAL_FINISHES} from '../../shared/lrf-3d/taps.js';
import {syncCabinetDrain} from '../../shared/lrf-3d/cabinet-drains.js';
import {makeModel as studioModel} from '../../studio-one/src/model.js';
import {makeModel as generalModel} from '../../randal-general/src/model.js';
import {initialDraft as studioDraft,draftProject as studioProject} from '../../studio-one/src/commerce/guided.js';
import {initialDraft as generalDraft,draftProject as generalProject} from '../../randal-general/src/commerce/guided.js';
import {quoteProject as studioQuote} from '../../studio-one/src/commerce/pricing.js';
import {quoteProject as generalQuote} from '../../randal-general/src/commerce/pricing.js';
import {disposeObject} from '../../studio-one/src/composition.js';

test('right-offset countertop bowls preserve real references and leave integrated catalogue restrictions intact',()=>{
 for(const kind of ['neris','torne']){assert.deepEqual(vesselLayoutOptions(kind,60).map(o=>o.layout),['center']);assert(vesselLayoutOptions(kind,80).some(o=>o.layout==='offset-right'));}
 for(const kind of ['sella','tampa'])assert(!integratedOptions(kind,80).some(o=>o.layout==='offset-right'));
 assert.deepEqual(basinCenters('offset-right',1),[.2]);assert.deepEqual(basinCenters('offset',1),[-.2]);const legacy=studioModel({width:1,format:'two',basinTop:'neris',basinLayout:'offset',includeMirror:false});try{assert.deepEqual(legacy.getBasinCenters('neris'),[0]);}finally{disposeObject(legacy.root);}
});

test('offset bowl, drilled top, mixer centres and siphon geometry agree in both actual models',()=>{
 for(const make of [studioModel,generalModel])for(const top of ['neris','torne'])for(const layout of ['center','vessel-left','offset-right']){
  const asset=make({width:1,format:make===studioModel?'two':'harmony-two',basinTop:top,basinLayout:layout,includeMirror:false}),x=basinCenters(layout,1)[0];
  try{assert.deepEqual(asset.getBasinCenters(top),[x]);assert.equal(asset.tops.vessels[top].group.position.x,x);assert.equal(asset.faucet.position.x,x);assert.equal(asset.tops.basinCenters[0],x);const points=asset.tops.drilled.geometry.parameters.shapes.holes[0].getPoints(),xs=points.map(p=>p.x);assert(Math.abs((Math.max(...xs)+Math.min(...xs))/2-x)<1e-7);const b=new T.Box3().setFromObject(asset.tops.vessels[top].group),width=b.max.x-b.min.x;assert(Math.abs(x)+width/2<=.5);}
  finally{disposeObject(asset.root);}
 }
});

test('clic-clac follows every actual mixer finish without recolouring shared chrome',()=>{
 const asset=studioModel({basinTop:'neris',includeMirror:false}),chrome=asset.faucet.getObjectByName('Embase').material,item={type:'cabinet',asset,settings:{top:'neris'}};
 try{for(const p of PLUMBING){const result=syncCabinetDrain(item,p.id);assert.equal(result.reference,p.drain);assert.equal(item.settings.drainFinish,p.id);assert.equal(item.settings.drainReference,p.drain);const actual=asset.tops.vessels.neris.group.getObjectByName('Couvercle_bonde_neris');assert.equal(actual.material.userData.drainFinish,p.id);assert.equal(actual.material.color.getHex(),new T.Color(METAL_FINISHES.find(m=>m.id===p.id).hex).getHex());assert.notEqual(actual.material,chrome);assert.equal(asset.faucet.getObjectByName('Embase').material,chrome);}
  item.settings.top='plain';syncCabinetDrain(item,'Noir mat');assert(!Object.hasOwn(item.settings,'drainReference'));assert.equal(matchingDrain('unknown').reference,'000550');
 }finally{disposeObject(asset.root);}
});

test('right layout and matching drain survive payload round-trip and public quote totals stay unchanged',()=>{
 for(const [initial,project,quote]of [[studioDraft,studioProject,studioQuote],[generalDraft,generalProject,generalQuote]]){
 const base={...initial(),width:100,top:'neris'},center=project({...base,basinLayout:'center'}),right=project({...base,basinLayout:'offset-right'});right.items[0].settings.tap='11340212703';assert.equal(JSON.parse(JSON.stringify(right)).items[0].settings.basinLayout,'offset-right');assert.equal(quote(center).publicTTC,quote(right).publicTTC);assert.match(quote(right).rows.find(r=>r.name==='Vasque Neris').detail,/droite/);assert.match(quote(right).rows.find(r=>r.name==='Vasque Neris').detail,/000553/);assert.equal(right.brightness,84);assert.equal(right.temperature,4700);assert.equal(right.items.filter(i=>i.type==='window').length,1);assert.equal(right.items.filter(i=>i.type==='door').length,1);
 }
});
