(() => {
  'use strict';

  const STOCK_API = 'https://us-central1-le-roy-factory.cloudfunctions.net/eliosStock';
  const PRICE = '18,00 € net/m²';
  const POOLS = {
    'pool-abyss': { title:'Pool Surfaces — Abyss', refs:[['Tikal','2071517'],['Port Royal','2071510'],['Atlantis','2071590'],['Thonis','2071512']] },
    'pool-acqua': { title:'Pool Surfaces — Acqua', refs:[['Light','04A1510'],['River','04A1530'],['Deep','04A1520'],['Cobalt','04A1540']] },
    'pool-greek-isles': { title:'Pool Surfaces — Greek Isles', refs:[['Crete','2101580']] },
    'pool-italian-slate': { title:'Pool Surfaces — Italian Slate', refs:[['Naples','2091540'],['Firenze','2091511']] },
    'pool-lakes': { title:'Pool Surfaces — Lakes', refs:[['Shasta','LAKSHA6'],['Tahoe','LAKTAH6']] },
    'pool-mare': { title:'Pool Surfaces — Mare', refs:[['Viridus','2151590'],['Altum','2151515'],['Caeles','2151510']] },
    'pool-nevada': { title:'Pool Surfaces — Nevada', refs:[['Mohave','NEMOH66'],['Carson','NECAR66'],['Vegas','NEVEG66'],['Reno','NEREN66']] },
    'pool-pacific': { title:'Pool Surfaces — Pacific', refs:[['Japan','04B1510'],['Mex','04B1520'],['Australia','04B1530']] },
    'pool-quantum': { title:'Pool Surfaces — Quantum', refs:[['Prism','04LBN02'],['Vector','04LBN03'],['Nova','04LBN01']] },
    'pool-sea-breeze': { title:'Pool Surfaces — Sea Breeze', refs:[['Sky','2011570'],['Teal','2011590']] },
    'pool-seychelles': { title:'Pool Surfaces — Seychelles', refs:[['Original','04C1510'],['Blue','04C1530'],['Cobalt','04C1540'],['Light','04C1550'],['Pearl','04C1520']] },
    'pool-twelfth-night': { title:'Pool Surfaces — Twelfth Night', refs:[['Orsino','NETN615'],['Viola','NETN639']] }
  };

  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function hasEliosAccess() {
    try {
      const session = JSON.parse(sessionStorage.getItem('lrfProSession') || 'null');
      if (!session || !Array.isArray(session.partenaires)) return false;
      return session.partenaires.some(p => ['elios','eliosceramica'].includes(norm(p)));
    } catch (_) { return false; }
  }

  function injectStyles() {
    if (document.getElementById('lrf-pool-integrated-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-pool-integrated-style';
    style.textContent = `
      .pool-card-meta{margin-top:12px;padding-top:11px;border-top:1px solid #e7dfd1;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
      .pool-card-meta .pool-format{font-size:.72rem;font-weight:900;color:#75694f;text-transform:uppercase;letter-spacing:.04em}
      .pool-card-meta .pool-price{font-size:.78rem;font-weight:950;color:#17623a;background:#edf8f1;border:1px solid #c5dfcf;border-radius:999px;padding:6px 9px}
      .pool-card-meta .pool-price.locked{color:#765f22;background:#fff7dc;border-color:#ead78f}
      .pool-card-hint{width:100%;font-size:.68rem;color:#81786b}
      .pool-stock-section{margin-top:20px;padding-top:18px;border-top:1px solid #e4ded2}
      .pool-stock-section h4{margin:0 0 7px}.pool-stock-lead{margin:0 0 12px!important;color:#6e706d;font-size:.82rem}
      .pool-stock-table-wrap{overflow:auto;border:1px solid #e3ddd1;border-radius:12px}
      .pool-stock-table{width:100%;border-collapse:collapse;min-width:620px;background:#fff}
      .pool-stock-table th,.pool-stock-table td{padding:10px 11px;border-bottom:1px solid #eee9e0;text-align:left;vertical-align:middle;font-size:.8rem}
      .pool-stock-table th{background:#f7f4ee;color:#746b5b;font-size:.68rem;text-transform:uppercase;letter-spacing:.04em}
      .pool-stock-table tr:last-child td{border-bottom:0}
      .pool-ref{font-family:Consolas,monospace;font-weight:900;color:#1a2530}
      .pool-price-ok{font-weight:950;color:#17623a;white-space:nowrap}.pool-price-lock{color:#80651f;font-weight:800;white-space:nowrap}
      .pool-stock-btn{border:0;border-radius:9px;padding:8px 10px;background:#17623a;color:#fff;font-weight:900;font-size:.74rem;cursor:pointer;white-space:nowrap}
      .pool-stock-btn:hover{background:#104d2d}.pool-stock-btn:disabled{opacity:.55;cursor:wait}
      .pool-stock-result{font-weight:900;color:#17623a}.pool-stock-result.zero{color:#9b3732}.pool-stock-error{color:#9b3732;font-weight:800}.pool-production{display:block;margin-top:3px;color:#a96813;font-size:.7rem;font-weight:850}
      .pool-packaging{margin-top:9px!important;font-size:.72rem;color:#777b77}
      @media(max-width:700px){.pool-stock-table-wrap{margin-left:-2px;margin-right:-2px}.pool-card-meta{align-items:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function removePoolShortcut() {
    document.querySelectorAll('#insp-categories [data-pool-shortcut]').forEach(el => el.remove());
  }

  function enhanceCards() {
    const allowed = hasEliosAccess();
    document.querySelectorAll('#partner-products [data-id^="elios-pool-"]').forEach(card => {
      const slug = String(card.dataset.id || '').replace(/^elios-/, '');
      if (!POOLS[slug]) return;
      const body = card.querySelector('.body');
      if (!body || body.querySelector('.pool-card-meta')) return;
      const meta = document.createElement('div');
      meta.className = 'pool-card-meta';
      meta.innerHTML = `<span class="pool-format">Pool Surface · 15×15</span><span class="pool-price${allowed?'':' locked'}">${allowed?PRICE:'🔒 Tarif PRO'}</span><span class="pool-card-hint">Références et disponibilité usine dans la fiche produit</span>`;
      body.appendChild(meta);
    });
  }

  function poolFromModal(box) {
    const title = box.querySelector('h2')?.textContent?.trim() || '';
    return Object.entries(POOLS).find(([, data]) => data.title === title) || null;
  }

  function stockUnit(unit) {
    const u = String(unit || '').toUpperCase();
    if (u === 'MQ' || u === 'M2' || u === 'M²') return 'm²';
    if (u === 'PZ' || u === 'PCS' || u === 'PCE') return 'pièces';
    return u || 'm²';
  }

  async function fetchStock(button, slug, ref) {
    if (!hasEliosAccess()) return;
    const cell = button.closest('td');
    button.disabled = true;
    button.textContent = '⌛ Recherche…';
    try {
      const response = await fetch(`${STOCK_API}?collection=${encodeURIComponent(slug)}&ref=${encodeURIComponent(ref)}`, { cache:'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !data?.product) throw new Error(data?.error || 'Stock indisponible');
      const stock = Number(data.product.stock || 0);
      const prod = Number(data.product.production || 0);
      const unit = stockUnit(data.product.stockUnit);
      const prodUnit = stockUnit(data.product.productionUnit || data.product.stockUnit);
      cell.innerHTML = `<span class="pool-stock-result${stock<=0?' zero':''}">${stock.toLocaleString('fr-FR',{maximumFractionDigits:2})} ${esc(unit)}</span>${prod>0?`<span class="pool-production">Production prévue : +${prod.toLocaleString('fr-FR',{maximumFractionDigits:2})} ${esc(prodUnit)}</span>`:'<span class="pool-production">Aucune production prévue</span>'}`;
    } catch (error) {
      cell.innerHTML = `<span class="pool-stock-error">Indisponible pour le moment</span><br><button class="pool-stock-btn" type="button" data-pool-stock="1" data-slug="${esc(slug)}" data-ref="${esc(ref)}">Réessayer</button>`;
    }
  }

  function enhanceModal() {
    const box = document.getElementById('product-modal-v2-card');
    if (!box || box.querySelector('.pool-stock-section')) return;
    const hit = poolFromModal(box);
    if (!hit) return;
    const [slug, pool] = hit;
    const info = box.querySelector('.modal-v2-info');
    if (!info) return;
    const allowed = hasEliosAccess();
    const section = document.createElement('section');
    section.className = 'pool-stock-section';
    section.innerHTML = `
      <h4>Références 15×15 & disponibilité usine</h4>
      <p class="pool-stock-lead">Toutes les couleurs Pool Surfaces de cette collection sont regroupées ici avec leur code article, tarif et contrôle de stock.</p>
      <div class="pool-stock-table-wrap"><table class="pool-stock-table">
        <thead><tr><th>Couleur</th><th>Référence</th><th>Tarif PRO</th><th>Disponibilité</th></tr></thead>
        <tbody>${pool.refs.map(([color,ref]) => `<tr><td><strong>${esc(color)}</strong></td><td><span class="pool-ref">${esc(ref)}</span></td><td>${allowed?`<span class="pool-price-ok">${PRICE}</span>`:'<span class="pool-price-lock">🔒 Accès PRO</span>'}</td><td>${allowed?`<button class="pool-stock-btn" type="button" data-pool-stock="1" data-slug="${esc(slug)}" data-ref="${esc(ref)}">Voir le stock</button>`:'<span class="pool-price-lock">🔒 Accès PRO</span>'}</td></tr>`).join('')}</tbody>
      </table></div>
      <p class="pool-packaging">15×15 cm · 56 pièces/carton · 1,26 m²/carton · contrôle de disponibilité en direct auprès d’ELIOS.</p>`;
    info.appendChild(section);
  }

  function install() {
    injectStyles();
    removePoolShortcut();
    enhanceCards();
    enhanceModal();

    const categories = document.getElementById('insp-categories');
    if (categories && !categories.dataset.poolIntegratedObserver) {
      categories.dataset.poolIntegratedObserver = '1';
      new MutationObserver(removePoolShortcut).observe(categories, { childList:true, subtree:false });
    }
    const grid = document.getElementById('partner-products');
    if (grid && !grid.dataset.poolIntegratedObserver) {
      grid.dataset.poolIntegratedObserver = '1';
      new MutationObserver(enhanceCards).observe(grid, { childList:true, subtree:true });
    }
    const modal = document.getElementById('product-modal-v2-card');
    if (modal && !modal.dataset.poolIntegratedObserver) {
      modal.dataset.poolIntegratedObserver = '1';
      new MutationObserver(enhanceModal).observe(modal, { childList:true, subtree:true });
    }
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-pool-stock="1"]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      fetchStock(button, button.dataset.slug, button.dataset.ref);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(install, 0), { once:true });
  else setTimeout(install, 0);
})();
