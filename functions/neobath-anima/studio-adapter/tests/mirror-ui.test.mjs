import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
import {PRODUCTS} from '../anima-data.js';
import {animaMirrorFamilies,animaMirrorFamily,animaMirrorSelection,mirrorSizeLabel,renderAnimaMirrorControls,renderAnimaMirrorChooser} from '../mirror-controls.js';
import {transformAnimaMirrorUI} from '../mirror-ui-transform.mjs';
import {transformCommonStudioSource} from '../studio-source-transform.mjs';
const sourceURL=new URL('../../../../studio-one/src/app.js',import.meta.url);
const mirrorURL=new URL('../mirrors.js',import.meta.url);
const sourceMirrors=PRODUCTS.filter(product=>product.category==='mirror');
class Element{
 constructor(document,tag){this.ownerDocument=document;this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.style={};this.textContent='';this.listeners={};this.value='';}
 append(...children){this.children.push(...children);for(const child of children)if(child&&typeof child==='object')child.parentNode=this;}
 replaceChildren(...children){this.children=[];this.append(...children);}
 addEventListener(type,fn){this.listeners[type]=fn;}
 setAttribute(key,value){this.attributes[key]=value;}
 click(){this.listeners.click?.({target:this});}
 change(value){this.value=value;this.listeners.change?.({target:this});}
}
function all(node){return[node,...node.children.flatMap(child=>child&&typeof child==='object'?all(child):[])];}
function doc(){const document={createElement:tag=>new Element(document,tag),createTextNode:text=>String(text),getElementById:id=>all(document.head).find(el=>el.id===id)||null};document.head=new Element(document,'head');document.body=new Element(document,'body');return document;}
const nodes=(root,tag)=>all(root).filter(element=>element.tagName===tag.toUpperCase());

test('42 exact catalogue SKUs appear once across15 mirror models, including the140cm variants',()=>{
 const families=animaMirrorFamilies(),grouped=families.flatMap(family=>family.products);
 assert.equal(sourceMirrors.length,42);assert.equal(families.length,15);assert.equal(grouped.length,42);
 assert.equal(new Set(grouped.map(product=>product.id)).size,42);
 assert.deepEqual(new Set(grouped.map(product=>product.id)),new Set(sourceMirrors.map(product=>product.id)));
 assert.equal(families.find(family=>family.id==='sf').products.length,4);
 assert.equal(families.find(family=>family.id==='sft').products.length,5);
 assert.equal(families.find(family=>family.id==='sfr').products.length,5);
 assert.equal(animaMirrorFamily({mirrorModel:'sft14070-mirror'}).id,'sft');
 assert.equal(animaMirrorFamily({mirrorModel:'sfr14070-mirror'}).id,'sfr');
 assert.ok(families.every(family=>family.photo?.src.includes('/neobath-anima-2026/product-photos/')));
});
test('model and format choices resolve only exact source identifiers and preserve their true dimensions',()=>{
 for(const family of animaMirrorFamilies())for(const product of family.products){
  const settings=animaMirrorSelection(family.id,product.id);
  assert.deepEqual([settings.mirrorModel,settings.width,settings.height],[product.id,product.width,product.height]);
  assert.equal(settings.led,!!product.backlit);assert.equal(settings.mirrorFinish,'Argent');assert.equal(settings.rotated,false);
 }
 assert.equal(animaMirrorSelection('sf','sft14070-mirror'),null);
 assert.equal(animaMirrorSelection('sf','invented-90x70'),null);
 assert.equal(animaMirrorFamily({mirrorModel:'missing'}),null);
 assert.equal(mirrorSizeLabel(PRODUCTS.find(product=>product.id==='offset80-mirror')),'80 × 80 cm');
 assert.equal(mirrorSizeLabel(PRODUCTS.find(product=>product.id==='sptr80-mirror')),'Ø 80 cm');
});
test('the add chooser has one source image per model, then only the selected model formats',()=>{
 const document=doc(),added=[],bindings=[],root=renderAnimaMirrorChooser(document.body,{onAdd:settings=>added.push(settings),bindDrag:(button,descriptor)=>bindings.push(descriptor)});
 assert.equal(nodes(root,'img').length,15);
 assert.equal(all(root).filter(element=>element.dataset.animaMirrorModel).length,15);
 all(root).find(element=>element.dataset.animaMirrorModel==='sfr').click();
 assert.equal(nodes(root,'img').length,1);
 const select=nodes(root,'select')[0];assert.equal(nodes(select,'option').length,5);
 select.change('sfr14070-mirror');
 assert.equal(bindings.at(-1).options.mirrorModel,'sfr14070-mirror');
 nodes(root,'button').find(button=>button.className==='anima-mirror-add').click();
 assert.deepEqual([added[0].mirrorModel,added[0].width,added[0].height],['sfr14070-mirror',140,70]);
 nodes(root,'button').find(button=>button.className==='anima-mirror-back').click();assert.equal(nodes(root,'img').length,15);
});
test('the inspector presents15 model choices and five realSFT sizes without invented frame finishes',()=>{
 const document=doc(),patches=[],root=renderAnimaMirrorControls(document.body,{settings:{mirrorModel:'sft14070-mirror',width:140,height:70,led:false},onPatch:settings=>patches.push(settings)});
 const selects=nodes(root,'select');assert.equal(selects.length,2);
 assert.equal(nodes(selects[0],'option').length,15);assert.equal(nodes(selects[1],'option').length,5);
 assert.equal(selects[0].value,'sft');assert.equal(selects[1].value,'sft14070-mirror');assert.equal(nodes(root,'img').length,1);
 selects[1].change('sft8070-mirror');assert.deepEqual([patches[0].mirrorModel,patches[0].width,patches[0].height],['sft8070-mirror',80,70]);
 assert.ok(!JSON.stringify(root.textContent).includes('Doré'));
 const ledRoot=renderAnimaMirrorControls(document.body,{settings:{mirrorModel:'sptr80-mirror',width:80,height:80,led:false},onPatch:settings=>patches.push(settings)});
 const ledSelect=nodes(ledRoot,'select').at(-1);assert.equal(ledSelect.value,'off');ledSelect.change('on');assert.deepEqual(patches.at(-1),{led:true});
});
test('the scoped transform replaces only mirror chooser/inspector and leaves the renderer/source untouched',()=>{
 const original=readFileSync(sourceURL,'utf8'),before=readFileSync(mirrorURL),source=transformCommonStudioSource(original,'app.js'),transformed=transformAnimaMirrorUI(source);
 parse(transformed,{ecmaVersion:'latest',sourceType:'module'});
 assert.match(transformed,/if\(type==='mirror'\)\{/);assert.match(transformed,/__animaMirrorFamilies\(\)\.length\+' modèles'/);
 assert.match(transformed,/function renderMirrorOptions\(parent,item\)\{if\(!item\)return;return __animaMirrorControls/);
 assert.equal(transformAnimaMirrorUI(transformed),transformed);
 assert.equal(readFileSync(sourceURL,'utf8'),original);assert.equal(createHash('sha256').update(readFileSync(mirrorURL)).digest('hex'),createHash('sha256').update(before).digest('hex'));
 assert.ok(transformed.includes('function updateMirror(patch)'));assert.ok(transformed.includes('function renderCabinetSizeControls'));
 assert.throws(()=>transformAnimaMirrorUI('function changed(){}'),/source contract changed/);
});
