(() => {
  'use strict';
  if (window.__LRF_BIOPIETRA_FINAL_UI__) return;
  window.__LRF_BIOPIETRA_FINAL_UI__ = true;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ACROPOLI={
    'B81':'https://biopietra.com/wp-content/uploads/2024/07/Acropoli-B81_min-964x640.jpg',
    'B82':'https://biopietra.com/wp-content/uploads/2023/09/Acropoli-B82-964x640.jpg',
    'Beige Credaro':'https://biopietra.com/wp-content/uploads/2016/08/Acropoli-Beige-Credaro-964x640.jpg',
    'D0':'https://biopietra.com/wp-content/uploads/2024/03/Acropoli-D0-F1-S-L-GS-964x640.jpg',
    'G85':'https://biopietra.com/wp-content/uploads/2023/01/Acropoli-G85-GS-964x640.jpg',
    'G87':'https://biopietra.com/wp-content/uploads/2023/12/Acropoli-G87-F0-964x640.jpeg',
    'M92':'https://biopietra.com/wp-content/uploads/2024/04/Acropoli-M92-F1-S-L-T-964x640.jpg',
    'M94':'https://biopietra.com/wp-content/uploads/2023/01/Acropoli-M94-964x640.jpg',
    'M95':'https://biopietra.com/wp-content/uploads/2023/01/Acropoli-M95-GS-964x640.jpg',
    'M96':'https://biopietra.com/wp-content/uploads/2019/09/Acropoli-M96-Minimale-964x640.jpg',
    'Mix ACR 01':'https://biopietra.com/wp-content/uploads/2025/06/Mix-Acr-01-Acropoli-B82_50G85_50-F0-964x640.jpg',
    'Terra':'https://biopietra.com/wp-content/uploads/2016/08/Acropoli-Terra-F2-S-L-964x640.jpg',
    'Zolfo':'https://biopietra.com/wp-content/uploads/2016/08/acropoli_zolfo_min0003-964x640.jpg'
  };
  const MAP={'acropoli':ACROPOLI};
  function style(){
    if($('#bio-final-ui-style'))return;
    const s=document.createElement('style');s.id='bio-final-ui-style';s.textContent=`
      .bio-head{position:relative!important;padding-right:94px!important}
      .bio-head .bio-close,.bio-final-close{display:flex!important;visibility:visible!important;opacity:1!important;position:absolute!important;top:16px!important;right:16px!important;width:58px!important;height:58px!important;z-index:999999!important;align-items:center!important;justify-content:center!important;border:2px solid #d4af37!important;border-radius:50%!important;background:#111!important;color:#fff!important;font-size:2rem!important;font-weight:700!important;line-height:1!important;padding:0!important;cursor:pointer!important;box-shadow:0 3px 12px rgba(0,0,0,.3)!important}
      .bio-final-colors{margin:0 0 16px;padding:14px;background:#fff;border:1px solid #ddd5c7;border-radius:16px}.bio-final-colors h3{margin:0 0 5px;color:#17623a;font-size:1.08rem}.bio-final-colors p{margin:0 0 12px;color:#756e64;font-size:.79rem}.bio-final-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}.bio-final-color{padding:0;overflow:hidden;border:2px solid #e7dfd1;border-radius:13px;background:#faf8f3;color:#211f1b;text-align:left;cursor:pointer}.bio-final-color.active{border-color:#d4af37;box-shadow:0 0 0 2px rgba(212,175,55,.18)}.bio-final-color img{display:block;width:100%;aspect-ratio:1.45/1;object-fit:cover;background:#f0ece4}.bio-final-color strong{display:block;padding:9px 10px;font-size:.75rem}.bio-final-selected{margin-top:10px;padding:9px 11px;border:1px solid #d4af37;border-radius:10px;background:#fffaf0;font-size:.78rem;font-weight:900}
      @media(max-width:650px){.bio-head{padding-right:88px!important}.bio-head .bio-close,.bio-final-close{position:fixed!important;top:calc(env(safe-area-inset-top,0px) + 78px)!important;right:14px!important;width:56px!important;height:56px!important}.bio-final-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.bio-final-colors{padding:11px}}
    `;document.head.appendChild(s);
  }
  function close(modal){
    const head=$('.bio-head',modal);if(!head)return;
    let b=$('.bio-close',head)||$('.bio-final-close',head);
    if(!b){b=document.createElement('button');b.type='button';b.className='bio-final-close';b.textContent='×';b.setAttribute('aria-label','Fermer la fiche');head.appendChild(b)}
    b.onclick=e=>{e.preventDefault();e.stopPropagation();modal.classList.remove('open');modal.style.display='none';document.body.style.overflow='';};
  }
  function product(modal){return $('.bio-head h2',modal)?.textContent?.trim()||''}
  function setColor(modal,color,card){
    $$('.bio-final-color',modal).forEach(x=>x.classList.remove('active'));card.classList.add('active');modal.dataset.biopietraColor=color;
    const out=$('.bio-final-selected',modal);if(out)out.textContent='Couleur sélectionnée : '+color;
    modal.dispatchEvent(new CustomEvent('biopietra-color-change',{bubbles:true,detail:{color}}));
  }
  function colors(modal){
    const name=product(modal),key=norm(name),entry=window.BIOPIETRA_PRODUCT_OPTIONS?.entry?.(name);if(!entry?.colors?.length)return;
    const body=$('.bio-body',modal);if(!body)return;
    let sec=$('.bio-final-colors',body);if(!sec){sec=document.createElement('section');sec.className='bio-final-colors';const gallery=$('.bio-gallery,.bio-safe-gallery,.bio-b2-gallery',body);if(gallery)gallery.insertAdjacentElement('afterend',sec);else body.insertBefore(sec,body.firstChild)}
    const staticMap=MAP[key]||{};
    sec.innerHTML=`<h3>Toutes les couleurs disponibles</h3><p>Choisissez une couleur. Chaque vignette utilise un visuel officiel Biopietra lorsque celui-ci est disponible.</p><div class="bio-final-grid">${entry.colors.map(c=>{const u=staticMap[c]||'';return `<button type="button" class="bio-final-color" data-color="${esc(c)}">${u?`<img src="${esc(u)}" alt="${esc(name+' · '+c)}" loading="lazy">`:`<img data-dynamic="1" alt="${esc(name+' · '+c)}" loading="lazy">`}<strong>${esc(c)}</strong></button>`}).join('')}</div><div class="bio-final-selected"></div>`;
    $$('.bio-final-color',sec).forEach(card=>{const color=card.dataset.color;card.onclick=()=>setColor(modal,color,card);const img=$('img[data-dynamic]',card);if(img&&window.BIOPIETRA_PRODUCT_OPTIONS?.imageFor){window.BIOPIETRA_PRODUCT_OPTIONS.imageFor(name,color).then(x=>{if(x?.url){img.src=x.url;img.removeAttribute('data-dynamic')}}).catch(()=>{})}});
  }
  function enhance(modal){if(!modal?.classList.contains('open'))return;style();close(modal);colors(modal)}
  function scan(){ $$('.bio-modal.open').forEach(enhance) }
  document.addEventListener('click',()=>setTimeout(scan,25),true);
  new MutationObserver(()=>setTimeout(scan,25)).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('lrf-biopietra-rerendered',()=>setTimeout(scan,25));
  style();setTimeout(scan,500);
})();