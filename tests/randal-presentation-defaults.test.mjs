import test from 'node:test';
import assert from 'node:assert/strict';
import {presentationDefaults,presentationChoices,withPresentationSurface,RANDAL_FLOORS} from '../shared/lrf-3d/randal-presentation-catalog.js';
import {normalizeTileLayout,rowShift,tileModules} from '../shared/lrf-3d/tile-layout.js';

for(const variant of ['studio-one','randal-general'])test(variant+': revised fullscreen defaults migrate old views once and survive native project persistence',async()=>{
 const {initialDraft,draftProject}=await import('../'+variant+'/src/commerce/guided.js');
 const {checkedProject}=await import('../'+variant+'/src/commerce/flow.js');
 const source=draftProject(variant==='studio-one'?initialDraft():initialDraft('aruba'));
 source.presentation={brightness:51,dimensions:true,cameraPreference:'preserved'};
 const before=structuredClone(source),view=presentationDefaults(source);
 assert.deepEqual(source,before);assert.deepEqual(view.items,source.items);assert.deepEqual(view.room,source.room);
 assert.deepEqual(presentationChoices(view),{floor:'yosemite-honey',wall:'paint-grey'});
 assert.equal(view.floor.collection,'Yosemite');assert.equal(view.floor.color,'honey');assert.equal(view.layouts.floor.pattern,'two-thirds');
 assert(view.walls.every(w=>w.collection==='Peinture'&&w.color==='grey'));
 assert.deepEqual(view.presentation,{brightness:71,dimensions:false,cameraPreference:'preserved',defaultsVersion:3});
 const saved=checkedProject(view);assert.deepEqual(saved.presentation,view.presentation);
 const changed=withPresentationSurface(withPresentationSurface(saved,'floor','creta-caramello'),'wall','paint-sage');changed.presentation.dimensions=true;
 const reopened=presentationDefaults(changed);assert.deepEqual(reopened,changed);assert.notEqual(reopened,changed);
 assert.deepEqual(presentationChoices(reopened),{floor:'creta-caramello',wall:'paint-sage'});assert.equal(reopened.presentation.dimensions,true);
});

test('Yosemite is genuinely laid at two thirds with correct physical plank scale',()=>{
 const definition=RANDAL_FLOORS.find(c=>c.id==='yosemite-honey');assert.match(definition.name,/pose 2\/3/);
 const layout=normalizeTileLayout(definition);assert.equal(layout.pattern,'two-thirds');assert.equal(layout.width,1.2);assert.equal(layout.height,.2);
 const shifts=[0,1,2,3].map(row=>rowShift(layout.pattern,row,layout.width));
 assert.deepEqual(shifts.map(v=>Math.round(v*100)),[0,80,40,0]);
 const modules=tileModules({minX:0,minY:0,maxX:3,maxY:1},layout);
 for(const row of [0,1,2]){const plank=modules.find(m=>m.row===row&&m.col===0);assert(plank);assert(Math.abs(plank.x-shifts[row])<1e-10);}
});
