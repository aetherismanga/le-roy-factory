(() => {
  'use strict';
  if (window.__LRF_VIEW_SAFE_CONTROLLER__) return;
  window.__LRF_VIEW_SAFE_CONTROLLER__ = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const fr = (v, d = 2) => Number(v || 0).toLocaleString('fr-FR', {minimumFractionDigits:d, maximumFractionDigits:d});
  const session = () => window.LRF_PRO_SESSION?.read?.() || (() => { try { return JSON.parse(sessionStorage.getItem('lrfProSession') || 'null'); } catch { return null; } })();
  const hasViewAccess = () => {
    const s = session();
    if (!s) return false;
    if (s.isAdmin || s.admin) return true;
    return Array.isArray(s.partenaires) && s.partenaires.some(p => ['view','viewceramica','viewceramiche'].includes(norm(p)));
  };
  const isView = () => norm($('#workspace-title')?.textContent) === 'viewceramica';
  const imageUrl = image => typeof image === 'string' ? image : image?.url;
  const uniqueKeepOrder = list => {
    const seen = new Set();
    return (list || []).filter(v => {
      if (!v || seen.has(v)) return false;
      seen.add(v); return true;
    });
  };
  const galleryOf = p => {
    const urls = uniqueKeepOrder((p.images || []).map(imageUrl).filter(Boolean));
    return urls.length ? urls : ['assets/img/view.png'];
  };

  let DATA = [];
  let activeProduct = null;
  let filters = {q:'', format:'Tous', color:'Tous', effect:'Tous', finish:'Tous'};

  function refreshData() {
    DATA = (Array.isArray(window.VIEW_CATALOGUE) ? window.VIEW_CATALOGUE : []).map((p, i) => ({
      ...p,
      __safeId: p.id || `view-safe-${i}-${norm(p.name || p.collection || 'produit')}`
    }));
  }

  function installStyle() {
    if ($('#lrf-view-safe-style')) return;
    const st = document.createElement('style');
    st.id = 'lrf-view-safe-style';
    st.textContent = `
      .view-safe-card{cursor:pointer;touch-action:manipulation}
      .view-safe-modal{position:relative;width:min(980px,96vw)!important;max-height:92vh!important;padding:0!important;overflow-y:auto!important;overflow-x:hidden!important;border-radius:18px!important}
      .view-safe-modal .modal-v2-close{position:sticky!important;float:right;top:12px;right:12px;z-index:50;width:48px;height:48px;margin:12px 12px -60px 0;border-radius:50%;background:#111!important;color:#fff!important}
      .view-safe-main{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);min-width:0}
      .view-safe-gallery{min-width:0;background:#f2efe9}
      .view-safe-stage{position:relative;aspect-ratio:4/3;overflow:hidden;background:#ebe7df;touch-action:pan-y}
      .view-safe-stage>img{display:block;width:100%;height:100%;object-fit:cover}
      .view-safe-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:42px;height:42px;border:1px solid rgba(255,255,255,.78);border-radius:50%;background:rgba(17,17,17,.72);color:#fff;font-size:1.6rem;display:grid;place-items:center}
      .view-safe-nav.prev{left:.75rem}.view-safe-nav.next{right:.75rem}
      .view-safe-counter{position:absolute;right:.75rem;bottom:.75rem;padding:.3rem .52rem;border-radius:999px;background:rgba(17,17,17,.72);color:#fff;font-size:.72rem;font-weight:850}
      .view-safe-thumbs{display:flex;gap:.45rem;overflow-x:auto;padding:.65rem .7rem;background:#fff;border-top:1px solid #ece5d9}
      .view-safe-thumb{border:2px solid transparent;border-radius:9px;padding:0;width:72px;height:54px;flex:0 0 72px;overflow:hidden;background:#eee}
      .view-safe-thumb.active{border-color:#D4AF37}.view-safe-thumb img{width:100%;height:100%;object-fit:cover;display:block}
      .view-safe-caption{padding:0 .75rem .65rem;background:#fff;color:#81786b;font-size:.68rem}
      .view-safe-info{min-width:0;padding:1.2rem 1.15rem 1.25rem;box-sizing:border-box}
      .view-safe-info h2{margin:.18rem 0 .7rem;font-size:1.6rem}.view-safe-info h4{margin:1.05rem 0 .55rem}.view-safe-info p{line-height:1.45}
      .view-safe-info .chips{display:flex;flex-wrap:wrap;gap:.4rem}
      .view-safe-table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:.45rem}
      .view-safe-table th,.view-safe-table td{padding:.7rem .48rem;border-bottom:1px solid #e7e0d5;text-align:left;vertical-align:top;overflow-wrap:anywhere}
      .view-safe-table th:first-child,.view-safe-table td:first-child{width:61%}
      .view-safe-price{font-weight:900;color:#176b42}.view-safe-lock{font-weight:800;color:#746d63}
      .view-safe-stock{margin:0;padding:1rem 1.15rem 1.1rem;border:1px solid #a9d4b9;border-radius:0 0 18px 18px;background:#effaf3;color:#17653d}
      .view-safe-stock h3{margin:0 0 .28rem}.view-safe-stock p{margin:.2rem 0 .75rem;color:#4d5b53}
      .view-safe-actions{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}.view-safe-actions button{min-height:46px;border-radius:9px;font-weight:900;padding:.7rem}
      .view-safe-actions .secondary{border:1px solid #77b091;background:#fff;color:#17653d}.view-safe-actions .primary{border:1px solid #176c40;background:#176c40;color:#fff}
      @media(max-width:900px){
        .modal-v2{padding:12px!important;box-sizing:border-box}
        .view-safe-modal{width:calc(100vw - 24px)!important;max-width:none!important;max-height:calc(100dvh - 24px)!important;border-radius:28px!important}
        .view-safe-main{grid-template-columns:1fr}
        .view-safe-info{padding:1rem .95rem 1.1rem}
        .view-safe-info h2{font-size:clamp(1.55rem,7vw,2rem)}
        .view-safe-table{font-size:.84rem}.view-safe-table th,.view-safe-table td{padding:.65rem .4rem}
        .view-safe-thumbs{padding:.52rem}.view-safe-thumb{width:66px;height:50px;flex-basis:66px}
        .view-safe-stock{border-radius:0 0 28px 28px}.view-safe-actions{grid-template-columns:1fr}.view-safe-actions button{min-height:50px;font-size:1rem}
      }
    `;
    document.head.appendChild(st);
  }

  function updateHeader() {
    if (!isView()) return;
    const allowed = hasViewAccess();
    const sub = $('#workspace-sub'); if (sub) sub.textContent = 'Italie · catalogue VIEW · disponibilité sur demande';
    const badge = $('#workspace-pro-badge');
    if (badge) { badge.textContent = allowed ? '✓ Tarif PRO VIEW accessible' : '🔒 Tarif PRO VIEW selon compte'; badge.className = `pro-badge${allowed ? ' allowed' : ''}`; }
    const link = $('#workspace-pro-link');
    if (link) { link.style.display = allowed ? 'inline-flex' : 'none'; link.href = 'tarifs-pro.html?partner=View%20Ceramica'; link.textContent = 'Voir tarif PRO VIEW'; }
  }

  function uniqueSorted(arr) { return [...new Set((arr || []).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b),'fr',{numeric:true})); }
  function fillFilters() {
    if (!isView()) return;
    const fill = (id, vals, label) => {
      const el = $(id); if (!el) return;
      const old = el.value;
      el.innerHTML = `<option value="Tous">${label}</option>${vals.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}`;
      el.value = vals.includes(old) ? old : 'Tous';
    };
    fill('#v2-format', uniqueSorted(DATA.flatMap(p => p.formats || [])), 'Tous les formats');
    fill('#v2-color', uniqueSorted(DATA.flatMap(p => p.colorFamilies || p.colors || [])), 'Toutes les couleurs');
    fill('#v2-effect', uniqueSorted(DATA.map(p => p.effect)), 'Tous les effets');
    fill('#v2-finish', uniqueSorted(DATA.flatMap(p => p.finishes || [])), 'Toutes les finitions');
  }

  function readFilters() {
    filters.q = $('#v2-search')?.value || '';
    filters.format = $('#v2-format')?.value || 'Tous';
    filters.color = $('#v2-color')?.value || 'Tous';
    filters.effect = $('#v2-effect')?.value || 'Tous';
    filters.finish = $('#v2-finish')?.value || 'Tous';
  }

  function matches(p) {
    const hay = norm([p.name,p.collection,p.description,p.category,p.effect,...(p.formats||[]),...(p.colors||[]),...(p.colorFamilies||[]),...(p.finishes||[])].join(' '));
    if (filters.q && !hay.includes(norm(filters.q))) return false;
    if (filters.format !== 'Tous' && !(p.formats||[]).some(x => norm(x) === norm(filters.format))) return false;
    if (filters.color !== 'Tous' && !(p.colorFamilies||p.colors||[]).some(x => norm(x) === norm(filters.color))) return false;
    if (filters.effect !== 'Tous' && norm(p.effect) !== norm(filters.effect)) return false;
    if (filters.finish !== 'Tous' && !(p.finishes||[]).some(x => norm(x) === norm(filters.finish))) return false;
    return true;
  }

  function render() {
    if (!isView()) return;
    refreshData(); updateHeader(); readFilters();
    const grid = $('#partner-products'), count = $('#partner-count'); if (!grid) return;
    const found = DATA.filter(matches);
    if (count) count.textContent = `${found.length} collection${found.length > 1 ? 's' : ''} VIEW`;
    grid.innerHTML = found.length ? found.map(p => `
      <article class="product-card-v2 view-safe-card" data-view-safe-id="${esc(p.__safeId)}">
        <img src="${esc(galleryOf(p)[0])}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/img/view.png'">
        <div class="body"><span class="eyebrow">VIEW · ${esc(p.effect || p.category || 'Carrelage')}</span><h3>${esc(p.name)}</h3><p>${esc(p.description || '')}</p><div class="chips">${[...(p.colors||[]).slice(0,2),...(p.formats||[]).slice(0,2)].map(x => `<span>${esc(x)}</span>`).join('')}</div></div>
      </article>`).join('') : '<div class="empty-partner"><strong>Aucune collection VIEW avec ces filtres.</strong><p>Modifiez la recherche, le format, la couleur, l’effet ou la finition.</p></div>';
  }

  function priceCell(r, allowed) {
    if (!allowed) return '<span class="view-safe-lock">🔒 Accès PRO</span>';
    if (Number.isFinite(r.proPrice)) return `<span class="view-safe-price">${fr(r.proPrice)} € net/m²</span>`;
    if (Number.isFinite(r.proPalette) && Number.isFinite(r.proDetail)) return `<span class="view-safe-price">Palette+ ${fr(r.proPalette)} € net/m²<br>Détail ${fr(r.proDetail)} € net/m²</span>`;
    if (Number.isFinite(r.proPalette)) return `<span class="view-safe-price">Palette+ ${fr(r.proPalette)} € net/m²</span>`;
    if (Number.isFinite(r.proDetail)) return `<span class="view-safe-price">Détail ${fr(r.proDetail)} € net/m²</span>`;
    return '<span class="view-safe-lock">Sur demande</span>';
  }

  function closeModal() {
    const modal = $('#product-modal-v2'), box = $('#product-modal-v2-card');
    modal?.classList.remove('open');
    if (box) { box.className = 'modal-v2-card'; box.innerHTML = ''; }
    activeProduct = null;
    document.body.style.overflow = '';
  }

  function openModal(p) {
    const modal = $('#product-modal-v2'), box = $('#product-modal-v2-card'); if (!modal || !box) return;
    activeProduct = p;
    const allowed = hasViewAccess();
    const items = galleryOf(p);
    const rows = (p.variants || []).map(r => `<tr><td><strong>${esc(r.format || '—')}</strong>${r.thickness ? `<br><small>${esc(r.thickness)}</small>` : ''}${r.finish ? `<br><small>${esc(r.finish)}</small>` : ''}</td><td>${priceCell(r, allowed)}</td></tr>`).join('');
    box.className = 'modal-v2-card view-safe-modal';
    box.innerHTML = `
      <button class="modal-v2-close" type="button" aria-label="Fermer">×</button>
      <div class="view-safe-main">
        <div class="view-safe-gallery" data-view-safe-gallery>
          <div class="view-safe-stage"><img src="${esc(items[0])}" alt="${esc(p.name)}" data-view-safe-main onerror="this.onerror=null;this.src='assets/img/view.png'">${items.length > 1 ? '<button class="view-safe-nav prev" type="button">‹</button><button class="view-safe-nav next" type="button">›</button>' : ''}<span class="view-safe-counter">1 / ${items.length}</span></div>
          <div class="view-safe-thumbs">${items.map((url,i) => `<button class="view-safe-thumb${i===0?' active':''}" type="button" data-view-safe-thumb="${i}"><img src="${esc(url)}" alt="" loading="lazy"></button>`).join('')}</div>
          <div class="view-safe-caption">Glissez l’image sur smartphone · cliquez sur les miniatures sur PC</div>
        </div>
        <div class="view-safe-info"><span class="eyebrow">VIEW CERAMICA · ${esc(p.effect || p.category || 'Carrelage')}</span><h2>${esc(p.name)}</h2><p>${esc(p.description || '')}</p>${(p.colors||[]).length ? `<h4>Couleurs / déclinaisons</h4><div class="chips">${(p.colors||[]).map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}${(p.formats||[]).length ? `<h4>Formats</h4><div class="chips">${(p.formats||[]).map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}<h4>Tarifs professionnels</h4><table class="view-safe-table"><thead><tr><th>Format</th><th>Tarif PRO</th></tr></thead><tbody>${rows || '<tr><td>—</td><td>Sur demande</td></tr>'}</tbody></table></div>
      </div>
      <section class="view-safe-stock"><h3>Disponibilités & commande VIEW</h3><p>Aucun stock VIEW n’est affiché. La disponibilité reste à confirmer auprès de l’usine.</p><div class="view-safe-actions"><button class="secondary" type="button" data-view-safe-action="availability">Demander disponibilité</button><button class="primary" type="button" data-view-safe-action="order">Commander</button></div></section>`;

    let index = 0, startX = null;
    const show = next => {
      index = (next + items.length) % items.length;
      const main = $('[data-view-safe-main]', box); if (main) main.src = items[index];
      const counter = $('.view-safe-counter', box); if (counter) counter.textContent = `${index + 1} / ${items.length}`;
      $$('[data-view-safe-thumb]', box).forEach((b,i) => b.classList.toggle('active', i === index));
    };
    $('.modal-v2-close', box).onclick = closeModal;
    $('.view-safe-nav.prev', box)?.addEventListener('click', e => { e.stopPropagation(); show(index - 1); });
    $('.view-safe-nav.next', box)?.addEventListener('click', e => { e.stopPropagation(); show(index + 1); });
    $('.view-safe-thumbs', box)?.addEventListener('click', e => { const b = e.target.closest('[data-view-safe-thumb]'); if (b) { e.stopPropagation(); show(Number(b.dataset.viewSafeThumb)); } });
    const stage = $('.view-safe-stage', box);
    stage?.addEventListener('touchstart', e => { startX = e.touches?.[0]?.clientX ?? null; }, {passive:true});
    stage?.addEventListener('touchend', e => { if (startX == null) return; const endX = e.changedTouches?.[0]?.clientX ?? startX; const dx = endX - startX; startX = null; if (Math.abs(dx) > 42 && items.length > 1) show(index + (dx < 0 ? 1 : -1)); }, {passive:true});
    box.querySelectorAll('[data-view-safe-action]').forEach(btn => btn.addEventListener('click', () => {
      const type = btn.dataset.viewSafeAction;
      const s = session() || {};
      const subject = `${type === 'order' ? '[COMMANDE VIEW]' : '[DISPONIBILITÉ VIEW]'} ${p.name}`;
      const body = [`${type === 'order' ? 'COMMANDE' : 'DEMANDE DE DISPONIBILITÉ'} VIEW CERAMICA`,`Collection : ${p.name}`,`Société : ${s.societe || ''}`,`Code client LRF : ${s.codeClient || ''}`,'','Merci de confirmer les références, quantités et disponibilités.'].join('\n');
      window.location.href = `mailto:jerome@leroyfactory.fr?cc=${encodeURIComponent('coryne@leroyfactory.fr')}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }));
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function bind() {
    const grid = $('#partner-products'), partnerGrid = $('#partner-grid');
    if (!grid || grid.dataset.viewSafeBound === '1') return;
    grid.dataset.viewSafeBound = '1';
    grid.addEventListener('click', e => {
      const card = e.target.closest('[data-view-safe-id]');
      if (!card || !isView()) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      const p = DATA.find(x => x.__safeId === card.dataset.viewSafeId);
      if (p) openModal(p);
    }, true);
    partnerGrid?.addEventListener('click', e => {
      const b = e.target.closest('[data-partner]');
      if (b && norm(b.dataset.partner) === 'viewceramica') setTimeout(() => { refreshData(); fillFilters(); render(); }, 0);
    });
    ['input','change'].forEach(type => document.addEventListener(type, e => {
      if (!isView()) return;
      if (['v2-search','v2-format','v2-color','v2-effect','v2-finish'].includes(e.target?.id)) setTimeout(render, 0);
    }));
    $('#product-modal-v2')?.addEventListener('click', e => { if (e.target.id === 'product-modal-v2' && activeProduct) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && activeProduct) closeModal(); });
    window.addEventListener('lrf-pro-session-changed', () => { if (isView()) render(); });
  }

  function start() {
    installStyle(); refreshData(); bind();
    if (isView()) { fillFilters(); render(); }
  }

  const boot = () => {
    let tries = 0;
    const run = () => {
      tries += 1;
      if (document.getElementById('partner-products') && Array.isArray(window.VIEW_CATALOGUE) && window.VIEW_CATALOGUE.length) { start(); return; }
      if (tries < 30) setTimeout(run, 100);
    };
    setTimeout(run, 250);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
