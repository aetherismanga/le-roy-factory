(() => {
  'use strict';
  if (window.__LRF_VIEW_ORDER_V2__) return;
  window.__LRF_VIEW_ORDER_V2__ = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const fr = (v, d = 2) => Number(v || 0).toLocaleString('fr-FR', {minimumFractionDigits:d, maximumFractionDigits:d});
  const session = () => window.LRF_PRO_SESSION?.read?.() || (() => { try { return JSON.parse(sessionStorage.getItem('lrfProSession') || 'null'); } catch { return null; } })();

  const getData = () => (Array.isArray(window.VIEW_CATALOGUE) ? window.VIEW_CATALOGUE : []).filter(p => {
    const name = norm(p?.name);
    const collection = norm(p?.collection);
    return name !== 'lux' && name !== 'rovereforte' && !collection.includes('ilegni');
  });

  let currentProduct = null;
  let mode = 'availability';
  let lines = [];
  let nextLineId = 1;

  function installStyle() {
    if ($('#lrf-view-order-v2-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-view-order-v2-style';
    style.textContent = `
      .view-order-v2{position:fixed;inset:0;z-index:30000;display:none;background:rgba(8,10,11,.72);backdrop-filter:blur(4px);padding:14px;box-sizing:border-box;overflow:auto}
      .view-order-v2.open{display:block}
      .view-order-shell{width:min(1120px,100%);margin:18px auto;background:#fbfaf7;border:1px solid #d8c99b;border-radius:22px;box-shadow:0 28px 90px rgba(0,0,0,.36);overflow:hidden}
      .view-order-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:22px 24px;background:#111;color:#fff;border-bottom:3px solid #d4af37}
      .view-order-head .eyebrow{display:block;color:#d4af37;font-size:.72rem;font-weight:950;letter-spacing:.12em;text-transform:uppercase;margin-bottom:5px}
      .view-order-head h2{margin:0;font-size:clamp(1.35rem,3vw,2rem);line-height:1.1}
      .view-order-head p{margin:7px 0 0;color:#d9d6cf;font-size:.86rem;line-height:1.4}
      .view-order-close{flex:0 0 auto;width:44px;height:44px;border:1px solid #d4af37;border-radius:50%;background:#000;color:#fff;font-size:1.6rem;cursor:pointer}
      .view-order-body{padding:20px 22px 24px}
      .view-order-notice{padding:11px 13px;border:1px solid #a9d4b9;border-radius:12px;background:#effaf3;color:#28573d;font-size:.82rem;margin-bottom:16px}
      .view-order-lines{display:grid;gap:13px}
      .view-order-line{position:relative;border:1px solid #ded8cc;border-radius:15px;background:#fff;padding:14px}
      .view-order-line-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:11px}
      .view-order-line-head strong{font-size:.9rem;color:#27241f}
      .view-order-remove{border:1px solid #e1c6c0;background:#fff7f5;color:#9b3326;border-radius:8px;padding:7px 10px;font-weight:800;cursor:pointer}
      .view-order-grid{display:grid;grid-template-columns:1.3fr 1.2fr .9fr .8fr;gap:10px}
      .view-order-field{display:flex;flex-direction:column;gap:5px;min-width:0}
      .view-order-field label{font-size:.68rem;color:#6a645b;font-weight:900;text-transform:uppercase;letter-spacing:.03em}
      .view-order-field input,.view-order-field select,.view-order-contact input,.view-order-contact textarea{width:100%;box-sizing:border-box;border:1px solid #d8d0c4;border-radius:9px;background:#fff;padding:10px 11px;font:inherit;min-width:0}
      .view-order-field input[readonly]{background:#f5f2ed;color:#555048}
      .view-order-calc{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:2px}
      .view-order-stat{background:#f5f2eb;border-radius:10px;padding:10px 11px;min-width:0}
      .view-order-stat span{display:block;color:#777066;font-size:.66rem;font-weight:850;text-transform:uppercase}
      .view-order-stat strong{display:block;margin-top:3px;color:#17653d;font-size:.9rem;overflow-wrap:anywhere}
      .view-order-add{margin-top:13px;border:1px solid #b99526;background:#fff;color:#6d5410;border-radius:10px;padding:10px 14px;font-weight:950;cursor:pointer}
      .view-order-total{margin:18px 0 0;padding:14px 16px;border:1px solid #d8c99b;border-radius:14px;background:#fffdf6;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      .view-order-total span{display:block;font-size:.68rem;color:#786d55;font-weight:900;text-transform:uppercase}
      .view-order-total strong{display:block;margin-top:3px;font-size:1.05rem;color:#171612}
      .view-order-contact{margin-top:18px;padding-top:18px;border-top:1px solid #e3ddd2;display:grid;grid-template-columns:1fr 1fr;gap:11px}
      .view-order-contact .full{grid-column:1/-1}
      .view-order-contact label{display:block;margin-bottom:5px;font-size:.7rem;color:#625c53;font-weight:900}
      .view-order-contact textarea{min-height:88px;resize:vertical}
      .view-order-routing{grid-column:1/-1;padding:10px 12px;border-radius:10px;background:#f2efe8;color:#575149;font-size:.76rem;line-height:1.45}
      .view-order-routing strong{color:#222}
      .view-order-submit{grid-column:1/-1;border:1px solid #176c40;background:#176c40;color:#fff;border-radius:11px;padding:13px 16px;font-weight:950;font-size:1rem;cursor:pointer}
      .view-order-error{grid-column:1/-1;display:none;padding:9px 11px;border-radius:9px;background:#fff1ef;border:1px solid #efc2ba;color:#9b3326;font-size:.78rem;font-weight:800}
      .view-order-error.show{display:block}
      @media(max-width:850px){
        .view-order-v2{padding:0;background:#fbfaf7}
        .view-order-shell{margin:0;width:100%;min-height:100dvh;border:0;border-radius:0;box-shadow:none}
        .view-order-head{position:sticky;top:0;z-index:5;padding:16px 15px}
        .view-order-body{padding:14px 12px 20px}
        .view-order-grid{grid-template-columns:1fr 1fr}
        .view-order-calc{grid-template-columns:1fr 1fr}
        .view-order-contact{grid-template-columns:1fr}
        .view-order-contact .full,.view-order-routing,.view-order-submit,.view-order-error{grid-column:auto}
        .view-order-total{grid-template-columns:1fr 1fr}
        .view-order-total>div:last-child{grid-column:1/-1}
      }
      @media(max-width:520px){
        .view-order-grid{grid-template-columns:1fr}
        .view-order-calc{grid-template-columns:1fr 1fr}
        .view-order-line{padding:12px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDialog() {
    installStyle();
    if ($('#view-order-v2')) return;
    const d = document.createElement('div');
    d.id = 'view-order-v2';
    d.className = 'view-order-v2';
    d.innerHTML = `
      <div class="view-order-shell" role="dialog" aria-modal="true" aria-labelledby="view-order-title">
        <header class="view-order-head">
          <div><span class="eyebrow">VIEW CERAMICA</span><h2 id="view-order-title">Demande de disponibilité</h2><p id="view-order-subtitle">Ajoutez les produits et indiquez vos besoins en m².</p></div>
          <button class="view-order-close" type="button" aria-label="Fermer">×</button>
        </header>
        <div class="view-order-body">
          <div class="view-order-notice">Aucun stock VIEW en temps réel n’est affiché. Le calcul transforme votre besoin en <strong>cartons complets</strong> et affiche automatiquement le <strong>m² réellement commandé</strong>.</div>
          <div id="view-order-lines" class="view-order-lines"></div>
          <button id="view-order-add" class="view-order-add" type="button">＋ Ajouter un produit VIEW</button>
          <div class="view-order-total">
            <div><span>Besoin total</span><strong id="view-order-total-need">0,00 m²</strong></div>
            <div><span>Total cartons</span><strong id="view-order-total-boxes">0</strong></div>
            <div><span>M² réels commandés</span><strong id="view-order-total-real">0,00 m²</strong></div>
          </div>
          <form id="view-order-form" class="view-order-contact">
            <div><label>Société</label><input id="view-order-company" required autocomplete="organization"></div>
            <div><label>Contact</label><input id="view-order-contact" required autocomplete="name"></div>
            <div><label>E-mail</label><input id="view-order-email" type="email" autocomplete="email"></div>
            <div><label>Téléphone</label><input id="view-order-phone" autocomplete="tel"></div>
            <div class="full"><label>Note / chantier / délai souhaité</label><textarea id="view-order-note" placeholder="Informations complémentaires…"></textarea></div>
            <div class="view-order-routing"><strong>Destinataire VIEW :</strong> Maura — maura@viewceramiche.com<br><strong>Copie :</strong> jerome@leroyfactory.fr · coryne@leroyfactory.fr</div>
            <div id="view-order-error" class="view-order-error"></div>
            <button id="view-order-submit" class="view-order-submit" type="submit">Préparer la demande</button>
          </form>
        </div>
      </div>`;
    document.body.appendChild(d);
    $('.view-order-close', d).addEventListener('click', closeDialog);
    d.addEventListener('click', e => { if (e.target === d) closeDialog(); });
    $('#view-order-add', d).addEventListener('click', () => addLine());
    $('#view-order-lines', d).addEventListener('change', handleLineEvent);
    $('#view-order-lines', d).addEventListener('input', handleQtyInput);
    $('#view-order-lines', d).addEventListener('click', e => {
      const btn = e.target.closest('[data-view-order-remove]');
      if (!btn) return;
      const id = Number(btn.dataset.viewOrderRemove);
      lines = lines.filter(x => x.id !== id);
      if (!lines.length) addLine(currentProduct);
      else renderLines();
    });
    $('#view-order-form', d).addEventListener('submit', submitRequest);
  }

  function productById(id) {
    return getData().find(p => String(p.id) === String(id));
  }

  function variantOf(line) {
    const p = productById(line.productId);
    return p?.variants?.[line.variantIndex] || null;
  }

  function colorsOf(product, variant) {
    const colors = variant?.colors?.length ? variant.colors : (product?.colors || []);
    return [...new Set(colors.filter(Boolean))];
  }

  function normalizeLine(line) {
    const data = getData();
    let p = productById(line.productId) || data[0] || null;
    if (!p) return line;
    line.productId = p.id;
    if (!Number.isInteger(line.variantIndex) || !p.variants?.[line.variantIndex]) line.variantIndex = 0;
    const v = p.variants?.[line.variantIndex] || null;
    const colors = colorsOf(p, v);
    if (!colors.includes(line.color)) line.color = colors[0] || '';
    line.qty = Number(line.qty || 0);
    return line;
  }

  function addLine(product = null) {
    const data = getData();
    const p = product && data.some(x => x.id === product.id) ? product : (data[0] || null);
    if (!p) return;
    lines.push(normalizeLine({id:nextLineId++, productId:p.id, variantIndex:0, color:'', qty:0}));
    renderLines();
  }

  function lineCalculation(line) {
    const v = variantOf(line);
    const pack = v?.pack || null;
    const need = Math.max(0, Number(line.qty || 0));
    if (pack?.m2Box > 0) {
      const boxes = need > 0 ? Math.ceil((need / Number(pack.m2Box)) - 1e-10) : 0;
      return {need, boxes, real:boxes * Number(pack.m2Box), m2Box:Number(pack.m2Box), pcsBox:Number(pack.pcsBox || 0)};
    }
    return {need, boxes:null, real:need, m2Box:null, pcsBox:null};
  }

  function renderLines() {
    const host = $('#view-order-lines');
    if (!host) return;
    const data = getData();
    lines = lines.map(normalizeLine);
    host.innerHTML = lines.map((line, index) => {
      const p = productById(line.productId);
      const variants = p?.variants || [];
      const v = variants[line.variantIndex] || variants[0] || {};
      const colors = colorsOf(p, v);
      const calc = lineCalculation(line);
      const ref = v.refs?.[line.color] || '';
      return `
        <section class="view-order-line" data-view-order-line="${line.id}">
          <div class="view-order-line-head"><strong>Produit ${index + 1}</strong>${lines.length > 1 ? `<button class="view-order-remove" type="button" data-view-order-remove="${line.id}">Supprimer</button>` : ''}</div>
          <div class="view-order-grid">
            <div class="view-order-field"><label>Produit / collection</label><select data-field="product">${data.map(x => `<option value="${esc(x.id)}"${x.id === line.productId ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
            <div class="view-order-field"><label>Format / finition</label><select data-field="variant">${variants.map((r,i) => `<option value="${i}"${i === line.variantIndex ? ' selected' : ''}>${esc(r.format || '—')} · ${esc(r.thickness || '')} · ${esc(r.finish || '')}</option>`).join('')}</select></div>
            <div class="view-order-field"><label>Couleur</label><select data-field="color">${colors.map(c => `<option value="${esc(c)}"${c === line.color ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
            <div class="view-order-field"><label>Besoin (m²)</label><input data-field="qty" type="number" min="0" step="0.01" inputmode="decimal" value="${line.qty > 0 ? esc(line.qty) : ''}" placeholder="Ex. 42,50"></div>
            <div class="view-order-field" style="grid-column:1/-1"><label>Référence VIEW</label><input readonly value="${esc(ref || 'Référence à confirmer')}"></div>
            <div class="view-order-calc">
              <div class="view-order-stat"><span>Boîtage</span><strong>${calc.m2Box ? `${fr(calc.m2Box)} m²/carton` : 'À confirmer'}</strong></div>
              <div class="view-order-stat"><span>Pièces / carton</span><strong>${calc.pcsBox ? fr(calc.pcsBox,0) : '—'}</strong></div>
              <div class="view-order-stat"><span>Cartons calculés</span><strong>${calc.boxes == null ? 'À confirmer' : calc.boxes}</strong></div>
              <div class="view-order-stat"><span>M² réels</span><strong>${fr(calc.real)} m²</strong></div>
            </div>
          </div>
        </section>`;
    }).join('');
    updateTotals();
  }

  function updateRowCalc(row, line) {
    const calc = lineCalculation(line);
    const values = $$('.view-order-stat strong', row);
    if (values[2]) values[2].textContent = calc.boxes == null ? 'À confirmer' : String(calc.boxes);
    if (values[3]) values[3].textContent = `${fr(calc.real)} m²`;
  }

  function handleQtyInput(e) {
    if (e.target?.dataset?.field !== 'qty') return;
    const row = e.target.closest('[data-view-order-line]');
    if (!row) return;
    const line = lines.find(x => x.id === Number(row.dataset.viewOrderLine));
    if (!line) return;
    line.qty = Number(e.target.value || 0);
    updateRowCalc(row, line);
    updateTotals();
  }

  function handleLineEvent(e) {
    const el = e.target.closest('[data-field]');
    const row = e.target.closest('[data-view-order-line]');
    if (!el || !row) return;
    const line = lines.find(x => x.id === Number(row.dataset.viewOrderLine));
    if (!line) return;
    const field = el.dataset.field;
    if (field === 'product') {
      line.productId = el.value;
      line.variantIndex = 0;
      line.color = '';
      renderLines();
      return;
    }
    if (field === 'variant') {
      line.variantIndex = Number(el.value || 0);
      line.color = '';
      renderLines();
      return;
    }
    if (field === 'color') {
      line.color = el.value;
      renderLines();
      return;
    }
    if (field === 'qty') {
      line.qty = Number(el.value || 0);
      updateRowCalc(row, line);
      updateTotals();
    }
  }

  function updateTotals() {
    const calcs = lines.map(lineCalculation);
    const need = calcs.reduce((a,c) => a + c.need, 0);
    const knownBoxes = calcs.filter(c => c.boxes != null).reduce((a,c) => a + c.boxes, 0);
    const hasUnknown = calcs.some(c => c.boxes == null && c.need > 0);
    const real = calcs.reduce((a,c) => a + c.real, 0);
    const needEl = $('#view-order-total-need'), boxEl = $('#view-order-total-boxes'), realEl = $('#view-order-total-real');
    if (needEl) needEl.textContent = `${fr(need)} m²`;
    if (boxEl) boxEl.textContent = `${knownBoxes}${hasUnknown ? ' + à confirmer' : ''}`;
    if (realEl) realEl.textContent = `${fr(real)} m²`;
  }

  function inferCurrentProduct() {
    if (currentProduct && getData().some(p => p.id === currentProduct.id)) return currentProduct;
    const title = $('.view-safe-info h2')?.textContent || $('.modal-v2-info h2')?.textContent || '';
    return getData().find(p => norm(p.name) === norm(title)) || null;
  }

  function openDialog(type, product = null) {
    currentProduct = product || inferCurrentProduct();
    ensureDialog();
    mode = type === 'order' ? 'order' : 'availability';
    lines = [];
    nextLineId = 1;
    addLine(currentProduct || getData()[0]);
    const s = session() || {};
    $('#view-order-title').textContent = mode === 'order' ? 'Commande VIEW' : 'Demande de disponibilité VIEW';
    $('#view-order-subtitle').textContent = mode === 'order'
      ? 'Composez la commande : plusieurs produits peuvent être ajoutés dans la même demande.'
      : 'Sélectionnez les références à vérifier : plusieurs produits peuvent être ajoutés dans la même demande.';
    $('#view-order-submit').textContent = mode === 'order' ? 'Préparer la commande VIEW' : 'Préparer la demande de disponibilité';
    $('#view-order-company').value = s.societe || s.company || '';
    $('#view-order-contact').value = s.name || s.contact || '';
    $('#view-order-email').value = s.email || '';
    $('#view-order-phone').value = s.phone || s.telephone || '';
    $('#view-order-note').value = '';
    $('#view-order-error').classList.remove('show');
    $('#view-order-v2').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDialog() {
    $('#view-order-v2')?.classList.remove('open');
    document.body.style.overflow = $('#product-modal-v2')?.classList.contains('open') ? 'hidden' : '';
  }

  function submitRequest(e) {
    e.preventDefault();
    const error = $('#view-order-error');
    const company = $('#view-order-company').value.trim();
    const contact = $('#view-order-contact').value.trim();
    const email = $('#view-order-email').value.trim();
    const phone = $('#view-order-phone').value.trim();
    const note = $('#view-order-note').value.trim();

    const validLines = lines.filter(l => Number(l.qty || 0) > 0);
    if (!validLines.length) {
      error.textContent = 'Indiquez une quantité en m² pour au moins un produit.';
      error.classList.add('show');
      return;
    }
    error.classList.remove('show');

    const blocks = validLines.map((line, i) => {
      const p = productById(line.productId);
      const v = variantOf(line) || {};
      const calc = lineCalculation(line);
      const ref = v.refs?.[line.color] || 'à confirmer';
      return [
        `PRODUIT ${i + 1} — ${p?.name || 'VIEW'}`,
        `Référence : ${ref}`,
        `Format : ${v.format || '—'}`,
        `Épaisseur : ${v.thickness || '—'}`,
        `Finition : ${v.finish || '—'}`,
        `Couleur : ${line.color || '—'}`,
        `Besoin : ${fr(calc.need)} m²`,
        calc.m2Box ? `Conditionnement : ${fr(calc.m2Box)} m²/carton${calc.pcsBox ? ` · ${fr(calc.pcsBox,0)} pcs/carton` : ''}` : 'Conditionnement : à confirmer',
        calc.boxes != null ? `Quantité calculée : ${calc.boxes} carton${calc.boxes > 1 ? 's' : ''} = ${fr(calc.real)} m²` : `Quantité : ${fr(calc.real)} m² — boîtage à confirmer`
      ].join('\n');
    });

    const calcs = validLines.map(lineCalculation);
    const totalNeed = calcs.reduce((a,c) => a + c.need, 0);
    const totalReal = calcs.reduce((a,c) => a + c.real, 0);
    const totalBoxes = calcs.filter(c => c.boxes != null).reduce((a,c) => a + c.boxes, 0);
    const unknown = calcs.some(c => c.boxes == null);
    const s = session() || {};
    const isOrder = mode === 'order';
    const subject = `${isOrder ? '[COMMANDE VIEW]' : '[DISPONIBILITÉ VIEW]'} ${company || contact || 'LE ROY FACTORY'} — ${validLines.length} produit${validLines.length > 1 ? 's' : ''}`;
    const body = [
      isOrder ? 'COMMANDE VIEW CERAMICA' : 'DEMANDE DE DISPONIBILITÉ VIEW CERAMICA',
      '',
      ...blocks.flatMap((b, i) => [b, i < blocks.length - 1 ? '\n------------------------------' : '']),
      '',
      'RÉCAPITULATIF',
      `Besoin total : ${fr(totalNeed)} m²`,
      `Total cartons calculés : ${totalBoxes}${unknown ? ' + conditionnement(s) à confirmer' : ''}`,
      `M² réels calculés : ${fr(totalReal)} m²`,
      '',
      'CLIENT / CONTACT',
      `Société : ${company || '—'}`,
      `Contact : ${contact || '—'}`,
      `E-mail : ${email || '—'}`,
      `Téléphone : ${phone || '—'}`,
      `Code client LRF : ${s.codeClient || '—'}`,
      note ? `Note : ${note}` : '',
      '',
      'Merci de confirmer la disponibilité, les références et le conditionnement avant validation définitive.'
    ].filter(v => v !== '').join('\n');

    const to = 'maura@viewceramiche.com';
    const cc = 'jerome@leroyfactory.fr,coryne@leroyfactory.fr';
    window.location.href = `mailto:${to}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  document.addEventListener('click', e => {
    const card = e.target.closest?.('[data-view-safe-id],[data-view-id]');
    if (card) {
      const id = card.dataset.viewSafeId || card.dataset.viewId || '';
      const title = $('h3', card)?.textContent || '';
      currentProduct = productById(id) || getData().find(p => norm(p.name) === norm(title)) || currentProduct;
      return;
    }

    const action = e.target.closest?.('[data-view-safe-action],[data-view-action]');
    if (!action) return;
    const type = action.dataset.viewSafeAction || action.dataset.viewAction || 'availability';
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openDialog(type);
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#view-order-v2')?.classList.contains('open')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeDialog();
    }
  }, true);
})();