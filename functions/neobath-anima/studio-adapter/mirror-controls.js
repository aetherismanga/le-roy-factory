import {PRODUCTS} from './anima-data.js';
import VISUALS from '../../../assets/data/neobath-anima-visuals.json' with {type:'json'};

const mirrors=products=>products.filter(product=>product.category==='mirror');
const number=value=>Number(value).toLocaleString('fr-FR',{maximumFractionDigits:1});
const money=value=>Number.isFinite(value)?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(value):'Sur devis';
const productPrice=product=>product.prices?.[0]?.price??product.pricePublicHT;
const familyKey=product=>String(product.ref||'').match(/^([A-Z]+)(?:[0-9].*)?$/i)?.[1]?.toLowerCase()||product.id;
const catalogVisual=product=>{
 const value=(globalThis.NEOBATH_ANIMA_VISUALS||VISUALS).products?.[product.id];
 const src=typeof value==='string'?value:value?.image;
 return src?{src,width:value.width||242,height:value.height||167,alt:'NEOBATH ANIMA · '+product.label+' · '+product.ref}:null;
};
export function mirrorSizeLabel(product){return product.shape==='round'?'Ø '+number(product.width)+' cm':number(product.width)+' × '+number(product.height)+' cm';}

// Group the source SKUs for presentation only. The unchanged mirror renderer and
// project records continue to use the exact product id and its catalogue size.
export function animaMirrorFamilies(products=PRODUCTS){
 const groups=new Map();
 for(const product of mirrors(products)){
  const key=familyKey(product);
  if(!groups.has(key))groups.set(key,{id:key,name:product.label,shape:product.shape,backlit:!!product.backlit,products:[]});
  groups.get(key).products.push(product);
 }
 return [...groups.values()].map(family=>({...family,products:family.products.slice().sort((a,b)=>a.width-b.width||a.height-b.height||String(a.ref).localeCompare(String(b.ref))),photo:catalogVisual(family.products[0])}));
}
export function animaMirrorFamily(settings={},products=PRODUCTS){
 const id=typeof settings==='string'?settings:settings.mirrorModel;
 return animaMirrorFamilies(products).find(family=>family.products.some(product=>product.id===id))||null;
}
export function animaMirrorSelection(familyId,productId,products=PRODUCTS){
 const family=animaMirrorFamilies(products).find(value=>value.id===familyId),product=family?.products.find(value=>value.id===productId);
 return product?{mirrorModel:product.id,width:product.width,height:product.height,rotated:false,mirrorFinish:'Argent',led:!!product.backlit}:null;
}
export function animaMirrorChoices(products=PRODUCTS){
 return animaMirrorFamilies(products).map(family=>({id:family.id,name:family.name,photo:family.photo,description:family.products.map(mirrorSizeLabel).join(' / '),products:family.products}));
}
function preferredProduct(family,settings={}){
 return family.products.find(product=>product.id===settings.mirrorModel)||family.products.find(product=>product.width===settings.width&&product.height===settings.height)||family.products[0];
}
function styles(document){
 if(document.getElementById('anima-mirror-controls-style'))return;
 const style=document.createElement('style');style.id='anima-mirror-controls-style';style.textContent=`
.anima-mirror-controls,.anima-mirror-picker{display:grid;gap:14px;width:100%;min-width:0;grid-column:1/-1;color:#29483e;box-sizing:border-box}
.anima-mirror-controls label,.anima-mirror-picker label{display:grid;gap:7px;font:600 13px/1.4 Arial,sans-serif;min-width:0}
.anima-mirror-controls select,.anima-mirror-picker select{width:100%;min-width:0;min-height:44px;border:1px solid #cbd2c5;border-radius:7px;padding:10px;background:#fffdf7;color:#29483e;font:16px Arial,sans-serif;box-sizing:border-box}
.anima-mirror-controls small,.anima-mirror-picker small{font:12px/1.5 Arial,sans-serif;color:#65715f;overflow-wrap:anywhere}
.anima-mirror-photo{display:grid;place-items:center;min-height:110px;padding:12px;border:1px solid #dce0d6;border-radius:8px;background:#fff}
.anima-mirror-photo img{display:block;width:100%;height:140px;object-fit:contain}
.anima-mirror-models{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;width:100%;grid-column:1/-1}
.anima-mirror-model{display:grid;align-content:start;gap:7px;min-width:0;min-height:155px;padding:10px;border:1px solid #cbd2c5;border-radius:8px;background:#fffdf7;text-align:left;color:#29483e;cursor:pointer}
.anima-mirror-model:hover,.anima-mirror-model:focus-visible{border-color:#29483e;background:#eff3e7}
.anima-mirror-model img{display:block;width:100%;height:100px;object-fit:contain;background:white}
.anima-mirror-model strong{font:600 13px/1.4 Arial,sans-serif;overflow-wrap:anywhere}
.anima-mirror-detail{display:grid;gap:14px;width:100%;max-width:540px;margin:0 auto}
.anima-mirror-detail h4{font:600 17px/1.4 Arial,sans-serif;margin:0}
.anima-mirror-picker button,.anima-mirror-controls button{min-height:44px;padding:10px 14px;border:1px solid #cbd2c5;border-radius:7px;font:600 13px/1.4 Arial,sans-serif;cursor:pointer}
.anima-mirror-add{background:#29483e!important;color:#fff!important}.anima-mirror-back{justify-self:start;background:#fffdf7;color:#29483e}
.anima-mirror-reference{display:grid;gap:4px;padding:10px 12px;background:#edf0e6;border-radius:7px}
.anima-mirror-reference strong{font:600 14px/1.4 Arial,sans-serif}.anima-mirror-reference small{display:block}
@media(max-width:700px){.anima-mirror-models{grid-template-columns:repeat(2,minmax(0,1fr))}.anima-mirror-model img{height:94px}.anima-mirror-model strong{font-size:12px}.anima-mirror-model{padding:8px}.anima-mirror-photo img{height:130px}}
`;document.head.append(style);
}
function photo(parent,product){
 const document=parent.ownerDocument,visual=catalogVisual(product),box=document.createElement('div');box.className='anima-mirror-photo';
 if(visual){const image=document.createElement('img');Object.assign(image,{src:visual.src,alt:visual.alt,width:visual.width,height:visual.height,loading:'lazy',decoding:'async'});box.append(image);}else{const note=document.createElement('small');note.textContent='Visuel du catalogue indisponible.';box.append(note);}
 parent.append(box);return box;
}
function selectField(parent,label,entries,value,onChange){
 const document=parent.ownerDocument,field=document.createElement('label'),select=document.createElement('select');field.append(document.createTextNode(label));
 for(const entry of entries){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.name;select.append(option);}
 select.value=value;select.addEventListener('change',()=>onChange(select.value));field.append(select);parent.append(field);return select;
}
function reference(parent,product){
 const document=parent.ownerDocument,box=document.createElement('div');box.className='anima-mirror-reference';const ref=document.createElement('strong');ref.textContent='NEOBATH · Réf. '+product.ref;const detail=document.createElement('small');detail.textContent=mirrorSizeLabel(product)+' · '+money(productPrice(product))+' HT'+(product.backlit?' · LED intégrée':'');box.append(ref,detail);parent.append(box);
}
export function renderAnimaMirrorControls(parent,{settings={},onPatch,onError=()=>{}}={}){
 const document=parent.ownerDocument;styles(document);const families=animaMirrorFamilies(),family=animaMirrorFamily(settings)||families[0];if(!family)return null;
 const current=preferredProduct(family,settings),box=document.createElement('section');box.className='anima-mirror-controls';parent.append(box);
 const patch=next=>{if(!next)return;try{return onPatch?.(next);}catch(error){onError(error.message||'Miroir indisponible.');return false;}};
 selectField(box,'Modèle',families.map(group=>({id:group.id,name:group.name})),family.id,id=>{const group=families.find(group=>group.id===id);const product=preferredProduct(group,settings);patch(animaMirrorSelection(group.id,product.id));});
 photo(box,current);
 selectField(box,'Format catalogue',family.products.map(product=>({id:product.id,name:mirrorSizeLabel(product)+' · Réf. '+product.ref})),current.id,id=>{const next=animaMirrorSelection(family.id,id);if(next&&current.backlit)next.led=settings.led!==false;patch(next);});
 if(current.backlit)selectField(box,'Éclairage LED intégré',[{id:'on',name:'Allumé'},{id:'off',name:'Éteint'}],settings.led===false?'off':'on',value=>patch({led:value==='on'}));
 reference(box,current);return box;
}
export function renderAnimaMirrorChooser(parent,{settings={},onAdd,onError=()=>{},bindDrag}={}){
 const document=parent.ownerDocument;styles(document);const families=animaMirrorFamilies(),box=document.createElement('section');box.className='anima-mirror-picker';parent.append(box);
 function chooseFamily(family){
  box.replaceChildren();const detail=document.createElement('div');detail.className='anima-mirror-detail';box.append(detail);const back=document.createElement('button');back.type='button';back.className='anima-mirror-back';back.textContent='← Tous les modèles';back.addEventListener('click',showFamilies);detail.append(back);const title=document.createElement('h4');title.textContent=family.name;detail.append(title);
  let product=preferredProduct(family,settings);const hero=photo(detail,product);let summary=document.createElement('div');
  const add=document.createElement('button');add.type='button';add.className='anima-mirror-add';add.textContent='Ajouter ce miroir';
  const applyChoice=()=>{summary.replaceChildren();reference(summary,product);bindDrag?.(add,{type:'mirror',options:animaMirrorSelection(family.id,product.id)});};
  selectField(detail,'Format catalogue',family.products.map(product=>({id:product.id,name:mirrorSizeLabel(product)+' · Réf. '+product.ref})),product.id,id=>{product=family.products.find(value=>value.id===id);hero.replaceChildren();const visual=catalogVisual(product);if(visual){const image=document.createElement('img');Object.assign(image,{src:visual.src,alt:visual.alt,width:visual.width,height:visual.height,decoding:'async'});hero.append(image);}applyChoice();});detail.append(summary,add);applyChoice();
  add.addEventListener('click',()=>{try{onAdd?.(animaMirrorSelection(family.id,product.id));}catch(error){onError(error.message||'Miroir indisponible.');}});
 }
 function showFamilies(){
  box.replaceChildren();const note=document.createElement('small');note.textContent='Choisissez votre modèle, puis l’un de ses formats catalogue.';box.append(note);const grid=document.createElement('div');grid.className='anima-mirror-models';box.append(grid);
  for(const family of families){const card=document.createElement('button');card.type='button';card.className='anima-mirror-model';card.dataset.animaMirrorModel=family.id;const visual=family.photo;if(visual){const image=document.createElement('img');Object.assign(image,{src:visual.src,alt:family.name,width:visual.width,height:visual.height,loading:'lazy',decoding:'async'});card.append(image);}const title=document.createElement('strong');title.textContent=family.name;const sizes=document.createElement('small');sizes.textContent=family.products.length+' format'+(family.products.length>1?'s':'')+' catalogue';card.append(title,sizes);card.addEventListener('click',()=>chooseFamily(family));grid.append(card);}
 }
 showFamilies();return box;
}
