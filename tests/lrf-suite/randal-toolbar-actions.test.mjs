import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPanelPointerGuard} from '../../shared/lrf-3d/panel-pointer-guard.js';
import {findWorkspaceOperation} from '../../shared/lrf-3d/workspace-ui.js';
import {createVisualChoiceDOM} from '../helpers/visual-choice-dom.mjs';

for(const className of ['view-commands','scene-tools','scene-position-lock','walk-toggle','element-side-panel','lrf-visual-choice-popup','lrf-visual-preview'])test(className+': a toolbar or portal click stays in its controls until the native action fires',()=>{
 const h=createVisualChoiceDOM();
 try{
  const panel=h.element('div'),button=h.element('button'),canvas=h.element('canvas');panel.className=className;panel.rect={left:350,top:200,width:180,height:80,right:530,bottom:280};button.textContent='Action';panel.append(button);h.document.body.append(canvas,panel);
  let actions=0;button.onclick=()=>actions++;
  const guard=mountPanelPointerGuard({canvas,document:h.document,view:h.window});
  const down={target:button,clientX:400,clientY:230,pointerId:7,stopImmediatePropagation(){this.stopped=true;}};
  assert.equal(guard.isPanelInteraction(down),true,'An outside-click handler must retain the source DOM until click');
  h.document.listeners.get('pointerdown').forEach(handler=>handler(down));assert.equal(down.stopped,undefined,'Native UI event is never cancelled');button.click();assert.equal(actions,1);
  const released={target:canvas,clientX:750,clientY:350,pointerId:7,stopImmediatePropagation(){this.stopped=true;}};
  h.document.listeners.get('pointerup').forEach(handler=>handler(released));assert.equal(released.stopped,true,'Retargeted release cannot become a scene selection');
  const scene={target:canvas,clientX:750,clientY:350,pointerId:8,stopImmediatePropagation(){this.stopped=true;}};
  assert.equal(guard.isPanelInteraction(scene),false);h.document.listeners.get('pointerdown').forEach(handler=>handler(scene));assert.equal(scene.stopped,undefined);
  guard.destroy();
 }finally{h.restore();}
});

test('saved furniture actions resolve after rerendering, label changes and translation without invoking an unrelated button',()=>{
 const h=createVisualChoiceDOM();
 try{
  const body=h.element('div');body.id='object-editor-body';h.document.body.append(body);
  const saved={key:'legacy-action',scope:body.id,data:{objectAction:'toggle-top'},text:'Haut · ouvrir',label:'Haut · ouvrir'};
  let opened=0;const button=h.element('button');button.dataset.objectAction='toggle-top';button.textContent='Haut · fermer';button.onclick=()=>opened++;body.append(button);
  const wrong=h.element('button');wrong.dataset.objectAction='toggle-bottom';wrong.textContent='Haut · ouvrir';body.prepend(wrong);
  assert.equal(findWorkspaceOperation(saved,{document:h.document}),button);findWorkspaceOperation(saved,{document:h.document}).click();assert.equal(opened,1);
  const translated=h.element('button');translated.dataset.objectAction='toggle-top';translated.textContent='Cajón superior · abrir';translated.onclick=()=>opened++;body.replaceChildren(translated);
  assert.equal(findWorkspaceOperation(saved,{document:h.document}),translated);findWorkspaceOperation(saved,{document:h.document}).click();assert.equal(opened,2);
  body.replaceChildren(wrong);assert.equal(findWorkspaceOperation(saved,{document:h.document}),null);
  const source=h.element('button');source.id='stable-action';body.append(source);assert.equal(findWorkspaceOperation({id:'stable-action'},{document:h.document}),source);
 }finally{h.restore();}
});
