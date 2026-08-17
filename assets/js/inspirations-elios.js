(() => {
  const data = Array.isArray(window.ELIOS_CATALOGUE) ? window.ELIOS_CATALOGUE : [];
  const images = window.ELIOS_IMAGE_DATA || {};
  const $ = (s, r=document) => r.querySelector(s);
  const grid = $('#products-grid');
  if (!grid) return;

  const state = {q:'', category:'Tous', color:'Tous', format:'Tous', usage:'Tous'};
  const els = {
    search: $('#product-search'), category: $('#filter-category'), color: $('#filter-color'),
    format: $('#filter-format'), usage: $('#filter-usage'), count: $('#results-count'),
    modal: $('#product-modal'), dialog: $('#product-dialog'), filters: $('#advanced-filters')
  };

  const fallbackByCategory = {
    'Bois':'assets/img/bois01.jpg',
    'Pierre / marbre':'assets/img/pierre01.jpg',
    'Grandes dalles':'assets/img/03.png',
    'Ciments / céramiques':'assets/img/02.png',
    'Décor / relief':'assets/img/04.png'
  };
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[,]/g,'.').replace(/\s+/g,' ').trim();
  const unique = arr => [...new Set(arr.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true}));
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const galleryUrls = p => (p.gallery||[]).map(k=>images[k]).filter(Boolean);
  const mainImage = p => galleryUrls(p)[0] || fallbackByCategory[p.category] || 'assets/img/03.png';

  function populateFilters(){
    fill(els.category,['Tous',...unique(data.map(p=>p.category))]);
    fill(els.color,['Tous',...unique(data.flatMap(p=>p.colors||[]))]);
    fill(els.format,['Tous',...unique(data.flatMap(p=>p.formats||[]))]);
    fill(els.usage,['Tous',...unique(data.flatMap(p=>p.uses||[]))]);
  }
  function fill(select, values){
    if(!select) return;
    select.innerHTML = values.map(v=>`<option value="${esc(v)}">${v==='Tous'?'Tous':esc(v)}</option>`).join('');
  }
  function matches(p){
    const hay = norm([p.name,p.category,p.description,...(p.colors||[]),...(p.formats||[]),...(p.finishes||[]),...(p.uses||[])].join(' '));
    if(state.q && !hay.includes(norm(state.q))) return false;
    if(state.category!=='Tous' && p.category!==state.category) return false;
    if(state.color!=='Tous' && !(p.colors||[]).includes(state.color)) return false;
    if(state.format!=='Tous' && !(p.formats||[]).some(v=>norm(v)===norm(state.format))) return false;
    if(state.usage!=='Tous' && !(p.uses||[]).includes(state.usage)) return false;
    return true;
  }
  function card(p){
    const chips = [...(p.colors||[]).slice(0,3),...(p.formats||[]).slice(0,2)];
    const realCount = galleryUrls(p).length;
    return `<article class="product-card" tabindex="0" role="button" data-slug="${esc(p.slug)}" aria-label="Voir ${esc(p.name)}">
      <div class="product-visual">
        <img src="${mainImage(p)}" alt="${esc(p.name)} - ${esc(p.category)}" loading="lazy">
        <div class="product-overlay"></div>
        <div class="product-badges"><span class="product-badge">ELIOS</span>${realCount?`<span class="product-badge detail">${realCount>1?realCount+' photos':'Photo catalogue'}</span>`:''}</div>
        <div class="product-name-over"><small>${esc(p.category)}</small><h3>${esc(p.name)}</h3></div>
      </div>
      <div class="product-body"><div class="product-summary">${esc(p.description || `Collection ELIOS · ${p.category}.`)}</div>
        ${chips.length?`<div class="chip-line">${chips.map(c=>`<span class="mini-chip">${esc(c)}</span>`).join('')}</div>`:''}
        <div class="card-footer"><span>Page catalogue ${esc(p.page||'—')}</span><span class="card-open">Voir →</span></div>
      </div>
    </article>`;
  }
  function render(){
    const found = data.filter(matches);
    els.count.textContent = `${found.length} collection${found.length>1?'s':''}`;
    grid.innerHTML = found.length ? found.map(card).join('') : `<div class="empty-products"><strong>Aucun produit trouvé.</strong><br>Essayez de retirer un filtre ou de rechercher un autre mot.</div>`;
  }
  function pricingCell(p, format){
    try {
      const api = window.LRF_INSPIRATIONS_PRICING;
      const price = api && typeof api.getPrice==='function' ? api.getPrice('elios',p,format) : null;
      if(price!==null && price!==undefined && price!=='') return `<span class="price-ready">${esc(price)} € HT/m²</span>`;
    } catch(e) { console.warn('Tarif inspirations',e); }
    return `<span class="price-locked">🔒 Tarif PRO</span>`;
  }
  function openProduct(p){
    const urls = galleryUrls(p);
    const displayUrls = urls.length ? urls : [mainImage(p)];
    const formats = p.formats||[];
    els.dialog.innerHTML = `
      <button class="modal-close" id="modal-close" aria-label="Fermer">×</button>
      <div class="modal-hero">
        <div class="modal-gallery-wrap">
          <div class="modal-gallery"><img id="modal-main-image" src="${displayUrls[0]}" alt="${esc(p.name)}"><div class="gallery-note">Visuel extrait du catalogue ELIOS 2026</div></div>
          ${displayUrls.length>1?`<div class="gallery-thumbs">${displayUrls.map((src,i)=>`<button class="gallery-thumb ${i===0?'active':''}" data-index="${i}" type="button" aria-label="Photo ${i+1}"><img src="${src}" alt=""></button>`).join('')}</div>`:''}
        </div>
        <div class="modal-info">
          <div class="modal-brand">ELIOS CERAMICA · Catalogue général 2026</div>
          <h2>${esc(p.name)}</h2>
          <p class="modal-description">${esc(p.description || `Collection ${p.category}.`)}</p>
          <div class="info-label">Univers</div><div class="finish-list"><span class="finish-chip">${esc(p.category)}</span></div>
          ${(p.colors||[]).length?`<div class="info-label">Couleurs</div><div class="color-list">${p.colors.map(c=>`<span class="color-chip">${esc(c)}</span>`).join('')}</div>`:''}
          ${(p.finishes||[]).length?`<div class="info-label">Finitions</div><div class="finish-list">${p.finishes.map(c=>`<span class="finish-chip">${esc(c)}</span>`).join('')}</div>`:''}
          ${(p.uses||[]).length?`<div class="info-label">Utilisation</div><div class="finish-list">${p.uses.map(c=>`<span class="finish-chip">${esc(c)}</span>`).join('')}</div>`:''}
          <p class="source-note">Source : Catalogue Général ELIOS 2026 · page catalogue ${esc(p.page||'—')}.</p>
        </div>
      </div>
      <div class="modal-sections"><div class="modal-section"><h3>Formats & tarifs professionnels</h3>
        ${formats.length?`<table class="formats-table"><thead><tr><th>Format</th><th>Tarif client</th></tr></thead><tbody>${formats.map(f=>`<tr><td>${esc(f)}</td><td>${pricingCell(p,f)}</td></tr>`).join('')}</tbody></table>`:`<p class="tariff-message">Formats en cours de saisie.</p>`}
        <p class="tariff-message"><span class="access-note">🔒 Tarifs réservés aux comptes clients autorisés</span><br><br>Le futur accès client restera actif pendant toute la session. Si le compte n’est pas ouvert chez ELIOS, le prix sera remplacé par « Contactez votre agent LE ROY FACTORY ».</p>
      </div></div>`;
    els.modal.classList.add('open'); document.body.style.overflow='hidden';
    $('#modal-close').addEventListener('click',closeModal);
    els.dialog.querySelectorAll('.gallery-thumb').forEach(btn=>btn.addEventListener('click',()=>{
      const index=Number(btn.dataset.index||0); const img=$('#modal-main-image'); if(img) img.src=displayUrls[index];
      els.dialog.querySelectorAll('.gallery-thumb').forEach(x=>x.classList.toggle('active',x===btn));
    }));
  }
  function closeModal(){els.modal.classList.remove('open');document.body.style.overflow='';}
  grid.addEventListener('click',e=>{const c=e.target.closest('.product-card');if(c){const p=data.find(x=>x.slug===c.dataset.slug);if(p)openProduct(p);}});
  grid.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.product-card')){e.preventDefault();e.target.closest('.product-card').click();}});
  els.modal.addEventListener('click',e=>{if(e.target===els.modal)closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&els.modal.classList.contains('open'))closeModal();});
  els.search.addEventListener('input',()=>{state.q=els.search.value;render();});
  [['category',els.category],['color',els.color],['format',els.format],['usage',els.usage]].forEach(([key,el])=>el&&el.addEventListener('change',()=>{state[key]=el.value;syncQuick();render();}));
  document.querySelectorAll('.quick-filter').forEach(btn=>btn.addEventListener('click',()=>{state.category=btn.dataset.category||'Tous';els.category.value=state.category;syncQuick();render();}));
  function syncQuick(){document.querySelectorAll('.quick-filter').forEach(b=>b.classList.toggle('active',(b.dataset.category||'Tous')===state.category));}
  $('#reset-filters').addEventListener('click',()=>{state.q='';state.category=state.color=state.format=state.usage='Tous';els.search.value='';[els.category,els.color,els.format,els.usage].forEach(e=>e.value='Tous');syncQuick();render();});
  $('#filter-toggle').addEventListener('click',()=>els.filters.classList.toggle('open'));
  populateFilters(); syncQuick(); render();
})();
