import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeCabinetInspector} from '../shared/lrf-3d/cabinet-inspector.js';
import {createVisualChoiceDOM,descendants} from './helpers/visual-choice-dom.mjs';

function fixture(){
 const dom=createVisualChoiceDOM(),body=dom.element('div');body.id='object-editor-body';dom.document.body.append(body);
 const add=(className,tag='div')=>{const node=dom.element(tag);node.className=className;body.append(node);return node;};
 return {...dom,body,add,item:{id:'cabinet',type:'cabinet',settings:{width:120}},cleanup(){dom.restore();}};
}
test('cabinet actions stay above finishes; installation tools keep their original callbacks in a separate group',()=>{
 const h=fixture(),calls=[];
 try{
  const size=h.add('cabinet-size-controls'),heading=h.add('cabinet-finish-heading','strong'),grid=h.add('object-grid'),actions=h.add('object-actions'),position=h.add('fixture-fields'),lock=h.add('renovation-context');
  const button=(id)=>{const node=h.element('button');node.dataset.objectAction=id;node.onclick=()=>calls.push(id);actions.append(node);return node;};
  const opening=button('cabinet'),duplicate=button('duplicate'),remove=button('remove');button('basin');const wall=h.element('select');wall.className='object-wall-choice';actions.append(wall);
  organizeCabinetInspector(h.body,h.item,'furniture',target=>calls.push(target));
  const children=h.body.children;
  assert.equal(children[0].className,'cabinet-inspector-nav');assert(children.indexOf(size)<children.indexOf(actions));assert(children.indexOf(actions)<children.indexOf(heading));assert(children.indexOf(heading)<children.indexOf(grid));
  const details=h.body.querySelector('.cabinet-installation');assert(details.contains(position));assert(details.contains(lock));assert(details.contains(duplicate));assert(details.contains(remove));assert(details.contains(wall));assert.equal(details.contains(opening),false);
  assert.equal(descendants(h.body).filter(node=>node.dataset.objectAction==='basin').length,0,'The worktop shortcut is represented by the persistent navigation, without a duplicate action');
  opening.click();duplicate.click();h.body.querySelector('[data-cabinet-panel="basin"]').click();assert.deepEqual(calls,['cabinet','duplicate','basin']);
 }finally{h.cleanup();}
});
test('worktop tab keeps basin controls and taps in place while cabinet installation remains on the cabinet tab',()=>{
 const h=fixture(),calls=[];
 try{
  const plans=h.add('object-models'),taps=h.add('cabinet-tap-details','details'),summary=h.element('summary');summary.textContent='Robinetterie';taps.append(summary);h.add('renovation-context');
  organizeCabinetInspector(h.body,h.item,'basin',target=>calls.push(target));
  assert.equal(h.body.querySelector('.renovation-context'),null);assert(h.body.contains(plans));assert(h.body.contains(taps));assert.match(h.body.querySelector('.cabinet-plan-context').textContent,/120 cm/);
  assert.equal(h.body.querySelector('[data-cabinet-panel="basin"]').getAttribute('aria-pressed'),'true');h.body.querySelector('[data-cabinet-panel="furniture"]').click();assert.deepEqual(calls,['furniture']);
  organizeCabinetInspector(h.body,{type:'window'},'window',()=>{});assert.equal(h.body.classList.contains('cabinet-inspector'),false,'Another selected object does not retain cabinet styling');
 }finally{h.cleanup();}
});
