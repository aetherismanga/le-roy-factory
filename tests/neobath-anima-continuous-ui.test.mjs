import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import {runInNewContext} from 'node:vm';
import {CABINET_FORMATS,cabinetFormat} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {continuousPlanOption,validContinuousPlan} from '../functions/neobath-anima/studio-adapter/continuous-plan-ui.js';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
const cabinet=(id,width,u,format='two')=>({id,type:'cabinet',settings:{format,width,top:'bare',finish:'rovere-alba'},placement:{wall:0,u,height:30}});

test('140cm source top appears only above adjacent stock100+40 supports with the correct20cm offset',()=>{
 const host=cabinet('host',100,150),base=cabinet('base',40,220,'pura-base-door'),project={items:[host,base]};
 assert.deepEqual(continuousPlanOption(project,host,'to140sx-integrated-top'),{span:140,offset:20,ids:['host','base'],min:100,max:240});
 base.placement.u=221;assert.equal(continuousPlanOption(project,host,'to140sx-integrated-top'),null);
 base.placement.u=220;base.placement.height=31;assert.equal(continuousPlanOption(project,host,'to140sx-integrated-top'),null);
});
test('linear160cm plan uses two real80cm cabinets and prevents a second overlapping plan',()=>{
 const host=cabinet('host',80,100),other=cabinet('other',80,180),project={items:[host,other]};
 const context=continuousPlanOption(project,host,'tpgea12-linear-top');assert.equal(context.span,160);assert.equal(context.offset,40);
 Object.assign(host.settings,{top:'tpgea12-linear-top',topSpan:context.span,topOffset:context.offset});
 assert.equal(validContinuousPlan(project,host),true);assert.equal(continuousPlanOption(project,other,'tpc80-cover'),null);
 assert.equal(continuousPlanOption(project,other,'bare').span,80);
 other.placement.u+=1;assert.equal(validContinuousPlan(project,host),false);
});
test('the original atelier preserves continuous plan settings through selection, rebuilding and restore',()=>{
 const source=transformCommonStudioSource(readFileSync(new URL('../studio-one/src/app.js',import.meta.url),'utf8'),'app.js');
 parse(source,{ecmaVersion:'latest',sourceType:'module'});
 assert.ok(source.includes("'topSpan','topOffset'"));
 assert.ok(source.includes('topAvailable(s.top,s.width,s.format,s.topSpan)'));
 assert.ok(source.includes('model.setTop(id,{topSpan:state.topSpan,topOffset:state.topOffset})'));
 assert.ok(source.includes('basinTop:s.top,topSpan:s.topSpan,topOffset:s.topOffset,'));
 assert.ok(source.includes("__animaSyncContinuousTops();return publicProjectData"));
});

test('the original multi-cabinet chooser resolves a40cm support to its real source module',()=>{
 const source=transformCommonStudioSource(readFileSync(new URL('../studio-one/src/app.js',import.meta.url),'utf8'),'app.js');
 const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='__animaCombinationFormat');
 const context={cabinetFormat,CABINET_FORMATS,state:{format:'two'}};runInNewContext(source.slice(node.start,node.end),context);
 assert.equal(context.__animaCombinationFormat(100),'two');assert.equal(context.__animaCombinationFormat(40),'pura-base-door');
 assert.equal(context.__animaCombinationFormat(40,'ribelle-two'),'ribelle-base-door');
 assert.equal(context.__animaCombinationFormat(40,'pura-one'),null);
 assert.ok(source.includes('format:form.id,width,topSpan:width,topOffset:0'));
});
