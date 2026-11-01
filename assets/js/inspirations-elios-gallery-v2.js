(() => {
  'use strict';
  if (window.__LRF_ELIOS_GALLERY_V3__) return;
  window.__LRF_ELIOS_GALLERY_V3__ = true;

  const grid = document.getElementById('partner-products');
  const modal = document.getElementById('product-modal-v2');
  const modalCard = document.getElementById('product-modal-v2-card');
  if (!grid || !modal || !modalCard) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const unique = list => {
    const seen=new Set();
    return (list||[]).filter(src => {
      src=String(src||'').trim();
      if(!src || seen.has(src)) return false;
      seen.add(src); return true;
    });
  };

  let activeId = '';
  let activeGallery = null;

  function catalogue(){ return Array.isArray(window.ELIOS_CATALOGUE) ? window.ELIOS_CATALOGUE : []; }
  function imageData(){ return window.ELIOS_IMAGE_DATA || {}; }
  function remote(){ return window.ELIOS_HD_REMOTE || {}; }
  function official(){ return window.ELIOS_OFFICIAL_GALLERIES || {}; }
  const model=window.ELIOS_SELECTION_MEDIA_MODEL;
  if(!model)return;
  const asset=(url,kind)=>window.ELIOS_COLOR_MEDIA?.assets?.[url]?.[kind]||url;
  const limited=url=>window.ELIOS_COLOR_MEDIA?.assets?.[url]?.definitionLimited===true;
  function variants(){ return model.mergeVariants(window.ELIOS_VERIFIED_VARIANTS,window.ELIOS_SELECTION_MEDIA?.variants,window.ELIOS_COLOR_MEDIA?.variants); }

  function productFromId(id){
    const slug=String(id||'').replace(/^elios-/,'');
    const product=catalogue().find(p=>p.slug===slug);
    return product ? {slug,product,id:'elios-'+slug} : null;
  }

  function productFromOpenModal(){
    const partner=document.getElementById('workspace-title')?.textContent;
    if(partner && !norm(partner).includes('elios'))return null;
    const title=modalCard.querySelector('.modal-v2-info h2, h2')?.textContent?.trim();
    if(!title) return null;
    if(activeId){
      const found=productFromId(activeId);
      if(found && [found.product.name,found.product.catalogueLabel].some(name=>norm(name)===norm(title))) return found;
    }
    const p=catalogue().find(x=>norm(x.name)===norm(title) || norm(x.catalogueLabel)===norm(title));
    return p ? {slug:p.slug,product:p,id:'elios-'+p.slug} : null;
  }

  function bestLocal(product){
    const data=imageData();
    const arr=(product.gallery||[]).map(k=>data[k]).filter(Boolean);
    return arr;
  }

  function variantMap(slug){
    return variants()[slug] || {};
  }

  function sourceColorMap(slug){
    const out=new Map();
    const vm=variantMap(slug);
    Object.entries(vm).forEach(([color,arr]) => (arr||[]).forEach(src => {
      if(src && !out.has(src)) out.set(src,color);
    }));
    return out;
  }

  function collectionImages(slug,product){
    const verified=window.ELIOS_SELECTION_MEDIA?.galleries?.[slug];
    if(verified?.length) return unique([...verified,...(window.ELIOS_COLOR_MEDIA?.galleries?.[slug]||[])]);
    const vm=variantMap(slug);
    const allVariants=Object.values(vm).flat();
    return unique([
      ...(official()[slug]||[]),...(window.ELIOS_COLOR_MEDIA?.galleries?.[slug]||[]),
      ...allVariants,
      ...(remote()[slug] ? [remote()[slug]] : []),
      ...bestLocal(product)
    ]);
  }

  function ensureLightbox(){
    let box=document.getElementById('elios-gallery-lightbox');
    if(box) return box;
    box=document.createElement('div');
    box.id='elios-gallery-lightbox';
    box.className='elios-lightbox';
    box.setAttribute('aria-hidden','true');
    box.innerHTML=`
      <button class="elios-lightbox-close" type="button" aria-label="Fermer">×</button>
      <button class="elios-lightbox-nav prev" type="button" aria-label="Image précédente">‹</button>
      <div class="elios-lightbox-inner">
        <img class="elios-lightbox-image" alt="">
        <div class="elios-lightbox-caption"></div>
      </div>
      <button class="elios-lightbox-nav next" type="button" aria-label="Image suivante">›</button>
    `;
    document.body.appendChild(box);
    box.querySelector('.elios-lightbox-close').addEventListener('click',()=>closeLightbox());
    box.addEventListener('click',e=>{ if(e.target===box) closeLightbox(); });
    box.querySelector('.prev').addEventListener('click',e=>{e.stopPropagation();activeGallery?.go(-1,true)});
    box.querySelector('.next').addEventListener('click',e=>{e.stopPropagation();activeGallery?.go(1,true)});
    window.LRF_GALLERY_GESTURES?.bind(box.querySelector('.elios-lightbox-inner'),{
      onSwipe:delta=>activeGallery?.go(delta,true),
      isEnabled:()=>box.classList.contains('open') && activeGallery?.canSwipe()===true
    });
    return box;
  }

  function closeLightbox(){
    const box=document.getElementById('elios-gallery-lightbox');
    if(!box) return;
    box.classList.remove('open');
    box.setAttribute('aria-hidden','true');
    document.body.classList.remove('elios-lightbox-open');
  }

  function inferColor(src,slug,selectedColor){
    if(selectedColor) return selectedColor;
    return sourceColorMap(slug).get(src) || '';
  }

  function enhance(found){
    if(!found) return false;
    const {slug,product,id}=found;
    const main=modalCard.querySelector('.modal-v2-main');
    const info=modalCard.querySelector('.modal-v2-info');
    if(!main || !info) return false;

    const existing=main.querySelector('.elios-gallery-v3');
    if(existing && existing.dataset.productId===id) return true;

    const oldImg=main.querySelector(':scope > img, .modal-v2-main > img');
    if(!oldImg && !existing) return false;
    if(existing) existing.remove();

    const all=collectionImages(slug,product);
    if(!all.length) return false;
    const vm=variantMap(slug);
    let currentImages=all.slice();
    let currentIndex=0;
    let selectedColor='';
    let selectionNote='';

    const gallery=document.createElement('div');
    gallery.className='elios-gallery-v3';
    gallery.dataset.productId=id;
    gallery.innerHTML=`
      <div class="elios-gallery-stage" title="Cliquer pour agrandir">
        <img class="elios-gallery-main" alt="${esc(product.name)} — Elios Ceramica" draggable="false">
        <button class="elios-gallery-nav prev" type="button" aria-label="Image précédente">‹</button>
        <button class="elios-gallery-nav next" type="button" aria-label="Image suivante">›</button>
        <span class="elios-gallery-counter"></span>
        <div class="elios-gallery-image-label"></div>
        <span class="elios-gallery-zoom-hint">⤢ Agrandir</span>
      </div>
      <div class="elios-gallery-thumbs"></div>
      <p class="elios-gallery-status" role="status" hidden></p>
    `;
    if(oldImg) oldImg.replaceWith(gallery); else main.prepend(gallery);

    const stage=gallery.querySelector('.elios-gallery-stage');
    const mainImg=gallery.querySelector('.elios-gallery-main');
    const thumbs=gallery.querySelector('.elios-gallery-thumbs');
    const counter=gallery.querySelector('.elios-gallery-counter');
    const label=gallery.querySelector('.elios-gallery-image-label');
    const prev=gallery.querySelector('.prev');
    const next=gallery.querySelector('.next');
    const status=gallery.querySelector('.elios-gallery-status');

    function caption(){
      const src=currentImages[currentIndex]||'';
      const color=inferColor(src,slug,selectedColor);
      return color ? `${product.name} · ${color}` : product.name;
    }

    function updateLightbox(){
      const box=document.getElementById('elios-gallery-lightbox');
      if(!box?.classList.contains('open')) return;
      box.querySelector('.elios-lightbox-image').src=asset(currentImages[currentIndex]||'','original');
      box.querySelector('.elios-lightbox-image').alt=caption()+' — Elios Ceramica';
      box.querySelector('.elios-lightbox-caption').textContent=`${caption()} · ${currentIndex+1} / ${currentImages.length}`;
      box.querySelector('.prev').hidden=box.querySelector('.next').hidden=currentImages.length<2;
    }

    function render(){
      if(!currentImages.length) currentImages=all.slice();
      currentIndex=Math.max(0,Math.min(currentIndex,currentImages.length-1));
      const src=currentImages[currentIndex]||'';
      const note=selectionNote||(limited(src)?'Échantillon issu du catalogue, dans sa définition d’origine.':'');
      status.hidden=!note;
      status.textContent=note;
      mainImg.hidden=false;
      mainImg.onerror=()=>{
        mainImg.onerror=null;
        mainImg.hidden=true;
        status.hidden=false;
        status.textContent='Le visuel '+caption()+' n’a pas pu être chargé. Choisissez un autre visuel ou réessayez.';
      };
      mainImg.src=asset(src,'original');
      mainImg.alt=caption()+' — Elios Ceramica';
      counter.textContent=`${currentIndex+1} / ${currentImages.length}`;
      label.textContent=caption();
      prev.hidden=next.hidden=currentImages.length<2;
      thumbs.innerHTML=currentImages.map((src,i)=>`
        <button type="button" class="elios-gallery-thumb ${i===currentIndex?'active':''}" data-gallery-index="${i}" aria-label="${esc(caption())} image ${i+1}">
          <img src="${esc(asset(src,'thumbnail'))}" alt="" loading="lazy" draggable="false">
        </button>`).join('');
      updateLightbox();
    }

    function go(delta,fromLightbox=false){
      if(currentImages.length<2) return;
      currentIndex=(currentIndex+delta+currentImages.length)%currentImages.length;
      render();
      if(fromLightbox) updateLightbox();
    }

    function openLightbox(){
      const box=ensureLightbox();
      activeGallery=api;
      box.querySelector('.elios-lightbox-image').src=asset(currentImages[currentIndex]||'','original');
      box.querySelector('.elios-lightbox-image').alt=caption()+' — Elios Ceramica';
      box.querySelector('.elios-lightbox-caption').textContent=`${caption()} · ${currentIndex+1} / ${currentImages.length}`;
      box.querySelector('.prev').hidden=box.querySelector('.next').hidden=currentImages.length<2;
      box.classList.add('open');
      box.setAttribute('aria-hidden','false');
      document.body.classList.add('elios-lightbox-open');
    }

    const api={go,render,openLightbox,canSwipe:()=>currentImages.length>1};
    activeGallery=api;

    prev.addEventListener('click',e=>{e.stopPropagation();go(-1)});
    next.addEventListener('click',e=>{e.stopPropagation();go(1)});
    thumbs.addEventListener('click',e=>{
      const b=e.target.closest('[data-gallery-index]'); if(!b) return;
      currentIndex=Number(b.dataset.galleryIndex)||0; render();
    });
    stage.addEventListener('click',e=>{
      if(e.target.closest('.elios-gallery-nav')) return;
      openLightbox();
    });

    window.LRF_GALLERY_GESTURES?.bind(stage,{
      onSwipe:delta=>go(delta),
      isEnabled:()=>currentImages.length>1 && modal.classList.contains('open')
    });

    // Remplace les simples chips par des cartes couleur avec aperçu image.
    const headings=[...info.querySelectorAll('h4')];
    const colorHeading=headings.find(h=>norm(h.textContent).startsWith('couleurs'));
    const oldColors=colorHeading?.nextElementSibling;
    const productColors=Array.isArray(product.colors)?product.colors:[];
    const entries=model.colorEntries(productColors,vm);
    const colors=entries.map(entry=>entry.color);

    if(colorHeading && colors.length){
      const colorBox=document.createElement('div');
      colorBox.className='elios-variant-colors-v3';
      colorBox.innerHTML=colors.map(color=>{
        const imgs=model.imagesForColor(vm,color);
        const thumb=imgs[0]||'';
        return `<button type="button" data-elios-color="${esc(color)}" aria-pressed="false" class="${imgs.length?'verified':''}">
          ${thumb?`<img src="${esc(asset(thumb,'thumbnail'))}" alt="${esc(product.name+' · '+color)}" loading="lazy">`:''}
          <span>${esc(color)}</span>
          ${imgs.length?`<small>${limited(thumb)?'Aperçu catalogue':imgs.length+' image'+(imgs.length>1?'s':'')}</small>`:'<small>Visuel à confirmer</small>'}
        </button>`;
      }).join('');
      if(oldColors && (oldColors.classList.contains('chips')||oldColors.classList.contains('elios-variant-colors')||oldColors.classList.contains('elios-variant-colors-v3'))) oldColors.replaceWith(colorBox);
      else colorHeading.insertAdjacentElement('afterend',colorBox);

      colorBox.addEventListener('error',event=>{
        const image=event.target;
        if(image.tagName!=='IMG')return;
        image.hidden=true;
        const button=image.closest('button');
        button?.classList.remove('verified');
        const message=button?.querySelector('small');
        if(message)message.textContent='Visuel indisponible';
      },true);

      colorBox.addEventListener('click',e=>{
        const b=e.target.closest('[data-elios-color]'); if(!b)return;
        const wanted=b.dataset.eliosColor||'';
        colorBox.querySelectorAll('button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});
        const imgs=model.imagesForColor(vm,wanted);
        selectedColor=imgs.length?wanted:'';
        currentImages=imgs.length?imgs:all.slice();
        selectionNote=imgs.length?'':'Le visuel exact du coloris '+wanted+' reste à confirmer. Les images affichées sont celles de la collection.';
        currentIndex=0; render();
      });
    }

    render();
    return true;
  }

  function attemptEnhance(){
    if(!modal.classList.contains('open') && getComputedStyle(modal).display==='none') return;
    enhance(productFromOpenModal());
  }

  grid.addEventListener('pointerdown',e=>{
    const card=e.target.closest('[data-id^="elios-"]');
    if(card) activeId=card.dataset.id||'';
  },true);
  grid.addEventListener('click',e=>{
    const card=e.target.closest('[data-id^="elios-"]');
    if(!card)return;
    activeId=card.dataset.id||'';
    setTimeout(attemptEnhance,0);
    setTimeout(attemptEnhance,120);
    setTimeout(attemptEnhance,350);
  });

  new MutationObserver(()=>setTimeout(attemptEnhance,0)).observe(modalCard,{childList:true,subtree:true});

  document.addEventListener('keydown',e=>{
    const lb=document.getElementById('elios-gallery-lightbox');
    if(lb?.classList.contains('open')){
      if(e.key==='Escape'){closeLightbox();return}
      if(e.key==='ArrowLeft'){e.preventDefault();activeGallery?.go(-1,true)}
      if(e.key==='ArrowRight'){e.preventDefault();activeGallery?.go(1,true)}
      return;
    }
    if(!modal.classList.contains('open'))return;
    if(e.key==='ArrowLeft')activeGallery?.go(-1);
    if(e.key==='ArrowRight')activeGallery?.go(1);
  });

  ensureLightbox();
  setTimeout(attemptEnhance,0);
  setTimeout(attemptEnhance,250);
})();
