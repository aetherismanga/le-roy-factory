(() => {
  'use strict';
  if (window.__LRF_VIEW_INSPIRATIONS_V2__) return;
  window.__LRF_VIEW_INSPIRATIONS_V2__ = true;

  const DATA = Array.isArray(window.VIEW_CATALOGUE) ? window.VIEW_CATALOGUE : [];
  if (!DATA.length) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const fr = (v, d = 2) => Number(v || 0).toLocaleString('fr-FR', {minimumFractionDigits:d, maximumFractionDigits:d});
  const euros = v => `${fr(v, 2)} € net/m²`;
  const unique = a => [...new Set((a || []).filter(Boolean))].sort((x, y) => String(x).localeCompare(String(y), 'fr', {numeric:true}));
  const currentSession = () => window.LRF_PRO_SESSION?.read?.() || (() => { try { return JSON.parse(sessionStorage.getItem('lrfProSession') || 'null'); } catch { return null; } })();
  const hasViewAccess = () => {
    const s = currentSession();
    if (!s) return false;
    if (s.isAdmin || s.admin) return true;
    return Array.isArray(s.partenaires) && s.partenaires.some(p => ['view','viewceramica','viewceramiche'].includes(norm(p)));
  };
  const isView = () => norm($('#workspace-title')?.textContent) === 'viewceramica';
  const imageUrl = image => typeof image === 'string' ? image : image?.url;
  const galleryOf = p => {
    const urls = unique((p.images || []).map(imageUrl).filter(Boolean));
    return urls.length ? urls : ['assets/img/view.png'];
  };
  const imageOf = p => galleryOf(p)[0];

  let filters = {q:'', format:'Tous', color:'Tous', effect:'Tous', finish:'Tous'};
  let activeProduct = null;
  let actionType = 'availability';
  let modalObserver = null;

  function installStyle() {
    if ($('#lrf-view-v2-style')) return;
    const st = document.createElement('style');
    st.id = 'lrf-view-v2-style';
    st.textContent = `
      .view-product-card{cursor:pointer}
      .view-modal-card{position:relative;width:min(980px,96vw)!important;max-height:92vh!important;padding:0!important;overflow-y:auto!important;overflow-x:hidden!important;border-radius:16px!important}
      .view-modal-card .modal-v2-close{position:absolute;top:12px;right:12px;z-index:40}
      .view-modal-card .modal-v2-main{display:grid!important;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr)!important;gap:0!important;align-items:start!important;min-width:0!important}
      .view-modal-card .modal-v2-info{min-width:0!important;padding:1rem 1.05rem 1.15rem!important;box-sizing:border-box}
      .view-modal-card .modal-v2-info h2{margin:.15rem 0 .65rem;font-size:1.45rem;line-height:1.15}
      .view-modal-card .modal-v2-info h4{margin:1rem 0 .55rem;font-size:.92rem}
      .view-modal-card .modal-v2-info>p{margin:.35rem 0 .7rem;line-height:1.4}
      .view-modal-card .chips{display:flex;flex-wrap:wrap;gap:.38rem}
      .view-modal-card .chips span{white-space:normal}
      .view-modal-card .elios-gallery-v2{min-width:0;background:#f4f1eb}
      .view-modal-card .elios-gallery-stage{position:relative;aspect-ratio:4/3;min-height:0;background:#ece8df;overflow:hidden}
      .view-modal-card .elios-gallery-main{display:block;width:100%;height:100%;max-height:none!important;object-fit:cover}
      .view-modal-card .elios-gallery-thumbs{overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin}
      .view-modal-card .elios-gallery-thumb{flex:0 0 72px;height:52px;object-fit:cover}
      .view-modal-card .formats-table{width:100%!important;min-width:0!important;table-layout:fixed!important;margin-top:.45rem}
      .view-modal-card .formats-table th,.view-modal-card .formats-table td{padding:.58rem .42rem!important;overflow-wrap:anywhere}
      .view-modal-card .formats-table th:first-child,.view-modal-card .formats-table td:first-child{width:62%}
      .view-modal-card .formats-table td:last-child{font-weight:900;color:#176b42}
      .view-modal-card .view-format-main{display:block;font-weight:700;color:#25231f}
      .view-modal-card .view-format-sub{display:block;margin-top:.12rem;font-size:.67rem;line-height:1.25;color:#7d766c;font-weight:500}
      .view-price-lock{font-weight:800;color:#746d63!important}
      .view-stock-panel{margin:0 12px 12px;padding:.82rem .9rem .9rem;border:1px solid #a9d4b9;border-radius:12px;background:#effaf3;color:#17653d}
      .view-stock-panel h3{margin:0 0 .2rem;font-size:.88rem;color:#17653d}
      .view-stock-panel p{margin:0 0 .7rem;font-size:.72rem;line-height:1.4;color:#4d5b53}
      .view-stock-actions{display:grid;grid-template-columns:1fr 1fr;gap:.55rem}
      .view-stock-actions button{min-height:42px;border-radius:8px;padding:.65rem .75rem;font-weight:900;cursor:pointer}
      .view-stock-actions .secondary{border:1px solid #77b091;background:#fff;color:#17653d}
      .view-stock-actions .primary{border:1px solid #176c40;background:#176c40;color:#fff}
      .view-action-dialog{position:fixed;inset:0;z-index:22000;background:rgba(0,0,0,.62);display:none;align-items:center;justify-content:center;padding:1rem}
      .view-action-dialog.open{display:flex}
      .view-action-panel{width:min(680px,96vw);max-height:92vh;overflow:auto;overflow-x:hidden;background:#fff;border-radius:16px;padding:1.15rem;box-shadow:0 24px 75px rgba(0,0,0,.35)}
      .view-action-head{display:flex;justify-content:space-between;gap:1rem;align-items:center;margin-bottom:.7rem}
      .view-action-close{border:1px solid #ddd4c7;background:#fff;border-radius:8px;padding:.5rem .7rem;font-size:1.1rem;cursor:pointer}
      .view-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
      .view-field{display:flex;flex-direction:column;gap:.3rem;min-width:0}
      .view-field.full{grid-column:1/-1}
      .view-field label{font-size:.72rem;font-weight:900;color:#615b52}
      .view-field input,.view-field select,.view-field textarea{width:100%;min-width:0;box-sizing:border-box;border:1px solid #d9d2c7;border-radius:8px;padding:.68rem;font:inherit}
      .view-field input[readonly]{background:#f5f2eb;color:#49453f}
      .view-field textarea{min-height:92px;resize:vertical}
      .view-order-calc{grid-column:1/-1;background:#f7f4ed;border:1px solid #ded5c7;border-radius:10px;padding:.72rem;font-size:.78rem;color:#4c4841}
      .view-order-calc strong{color:#17623a}
      .view-send{width:100%;margin-top:.8rem;border:0;border-radius:9px;background:#176c40;color:#fff;padding:.78rem 1rem;font-weight:950;cursor:pointer}
      .view-disclaimer{font-size:.7rem;color:#777065;margin:.7rem 0 0}
      @media(max-width:900px){
        .modal-v2{padding:12px!important;box-sizing:border-box}
        .view-modal-card{width:calc(100vw - 24px)!important;max-width:none!important;max-height:calc(100dvh - 24px)!important;border-radius:28px!important}
        .view-modal-card .modal-v2-main{grid-template-columns:1fr!important}
        .view-modal-card .modal-v2-info{padding:1.2rem 1.2rem 1.35rem!important}
        .view-modal-card .modal-v2-info h2{font-size:clamp(1.55rem,7vw,2rem)}
        .view-modal-card .elios-gallery-stage{aspect-ratio:4/3}
        .view-modal-card .elios-gallery-thumb{flex-basis:86px;height:62px}
        .view-modal-card .formats-table{font-size:.88rem!important}
        .view-modal-card .formats-table th,.view-modal-card .formats-table td{padding:.7rem .45rem!important}
        .view-stock-panel{margin:0 0 0;padding:1rem 1.15rem 1.1rem;border-radius:22px 22px 28px 28px;border-left:1px solid #a9d4b9;border-right:1px solid #a9d4b9}
        .view-stock-panel h3{font-size:1.05rem}
        .view-stock-panel p{font-size:.85rem}
        .view-stock-actions{grid-template-columns:1fr}
        .view-stock-actions button{min-height:50px;font-size:1rem}
        .view-form-grid{grid-template-columns:1fr}
        .view-field.full,.view-order-calc{grid-column:auto}
      }
      @media(max-width:430px){
        .view-modal-card .modal-v2-info{padding:1rem .95rem 1.15rem!important}
        .view-modal-card .formats-table{font-size:.8rem!important}
        .view-modal-card .formats-table th:first-child,.view-modal-card .formats-table td:first-child{width:59%}
        .view-modal-card .elios-gallery-thumb{flex-basis:76px;height:56px}
      }
    `;
    document.head.appendChild(st);
  }

  function updateWorkspaceHeader() {
    if (!isView()) return;
    const allowed = hasViewAccess();
    const sub = $('#workspace-sub');
    if (sub) sub.textContent = 'Italie · catalogue VIEW · disponibilité sur demande';
    const badge = $('#workspace-pro-badge');
    if (badge) {
      badge.textContent = allowed ? '✓ Tarif PRO VIEW accessible' : '🔒 Tarif PRO VIEW selon compte';
      badge.className = `pro-badge${allowed ? ' allowed' : ''}`;
    }
    const link = $('#workspace-pro-link');
    if (link) {
      link.style.display = allowed ? 'inline-flex' : 'none';
      link.href = 'tarifs-pro.html?partner=View%20Ceramica';
      link.textContent = 'Voir tarif PRO VIEW';
    }
  }

  function fillFilters() {
    if (!isView()) return;
    const fill = (id, values, label) => {
      const el = $(id); if (!el) return;
      const old = el.value;
      el.innerHTML = `<option value="Tous">${label}</option>${values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}`;
      el.value = values.includes(old) ? old : 'Tous';
    };
    fill('#v2-format', unique(DATA.flatMap(p => p.formats || [])), 'Tous les formats');
    fill('#v2-color', unique(DATA.flatMap(p => p.colorFamilies || p.colors || [])), 'Toutes les couleurs');
    fill('#v2-effect', unique(DATA.map(p => p.effect)), 'Tous les effets');
    fill('#v2-finish', unique(DATA.flatMap(p => p.finishes || [])), 'Toutes les finitions');
  }

  function readFilters() {
    filters.q = $('#v2-search')?.value || '';
    filters.format = $('#v2-format')?.value || 'Tous';
    filters.color = $('#v2-color')?.value || 'Tous';
    filters.effect = $('#v2-effect')?.value || 'Tous';
    filters.finish = $('#v2-finish')?.value || 'Tous';
  }

  function matches(p) {
    const hay = norm([p.name,p.collection,p.description,p.category,p.effect,...(p.formats||[]),...(p.colors||[]),...(p.colorFamilies||[]),...(p.finishes||[]),...(p.variants||[]).flatMap(r => Object.values(r.refs||{}))].join(' '));
    if (filters.q && !hay.includes(norm(filters.q))) return false;
    if (filters.format !== 'Tous' && !(p.formats||[]).some(x => norm(x) === norm(filters.format))) return false;
    if (filters.color !== 'Tous' && !(p.colorFamilies||p.colors||[]).some(x => norm(x) === norm(filters.color))) return false;
    if (filters.effect !== 'Tous' && norm(p.effect) !== norm(filters.effect)) return false;
    if (filters.finish !== 'Tous' && !(p.finishes||[]).some(x => norm(x) === norm(filters.finish))) return false;
    return true;
  }

  function render() {
    if (!isView()) return;
    updateWorkspaceHeader(); readFilters();
    const grid = $('#partner-products'), count = $('#partner-count');
    if (!grid) return;
    const found = DATA.filter(matches);
    if (count) count.textContent = `${found.length} collection${found.length > 1 ? 's' : ''} VIEW`;
    grid.innerHTML = found.length ? found.map(p => `
      <article class="product-card-v2 view-product-card" data-view-id="${esc(p.id)}">
        <img src="${esc(imageOf(p))}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/img/view.png'">
        <div class="body">
          <span class="eyebrow">VIEW · ${esc(p.effect || p.category || 'Carrelage')}</span>
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.description || '')}</p>
          <div class="chips">${[...(p.colors||[]).slice(0,2),...(p.formats||[]).slice(0,2)].map(x => `<span>${esc(x)}</span>`).join('')}</div>
        </div>
      </article>`).join('') : '<div class="empty-partner"><strong>Aucune collection VIEW avec ces filtres.</strong><p>Modifiez la recherche, le format, la couleur, l’effet ou la finition.</p></div>';
  }

  function proCell(r, allowed) {
    if (!allowed) return '<span class="view-price-lock">🔒 Accès PRO</span>';
    if (Number.isFinite(r.proPrice)) return `<span class="price-ok">${euros(r.proPrice)}</span>`;
    if (Number.isFinite(r.proPalette) && Number.isFinite(r.proDetail)) return `<span class="price-ok">Palette+ ${euros(r.proPalette)}<br>Détail ${euros(r.proDetail)}</span>`;
    if (Number.isFinite(r.proPalette)) return `<span class="price-ok">Palette+ ${euros(r.proPalette)}</span>`;
    if (Number.isFinite(r.proDetail)) return `<span class="price-ok">Détail ${euros(r.proDetail)}</span>`;
    return '<span class="view-price-lock">Sur demande</span>';
  }

  function galleryMarkup(p) {
    const items = galleryOf(p);
    return `
      <div class="elios-gallery-v2 view-gallery" data-view-gallery>
        <div class="elios-gallery-stage">
          <img class="elios-gallery-main" src="${esc(items[0])}" alt="${esc(p.name)}" data-view-main onerror="this.onerror=null;this.src='assets/img/view.png'">
          ${items.length > 1 ? '<button class="elios-gallery-prev" type="button" aria-label="Image précédente">‹</button><button class="elios-gallery-next" type="button" aria-label="Image suivante">›</button>' : ''}
          <span class="elios-gallery-count" data-view-count>1 / ${items.length}</span>
        </div>
        <div class="elios-gallery-thumbs" data-view-thumbs>${items.map((url, i) => `<button class="elios-gallery-thumb${i===0?' active':''}" type="button" data-view-thumb="${i}" aria-label="Visuel ${i+1}"><img src="${esc(url)}" alt="${esc(p.name)} · ${i+1}" loading="lazy" onerror="this.closest('button').style.display='none'"></button>`).join('')}</div>
        <div class="elios-gallery-mobile-help">Glissez l’image sur smartphone · cliquez sur les miniatures sur PC</div>
      </div>`;
  }

  function installGallery(box, p) {
    const items = galleryOf(p);
    if (!items.length) return;
    let index = 0, startX = null;
    const main = $('[data-view-main]', box), count = $('[data-view-count]', box), thumbs = $('[data-view-thumbs]', box);
    const show = next => {
      index = (next + items.length) % items.length;
      if (main) { main.src = items[index]; main.alt = `${p.name} · visuel ${index + 1}`; }
      if (count) count.textContent = `${index + 1} / ${items.length}`;
      $$('[data-view-thumb]', box).forEach((b, i) => b.classList.toggle('active', i === index));
      const active = $(`[data-view-thumb="${index}"]`, box);
      active?.scrollIntoView?.({behavior:'smooth', block:'nearest', inline:'nearest'});
    };
    $('.elios-gallery-prev', box)?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); show(index - 1); });
    $('.elios-gallery-next', box)?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); show(index + 1); });
    thumbs?.addEventListener('click', e => {
      const b = e.target.closest('[data-view-thumb]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation(); show(Number(b.dataset.viewThumb));
    });
    const stage = $('.elios-gallery-stage', box);
    stage?.addEventListener('touchstart', e => { startX = e.touches?.[0]?.clientX ?? null; }, {passive:true});
    stage?.addEventListener('touchend', e => {
      if (startX == null) return;
      const endX = e.changedTouches?.[0]?.clientX ?? startX;
      const dx = endX - startX; startX = null;
      if (Math.abs(dx) > 42 && items.length > 1) show(index + (dx < 0 ? 1 : -1));
    }, {passive:true});
  }

  function stopModalGuard() {
    modalObserver?.disconnect(); modalObserver = null;
  }

  function startModalGuard(box) {
    stopModalGuard();
    const bad = node => /Disponibilit(?:é|e)s\s*&\s*commande\s*ELIOS|Voir les stocks\s*&\s*commander/i.test(node?.textContent || '');
    const cleanDirect = () => {
      [...box.children].forEach(child => {
        if (child.matches('.modal-v2-close,.modal-v2-main,.view-stock-panel')) return;
        if (bad(child)) child.remove();
      });
    };
    cleanDirect();
    modalObserver = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.closest?.('.view-stock-panel')) return;
        if (bad(node)) node.remove();
      }));
      cleanDirect();
    });
    modalObserver.observe(box, {childList:true, subtree:true});
  }

  function closeProduct() {
    stopModalGuard();
    const modal = $('#product-modal-v2'), box = $('#product-modal-v2-card');
    modal?.classList.remove('open');
    box?.classList.remove('view-modal-card');
    if (box) delete box.dataset.viewModal;
    activeProduct = null;
    document.body.style.overflow = '';
  }

  function openProduct(p) {
    const modal = $('#product-modal-v2'), box = $('#product-modal-v2-card');
    if (!modal || !box) return;
    activeProduct = p;
    const allowed = hasViewAccess();
    const rows = (p.variants || []).map(r => `
      <tr>
        <td><span class="view-format-main">${esc(r.format || '—')}${r.thickness ? ` · ${esc(r.thickness)}` : ''}</span>${r.finish ? `<small class="view-format-sub">${esc(r.finish)}</small>` : ''}</td>
        <td>${proCell(r, allowed)}</td>
      </tr>`).join('');

    box.className = 'modal-v2-card view-modal-card';
    box.dataset.viewModal = '1';
    box.innerHTML = `
      <button class="modal-v2-close" type="button" aria-label="Fermer">×</button>
      <div class="modal-v2-main">
        ${galleryMarkup(p)}
        <div class="modal-v2-info">
          <span class="eyebrow">VIEW CERAMICA · ${esc(p.effect || p.category || 'Carrelage')}</span>
          <h2>${esc(p.name)}</h2>
          <p>${esc(p.description || '')}</p>
          ${(p.colors||[]).length ? `<h4>Couleurs / déclinaisons</h4><div class="chips">${(p.colors||[]).map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
          ${(p.formats||[]).length ? `<h4>Formats</h4><div class="chips">${(p.formats||[]).map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
          <h4>Tarifs professionnels</h4>
          <table class="formats-table"><thead><tr><th>Format</th><th>Tarif PRO</th></tr></thead><tbody>${rows || '<tr><td>—</td><td>Sur demande</td></tr>'}</tbody></table>
        </div>
      </div>
      <section class="view-stock-panel">
        <h3>Disponibilités & commande VIEW</h3>
        <p>Aucun stock VIEW n’est affiché. Demandez la disponibilité usine ou préparez directement votre commande.</p>
        <div class="view-stock-actions">
          <button class="secondary" type="button" data-view-action="availability">Demander disponibilité</button>
          <button class="primary" type="button" data-view-action="order">Commander</button>
        </div>
      </section>`;

    $('.modal-v2-close', box).onclick = closeProduct;
    installGallery(box, p);
    startModalGuard(box);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function currentVariant() {
    const idx = Number($('#view-action-variant')?.value || 0);
    return activeProduct?.variants?.[idx] || {};
  }

  function fillActionColors() {
    const r = currentVariant(), el = $('#view-action-color');
    if (!el) return;
    const colors = r.colors?.length ? r.colors : (activeProduct?.colors || []);
    const old = el.value;
    el.innerHTML = colors.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if (colors.includes(old)) el.value = old;
    updateActionDetails();
  }

  function updateActionDetails() {
    const r = currentVariant(), color = $('#view-action-color')?.value || '', ref = r.refs?.[color] || '';
    const refInput = $('#view-action-ref'); if (refInput) refInput.value = ref || 'Référence à confirmer';
    const q = Number($('#view-action-qty')?.value || 0), p = r.pack, calc = $('#view-order-calc');
    if (!calc) return;
    if (p?.m2Box) {
      const boxes = q > 0 ? Math.ceil(q / p.m2Box) : 0, orderQty = boxes * p.m2Box;
      calc.innerHTML = `Conditionnement : <strong>${fr(p.m2Box,2)} m²/carton</strong> · ${fr(p.pcsBox,0)} pcs/carton${q > 0 ? `<br>Besoin ${fr(q,2)} m² → <strong>${boxes} carton${boxes>1?'s':''} = ${fr(orderQty,2)} m² commandés</strong>` : ''}`;
    } else calc.textContent = 'Conditionnement : quantité à confirmer pour cette référence.';
  }

  function ensureActionDialog() {
    if ($('#view-action-dialog')) return;
    const d = document.createElement('div');
    d.id = 'view-action-dialog'; d.className = 'view-action-dialog';
    d.innerHTML = `<div class="view-action-panel"><div class="view-action-head"><div><strong id="view-action-title">VIEW</strong><div id="view-action-sub" style="font-size:.75rem;color:#777065;margin-top:.2rem"></div></div><button class="view-action-close" type="button" aria-label="Fermer">×</button></div><form id="view-action-form"><div class="view-form-grid"><div class="view-field full"><label>Format / finition</label><select id="view-action-variant" required></select></div><div class="view-field"><label>Couleur</label><select id="view-action-color" required></select></div><div class="view-field"><label>Référence VIEW</label><input id="view-action-ref" readonly></div><div class="view-field"><label>Besoin (m²)</label><input id="view-action-qty" type="number" min="0.01" step="0.01" placeholder="Ex. 42,50" required></div><div class="view-field"><label>Société</label><input id="view-action-company" autocomplete="organization" required></div><div id="view-order-calc" class="view-order-calc">Conditionnement à calculer.</div><div class="view-field"><label>Contact</label><input id="view-action-contact" autocomplete="name" required></div><div class="view-field"><label>E-mail</label><input id="view-action-email" type="email" autocomplete="email"></div><div class="view-field"><label>Téléphone</label><input id="view-action-phone" autocomplete="tel"></div><div class="view-field full"><label>Note</label><textarea id="view-action-note" placeholder="Chantier, délai souhaité, livraison, précision…"></textarea></div></div><button class="view-send" type="submit">Préparer la demande</button><p class="view-disclaimer">Aucun stock VIEW n’est affiché : la disponibilité reste à confirmer par l’usine avant validation définitive.</p></form></div>`;
    document.body.appendChild(d);
    $('.view-action-close', d).onclick = () => d.classList.remove('open');
    d.addEventListener('click', e => { if (e.target === d) d.classList.remove('open'); });
    $('#view-action-variant').addEventListener('change', fillActionColors);
    $('#view-action-color').addEventListener('change', updateActionDetails);
    $('#view-action-qty').addEventListener('input', updateActionDetails);
    $('#view-action-form').addEventListener('submit', sendAction);
  }

  function openAction(type) {
    if (!activeProduct) return;
    ensureActionDialog(); actionType = type;
    const s = currentSession() || {};
    $('#view-action-title').textContent = type === 'order' ? 'Commande VIEW' : 'Disponibilité VIEW';
    $('#view-action-sub').textContent = activeProduct.name;
    $('#view-action-variant').innerHTML = (activeProduct.variants || []).map((r, i) => `<option value="${i}">${esc(r.format || '—')} · ${esc(r.thickness || '')} · ${esc(r.finish || '')}</option>`).join('');
    $('#view-action-company').value = s.societe || '';
    $('#view-action-contact').value = s.name || s.contact || '';
    $('#view-action-email').value = s.email || '';
    $('#view-action-phone').value = '';
    $('#view-action-qty').value = '';
    $('#view-action-note').value = '';
    fillActionColors();
    $('#view-action-dialog').classList.add('open');
  }

  function sendAction(e) {
    e.preventDefault(); if (!activeProduct) return;
    const r = currentVariant(), color = $('#view-action-color').value, ref = r.refs?.[color] || '', qty = Number($('#view-action-qty').value || 0), p = r.pack;
    const boxes = p?.m2Box && qty > 0 ? Math.ceil(qty / p.m2Box) : null, orderQty = boxes != null ? boxes * p.m2Box : qty;
    const company = $('#view-action-company').value.trim(), contact = $('#view-action-contact').value.trim(), email = $('#view-action-email').value.trim(), phone = $('#view-action-phone').value.trim(), note = $('#view-action-note').value.trim();
    const isOrder = actionType === 'order', subject = `${isOrder ? '[COMMANDE VIEW]' : '[DISPONIBILITÉ VIEW]'} ${activeProduct.name} — ${company}`;
    const body = [
      `${isOrder ? 'COMMANDE' : 'DEMANDE DE DISPONIBILITÉ'} VIEW CERAMICA`, '',
      `Collection : ${activeProduct.name}`, `Référence : ${ref || 'à confirmer'}`, `Format : ${r.format || '—'}`, `Épaisseur : ${r.thickness || '—'}`, `Finition : ${r.finish || '—'}`, `Couleur : ${color || '—'}`, `Besoin : ${fr(qty,2)} m²`,
      boxes != null ? `Commande calculée : ${boxes} carton${boxes>1?'s':''} = ${fr(orderQty,2)} m²` : '',
      p?.m2Box ? `Boîtage : ${fr(p.m2Box,2)} m²/carton · ${fr(p.pcsBox,0)} pcs/carton` : '', '',
      `Société : ${company}`, `Contact : ${contact}`, `E-mail : ${email || '—'}`, `Téléphone : ${phone || '—'}`, `Code client LRF : ${currentSession()?.codeClient || '—'}`,
      note ? `Note : ${note}` : '', '', 'Disponibilité à confirmer par VIEW — aucun stock temps réel affiché.'
    ].filter(Boolean).join('\n');
    window.location.href = `mailto:jerome@leroyfactory.fr?cc=${encodeURIComponent('coryne@leroyfactory.fr')}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $('#view-action-dialog').classList.remove('open');
  }

  function activate() {
    if (!isView()) return;
    installStyle(); fillFilters(); render();
  }

  document.addEventListener('click', e => {
    const card = e.target.closest('[data-view-id]');
    if (card && isView()) {
      e.preventDefault(); e.stopPropagation();
      const p = DATA.find(x => x.id === card.dataset.viewId);
      if (p) openProduct(p);
      return;
    }
    const action = e.target.closest('[data-view-action]');
    if (action) {
      e.preventDefault(); e.stopPropagation(); openAction(action.dataset.viewAction); return;
    }
    const partner = e.target.closest('[data-partner]');
    if (partner && norm(partner.dataset.partner) === 'viewceramica') setTimeout(activate, 0);
    const modal = $('#product-modal-v2');
    if (modal && e.target === modal && activeProduct) closeProduct();
  }, false);

  ['input','change'].forEach(type => document.addEventListener(type, e => {
    if (!isView()) return;
    if (['v2-search','v2-format','v2-color','v2-effect','v2-finish'].includes(e.target?.id)) setTimeout(render, 0);
  }, false));

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('#view-action-dialog')?.classList.contains('open')) { $('#view-action-dialog').classList.remove('open'); e.stopPropagation(); return; }
    if (activeProduct) closeProduct();
  });
  window.addEventListener('lrf-pro-session-changed', () => { if (isView()) activate(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(activate, 140), {once:true});
  else setTimeout(activate, 140);
})();
