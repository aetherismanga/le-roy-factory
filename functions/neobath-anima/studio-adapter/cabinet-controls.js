import {CABINET_FORMATS,cabinetFormat,cabinetProduct,cabinetHeightLabel} from './configuration.js';
import VISUALS from '../../../assets/data/neobath-anima-visuals.json' with {type:'json'};

const visuals=()=>globalThis.NEOBATH_ANIMA_VISUALS||VISUALS;
const label=form=>form.name.replace(/^(Pura|Ribelle) · /,'');
const categoryName={vanity:'Sous-vasques',base:'Meubles bas',wall:'Meubles hauts'};
const matchShape=(a,b)=>a.subtype===b.subtype&&a.height===b.height&&a.depth===b.depth&&a.trueDrawers===b.trueDrawers&&a.doors===b.doors;
export const puraCabinetModels=()=>CABINET_FORMATS.filter(form=>form.facade==='PURA');
export function matchingCabinetFacade(format,facade='PURA'){
 const form=typeof format==='string'?cabinetFormat(format):format;
 return CABINET_FORMATS.find(candidate=>candidate.facade===facade&&matchShape(candidate,form))||null;
}
export function cabinetModelPhoto(format,width=80){
 const form=typeof format==='string'?cabinetFormat(format):format;
 const actualWidth=form.allowedWidths.includes(Number(width))?Number(width):form.allowedWidths.find(value=>value>=Number(width))||form.allowedWidths[0];
 const product=cabinetProduct(form.id,actualWidth),entry=visuals().products?.[product?.id];
 return {product,width:actualWidth,src:typeof entry==='string'?entry:entry?.image||''};
}
const el=(document,tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
function styles(document){
 if(document.getElementById('anima-cabinet-controls-style'))return;
 const style=el(document,'style');style.id='anima-cabinet-controls-style';style.textContent=`
.anima-cabinet-controls,.anima-cabinet-gallery{display:grid;gap:14px;min-width:0;width:100%;box-sizing:border-box;grid-column:1/-1}
.anima-cabinet-controls h4,.anima-cabinet-gallery h4{margin:0;font:600 14px/1.4 Arial,sans-serif;color:#29483e}
.anima-cabinet-controls p,.anima-cabinet-controls small,.anima-cabinet-gallery small,.anima-cabinet-gallery p{margin:0;font:12px/1.5 Arial,sans-serif;color:#65715f}
.anima-cabinet-models,.anima-cabinet-facades{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.anima-cabinet-card{display:grid;align-content:start;gap:6px;min-width:0;padding:10px;border:1px solid #cbd2c5;border-radius:10px;background:#fffdf7;text-align:left;color:#29483e;cursor:pointer;touch-action:manipulation}
.anima-cabinet-card[aria-pressed=true]{border-color:#29483e;background:#eef1e7;box-shadow:inset 0 0 0 1px #29483e}
.anima-cabinet-card img{display:block;width:100%;height:106px;object-fit:contain;background:#fff;border-radius:5px}
.anima-cabinet-card strong{font:600 13px/1.4 Arial,sans-serif}
.anima-cabinet-controls .anima-cabinet-current{display:grid;gap:8px}
.anima-cabinet-controls .anima-cabinet-current img{display:block;width:100%;max-height:160px;object-fit:contain;background:#fff;border-radius:8px}
.anima-cabinet-controls details{border:1px solid #d8dccf;border-radius:9px;padding:12px}
.anima-cabinet-controls summary{font:600 14px/1.4 Arial,sans-serif;cursor:pointer;color:#29483e;min-height:30px}
.anima-cabinet-controls details .anima-cabinet-gallery{margin-top:12px}
.anima-cabinet-widths{display:flex;flex-wrap:wrap;gap:7px}
.anima-cabinet-controls button{min-height:44px;font-size:14px;touch-action:manipulation}
.anima-cabinet-widths button{flex:1 0 44px;border:1px solid #cbd2c5;border-radius:7px;background:#fffdf7;color:#29483e}
.anima-cabinet-widths button[aria-pressed=true]{background:#e5ebdb;border-color:#29483e}
.anima-cabinet-controls label{display:grid;gap:7px;font:600 13px/1.4 Arial,sans-serif;color:#29483e}
.anima-cabinet-controls input{box-sizing:border-box;width:100%;min-width:0;min-height:44px;padding:9px;border:1px solid #cbd2c5;border-radius:7px;background:#fffdf7;color:#29483e;font:14px Arial,sans-serif}
.anima-cabinet-controls .anima-composition-request{display:grid;grid-template-columns:1fr;gap:9px}
.anima-cabinet-controls [hidden],.anima-cabinet-gallery [hidden]{display:none!important}
#add-choices:has(>.anima-cabinet-gallery){display:block}
`;
 document.head.append(style);
}
function modelCard(parent,form,{width=80,selected=false,onChoose,onCard,facade=false}={}){
 const document=parent.ownerDocument,button=el(document,'button',undefined,'anima-cabinet-card'),visual=cabinetModelPhoto(form,width);
 button.type='button';button.dataset.animaCabinetModel=form.id;button.setAttribute('aria-pressed',String(selected));
 if(visual.src){const image=el(document,'img');image.src=visual.src;image.alt='NEOBATH ANIMA · '+form.name+' · '+visual.product.ref;image.width=242;image.height=167;image.loading='lazy';image.decoding='async';button.append(image);}
 button.append(el(document,'strong',facade?(form.facade==='PURA'?'Pura · lisse':'Ribelle · cannelée'):label(form)),el(document,'small',facade?visual.product.ref:cabinetHeightLabel(form)));
 button.onclick=()=>onChoose?.(form.id);onCard?.(button,form);parent.append(button);return button;
}
export function renderAnimaCabinetGallery(parent,{width=80,selectedFormat,onChoose,onCard}={}){
 const document=parent.ownerDocument;styles(document);const root=el(document,'div',undefined,'anima-cabinet-gallery');root.dataset.animaCabinetGallery='true';
 root.append(el(document,'p','Choisissez votre modèle Pura. La façade Ribelle est proposée après le choix du meuble.'));
 const selected=selectedFormat?matchingCabinetFacade(selectedFormat,'PURA')?.id:'';
 for(const subtype of ['vanity','base','wall']){
  root.append(el(document,'h4',categoryName[subtype]));const cards=el(document,'div',undefined,'anima-cabinet-models');
  for(const form of puraCabinetModels().filter(form=>form.subtype===subtype))modelCard(cards,form,{width,selected:form.id===selected,onChoose,onCard});root.append(cards);
 }
 parent.append(root);return root;
}
export function renderAnimaCabinetControls(parent,{settings,onModel,onWidth,onComposition,onError=()=>{}}={}){
 const document=parent.ownerDocument;styles(document);const root=el(document,'div',undefined,'anima-cabinet-controls');root.dataset.animaCabinetControls='true';parent.append(root);
 const form=cabinetFormat(settings.format),current=cabinetModelPhoto(form,settings.width),hero=el(document,'div',undefined,'anima-cabinet-current');
 if(current.src){const image=el(document,'img');image.src=current.src;image.alt='NEOBATH ANIMA · '+form.name+' · '+current.product.ref;image.width=242;image.height=167;image.decoding='async';hero.append(image);}
 hero.append(el(document,'h4',label(form)),el(document,'small',current.product.ref+' · '+cabinetHeightLabel(form)));root.append(hero);
 const change=el(document,'details');change.append(el(document,'summary','Changer de modèle'));renderAnimaCabinetGallery(change,{width:settings.width,selectedFormat:form.id,onChoose:id=>onModel?.(id)});root.append(change);
 root.append(el(document,'h4','Votre façade'));const facades=el(document,'div',undefined,'anima-cabinet-facades');
 for(const facade of ['PURA','RIBELLE']){const candidate=matchingCabinetFacade(form,facade);if(candidate)modelCard(facades,candidate,{width:settings.width,selected:candidate.id===form.id,onChoose:id=>onModel?.(id),facade:true});}root.append(facades);
 root.append(el(document,'h4','Largeur du caisson'));const widths=el(document,'div',undefined,'anima-cabinet-widths');
 for(const width of form.allowedWidths){const button=el(document,'button',width+' cm');button.type='button';button.dataset.animaCabinetWidth=String(width);button.setAttribute('aria-pressed',String(width===Number(settings.width)));button.onclick=()=>onWidth?.(width);widths.append(button);}root.append(widths);
 const composition=el(document,'details');composition.append(el(document,'summary','Composer plusieurs caissons'));const fields=el(document,'div',undefined,'anima-composition-request'),wrap=el(document,'label','Largeur totale souhaitée (cm)'),total=el(document,'input');total.type='number';total.min=121;total.max=1000;total.step=1;total.value=180;total.inputMode='numeric';total.dataset.animaCompositionWidth='true';wrap.append(total);fields.append(wrap);
 const apply=el(document,'button','Voir les compositions possibles');apply.type='button';apply.dataset.animaCompositionApply='true';apply.onclick=()=>{const width=Number(total.value);if(!Number.isInteger(width)||width<=120||width>1000){onError('Indiquez une largeur totale de plus de 120 cm pour composer plusieurs caissons.');return;}onComposition?.(width);};fields.append(apply,el(document,'small','Uniquement les largeurs du catalogue, avec des caissons compatibles en hauteur et en profondeur.'));composition.append(fields);root.append(composition);return root;
}
