import {resolveSurfaceTexture} from './surface-texture-selection.js';
import {surfaceAssetURL} from './texture-loader.js';
import {enhanceVisualSelect,attachVisualPreview} from './visual-choice.js';

// Use the same reviewed reference-to-face mapping as the 3D scene. In
// particular, an HD face for one finish must not illustrate a different SKU.
export function surfaceReferencePreview(product){
 if(!product)return '';
 const selection=resolveSurfaceTexture(product.collection,product.colorId||product.color,'balanced',{
  catalogueKey:product.key,reference:product.reference,format:product.format,finish:product.finish
 });
 const file=selection.files[0]||product.preview;
 return typeof file==='string'&&file.trim()?surfaceAssetURL(file):'';
}

function installStyle(){
 if(document.getElementById('surface-reference-picker-style'))return;
 const style=document.createElement('style');style.id='surface-reference-picker-style';style.textContent=`
 .surface-reference-control{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:10px;width:100%;min-width:0}
 .surface-reference-control .surface-reference-image{display:grid;place-items:center;width:72px;height:72px;overflow:hidden;border:1px solid #cbd2c2;border-radius:7px;background:#fffdf7}
 .surface-reference-image img{display:block;width:100%;height:100%;object-fit:contain}
 .surface-reference-image [hidden]{display:none!important}
 .surface-reference-unavailable{padding:5px;text-align:center;font:10px/1.3 Arial,sans-serif;color:#71816d}
 .surface-reference-control select{width:100%;min-width:0;min-height:44px}
 .surface-reference-control:has(.lrf-visual-choice){grid-template-columns:minmax(0,1fr)}
 .surface-reference-control:has(.lrf-visual-choice)>.surface-reference-image{display:none}
 .surface-reference-caption{display:block;margin-top:5px;color:#71816d;font-size:11px;line-height:1.4;overflow-wrap:anywhere}
 `;document.head.append(style);
}

// Keep the native value/change contract for the scene, while the illustrated
// choices expose each candidate's reviewed face on desktop and touch screens.
export function renderSurfaceReferenceSelection(host,{choices,selected,onChange}){
 if(!host)return;host.replaceChildren();if(!selected)return;
 installStyle();
 const label=document.createElement('label');label.className='full-field';
 const title=document.createElement('span');title.textContent='Référence & finition';label.append(title);
 const row=document.createElement('span');row.className='surface-reference-control';
 const preview=document.createElement('span');preview.className='surface-reference-image';
 const select=document.createElement('select');select.setAttribute('aria-label','Référence & finition');
 for(const product of choices){const option=document.createElement('option');option.value=product.key;option.textContent=(product.reference||'Référence à confirmer')+' · '+product.finish;select.append(option);}
 select.value=selected.key;
 const caption=document.createElement('small');caption.className='surface-reference-caption';
 const note=document.createElement('p');note.className='control-note';
 let disposePreview;
 const fmt=value=>Number(value||0).toLocaleString('fr-FR',{maximumFractionDigits:2,minimumFractionDigits:2});
 function show(product){
  const image=document.createElement('img'),url=surfaceReferencePreview(product);
  const unavailable=document.createElement('span');unavailable.className='surface-reference-unavailable';unavailable.textContent='Aperçu indisponible';
  image.alt=[product.collection,product.color,product.format,product.reference&&'Réf. '+product.reference].filter(Boolean).join(' · ');
  image.width=72;image.height=72;image.loading='lazy';image.decoding='async';
  image.hidden=!url;unavailable.hidden=!!url;image.onerror=()=>{image.hidden=true;unavailable.hidden=false;};
  if(url)image.src=url;
  disposePreview?.();
  preview.replaceChildren(image,unavailable);
  disposePreview=attachVisualPreview(preview,{value:product.key,label:[product.reference,product.finish].filter(Boolean).join(' · '),detail:[product.collection,product.color,product.format].filter(Boolean).join(' · '),image:url});
  caption.textContent=[product.collection,product.color,product.format&&product.format.replaceAll('x',' × ')+' cm'].filter(Boolean).join(' · ');
  note.textContent=product.packVerified?product.packPieces+' pièces · '+fmt(product.packArea)+' m² par boîte':'Boîtage à confirmer sur la fiche fabricant';
 }
 select.onchange=()=>{const product=choices.find(product=>product.key===select.value);if(!product)return;show(product);onChange?.(product.key);};
 row.append(preview,select);label.append(row,caption);host.append(label,note);show(selected);
 // A displayed default is not necessarily recorded in the project yet.
 // Explicitly choosing that same SKU must still confirm its commercial identity.
 const visual=enhanceVisualSelect(select,{emitUnchanged:true,label:'Référence & finition',entries:choices.map(product=>({value:product.key,label:(product.reference||'Référence à confirmer')+' · '+product.finish,detail:[product.collection,product.color,product.format&&product.format.replaceAll('x',' × ')+' cm'].filter(Boolean).join(' · '),image:surfaceReferencePreview(product)})),searchPlaceholder:'Rechercher une référence ou une finition'});
 return {select,preview,visual};
}
