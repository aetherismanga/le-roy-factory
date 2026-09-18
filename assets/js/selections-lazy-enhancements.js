(() => {
  'use strict';
  if (window.__LRF_SELECTIONS_LAZY_ENHANCEMENTS__) return;
  window.__LRF_SELECTIONS_LAZY_ENHANCEMENTS__ = true;

  const GROUPS = {
    elios: [
      'assets/js/inspirations-elios-pricing.js?v=20260902-20mm1',
      'assets/js/inspirations-elios-pool-integrated.js?v=20260907-pool2',
      'assets/js/inspirations-elios-official-galleries.js?v=20260902-batch2',
      'assets/js/inspirations-elios-official-galleries-2.js?v=20260902-batch3',
      'assets/js/inspirations-elios-official-galleries-3.js?v=20260902-batch4',
      'assets/js/inspirations-elios-official-galleries-4.js?v=20260902-batch5',
      'assets/js/inspirations-elios-official-galleries-5.js?v=20260902-stones1',
      'assets/js/inspirations-elios-official-galleries-6.js?v=20260902-stones2',
      'assets/js/inspirations-elios-fix-bavaria-dolomiti-harmony.js?v=20260902-fix4',
      'assets/js/inspirations-elios-pass1-hd.js?v=20260902-pass1hd2',
      'assets/js/inspirations-elios-lot1-hd.js?v=20260902-lot1hd2',
      'assets/js/inspirations-elios-slate-hd.js?v=20260902-slatehq1',
      'assets/js/inspirations-elios-azuli-hd.js?v=20260911-azuli-hd2',
      'assets/js/inspirations-elios-dust-hd.js?v=20260913-dusthd2',
      'assets/js/inspirations-elios-gallery-v2.js?v=20260913-dusthd2'
    ],
    view: [
      'assets/js/inspirations-view-data.js?v=20260907-view-lot1-final',
      'assets/js/inspirations-view-elios-parity.js?v=20260907-view-parity3',
      'assets/js/inspirations-view-data-lot2.js?v=20260907-view-lot2',
      'assets/js/inspirations-view-data-lot3.js?v=20260907-view-lot3',
      'assets/js/inspirations-view-accessories.js?v=20260911-view-accessories1',
      'assets/js/inspirations-view-hd.js?v=20260907-view-hd1',
      'assets/js/inspirations-view-mobile-safe.js?v=20260907-view-safe1',
      'assets/js/inspirations-view-accessories-ui.js?v=20260911-view-accessories-ui1',
      'assets/js/inspirations-view-order-v4.js?v=20260911-view-order-v4',
      'assets/js/inspirations-view-order-v5-polish.js?v=20260911-view-order-v5',
      'assets/js/inspirations-view-order-email-recap-fix.js?v=20260911-view-mail-recap2'
    ]
  };

  const states = new Map();
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function loadScript(src) {
    if ([...document.scripts].some(s => s.src && s.src.includes(src.split('?')[0]))) return Promise.resolve();
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.lrfLazySelection = '1';
      script.onload = resolve;
      script.onerror = resolve;
      document.body.appendChild(script);
    });
  }

  async function loadGroup(name, urgent = false) {
    if (states.has(name)) return states.get(name);
    const promise = (async () => {
      const list = GROUPS[name] || [];
      for (const src of list) {
        await loadScript(src);
        if (urgent) await nextFrame();
        else await wait(45);
      }
      window.dispatchEvent(new CustomEvent(`lrf-selections-${name}-ready`));
    })();
    states.set(name, promise);
    return promise;
  }

  function idle(callback, timeout = 1200) {
    if ('requestIdleCallback' in window) return window.requestIdleCallback(callback, { timeout });
    return setTimeout(callback, 260);
  }

  /* Lexique produits : accès rapide aux collections depuis le bloc Produits. */
  function installProductLexicon() {
    if (document.getElementById('lrf-product-lexicon-btn')) return true;
    const filters = document.querySelector('#v2-filters .filters-inner');
    if (!filters) return false;

    const style = document.createElement('style');
    style.id = 'lrf-product-lexicon-style';
    style.textContent = `
      .lrf-lexicon-btn{min-height:46px;padding:0 18px;border:1px solid #c9a438;border-radius:12px;background:#151515;color:#ffd632;font-weight:900;cursor:pointer;white-space:nowrap;box-shadow:0 5px 14px rgba(0,0,0,.08)}
      .lrf-lexicon-btn:hover{background:#222}
      .lrf-lexicon-overlay{position:fixed;inset:0;z-index:99999;background:rgba(12,12,12,.55);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:18px}
      .lrf-lexicon-overlay.open{display:flex}
      .lrf-lexicon-card{width:min(720px,100%);max-height:min(78vh,760px);display:flex;flex-direction:column;background:#fff;border-radius:22px;border:1px solid #e0d5bf;box-shadow:0 22px 70px rgba(0,0,0,.3);overflow:hidden}
      .lrf-lexicon-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid #eee6d9;background:#fffdf8}
      .lrf-lexicon-head h3{margin:0;font-size:1.3rem;color:#1a2530}.lrf-lexicon-head small{display:block;margin-top:3px;color:#81786b;font-weight:600}
      .lrf-lexicon-close{width:42px;height:42px;border:0;border-radius:50%;background:#f1eee8;font-size:1.7rem;line-height:1;cursor:pointer}
      .lrf-lexicon-catalogue-wrap{display:none;margin:14px 18px 0;padding:12px;border:1px solid #e2d6bf;border-radius:14px;background:#fffaf0}.lrf-lexicon-catalogue-wrap.show{display:block}
      .lrf-lexicon-catalogue-wrap label{display:block;margin:0 0 7px;font-size:.78rem;font-weight:900;color:#6d5730;text-transform:uppercase;letter-spacing:.05em}
      .lrf-lexicon-catalogue{width:100%;min-height:48px;border:1px solid #c9a438;border-radius:11px;background:#fff;color:#222;padding:0 12px;font:inherit;font-size:16px;font-weight:800}
      .lrf-lexicon-search{margin:14px 18px 8px;width:calc(100% - 36px);min-height:48px;border:1px solid #d8cdbb;border-radius:12px;padding:0 14px;font:inherit;font-size:16px}
      .lrf-lexicon-list{padding:10px 18px 20px;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .lrf-lexicon-item{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid #e5dfd4;background:#fff;border-radius:12px;padding:11px 12px;font:inherit;color:#222;cursor:pointer;min-height:54px}
      .lrf-lexicon-item:before{content:'›';color:#b58b35;font-size:1.4rem;font-weight:900;flex:0 0 auto}.lrf-lexicon-item:hover{border-color:#c9a438;background:#fffaf0}
      .lrf-lexicon-item-copy{display:flex;min-width:0;flex-direction:column;gap:2px}.lrf-lexicon-item-main{font-weight:900;line-height:1.15}.lrf-lexicon-item-meta{font-size:.72rem;color:#81786b;font-weight:700;line-height:1.2}
      .lrf-lexicon-empty{grid-column:1/-1;text-align:center;padding:24px;color:#81786b}
      @media(max-width:760px){#v2-filters .filters-inner{align-items:stretch}.lrf-lexicon-btn{width:100%;min-height:52px}.lrf-lexicon-card{max-height:88vh;border-radius:18px}.lrf-lexicon-list{grid-template-columns:1fr}.lrf-lexicon-head{padding:15px 16px}.lrf-lexicon-catalogue-wrap{margin:12px 14px 0}.lrf-lexicon-search{margin:12px 14px 6px;width:calc(100% - 28px)}}`;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'lrf-product-lexicon-btn';
    btn.className = 'lrf-lexicon-btn';
    btn.type = 'button';
    btn.textContent = '☰ Lexique des carreaux';
    filters.insertBefore(btn, filters.firstChild);

    const overlay = document.createElement('div');
    overlay.className = 'lrf-lexicon-overlay';
    overlay.innerHTML = `<div class="lrf-lexicon-card" role="dialog" aria-modal="true" aria-label="Lexique des produits"><div class="lrf-lexicon-head"><div><h3>Lexique des carreaux</h3><small id="lrf-lexicon-sub">Accès rapide aux collections</small></div><button type="button" class="lrf-lexicon-close" aria-label="Fermer">×</button></div><div class="lrf-lexicon-catalogue-wrap"><label for="lrf-lexicon-catalogue">Choisir le catalogue</label><select id="lrf-lexicon-catalogue" class="lrf-lexicon-catalogue"></select></div><input class="lrf-lexicon-search" type="search" placeholder="Rechercher une collection, un coloris ou un décor…"><div class="lrf-lexicon-list"></div></div>`;
    document.body.appendChild(overlay);

    const search = overlay.querySelector('.lrf-lexicon-search');
    const list = overlay.querySelector('.lrf-lexicon-list');
    const sub = overlay.querySelector('#lrf-lexicon-sub');
    const catalogueWrap = overlay.querySelector('.lrf-lexicon-catalogue-wrap');
    const catalogueSelect = overlay.querySelector('.lrf-lexicon-catalogue');
    let entries = [];

    const normalise = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const currentPartnerName = () => document.getElementById('workspace-title')?.textContent?.trim() || '';
    const isFenice = () => /fenice/i.test(currentPartnerName());

    function selectedFeniceCatalogue() {
      const data = window.LRF_FENICE_LEXICON;
      if (!isFenice() || !data || !Array.isArray(data.catalogues) || !data.catalogues.length) return null;
      const wanted = catalogueSelect.value || data.defaultCatalogue || data.catalogues[0].id;
      return data.catalogues.find(c => c.id === wanted) || data.catalogues[0];
    }

    function setupFeniceCatalogueSelector() {
      const data = window.LRF_FENICE_LEXICON;
      if (!isFenice() || !data || !Array.isArray(data.catalogues) || !data.catalogues.length) {
        catalogueWrap.classList.remove('show');
        catalogueSelect.innerHTML = '';
        return null;
      }
      const previous = catalogueSelect.value;
      catalogueSelect.innerHTML = data.catalogues.map(c => `<option value="${String(c.id).replace(/"/g,'&quot;')}">${String(c.label).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</option>`).join('');
      const desired = data.catalogues.some(c => c.id === previous) ? previous : (data.defaultCatalogue || data.catalogues[0].id);
      catalogueSelect.value = desired;
      catalogueWrap.classList.add('show');
      return selectedFeniceCatalogue();
    }

    function currentEntries() {
      const partner = currentPartnerName();
      if (/fenice/i.test(partner)) {
        const cat = selectedFeniceCatalogue();
        return Array.isArray(cat?.entries) ? cat.entries.slice().sort((a,b) => a.name.localeCompare(b.name,'fr',{sensitivity:'base'})) : [];
      }
      if (/elios/i.test(partner) && Array.isArray(window.ELIOS_CATALOGUE)) {
        return window.ELIOS_CATALOGUE.map(p => ({
          id: `elios-${p.slug}`,
          name: p.name || p.catalogueLabel || p.slug
        })).filter(x => x.id && x.name).sort((a,b) => a.name.localeCompare(b.name,'fr',{sensitivity:'base'}));
      }
      return [...document.querySelectorAll('#partner-products .product-card-v2')].map(card => ({
        id: card.dataset.id,
        name: card.querySelector('h3')?.textContent?.trim() || card.dataset.id
      })).filter(x => x.id && x.name).sort((a,b) => a.name.localeCompare(b.name,'fr',{sensitivity:'base'}));
    }

    function renderLexicon(query='') {
      const q = normalise(query).trim();
      const shown = entries.filter(x => !q || normalise(`${x.name || ''} ${x.keywords || ''} ${x.meta || ''}`).includes(q));
      list.innerHTML = shown.length ? shown.map(x => `<button type="button" class="lrf-lexicon-item" data-lex-id="${String(x.id).replace(/"/g,'&quot;')}"><span class="lrf-lexicon-item-copy"><span class="lrf-lexicon-item-main">${String(x.name).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</span>${x.meta ? `<span class="lrf-lexicon-item-meta">${String(x.meta).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</span>` : ''}</span></button>`).join('') : '<div class="lrf-lexicon-empty">Aucune référence trouvée.</div>';
    }

    function closeLexicon() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', () => {
      const cat = setupFeniceCatalogueSelector();
      entries = currentEntries();
      const partner = currentPartnerName() || 'ce fabricant';
      sub.textContent = cat?.subtitle || `${entries.length} produit${entries.length>1?'s':''} · ${partner}`;
      search.value = '';
      renderLexicon();
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => search.focus({preventScroll:true}), 50);
    });
    catalogueSelect.addEventListener('change', () => {
      const cat = selectedFeniceCatalogue();
      entries = currentEntries();
      sub.textContent = cat?.subtitle || `${entries.length} référence${entries.length>1?'s':''} · La Fenice`;
      search.value = '';
      renderLexicon();
    });
    search.addEventListener('input', () => renderLexicon(search.value));
    overlay.querySelector('.lrf-lexicon-close').addEventListener('click', closeLexicon);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeLexicon(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeLexicon(); });

    list.addEventListener('click', e => {
      const item = e.target.closest('[data-lex-id]');
      if (!item) return;
      const id = item.dataset.lexId;
      const entry = entries.find(x => x.id === id);
      closeLexicon();

      if (entry?.pdf && entry?.page) {
        const viewerCatalogue = /general_2026_2027|Generale_2026-2027|catalogo_Generale/i.test(entry.pdf) ? 'general' : 'cersaie';
        const target = `fenice-pdf.html?catalogue=${encodeURIComponent(viewerCatalogue)}&page=${encodeURIComponent(entry.page)}&title=${encodeURIComponent(entry.name || 'La Fenice')}`;
        const win = window.open(target, '_blank');
        if (win) win.opener = null;
        else window.location.href = target;
        return;
      }

      const searchBox = document.getElementById('v2-search');
      if (searchBox) {
        const entry = entries.find(x => x.id === id);
        searchBox.value = entry?.name || '';
        searchBox.dispatchEvent(new Event('input', {bubbles:true}));
      }
      ['v2-format','v2-color','v2-effect','v2-finish'].forEach(selectId => {
        const el = document.getElementById(selectId);
        if (el && el.value !== 'Tous') { el.value = 'Tous'; el.dispatchEvent(new Event('change',{bubbles:true})); }
      });
      setTimeout(() => {
        const card = document.querySelector(`#partner-products .product-card-v2[data-id="${CSS.escape(id)}"]`);
        if (card) {
          card.scrollIntoView({behavior:'smooth',block:'center'});
          setTimeout(() => card.click(), 180);
        }
      }, 120);
    });
    return true;
  }

  document.addEventListener('pointerdown', e => {
    const partner = e.target.closest?.('[data-partner]');
    if (partner && /view/i.test(partner.dataset.partner || '')) loadGroup('view', true);
    const card = e.target.closest?.('.product-card-v2');
    const title = document.getElementById('workspace-title')?.textContent || '';
    if (card && /elios/i.test(title)) loadGroup('elios', true);
  }, { capture: true, passive: true });

  const startBackgroundLoad = () => {
    installProductLexicon();
    idle(() => {
      loadGroup('elios').finally(() => { idle(() => loadGroup('view'), 1800); });
    }, 1000);
  };

  if (document.readyState === 'complete') startBackgroundLoad();
  else window.addEventListener('load', startBackgroundLoad, { once: true, passive: true });

  let lexiconTries = 0;
  const lexiconTimer = setInterval(() => {
    lexiconTries += 1;
    if (installProductLexicon() || lexiconTries > 40) clearInterval(lexiconTimer);
  }, 250);
})();