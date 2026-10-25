// Original manufacturer photographs extracted from the AQUAHOME 2026 catalogue.
// Model photos are never recoloured to fabricate a missing finish photograph.
import {AQUAHOME} from './aquahome-catalog.js';
import catalogue from './aquahome-product-photos.json' with {type:'json'};
const byReference=new Map(catalogue.models.flatMap(model=>model.references.map(reference=>[reference,model])));
const products=new Map(AQUAHOME.map(product=>[product.reference,product]));
export function aquahomeProductVisual(referenceOrProduct){
 const product=typeof referenceOrProduct==='string'?products.get(referenceOrProduct):referenceOrProduct;
 if(!product)return null;const model=byReference.get(product.reference);if(!model)return null;
 const finishExact=model.shownFinish===product.finish,detail=model.detail?' · détail':'';
 return {src:'assets/aquahome-2026/'+model.file,alt:`AQUA HOME ${product.collection} · ${product.name}${detail} · photo catalogue en ${model.shownFinish}`,kind:'manufacturer-photo',reference:product.reference,shownFinish:model.shownFinish,finishExact,detail:!!model.detail,width:model.width,height:model.height,page:model.page,provenance:`AQUAHOME 2026 · catalogue général, page PDF ${model.page} · photographie originale`,caption:finishExact?`Photo catalogue${detail}`:`Photo catalogue${detail} · finition présentée : ${model.shownFinish}`};
}
export function defaultAquahomeProductVisual(use='shower'){
 return aquahomeProductVisual(AQUAHOME.find(product=>product.use===use));
}
export function aquahomeModelKey(product){return ['shower','island'].includes(product.use)?product.sourceName:product.collection;}
export function aquahomeModelLabel(product){return aquahomeModelKey(product).replace('COLUMNA TERMOSTÁTICA DE DUCHA ','Colonne thermostatique ').replace('COLUMNA DE DUCHA ','Colonne ').replace('COLUMNA DE BAÑO ','Colonne bain ').replace('BAÑERA EXENTA ','Bain sur pied ');}
function styles(document){
 if(document.getElementById('aquahome-product-visual-styles'))return;
 const style=document.createElement('style');style.id='aquahome-product-visual-styles';style.textContent=`.aquahome-photo{margin:12px 0;padding:10px;border:1px solid #d9dccf;border-radius:10px;background:#fff}.aquahome-photo img{display:block;object-fit:contain;max-width:100%;width:100%;height:145px;background:white}.aquahome-photo figcaption{font:11px/1.45 Arial,sans-serif;color:#63716a;margin-top:7px}.aquahome-photo figcaption strong{display:block;color:#29483e;font-size:12px}.aquahome-model-choices{margin:12px 0}.aquahome-model-choices summary{font:12px/1.5 Arial,sans-serif;cursor:pointer;padding:8px 0}.aquahome-model-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.aquahome-model-grid button{display:grid;gap:5px;min-width:0;text-align:left;padding:8px!important;border:1px solid #d9dccf;border-radius:8px;background:#fff;color:#29483e}.aquahome-model-grid button[aria-pressed=true]{border-color:#29483e;background:#edf1e5}.aquahome-model-grid img{object-fit:contain;width:100%;height:100px;background:#fff}.aquahome-model-grid strong{font:12px/1.35 Arial,sans-serif}.aquahome-model-grid small{font:10px/1.35 Arial,sans-serif;color:#69766d}`;document.head.append(style);
}
function photo(document,visual){const image=document.createElement('img');image.src=visual.src;image.alt=visual.alt;image.width=visual.width;image.height=visual.height;image.loading='lazy';image.decoding='async';image.onerror=()=>{image.hidden=true;};return image;}
export function renderAquahomeProductPreview(parent,product){
 const visual=aquahomeProductVisual(product);if(!visual)return null;const document=parent.ownerDocument;styles(document);const figure=document.createElement('figure');figure.className='aquahome-photo';figure.dataset.aquahomeReference=product.reference;const caption=document.createElement('figcaption'),label=document.createElement('strong');label.textContent=`${aquahomeModelLabel(product)} · ${product.finish}`;caption.append(label,document.createTextNode(visual.caption));figure.append(photo(document,visual),caption);parent.append(figure);return figure;
}
export function renderAquahomeModelChoices(parent,{products,selected,onSelect}){
 const document=parent.ownerDocument;styles(document);const families=[...new Set(products.map(aquahomeModelKey))];if(families.length<2)return null;
 const details=document.createElement('details');details.className='aquahome-model-choices';const summary=document.createElement('summary');summary.textContent='Voir les modèles en photo';const grid=document.createElement('div');grid.className='aquahome-model-grid';details.append(summary,grid);
 for(const family of families){const variants=products.filter(product=>aquahomeModelKey(product)===family),product=variants.find(product=>product.finish===selected.finish)||variants[0],visual=aquahomeProductVisual(product);if(!visual)continue;const button=document.createElement('button');button.type='button';button.dataset.aquahomeModel=family;button.setAttribute('aria-pressed',String(aquahomeModelKey(selected)===family));const name=document.createElement('strong'),caption=document.createElement('small');name.textContent=aquahomeModelLabel(product);caption.textContent=visual.caption;button.append(photo(document,visual),name,caption);button.onclick=()=>onSelect(product);grid.append(button);}
 parent.append(details);return details;
}
