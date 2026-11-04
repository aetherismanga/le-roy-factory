import {AQUAHOME} from '../../../shared/lrf-3d/aquahome-catalog.js';
import {AQUAHOME_INSTALLATIONS,tapModelKey,tapModelLabel} from '../../../shared/lrf-3d/aquahome-installation.js';
import {aquahomeProductVisual} from '../../../shared/lrf-3d/aquahome-product-visuals.js';

const ORIGIN='https://studio-one-beta-test-v2.vercel.app/';
const LAVABO_USES=Object.freeze([
 {id:'basin',name:'Mitigeur lavabo',detail:'Pose sur plan · vasque intégrée ou basse'},
 {id:'basin-xl',name:'Mitigeur lavabo XL',detail:'Pose sur plan · vasque à poser'},
 {id:'basin-wall',name:'Mitigeur lavabo mural',detail:'Pose murale · sans perçage du plan sur mesure'}
]);
const el=(d,tag,text,cls)=>{const n=d.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const group=p=>tapModelKey(p)+'|'+p.use;
const useName=use=>LAVABO_USES.find(p=>p.id===use)?.name||AQUAHOME_INSTALLATIONS.find(p=>p.id===use)?.name||use;
const familyName=p=>tapModelLabel(p)+(p.use==='basin-xl'?' · XL':p.use==='basin'?' · standard':'');
const preferred=(products,selected)=>products.find(p=>p.reference===selected?.reference)||products.find(p=>p.finish===selected?.finish)||products.find(p=>p.finish==='Chrome brillant')||products[0];

export function animaTapInstallationChoices(products=AQUAHOME){
 const seen=new Set();return [...LAVABO_USES,...AQUAHOME_INSTALLATIONS].filter(use=>!seen.has(use.id)&&seen.add(use.id)&&products.some(p=>p.use===use.id));
}
function styles(d){
 if(d.getElementById('anima-tap-controls-style'))return;
 const style=el(d,'style');style.id='anima-tap-controls-style';style.textContent=`
.anima-tap-controls{display:grid;grid-auto-rows:max-content;align-content:start;gap:12px;min-width:0;width:100%;grid-column:1/-1;box-sizing:border-box;flex:none;color:#29483e;font:13px/1.5 Arial,sans-serif}
.anima-tap-controls p,.anima-tap-controls small{margin:0;font:12px/1.5 Arial,sans-serif;color:#65715f}
.anima-tap-controls h4{margin:0;font:600 14px/1.4 Arial,sans-serif}
.anima-tap-controls label{display:grid;gap:6px;min-width:0;font-weight:600}
.anima-tap-controls select,.anima-tap-controls button{min-width:0;max-width:100%;min-height:44px;box-sizing:border-box;font:13px/1.4 Arial,sans-serif;color:#29483e;touch-action:manipulation}
.anima-tap-controls select{width:100%;padding:10px;border:1px solid #cbd2c5;border-radius:7px;background:#fffdf7}
.anima-tap-controls button{padding:9px;border:1px solid #cbd2c5;border-radius:8px;background:#fffdf7;cursor:pointer;white-space:normal;overflow-wrap:anywhere;text-align:left}
.anima-tap-controls button[aria-pressed=true]{background:#e9efdf;border-color:#29483e;box-shadow:inset 0 0 0 1px #29483e}
.anima-tap-controls .anima-tap-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:0}
.anima-tap-controls .anima-tap-actions>button:last-child{grid-column:1/-1}
.anima-tap-controls .anima-tap-uses,.anima-tap-controls .anima-tap-models{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:max-content;align-content:start;gap:8px;min-width:0}
.anima-tap-controls .anima-tap-card{display:grid;grid-auto-rows:max-content;align-content:start;gap:6px;min-width:0;height:auto}
.anima-tap-controls .anima-tap-card img{display:block;width:100%;height:112px;object-fit:contain;background:#fff;border-radius:5px}
.anima-tap-controls .anima-tap-card strong{font:600 12px/1.4 Arial,sans-serif}
.anima-tap-controls .anima-tap-card small{font-size:11px}
.anima-tap-controls .anima-tap-photo{display:grid;gap:6px;margin:0;padding:10px;border:1px solid #d9dccf;border-radius:8px;background:#fff}
.anima-tap-controls .anima-tap-photo img{display:block;width:100%;height:150px;object-fit:contain}
.anima-tap-controls .anima-tap-photo figcaption{font:11px/1.4 Arial,sans-serif;color:#65715f}
.anima-tap-controls .anima-tap-note{padding:10px;border-radius:7px;background:#edf0e6}
.anima-tap-controls details>summary{cursor:pointer;padding:9px 0;font-weight:600}
.anima-tap-controls [hidden]{display:none!important}
`;d.head.append(style);
}
function photo(d,p,{card=false}={}){
 const visual=aquahomeProductVisual(p);if(!visual)return null;
 const image=el(d,'img');image.src=new URL(visual.src,ORIGIN).href;image.alt=visual.alt;image.width=visual.width;image.height=visual.height;image.loading='lazy';image.decoding='async';
 if(card)return image;const figure=el(d,'figure',undefined,'anima-tap-photo');figure.dataset.animaTapPhoto=p.reference;figure.append(image,el(d,'figcaption',visual.caption));return figure;
}
function field(parent,label,value,entries,onChange,key){
 const d=parent.ownerDocument,wrap=el(d,'label',label),select=el(d,'select');select.dataset.animaTapControl=key;select.setAttribute('aria-label',label);
 for(const entry of entries){const option=el(d,'option',entry.name);option.value=String(entry.id);option.selected=String(value)===String(entry.id);select.append(option);}select.value=String(value??'');select.onchange=()=>onChange(select.value);wrap.append(select);parent.append(wrap);return select;
}
function modelCards(parent,products,selected,onChoose,onCard){
 const d=parent.ownerDocument,grid=el(d,'div',undefined,'anima-tap-models');
 for(const id of [...new Set(products.map(group))]){
  const p=preferred(products.filter(p=>group(p)===id),selected),b=el(d,'button',undefined,'anima-tap-card');b.type='button';b.dataset.animaTapModel=id;b.dataset.animaTapReference=p.reference;b.setAttribute('aria-pressed',String(group(selected||{})===id));b.setAttribute('aria-label','Choisir '+familyName(p)+' · '+p.finish);const image=photo(d,p,{card:true});if(image)b.append(image);b.append(el(d,'strong',familyName(p)),el(d,'small',p.finish));b.onclick=()=>onChoose?.(p);onCard?.(b,p);grid.append(b);
 }
 parent.append(grid);return grid;
}

/** The caller supplies only geometrically compatible deck products. Wall
 * choices use the native wall placement callback, never a deck SKU alias. */
export function renderAnimaTapChooser(parent,{item,products=[],onChoose,onAuto,onNone,onWall,renderPreview,renderModels}={}){
 const d=parent.ownerDocument;styles(d);const root=el(d,'div',undefined,'anima-tap-controls');root.dataset.animaTapChooser='host';parent.append(root);root.append(el(d,'h4','AQUA HOME · mitigeur de lavabo'));
 const selected=products.find(p=>p.reference===item?.settings?.tap),mode=item?.settings?.tapMode||'auto',walls=(item?.settings?.tapWallIds||[]).filter(Boolean).length,actions=el(d,'div',undefined,'anima-tap-actions');
 for(const [id,name,callback]of[['auto','Automatique · adapté à la vasque',onAuto],['none','Sans mitigeur',onNone],['wall','Choisir un mitigeur mural',onWall]]){const b=el(d,'button',name);b.type='button';b.dataset.animaTapMode=id;b.setAttribute('aria-pressed',String(id==='wall'?walls>0:mode===id&&walls===0));b.onclick=()=>callback?.();actions.append(b);}root.append(actions);
 if(walls)root.append(el(d,'p',walls+' vasque'+(walls>1?'s':'')+' avec mitigeur mural. Le perçage du plan sur mesure suit la pose.','anima-tap-note'));
 if((item?.asset?.tops?.root?.userData?.animaTop?.factoryPreDrilled||item?.asset?.tops?.root?.userData?.animaTop?.retainedFactoryTapHoles?.length)&&walls)root.append(el(d,'p','Ce modèle est prépercé en usine. Son perçage fabricant est conservé avec la pose murale.','anima-tap-note'));
 if(!products.length){root.append(el(d,'p',item?.asset?.tops?.root?.userData?.animaTop?.wells?.length?'Choisissez une pose murale adaptée à cette vasque.':'Ajoutez une vasque sur un support compatible pour choisir son mitigeur.'));return root;}
 field(root,'Modèle de lavabo',selected?group(selected):'',[{id:'',name:mode==='none'?'Sans mitigeur':'Sélection automatique'},...[...new Set(products.map(group))].map(id=>({id,name:familyName(products.find(p=>group(p)===id))}))],id=>{if(!id){mode==='none'?onNone?.():onAuto?.();return;}onChoose?.(preferred(products.filter(p=>group(p)===id),selected));},'model');
 if(selected){field(root,'Finition du mitigeur',selected.reference,products.filter(p=>group(p)===group(selected)).map(p=>({id:p.reference,name:p.finish})),reference=>onChoose?.(products.find(p=>p.reference===reference)),'finish');root.append(el(d,'small','Réf. '+selected.reference));if(renderPreview)renderPreview(root,selected);else{const image=photo(d,selected);if(image)root.append(image);}}
 const details=el(d,'details'),summary=el(d,'summary','Voir les modèles compatibles');details.append(summary);if(renderModels&&selected)renderModels(details,{products,selected,onSelect:onChoose});else modelCards(details,products,selected,onChoose);root.append(details);return root;
}

/** Start with lavabo standard / XL / wall, then retain the catalogue's bath
 * and shower installations. Models are grouped before finish/SKU selection. */
export function renderAnimaTapAdditionChooser(parent,{products=AQUAHOME,initialUse='basin',onSelect,onCard}={}){
 const d=parent.ownerDocument;styles(d);const root=el(d,'div',undefined,'anima-tap-controls'),uses=animaTapInstallationChoices(products),usageGrid=el(d,'div',undefined,'anima-tap-uses'),detail=el(d,'div'),status=el(d,'small'),other=el(d,'details'),otherGrid=el(d,'div',undefined,'anima-tap-uses'),useButtons=[];root.dataset.animaTapChooser='addition';status.setAttribute('role','alert');parent.append(root);root.append(el(d,'p','Choisissez la pose, puis le modèle et sa finition.'),usageGrid,detail);let activeUse=uses.some(p=>p.id===initialUse)?initialUse:uses[0]?.id,selected=null;
 const selectModel=p=>{selected=p;renderDetail();};
 const renderDetail=()=>{
  detail.replaceChildren();status.textContent='';const current=products.filter(p=>p.use===activeUse);if(!current.length)return;selected=current.find(p=>p.reference===selected?.reference)||null;
  detail.append(el(d,'h4',useName(activeUse)));field(detail,'Modèle de mitigeur',selected?group(selected):'',[{id:'',name:'Choisir un modèle'},...[...new Set(current.map(group))].map(id=>({id,name:familyName(current.find(p=>group(p)===id))}))],id=>{if(id)selectModel(preferred(current.filter(p=>group(p)===id),selected));},'addition-model');
  if(selected){
   const chosen=el(d,'div');chosen.dataset.animaTapSelected=selected.reference;field(chosen,'Finition du mitigeur',selected.reference,current.filter(p=>group(p)===group(selected)).map(p=>({id:p.reference,name:p.finish})),reference=>selectModel(current.find(p=>p.reference===reference)),'finish');chosen.append(el(d,'small','Réf. '+selected.reference));const preview=photo(d,selected);if(preview)chosen.append(preview);const install=el(d,'button','Installer ce mitigeur');install.type='button';install.dataset.animaTapControl='install';install.onclick=()=>{const accepted=onSelect?.(selected);status.textContent=accepted===false?'Sélectionnez une vasque compatible dans la pièce pour installer ce mitigeur.':'';return accepted;};chosen.append(install,status);detail.append(chosen);
   const alternatives=el(d,'details');alternatives.append(el(d,'summary','Voir les autres modèles en photo'));modelCards(alternatives,current,selected,selectModel,onCard);detail.append(alternatives);
  }else modelCards(detail,current,selected,selectModel,onCard);
 };
 for(const use of uses){const b=el(d,'button',undefined,'anima-tap-card');b.type='button';b.dataset.animaTapUse=use.id;const p=preferred(products.filter(p=>p.use===use.id)),image=photo(d,p,{card:true});if(image)b.append(image);b.append(el(d,'strong',use.name));if(use.detail)b.append(el(d,'small',use.detail));b.onclick=()=>{activeUse=use.id;selected=null;for(const card of useButtons)card.setAttribute('aria-pressed',String(card===b));renderDetail();};b.setAttribute('aria-pressed',String(use.id===activeUse));useButtons.push(b);(LAVABO_USES.some(p=>p.id===use.id)?usageGrid:otherGrid).append(b);}
 if(otherGrid.children.length){other.append(el(d,'summary','Douche, bain et autres robinetteries'),otherGrid);other.open=!LAVABO_USES.some(p=>p.id===activeUse);root.append(other);}
 renderDetail();return root;
}
