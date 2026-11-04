import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {parse} from 'acorn';
import {AQUAHOME} from '../shared/lrf-3d/aquahome-catalog.js';
import {tapModelKey} from '../shared/lrf-3d/aquahome-installation.js';
import {aquahomeProductVisual} from '../shared/lrf-3d/aquahome-product-visuals.js';
import {animaTapInstallationChoices,renderAnimaTapChooser,renderAnimaTapAdditionChooser} from '../functions/neobath-anima/studio-adapter/tap-controls.js';
import {transformAnimaTapUI} from '../functions/neobath-anima/studio-adapter/tap-ui-transform.mjs';

class Element{
 constructor(d,t){this.ownerDocument=d;this.tagName=t.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.style={};this.textContent='';}
 append(...children){this.children.push(...children);for(const child of children)if(child&&typeof child==='object')child.parentNode=this;}
 replaceChildren(...children){this.children=[];this.append(...children);}
 setAttribute(name,value){this.attributes[name]=value;}
}
const all=node=>[node,...node.children.flatMap(child=>child&&typeof child==='object'?all(child):[])];
function fixture(){const d={createElement:tag=>new Element(d,tag),getElementById:id=>all(d.head).find(n=>n.id===id)||null};d.head=new Element(d,'head');d.body=new Element(d,'body');return d;}
const control=(root,key)=>{const node=all(root).find(n=>n.dataset.animaTapControl===key);assert.ok(node,'control '+key);return node;};
const texts=root=>all(root).map(n=>n.textContent).join('\n');

test('lavabo standard, XL and wall are the first actual catalogue uses, with bath and shower preserved',()=>{
 const uses=animaTapInstallationChoices();assert.deepEqual(uses.slice(0,3).map(use=>use.id),['basin','basin-xl','basin-wall']);
 assert.ok(uses.some(use=>use.id==='shower'));assert.ok(uses.some(use=>use.id==='bath'));assert.equal(new Set(uses.map(use=>use.id)).size,uses.length);
 for(const use of uses)assert.ok(AQUAHOME.some(p=>p.use===use.id));
 const d=fixture(),root=renderAnimaTapAdditionChooser(d.body),cards=all(root).filter(n=>n.dataset.animaTapUse);
 assert.deepEqual(cards.slice(0,3).map(n=>n.dataset.animaTapUse),['basin','basin-xl','basin-wall']);
 for(const card of cards.slice(0,3))assert.ok(card.children.some(n=>n.tagName==='IMG'&&n.src.startsWith('https://studio-one-beta-test-v2.vercel.app/assets/aquahome-2026/')));
 assert.ok(all(root).some(n=>n.tagName==='SUMMARY'&&n.textContent==='Douche, bain et autres robinetteries'));
});

test('each lavabo use chooses a real grouped model and exact finish SKU before native installation',()=>{
 for(const use of ['basin','basin-xl','basin-wall']){
  const d=fixture(),installed=[],bound=[],root=renderAnimaTapAdditionChooser(d.body,{initialUse:use,onSelect:product=>installed.push(product),onCard:(button,product)=>bound.push({button,product})});
  const useProducts=AQUAHOME.filter(p=>p.use===use),families=new Set(useProducts.map(p=>tapModelKey(p)+'|'+p.use)),models=all(root).filter(n=>n.dataset.animaTapModel);
  assert.equal(models.length,families.size);assert.ok(models.length<useProducts.length,'one picture per model instead of duplicate finishes');
  assert.ok(bound.every(({product})=>product.use===use));assert.equal(installed.length,0);
  models[0].onclick();
  let finish=control(root,'finish');const options=finish.children;assert.ok(options.length);
  const black=options.find(option=>/Noir/.test(option.textContent))||options.at(-1);finish.value=black.value;finish.onchange();
  const reference=all(root).find(n=>n.dataset.animaTapSelected)?.dataset.animaTapSelected;assert.equal(reference,black.value);
  control(root,'install').onclick();assert.equal(installed.length,1);assert.equal(installed[0],AQUAHOME.find(p=>p.reference===black.value));assert.equal(installed[0].use,use);
  const visual=aquahomeProductVisual(installed[0]);assert.ok(texts(root).includes(visual.caption),'manufacturer photo remains labelled with its actual shown finish');
  assert.ok(texts(root).includes('Réf. '+installed[0].reference));
 }
});

