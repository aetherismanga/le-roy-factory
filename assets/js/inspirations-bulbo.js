/* BULBO: official collections, a single current catalogue and exact product photos. */
(() => {
  'use strict';
  const $ = (selector,root=document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = value => /^(https:\/\/|\/(?!\/)|assets\/)/i.test(String(value || '')) ? String(value) : '';
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const products = () => window.BULBO_CATALOGUE || [];
  let pending, failed=false, group='all', chrome, dialog, lightbox, active, photos=[], photoIndex=0, trigger, overflow='';
  const galleries = product => (product.images || []).map(image=>typeof image === 'string' ? {url:image,label:product.name} : image).filter(image=>safe(image.url));
  const isBulbo = () => norm($('#workspace-title')?.textContent) === 'bulbo';
  const isFurniture = product => product.productType === 'furniture';
  function normaliseProducts() {
    return products().map(product=>({...product,category:isFurniture(product)?'Meubles & vasques':'Décors & surfaces',
      effect:product.family || (isFurniture(product)?'AQUERELLE':'Décors & surfaces'),colorFamilies:product.colors || [],
      keywords:[product.family,isFurniture(product)?'meuble vasque mobilier salle de bain aquerelle aquarelle':'carrelage revetement dalle decor mural',...(product.thicknesses || []),...(product.formats || []).map(format=>format.replace(/×/g,'x'))].join(' ')}));
  }
  async function load() {
    if (products().length) return products();
    if (pending) return pending;
    failed=false;
    pending=(async()=>{
      try {
        const response=await fetch('assets/data/bulbo-catalogue.json?v=20261101-bulbo1');
        if (!response.ok) throw Error('Catalogue indisponible');
        const data=await response.json();
        if (!Array.isArray(data.collections) || !data.collections.length) throw Error('Catalogue incomplet');
        window.BULBO_CATALOGUE=data.collections;
        window.BULBO_CATALOGUES=data.catalogues || [];
        window.dispatchEvent(new CustomEvent('lrf-bulbo-data-ready'));
        refreshChrome();return products();
      } catch(error) { failed=true;window.dispatchEvent(new CustomEvent('lrf-bulbo-data-error'));throw error; }
      finally { pending=null; }
    })();return pending;
  }
  function matches(product) {
    return group==='all' || group==='furniture' && isFurniture(product) || group==='surface' && !isFurniture(product) || group==='new' && !!product.badge;
  }
  function renderCards(found) {
    if (!products().length) return `<div class="bulbo-empty" role="${failed?'alert':'status'}"><p>${failed?'Le catalogue BULBO n’a pas pu être chargé.':'Chargement des collections BULBO…'}</p>${failed?'<button type="button" data-bulbo-retry>Réessayer</button>':''}</div>`;
    if (!found.length) return '<div class="bulbo-empty"><h3>Aucune collection avec ces critères.</h3><p>Essayez un autre nom, un coloris ou réinitialisez les filtres.</p><button type="button" data-bulbo-reset>Réinitialiser les filtres</button></div>';
    return found.map(product=>{
      const first=galleries(product)[0],cover=safe(product.coverImage || first?.url);
      return `<article class="product-card-v2 bulbo-card" data-id="${esc(product.id)}"><button type="button" class="bulbo-card-button" aria-label="Découvrir ${esc(product.name)}"><span class="bulbo-card-visual">${cover?`<img src="${esc(product.thumbnail || first?.thumb || cover)}" alt="${esc(product.name)} — BULBO" srcset="${esc(product.thumbnail || first?.thumb || cover)} 640w, ${esc(cover)} 1920w" sizes="(max-width:540px) 45vw,(max-width:900px) 45vw,30vw" loading="lazy" decoding="async" width="640" height="480">`:'<span>Visuels sur la fiche du fabricant</span>'}${product.badge?`<span class="bulbo-card-badge">${esc(product.badge)}</span>`:''}</span><span class="bulbo-card-copy"><span class="bulbo-eyebrow">${isFurniture(product)?'AQUERELLE · Mobilier':esc(product.family || 'Décors & surfaces')}</span><span class="bulbo-card-name">${esc(product.name)}</span><span class="bulbo-card-meta">${isFurniture(product)?esc((product.formats || []).join(' · ')):`${(product.colors || []).length ? (product.colors || []).length+' coloris · ' : ''}${galleries(product).length} visuel${galleries(product).length>1?'s':''}`}</span><span class="bulbo-card-more">Explorer la collection <span aria-hidden="true">↗</span></span></span></button></article>`;
    }).join('');
  }
  function resetFilters() { window.dispatchEvent(new CustomEvent('lrf-bulbo-filter-change',{detail:{reset:true}})); }
  function refreshChrome() {
    const current=isBulbo();
    $('#partner-workspace')?.classList.toggle('bulbo-workspace',current);
    if (!chrome) {
      chrome=document.createElement('section');chrome.id='bulbo-guide';chrome.className='bulbo-guide';
      chrome.innerHTML='<div class="bulbo-introduction"><div><span class="bulbo-eyebrow">BULBO · DESIGN ITALIEN</span><h3>Des surfaces singulières.<br>Un intérieur qui vous ressemble.</h3><p>Décors grand format, matières et mobilier coordonné. Explorez chaque collection, découvrez ses nuances et préparez votre projet avec notre agence.</p></div><div class="bulbo-intro-detail"><span>SUPERFICI MAGNIFICHE</span><p>La liberté de créer,<br>jusque dans les détails.</p><button type="button" data-bulbo-collection-link>Découvrir les nouveautés ↗</button></div></div><nav class="bulbo-tabs" aria-label="Explorer BULBO"><button type="button" data-bulbo-group="all">Tout BULBO</button><button type="button" data-bulbo-group="surface">Décors & surfaces</button><button type="button" data-bulbo-group="furniture">Meubles & vasques</button><button type="button" data-bulbo-group="new">Nouveautés 2026</button></nav><div class="bulbo-library"><label for="bulbo-jump">Accès direct à une collection<select id="bulbo-jump"><option value="">Choisir une collection…</option></select></label><details><summary>Catalogues & documentation</summary><div id="bulbo-catalogue-links"></div></details></div>';
      $('#v2-filters')?.before(chrome);
      chrome.addEventListener('click',event=>{
        const tab=event.target.closest('[data-bulbo-group]');
        if(tab){group=tab.dataset.bulboGroup;resetFilters();refreshChrome();}
        if(event.target.closest('[data-bulbo-collection-link]')){event.preventDefault();group='new';resetFilters();refreshChrome();$('#partner-products')?.scrollIntoView({behavior:'smooth',block:'start'});}
      });
      $('#bulbo-jump',chrome).addEventListener('change',event=>{if(event.target.value)openCollection(event.target.value,event.target);event.target.value='';});
    }
    chrome.hidden=!current;
    if(!current){if(dialog?.open)close();return;}
    if(!products().length)load().catch(()=>{});
    $('#workspace-sub').textContent='Carrelage d’exception · Décors & mobilier italiens';
    $('#v2-search').placeholder='Collection, décor, couleur, meuble…';
    $('#v2-search').setAttribute('aria-label','Rechercher parmi les collections BULBO');
    const allowed=window.LRF_BULBO_ACCESS?.canAccess?.()===true;
    const badge=$('#workspace-pro-badge');badge.textContent=allowed?'Tarifs BULBO accessibles':'Tarifs réservés aux comptes autorisés';
    badge.className='pro-badge'+(allowed?' allowed':'');
    const link=$('#workspace-pro-link');link.hidden=!allowed;link.style.display=allowed?'inline-flex':'none';link.textContent='Consulter les tarifs BULBO';
    $('#v2-effect')?.setAttribute('aria-label','Filtrer les familles BULBO');
    $('#v2-format')?.setAttribute('aria-label','Filtrer les formats BULBO');
    $('#v2-color')?.setAttribute('aria-label','Filtrer les couleurs BULBO');
    $('#v2-finish')?.setAttribute('aria-label','Filtrer les finitions BULBO');
    chrome.querySelectorAll('[data-bulbo-group]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bulboGroup===group)));
    const signature=products().map(p=>p.id).join('|');
    if(chrome.dataset.signature!==signature){
      chrome.dataset.signature=signature;
      $('#bulbo-jump',chrome).innerHTML='<option value="">Choisir une collection…</option>'+products().slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}${isFurniture(p)?' · Meuble':''}</option>`).join('');
      $('#bulbo-catalogue-links',chrome).innerHTML=(window.BULBO_CATALOGUES || []).filter(c=>safe(c.url)).map(c=>`<a href="${esc(safe(c.url))}" target="_blank" rel="noopener">${esc(c.label)} ↗</a>`).join('')+((window.BULBO_CATALOGUES || []).some(c=>c.id==='bulbo-cersaie-2026')?'':'<a href="assets/pdf/bulbo/BULBO-CERSAIE-2026.pdf" target="_blank" rel="noopener">Nouveautés & AQUERELLE · Cersaie 2026 ↗</a>')+'<a href="assets/pdf/bulbo/BULBO-NOTICE-TECHNIQUE-2026.pdf" target="_blank" rel="noopener">Notice technique & conseils de pose ↗</a>';
    }
    const hint=$('#partner-count')?.parentElement?.querySelector('span');if(hint)hint.textContent='Découvrir, choisir et préparer son projet';
  }
  function close() {if(!dialog?.open)return;lightbox?.close();dialog.close();document.body.style.overflow=overflow;trigger?.focus?.({preventScroll:true});}
  function makeDialog(){
    if(dialog)return;dialog=document.createElement('dialog');dialog.id='bulbo-product-dialog';dialog.className='bulbo-dialog';dialog.setAttribute('aria-labelledby','bulbo-product-title');
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('click',event=>{if(event.target===dialog)close();});document.body.appendChild(dialog);
  }
  function showPhoto(index){
    if(!photos.length)return;photoIndex=(index+photos.length)%photos.length;const photo=photos[photoIndex];
    const img=$('#bulbo-main-image',dialog);img.src=safe(photo.url);img.alt=photo.label || active.name;
    $('#bulbo-image-caption',dialog).textContent=photo.label || active.name;
    $('#bulbo-image-count',dialog).textContent=`${photoIndex+1} / ${photos.length}`;
    dialog.querySelectorAll('[data-bulbo-photo]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.bulboPhoto)===photoIndex)));
    if(lightbox?.open){$('img',lightbox).src=safe(photo.url);$('img',lightbox).alt=photo.label || active.name;$('.bulbo-lightbox-label',lightbox).textContent=(photo.label || active.name)+` · ${photoIndex+1}/${photos.length}`;}
  }
  function openImage(){
    if(!photos.length)return;
    if(!lightbox){
      lightbox=document.createElement('dialog');lightbox.className='bulbo-lightbox';lightbox.setAttribute('aria-label','Visuel BULBO en plein écran');
      lightbox.innerHTML='<div class="bulbo-lightbox-toolbar"><span class="bulbo-lightbox-label"></span><button type="button" data-bulbo-zoom>Zoom ×2</button><button type="button" data-bulbo-close-image aria-label="Fermer le plein écran">×</button></div><div class="bulbo-lightbox-stage"><img alt=""></div><div class="bulbo-lightbox-nav"><button type="button" data-bulbo-prev aria-label="Image précédente">←</button><button type="button" data-bulbo-next aria-label="Image suivante">→</button></div>';
      $('[data-bulbo-close-image]',lightbox).onclick=()=>lightbox.close();
      $('[data-bulbo-zoom]',lightbox).onclick=event=>{const zoom=lightbox.classList.toggle('bulbo-zoomed');event.currentTarget.textContent=zoom?'Ajuster':'Zoom ×2';};
      $('[data-bulbo-prev]',lightbox).onclick=()=>showPhoto(photoIndex-1);$('[data-bulbo-next]',lightbox).onclick=()=>showPhoto(photoIndex+1);
      window.LRF_GALLERY_GESTURES?.bind($('.bulbo-lightbox-stage',lightbox),{onSwipe:delta=>showPhoto(photoIndex+delta),isEnabled:()=>lightbox.open && photos.length>1 && !lightbox.classList.contains('bulbo-zoomed')});
      lightbox.addEventListener('keydown',event=>{if(event.key==='ArrowRight')showPhoto(photoIndex+1);if(event.key==='ArrowLeft')showPhoto(photoIndex-1);});
      document.body.appendChild(lightbox);
    }
    lightbox.classList.remove('bulbo-zoomed');$('[data-bulbo-zoom]',lightbox).textContent='Zoom ×2';
    lightbox.showModal();showPhoto(photoIndex);
  }
  function requestUrl(){
    const params=new URLSearchParams({collection:active.slug});
    for(const key of ['color','color2','format','finish','quantity','decor']){const value=$('#bulbo-choice-'+key,dialog)?.value;if(value)params.set(key,value);}
    return 'bulbo-projet.html?'+params;
  }
  async function openTariff(button){
    const status=$('#bulbo-tariff-status',dialog);button.disabled=true;status.textContent='Vérification de votre accès…';
    try{if(!window.LRF_BULBO_ACCESS)throw Error('Connectez-vous à l’espace PRO pour consulter les tarifs BULBO.');await window.LRF_BULBO_ACCESS.openTariff(button,isFurniture(active)?'furniture':'surfaces');status.textContent='';}
    catch(error){status.textContent=error.message || 'Le tarif est momentanément indisponible.';}
    finally{button.disabled=false;}
  }
  function openCollection(id,from){
    const product=products().find(p=>p.id===id || p.slug===id);if(!product)return false;makeDialog();
    if(!dialog.open){trigger=from || document.activeElement;overflow=document.body.style.overflow;}
    active=product;photos=galleries(product);photoIndex=0;
    const furniture=isFurniture(product),allowed=window.LRF_BULBO_ACCESS?.canAccess?.()===true;
    const twoColors=(product.technicalNotes || []).some(note=>/deux codes couleur/i.test(note));
    const gradient=product.family==='Dégradé';
    const swatches=(product.colorOptions?.length?product.colorOptions.filter(option=>/^#[0-9a-f]{6}$/i.test(option.hex)).map(option=>({label:option.name,hex:option.hex})):product.swatches || []).filter(image=>image.hex || safe(image.url));
    const palette=swatches.length ? `<details class="bulbo-palette"><summary>Voir le nuancier · ${swatches.length} teintes</summary><div>${swatches.map((image,i)=>`<button type="button" data-bulbo-swatch="${i}" aria-label="Choisir ${esc(image.label)}">${image.hex?`<span class="bulbo-palette-chip" style="background-color:${esc(image.hex)}" aria-hidden="true"></span>`:`<img src="${esc(safe(image.thumb || image.url))}" alt="" loading="lazy" width="38" height="38">`}<span>${esc(image.label)}</span></button>`).join('')}</div></details>` : '';
    const select=(key,label,values)=>values?.length?`<label>${label}<select id="bulbo-choice-${key}"><option value="">À préciser avec l’agence</option>${[...new Set(values || [])].map(v=>`<option>${esc(v)}</option>`).join('')}</select></label>`:'';
    dialog.innerHTML=`<div class="bulbo-dialog-head"><span class="bulbo-eyebrow">BULBO · ${furniture?'AQUERELLE':'CARRELAGE D’EXCEPTION'}</span><button type="button" class="bulbo-close" aria-label="Fermer la collection">×</button></div><div class="bulbo-detail"><section class="bulbo-gallery" aria-label="Visuels ${esc(product.name)}">${photos.length?`<button type="button" class="bulbo-main-photo" aria-label="Agrandir le visuel"><img id="bulbo-main-image" src="${esc(safe(photos[0].url))}" alt="${esc(product.name)}"><span>Agrandir ↗</span></button><div class="bulbo-photo-caption"><span id="bulbo-image-caption"></span><span id="bulbo-image-count"></span></div><div class="bulbo-thumbnails">${photos.map((image,i)=>`<button type="button" data-bulbo-photo="${i}" aria-label="Voir ${esc(image.label || 'le visuel '+(i+1))}" aria-pressed="${i===0}"><img src="${esc(safe(image.thumb || image.url))}" alt="${esc(image.label || product.name)}" loading="lazy" width="100" height="80"></button>`).join('')}</div>`:'<p>Consultez les visuels sur la fiche du fabricant.</p>'}</section><section class="bulbo-product-info"><span class="bulbo-eyebrow">${esc(product.badge || product.family || 'Design italien')}</span><h2 id="bulbo-product-title">${esc(product.name)}</h2><p class="bulbo-description">${esc(product.description)}</p>${(product.technicalNotes || []).length?`<ul class="bulbo-technical-notes">${product.technicalNotes.map(note=>`<li>${esc(note)}</li>`).join('')}</ul>`:''}<dl class="bulbo-specs">${[['Formats',product.formats],['Finitions',product.finishes],['Épaisseurs',product.thicknesses]].filter(([,values])=>values?.length).map(([label,values])=>`<div><dt>${label}</dt><dd>${esc(values.join(' · '))}</dd></div>`).join('')}</dl><div class="bulbo-choice"><h3>Votre projet</h3>${select('color',twoColors?(gradient?'Couleur de départ':'Couleur du fond'):product.colorLabel || 'Coloris / décor',product.colors)}${twoColors?select('color2',gradient?'Couleur d’arrivée':'Couleur du motif',product.colors):''}${select('format',furniture?'Dimensions':'Format',product.formats)}${select('finish',furniture && product.slug!=='monolith'?'Finition du plan':'Finition',product.finishes)}${furniture?'<label>Décor de façade souhaité<input id="bulbo-choice-decor" type="text" maxlength="180" placeholder="Nom du décor ou à définir"></label>':''}<label>Quantité souhaitée (${furniture?'pièces':'m²'})<input id="bulbo-choice-quantity" type="number" inputmode="decimal" min="${furniture?'1':'0.01'}" step="${furniture?'1':'0.01'}" placeholder="À préciser"></label><p class="bulbo-choice-note">${furniture?'La configuration finale sera validée avec l’agence.':'Fabrication sur commande · Format 60 × 120 arrêté · Commande minimale : 3 m².'}</p><a id="bulbo-request-link" class="bulbo-primary" href="bulbo-projet.html?collection=${esc(product.slug)}">Préparer ma demande →</a></div>${palette}<div class="bulbo-detail-links">${safe(product.catalogueUrl)?`<a href="${esc(safe(product.catalogueUrl))}" target="_blank" rel="noopener">Voir dans le catalogue ↗</a>`:''}${safe(product.sourceUrl)?`<a href="${esc(safe(product.sourceUrl))}" target="_blank" rel="noopener">Fiche du fabricant ↗</a>`:''}</div><div class="bulbo-tariff-area">${allowed?`<button type="button" data-bulbo-tariff="${furniture?'furniture':'surfaces'}">Consulter le tarif BULBO</button>`:'<a href="tarifs-pro.html">Se connecter pour consulter les tarifs</a>'}<p id="bulbo-tariff-status" role="status"></p></div></section></div>`;
    $('.bulbo-close',dialog).onclick=close;$('.bulbo-main-photo',dialog)?.addEventListener('click',openImage);
    window.LRF_GALLERY_GESTURES?.bind($('.bulbo-main-photo',dialog),{onSwipe:delta=>showPhoto(photoIndex+delta),isEnabled:()=>dialog.open && photos.length>1});
    dialog.querySelectorAll('[data-bulbo-photo]').forEach(button=>button.onclick=()=>showPhoto(Number(button.dataset.bulboPhoto)));
    dialog.querySelectorAll('.bulbo-choice select,.bulbo-choice input').forEach(input=>{const update=()=>$('#bulbo-request-link',dialog).href=requestUrl();input.addEventListener('change',update);input.addEventListener('input',update);});
    $('#bulbo-request-link',dialog).addEventListener('click',event=>{event.currentTarget.href=requestUrl();});
    dialog.querySelectorAll('[data-bulbo-swatch]').forEach(button=>button.onclick=()=>{const image=swatches[Number(button.dataset.bulboSwatch)],select=$('#bulbo-choice-color',dialog);const option=[...select.options].find(option=>norm(option.value)===norm(image.label)||norm(option.value)===norm('Code '+image.label));if(option){select.value=option.value;$('#bulbo-request-link',dialog).href=requestUrl();}dialog.querySelectorAll('[data-bulbo-swatch]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));});
    if(!dialog.open)dialog.showModal();document.body.style.overflow='hidden';if(photos.length)showPhoto(0);return true;
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-bulbo-retry]'))load().catch(()=>{});
    if(event.target.closest('[data-bulbo-reset]')){group='all';resetFilters();refreshChrome();}
  });
  window.addEventListener('lrf-pro-session-changed',()=>{if(dialog?.open)close();refreshChrome();});
  window.addEventListener('lrf-bulbo-access-changed',()=>{if(dialog?.open)close();refreshChrome();});
  if(typeof MutationObserver!=='undefined' && $('#workspace-title'))new MutationObserver(()=>{if(chrome)refreshChrome();}).observe($('#workspace-title'),{childList:true,characterData:true,subtree:true});
  window.LRF_BULBO_LOAD=load;
  window.LRF_BULBO_SELECTION=Object.freeze({normaliseProducts,matches,renderCards,refreshChrome,openCollection});
})();
