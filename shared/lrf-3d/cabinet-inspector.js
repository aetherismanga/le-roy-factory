// Cabinet actions and worktop controls have their own, predictable places.
// The host owns all state and callbacks; rearranging nodes keeps them intact.
function installStyle(document){
 if(document.getElementById('lrf-cabinet-inspector-style'))return;
 const style=document.createElement('style');style.id='lrf-cabinet-inspector-style';style.textContent=`
 #object-editor{background:#fffdf8;border-color:#d8d4c9;border-radius:16px;box-shadow:0 12px 36px #24282018}
 #object-editor .object-editor-heading{padding-bottom:14px;border-bottom:1px solid #e5e1d7;margin-bottom:14px}
 #object-editor .object-editor-heading h2{font:26px/1.2 Georgia,serif;color:#263d35}
 #object-editor-body.cabinet-inspector{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:14px!important;min-width:0;max-height:none!important;overflow-x:hidden!important}
 #viewer #object-editor:has(#object-editor-body.cabinet-inspector){width:min(350px,calc(100% - 24px));max-height:min(62dvh,calc(100% - 90px));overflow-y:auto}
 #object-editor:has(.opening-colors) #object-editor-body{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:12px!important;overflow-x:hidden!important}
 #object-editor .opening-dimensions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
 #object-editor .opening-dimensions input{width:100%;min-height:44px;box-sizing:border-box}
 #object-editor .opening-dimensions button{grid-column:1/-1;min-height:44px;border-radius:8px}
 @media(max-width:760px){#viewer #object-editor:has(#object-editor-body.cabinet-inspector){width:auto;left:10px;right:10px;max-width:none}}
 #object-editor .cabinet-inspector .object-models{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-flow:row;grid-auto-columns:auto;max-width:100%;overflow:visible}
 #object-editor .cabinet-inspector .basin-colors{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-flow:row;grid-auto-columns:auto;max-width:100%;overflow:visible}
 .cabinet-inspector-nav{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:4px;background:#eeede6;border-radius:11px}
 #object-editor .cabinet-inspector-nav button{min-height:42px;padding:9px;border:0;border-radius:8px;background:transparent;font:600 12px/1.3 Arial,sans-serif;color:#607068;cursor:pointer}
 #object-editor .cabinet-inspector-nav button[aria-pressed=true]{background:#fffdf8;color:#294b3f;box-shadow:0 2px 8px #27382c13}
 .cabinet-inspector .cabinet-size-controls{margin:0;display:grid;gap:9px;border:0;background:transparent;padding:0}
 .cabinet-inspector .cabinet-size-controls label,.cabinet-inspector .fixture-fields label{font:12px/1.5 Arial,sans-serif;display:grid;gap:5px}
 .cabinet-inspector select,.cabinet-inspector input{min-height:44px;border:1px solid #d8d7ce;border-radius:8px;background:#fffdf8;padding:9px;color:#29483e;min-width:0;box-sizing:border-box;width:100%}
 .cabinet-inspector .object-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:0;padding:0}
 #object-editor .cabinet-inspector .object-actions button{padding:9px 7px;min-height:42px;border:1px solid #d8d7ce;border-radius:8px;background:#f7f6ef;color:#29483e;font:12px/1.3 Arial,sans-serif;cursor:pointer}
 #object-editor .cabinet-inspector .object-actions button[aria-pressed=true]{background:#294b3f;border-color:#294b3f;color:white}
 .cabinet-inspector .object-actions .check-field{grid-column:1/-1;display:flex;align-items:center;gap:7px;font-size:12px}
 .cabinet-inspector .check-field input{width:18px;min-height:18px;flex:none}
 .cabinet-inspector .cabinet-finish-heading{margin:4px 0 0;font:600 13px/1.4 Arial,sans-serif;color:#3d5148}
 .cabinet-inspector .object-grid{margin:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-flow:row;grid-auto-columns:auto;overflow:visible;gap:8px}
 #object-editor .cabinet-inspector .object-choice{padding:5px;border:1px solid #dddacf;border-radius:9px;background:#fffdf8;min-width:0;overflow:hidden}
 #object-editor .cabinet-inspector .object-choice[aria-pressed=true]{border:2px solid #827457;padding:4px;background:#f2eee4}
 .cabinet-inspector .object-sample{height:58px;border-radius:5px;margin:0 0 6px;background-size:cover;background-position:center}
 .cabinet-inspector .object-choice small{font:11px/1.35 Arial,sans-serif;display:block;overflow-wrap:anywhere;padding:0 2px 3px}
 .cabinet-inspector details.cabinet-tap-details,.cabinet-inspector details.cabinet-installation{border:1px solid #dedbd0;border-radius:10px;padding:0 12px;background:#f8f7f1}
 .cabinet-inspector details>summary{min-height:44px;padding:12px 0;cursor:pointer;font:600 13px/1.4 Arial,sans-serif;color:#3e5148}
 .cabinet-inspector details[open]>summary{border-bottom:1px solid #e1ded4;margin-bottom:12px}
 .cabinet-inspector details .renovation-context{margin:0;padding:0;border:0}
 .cabinet-inspector details .fixture-fields{margin:0 0 12px;gap:9px}
 .cabinet-inspector .basin-compatibility{display:block;margin:0;color:#738075;font:11px/1.5 Arial,sans-serif}
 .cabinet-inspector .cabinet-plan-context{margin:0;font:12px/1.4 Arial,sans-serif;color:#6c786c}
 .cabinet-inspector .cabinet-tap-details .tap-photo{max-height:150px}
 `;document.head.append(style);
}
export function organizeCabinetInspector(body,item,target,openInspector){
 const document=body.ownerDocument||globalThis.document;installStyle(document);
 body.classList.toggle('cabinet-inspector',!!item&&item.type==='cabinet'&&['furniture','basin'].includes(target));
 if(!body.classList.contains('cabinet-inspector'))return;
 const nav=document.createElement('nav');nav.className='cabinet-inspector-nav';nav.setAttribute('aria-label','Configuration du meuble');
 for(const [id,label] of [['furniture','Meuble'],['basin','Plan & vasque']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.cabinetPanel=id;button.setAttribute('aria-pressed',String(id===target));button.onclick=()=>openInspector(id);nav.append(button);}
 body.prepend(nav);
 if(target==='furniture'){
  const actions=body.querySelector('[data-object-action="cabinet"]')?.parentElement;
  if(actions){const placementActions=document.createElement('div');placementActions.className='object-actions cabinet-placement-actions';for(const element of [...actions.children])if(['duplicate','remove','basin'].includes(element.dataset.objectAction)||element.classList.contains('object-wall-choice')){if(element.dataset.objectAction==='basin')element.remove();else placementActions.append(element);}if(placementActions.children.length)body.append(placementActions);actions.classList.add('cabinet-primary-actions');const size=body.querySelector('.cabinet-size-controls');(size||nav).after(actions);}
  const secondary=[...body.children].filter(child=>child.classList.contains('fixture-fields')||child.classList.contains('renovation-context')||child.classList.contains('cabinet-placement-actions'));
  if(secondary.length){const details=document.createElement('details'),summary=document.createElement('summary');details.className='cabinet-installation';summary.textContent='Position & installation';details.append(summary,...secondary);body.append(details);}
 }else{
  const context=document.createElement('p');context.className='cabinet-plan-context';context.textContent='Pour votre meuble de '+item.settings.width+' cm';nav.after(context);
  // Installation belongs to the cabinet tab, while all plan choices stay visible.
  body.querySelector('.renovation-context')?.remove();
 }
}