test('host chooser exposes only supplied compatible references and keeps explicit auto, none and wall actions',()=>{
 const first=AQUAHOME.find(p=>p.use==='basin'),sameFamily=AQUAHOME.filter(p=>p.use===first.use&&tapModelKey(p)===tapModelKey(first)),d=fixture(),picked=[],modes=[];
 const root=renderAnimaTapChooser(d.body,{item:{settings:{tap:first.reference,tapMode:'manual'},asset:{tops:{root:{userData:{animaTop:{wells:[{}]}}}}}},products:sameFamily,onChoose:p=>picked.push(p),onAuto:()=>modes.push('auto'),onNone:()=>modes.push('none'),onWall:()=>modes.push('wall')});
 const finish=control(root,'finish');assert.deepEqual(finish.children.map(n=>n.value),sameFamily.map(p=>p.reference));
 finish.value=sameFamily.at(-1).reference;finish.onchange();assert.equal(picked.at(-1),sameFamily.at(-1));
 for(const mode of ['auto','none','wall'])all(root).find(n=>n.dataset.animaTapMode===mode).onclick();assert.deepEqual(modes,['auto','none','wall']);
 assert.ok(!all(root).filter(n=>n.dataset.animaTapModel).some(n=>!sameFamily.some(p=>p.reference===n.dataset.animaTapReference)));
});

test('wall mode and fixed factory predrilling remain explicit even without any compatible deck mixer',()=>{
 const d=fixture(),item={settings:{tapMode:'auto',tapWallIds:['wall-1']},asset:{tops:{root:{userData:{animaTop:{wells:[{}],factoryPreDrilled:true,retainedFactoryTapHoles:[{}]}}}}}},root=renderAnimaTapChooser(d.body,{item,products:[]});
 assert.ok(texts(root).includes('1 vasque avec mitigeur mural.'));assert.ok(texts(root).includes('prépercé en usine'));assert.ok(texts(root).includes('Choisissez une pose murale adaptée'));
 const wall=all(root).find(n=>n.dataset.animaTapMode==='wall');assert.equal(wall.attributes['aria-pressed'],'true');
 assert.ok(!all(root).some(n=>n.dataset.animaTapControl==='model'));
});

test('a rejected deck installation stays in the model panel with a visible compatible-basin explanation',()=>{
 const d=fixture(),chosen=[],root=renderAnimaTapAdditionChooser(d.body,{onSelect:p=>{chosen.push(p);return false;}});
 all(root).find(n=>n.dataset.animaTapModel).onclick();const selected=all(root).find(n=>n.dataset.animaTapSelected).dataset.animaTapSelected;
 assert.equal(control(root,'install').onclick(),false);assert.equal(chosen.length,1);assert.equal(chosen[0].reference,selected);
 const alert=all(root).find(n=>n.attributes.role==='alert');assert.ok(alert?.textContent.includes('Sélectionnez une vasque compatible'));assert.ok(all(root).some(n=>n.dataset.animaTapSelected===selected));
});

test('the actual catalogue bridge never binds a floating deck mixer and preserves wall/bath native placement',()=>{
 const minimal="function openAddChooser(type){const dialog=$('#add-dialog'),body=$('#add-choices');body.replaceChildren();}";
 const source=transformAnimaTapUI(minimal,'app.js'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='__animaOpenTapAddition');
 const callbacks=[],drags=[],events=[],dialog={close:()=>events.push('close')},context={AQUAHOME,__animaTapCatalogueUse:'basin',__animaTapAdditionChooser:(_body,options)=>callbacks.push(options),$ :()=>({textContent:''}),__animaChooseTapProduct:()=>false,setWorkspace:()=>events.push('workspace'),composition:{selected:{type:'cabinet'}},openInspector:target=>events.push(target),openElementPanel:()=>events.push('open'),productDragController:{bind:(button,product)=>drags.push(product)}};
 runInNewContext(source.slice(node.start,node.end),context);context.__animaOpenTapAddition(dialog,{});const options=callbacks[0];
 for(const use of ['basin','basin-xl','basin-wall','bath'])options.onCard({},AQUAHOME.find(p=>p.use===use));
 assert.deepEqual(drags.map(p=>p.options.use),['basin-wall','bath']);for(const p of drags)assert.ok(AQUAHOME.some(source=>source.reference===p.options.tap&&source.use===p.options.use&&source.finish===p.options.metal));
 assert.equal(options.onSelect(AQUAHOME.find(p=>p.use==='basin')),false);assert.deepEqual(events,['open']);
 context.__animaChooseTapProduct=()=>true;assert.equal(options.onSelect(AQUAHOME.find(p=>p.use==='basin')),true);assert.deepEqual(events,['open','close','workspace','basin']);
});
