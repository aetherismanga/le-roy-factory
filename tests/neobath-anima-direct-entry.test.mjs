import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parse} from 'acorn';
import {transformHomeSource} from '../functions/neobath-anima/studio-adapter/home-transform.mjs';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {initialDraft,draftProject} from '../functions/neobath-anima/studio-adapter/commerce/guided.js';
import {cabinetProduct,cabinetFormat} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {validateProject} from '../functions/neobath-anima/studio-adapter/projects.js';

function handler(id){
 const source=transformCommonStudioSource(transformHomeSource(readFileSync(new URL('../studio-one/src/commerce/home.js',import.meta.url),'utf8')),'commerce/home.js');
 const expression=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='ExpressionStatement'&&node.expression.type==='AssignmentExpression'&&node.expression.left.object?.callee?.name==='$'&&node.expression.left.object.arguments[0]?.value===id)?.expression;
 assert.ok(expression,'Original Studio One control '+id+' is present');
 return source.slice(expression.right.start,expression.right.end);
}
function fixture(){
 const values=new Map([['draft','old draft'],['current','old current'],['saved','saved projects'],['active','previous identity']]);
 const navigations=[],storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
 const context={initialDraft,draftProject,localStorage:storage,projectNavigation:{request:callback=>callback()},t:x=>x,demoRoute:x=>x,__animaGo:path=>navigations.push(path),switchView(){throw Error('The preliminary wizard must not be opened.');},DRAFT_KEY:'draft',TRANSFER_KEY:'transfer',CURRENT_KEY:'current',QUOTE_KEY:'quote',QUOTE_CONTEXT:'quote-context',FLOW_KEY:'flow',ACTIVE_ID:'active'};
 return {values,navigations,context};
}
test('Nouveau projet opens the real atelier directly with one valid Anima cabinet and keeps saved projects',()=>{
 const {context,values,navigations}=fixture();
 runInNewContext('('+handler('#new-project')+')()',context);
 assert.deepEqual(navigations,['atelier.html?guided=1']);
 assert.equal(values.get('saved'),'saved projects');assert.equal(values.has('active'),false);
 assert.equal(JSON.parse(values.get('flow')).view,'atelier');
 const project=validateProject(JSON.parse(values.get('transfer'))),cabinet=project.items.filter(item=>item.type==='cabinet');
 assert.equal(cabinet.length,1);assert.equal(cabinet[0].settings.format,'pura-base-two');assert.equal(cabinet[0].settings.topDrawer,'full');assert.equal(cabinetProduct(cabinet[0].settings.format,80).ref,'APUR-BA8052');assert.equal(cabinetFormat(cabinet[0].settings.format).trueDrawers,2);assert.equal(cabinet[0].settings.width,80);assert.equal(cabinet[0].settings.top,'bare');
});
test('Resume and edit choices return existing compositions to the atelier without reopening the wizard',()=>{
 const {context}=fixture(),project=draftProject(initialDraft()),opened=[];
 Object.assign(context,{resumeStudioEntry:()=>null,read:key=>key==='current'?project:null,launch:p=>opened.push(p),persistQuote(){},project,error(message){throw Error(message);}});
 runInNewContext('('+handler('#resume-project')+')()',context);assert.equal(opened[0],project);
 runInNewContext('('+handler('#edit-choices')+')()',context);assert.equal(opened[1],project);
});
