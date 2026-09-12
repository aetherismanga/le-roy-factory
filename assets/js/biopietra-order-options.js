(() => {
  'use strict';
  const $=s=>document.querySelector(s), g=id=>document.getElementById(id), p=new URLSearchParams(location.search);
  const product=p.get('product')||g('product')?.value||'';
  const entry=window.BIOPIETRA_PRODUCT_OPTIONS?.entry(product);
  const style=document.createElement('style');style.textContent=`
    .close{position:fixed!important;right:14px!important;top:calc(env(safe-area-inset-top,0px) + 12px)!important;z-index:10000!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 4px 18px rgba(0,0,0,.35)!important}.bio-color-preview{margin-top:8px;border:1px solid #ddd4c6;border-radius:12px;overflow:hidden;background:#f5f1e8;min-height:110px;display:flex;align-items:center;justify-content:center}.bio-color-preview img{display:block;width:100%;max-height:260px;object-fit:cover}.bio-color-preview span{padding:14px;color:#81786b;text-align:center;font-size:.82rem;font-weight:700}select{box-sizing:border-box;width:100%;padding:14px;border:1px solid #d8d0c2;border-radius:12px;font:inherit;background:#fff;color:#211f1b}.bio-color-note{font-size:.72rem;color:#81786b;margin-top:5px}@media(max-width:650px){.head{padding-right:82px!important}.close{width:54px!important;height:54px!important}}
  `;document.head.appendChild(style);
  const productField=g('product')?.closest('.field');
  if(productField){
    const f=document.createElement('div');f.className='field';f.innerHTML='<label>Couleur / référence couleur</label><select id="color"><option value="">Choisir une couleur</option></select><div class="bio-color-preview" id="colorPreview"><span>Sélectionnez une couleur pour afficher son visuel officiel lorsqu’il est disponible.</span></div><div class="bio-color-note">Couleurs issues des gammes officielles Biopietra.</div>';
    productField.insertAdjacentElement('afterend',f);
    const sel=g('color');(entry?.colors||[]).forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o)});
    const initial=p.get('color')||'';if(initial&&[...sel.options].some(o=>o.value===initial))sel.value=initial;
    async function paint(){const host=g('colorPreview'),color=sel.value;if(!color){host.innerHTML='<span>Sélectionnez une couleur pour afficher son visuel officiel lorsqu’il est disponible.</span>';return}host.innerHTML='<span>Chargement du visuel officiel…</span>';const im=await window.BIOPIETRA_PRODUCT_OPTIONS?.imageFor(product,color);host.innerHTML=im?`<img src="${im.url}" alt="${product} · ${color}">`:'<span>Visuel officiel non disponible pour cette teinte dans la médiathèque publique Biopietra.</span>'}
    sel.addEventListener('change',paint);paint();
  }
  const color=()=>g('color')?.value||p.get('color')||'—';
  const isOrder=/commande/i.test(document.title);
  function message(){
    const qty=g('qty')?.value||'à préciser', unit=g('unit')?.value||'', ref=g('ref')?.value||'', price=g('price')?.value||p.get('price')||'—', company=g('company')?.value||'—', contact=g('contact')?.value||'—', note=g('note')?.value||'—', email=g('email')?.value||'—';
    if(isOrder)return `Bonjour,\n\nMerci de nous préparer la commande Biopietra suivante :\n\nProduit : ${product}\nCouleur : ${color()}\nType / référence tarifaire : ${ref||p.get('label')||'—'}\nQuantité / besoin : ${qty} ${unit}\nPrix PRO indicatif : ${price}\nSociété : ${company}\nContact : ${contact}\nEmail contact : ${email}\nObservation : ${note}\n\nMerci de nous confirmer la bonne prise en compte de cette commande.`;
    return `Bonjour,\n\nMerci de nous confirmer la disponibilité du produit Biopietra suivant :\n\nProduit : ${product}\nCouleur : ${color()}\nType / référence tarifaire : ${ref||p.get('label')||'—'}\nBesoin : ${qty} ${unit}\nSociété : ${company}\nContact : ${contact}\nObservation : ${note}\n\nMerci d'avance pour votre retour.`;
  }
  if(g('summaryTitle'))g('summaryTitle').textContent=product+(color()!=='—'?' · '+color():'');
  if(g('previewBtn'))g('previewBtn').onclick=()=>{g('previewBox').textContent=message();g('previewBox').classList.add('open')};
  if(g('sendBtn'))g('sendBtn').onclick=()=>{const subj=(isOrder?'Commande Biopietra - ':'Demande disponibilité Biopietra - ')+product+(color()!=='—'?' - '+color():'');location.href='mailto:info@biopietra.com?cc='+encodeURIComponent('jerome@leroyfactory.fr,coryne@leroyfactory.fr')+'&subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(message())};
})();