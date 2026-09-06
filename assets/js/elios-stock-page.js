(() => {
  'use strict';

  const STOCK_API = 'https://us-central1-le-roy-factory.cloudfunctions.net/eliosStock';
  const ORDER_API = 'https://us-central1-le-roy-factory.cloudfunctions.net/eliosOrder';
  const source = window.ELIOS_ROMA_STOCK_DATA || { collection:'ROMA', colors:[], rows:[] };
  const rows = (source.rows || []).map((row, index) => ({ ...row, _key: row.ref || `${row.color}-${row.kind}-${row.format}-${index}` }));

  const body = document.getElementById('stock-body');
  const empty = document.getElementById('stock-empty');
  const search = document.getElementById('stock-search');
  const colorFilter = document.getElementById('stock-color');
  const status = document.getElementById('stock-status');
  const statusText = document.getElementById('status-text');
  const title = document.getElementById('collection-title');
  const count = document.getElementById('stock-count');
  const categoryBar = document.getElementById('category-filters');
  let activeCategory = '';
  let orderRow = null;

  if (title) title.textContent = source.collection || 'ROMA';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const fr = (value, digits = 2) => Number(value).toLocaleString('fr-FR', { maximumFractionDigits:digits, minimumFractionDigits:0 });
  const isNum = value => value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value));
  const show = (value, suffix = '', digits = 2) => isNum(value) ? `${fr(value, digits)}${suffix}` : '—';

  function unitLabel(unit, value) {
    const u = String(unit || 'MQ').toUpperCase();
    if (u === 'MQ' || u === 'M2' || u === 'M²') return 'm²';
    if (u === 'PZ' || u === 'PCE' || u === 'PCS') return Number(value) === 1 ? 'pièce' : 'pièces';
    if (u === 'ML' || u === 'M') return 'ml';
    return u;
  }

  function categoryOf(row) {
    const kind = norm(row.kind);
    if (kind.includes('mosa')) return 'mosaique';
    if (kind.includes('plinthe')) return 'plinthes';
    if (kind.includes('piece speciale')) return 'speciales';
    if (kind.includes('modulo')) return 'module';
    return 'carreaux';
  }

  function orderInfo(row) {
    if (row.orderUnit) {
      const perBox = Number(row.orderPerBox || 0);
      return { unit:String(row.orderUnit).toUpperCase(), perBox:perBox > 0 ? perBox : 1 };
    }
    if (categoryOf(row) === 'plinthes' || categoryOf(row) === 'speciales') {
      return { unit:'PZ', perBox:Math.max(1, Number(row.pcsBox || 1)) };
    }
    if (isNum(row.sqmBox) && Number(row.sqmBox) > 0) return { unit:'MQ', perBox:Number(row.sqmBox) };
    return { unit:'PZ', perBox:Math.max(1, Number(row.pcsBox || 1)) };
  }

  function installFilters() {
    if (colorFilter) {
      colorFilter.innerHTML = '<option value="Tous">Toutes les couleurs</option>' +
        (source.colors || []).map(color => `<option value="${esc(color)}">${esc(color)}</option>`).join('');
    }
    categoryBar?.querySelectorAll('[data-category]').forEach(button => {
      button.addEventListener('click', () => {
        const category = button.dataset.category || '';
        activeCategory = activeCategory === category ? '' : category;
        categoryBar.querySelectorAll('[data-category]').forEach(b => b.classList.toggle('active', b.dataset.category === activeCategory));
        render();
      });
    });
  }

  function packageCell(row) {
    const pieces = isNum(row.pcsBox) ? `${fr(row.pcsBox, 0)} pcs/carton` : '—';
    const sqm = isNum(row.sqmBox) ? `${fr(row.sqmBox, 3)} m²/carton` : '';
    return `<strong>${pieces}</strong>${sqm ? `<small>${sqm}</small>` : ''}`;
  }

  function paletteCell(row) {
    if (![row.boxesPal, row.sqmPal, row.kgPal].some(isNum)) return '<span class="muted">—</span>';
    const bits = [];
    if (isNum(row.boxesPal)) bits.push(`${fr(row.boxesPal,0)} cartons`);
    if (isNum(row.sqmPal)) bits.push(`${fr(row.sqmPal,2)} m²`);
    if (isNum(row.kgPal)) bits.push(`${fr(row.kgPal,0)} kg`);
    return bits.map((bit, i) => i === 0 ? `<strong>${esc(bit)}</strong>` : `<small>${esc(bit)}</small>`).join('');
  }

  function orderButton(row) {
    return `<button class="order-btn" type="button" data-order-key="${esc(row._key)}">Commander</button>`;
  }

  function stockCell(row) {
    if (row.orderOnly) {
      return `<span class="order-badge">Sur commande</span>${orderButton(row)}`;
    }
    if (row.loading) return '<button class="stock-btn loading" type="button" disabled><span class="hourglass">⌛</span> Recherche…</button>';
    if (row.error) {
      return `<span class="stock-error">Stock indisponible.</span><button class="stock-btn retry" type="button" data-stock-key="${esc(row._key)}">Réessayer</button>${orderButton(row)}`;
    }
    if (isNum(row.stock)) {
      const value = Number(row.stock);
      const production = isNum(row.production) ? Number(row.production) : 0;
      const stockUnit = unitLabel(row.stockUnit, value);
      const productionUnit = unitLabel(row.productionUnit || row.stockUnit, production);
      const when = row.updatedAt ? new Date(row.updatedAt).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '';
      return `<span class="stock-value ${value <= 0 ? 'zero' : ''}">${fr(value,2)} ${esc(stockUnit)}</span>` +
        (production > 0 ? `<span class="production">Production prévue : +${fr(production,2)} ${esc(productionUnit)}</span>` : '<span class="production none">Aucune production prévue</span>') +
        (when ? `<small class="stock-note">Actualisé à ${esc(when)}</small>` : '') +
        `<div class="stock-actions"><button class="stock-btn refresh-one" type="button" data-stock-key="${esc(row._key)}">↻ Actualiser</button>${orderButton(row)}</div>`;
    }
    return `<div class="stock-actions"><button class="stock-btn" type="button" data-stock-key="${esc(row._key)}">Voir le stock</button>${orderButton(row)}</div>`;
  }

  function matches(row) {
    const q = norm(search?.value);
    const color = colorFilter?.value || 'Tous';
    if (color !== 'Tous' && row.color !== color) return false;
    if (activeCategory && categoryOf(row) !== activeCategory) return false;
    if (!q) return true;
    return norm(`${row.ref} ${row.name} ${row.color} ${row.kind} ${row.format} ${row.finish}`).includes(q);
  }

  function render() {
    const filtered = rows.filter(matches);
    if (count) count.textContent = `${filtered.length} référence${filtered.length > 1 ? 's' : ''}`;
    if (!body) return;
    let html = '';
    let lastColor = '';
    for (const row of filtered) {
      if (row.color !== lastColor) {
        lastColor = row.color;
        html += `<tr class="color-row"><td colspan="7"><span>${esc(row.color)}</span></td></tr>`;
      }
      html += `<tr data-row-key="${esc(row._key)}">
        <td><span class="ref">${row.ref ? esc(row.ref) : '<span class="muted">Sur commande</span>'}</span></td>
        <td><strong>${esc(row.kind)}</strong><small>${esc(row.color)}</small></td>
        <td><strong>${esc(row.format)}</strong><small>${esc(row.finish || '')}</small></td>
        <td>${packageCell(row)}</td>
        <td>${show(row.kgBox, ' kg', 2)}</td>
        <td>${paletteCell(row)}</td>
        <td class="stock-cell">${stockCell(row)}</td>
      </tr>`;
    }
    body.innerHTML = html;
    if (empty) empty.hidden = filtered.length > 0;
  }

  function setStatus(message, mode = '') {
    if (!status || !statusText) return;
    if (!message) { status.hidden = true; return; }
    status.hidden = false;
    status.className = `status ${mode}`;
    statusText.textContent = message;
  }

  async function requestStock(key) {
    const row = rows.find(item => item._key === key);
    if (!row || !row.ref || row.orderOnly || row.loading) return;
    row.loading = true;
    row.error = '';
    render();
    setStatus(`Recherche du stock de ${row.ref}…`, 'working');
    try {
      const response = await fetch(`${STOCK_API}?collection=ROMA&ref=${encodeURIComponent(row.ref)}`, { cache:'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !data?.product) throw new Error(data?.error || `Erreur HTTP ${response.status}`);
      row.stock = Number(data.product.stock);
      row.stockUnit = data.product.stockUnit || 'MQ';
      row.production = Number(data.product.production || 0);
      row.productionUnit = data.product.productionUnit || row.stockUnit;
      row.updatedAt = data.updatedAt || new Date().toISOString();
      row.cached = Boolean(data.cached);
      row.telegramDescription = data.product.description || '';
      setStatus(`${row.ref} : stock actualisé.`, 'live');
    } catch (error) {
      row.error = 'Stock indisponible pour le moment.';
      setStatus(`Impossible de récupérer le stock de ${row.ref}.`, 'error');
    } finally {
      row.loading = false;
      render();
    }
  }

  function ensureOrderModal() {
    if (document.getElementById('order-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'order-overlay';
    overlay.className = 'order-overlay';
    overlay.innerHTML = `<div class="order-modal">
      <div class="order-head"><div><span class="kicker">COMMANDE USINE</span><h2 id="order-title">Commander</h2></div><button type="button" class="order-close" id="order-close">×</button></div>
      <div id="order-product" class="order-product"></div>
      <div class="order-grid">
        <div><label id="order-qty-label">Quantité souhaitée</label><input id="order-qty" type="number" min="0.01" step="0.01"></div>
        <div><label>Cartons complets</label><input id="order-boxes" type="number" readonly></div>
      </div>
      <div class="order-summary" id="order-summary"></div>
      <div class="order-grid">
        <div><label>Société *</label><input id="order-company" autocomplete="organization"></div>
        <div><label>Code client LRF</label><input id="order-code" placeholder="LRF-00000"></div>
        <div><label>Contact *</label><input id="order-contact" autocomplete="name"></div>
        <div><label>E-mail *</label><input id="order-email" type="email" autocomplete="email"></div>
        <div class="full"><label>Téléphone</label><input id="order-phone" autocomplete="tel"></div>
        <div class="full"><label>Note / précision</label><textarea id="order-note" placeholder="Référence chantier, délai souhaité, commentaire…"></textarea></div>
      </div>
      <div class="order-actions"><button type="button" class="order-cancel" id="order-cancel">Annuler</button><button type="button" class="order-send" id="order-send">Envoyer la commande</button></div>
      <div id="order-result" class="order-result" hidden></div>
    </div>`;
    document.body.appendChild(overlay);
    const close = () => { overlay.classList.remove('open'); orderRow = null; };
    document.getElementById('order-close').onclick = close;
    document.getElementById('order-cancel').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('order-qty').addEventListener('input', updateOrderCalc);
    document.getElementById('order-send').addEventListener('click', sendOrder);
  }

  function savedCustomer() {
    try { return JSON.parse(localStorage.getItem('lrfEliosOrderCustomer') || '{}') || {}; } catch (_) { return {}; }
  }
  function saveCustomer(data) {
    try { localStorage.setItem('lrfEliosOrderCustomer', JSON.stringify(data)); } catch (_) {}
  }

  function openOrder(key) {
    const row = rows.find(item => item._key === key);
    if (!row) return;
    ensureOrderModal();
    orderRow = row;
    const info = orderInfo(row);
    const label = unitLabel(info.unit, 2);
    document.getElementById('order-title').textContent = `Commander · ${row.color}`;
    document.getElementById('order-product').innerHTML = `<strong>${esc(row.ref || 'Pièce spéciale')} — ${esc(row.kind)}</strong><span>${esc(row.format)} · ${esc(row.finish || '')}</span><span>${fr(info.perBox,3)} ${esc(label)} par carton</span>`;
    document.getElementById('order-qty-label').textContent = `Quantité souhaitée (${label})`;
    const q = document.getElementById('order-qty');
    q.step = info.unit === 'PZ' ? '1' : '0.01';
    q.min = info.unit === 'PZ' ? '1' : '0.01';
    q.value = info.perBox;
    const c = savedCustomer();
    document.getElementById('order-company').value = c.societe || '';
    document.getElementById('order-code').value = c.codeClient || '';
    document.getElementById('order-contact').value = c.contact || '';
    document.getElementById('order-email').value = c.email || '';
    document.getElementById('order-phone').value = c.telephone || '';
    document.getElementById('order-note').value = '';
    document.getElementById('order-result').hidden = true;
    document.getElementById('order-send').disabled = false;
    document.getElementById('order-send').textContent = 'Envoyer la commande';
    updateOrderCalc();
    document.getElementById('order-overlay').classList.add('open');
  }

  function orderCalculation() {
    if (!orderRow) return null;
    const info = orderInfo(orderRow);
    const requested = Number(document.getElementById('order-qty')?.value || 0);
    if (!Number.isFinite(requested) || requested <= 0) return null;
    const boxes = Math.max(1, Math.ceil((requested - 1e-9) / info.perBox));
    const ordered = boxes * info.perBox;
    return { ...info, requested, boxes, ordered };
  }

  function updateOrderCalc() {
    const calc = orderCalculation();
    if (!calc) return;
    document.getElementById('order-boxes').value = calc.boxes;
    const unit = unitLabel(calc.unit, calc.ordered);
    document.getElementById('order-summary').innerHTML = `Commande arrondie au carton complet : <strong>${calc.boxes} carton${calc.boxes > 1 ? 's' : ''}</strong> = <strong>${fr(calc.ordered,3)} ${esc(unit)}</strong>.`;
  }

  async function sendOrder() {
    if (!orderRow) return;
    const calc = orderCalculation();
    const societe = document.getElementById('order-company').value.trim();
    const codeClient = document.getElementById('order-code').value.trim();
    const contact = document.getElementById('order-contact').value.trim();
    const email = document.getElementById('order-email').value.trim();
    const telephone = document.getElementById('order-phone').value.trim();
    const note = document.getElementById('order-note').value.trim();
    if (!calc) return alert('Indiquez une quantité valide.');
    if (!societe || !contact || !/^\S+@\S+\.\S+$/.test(email)) return alert('Société, contact et e-mail sont obligatoires.');
    const btn = document.getElementById('order-send');
    btn.disabled = true;
    btn.textContent = 'Envoi…';
    const result = document.getElementById('order-result');
    result.hidden = true;
    saveCustomer({societe,codeClient,contact,email,telephone});
    try {
      const response = await fetch(ORDER_API, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          ref:orderRow.ref || '', color:orderRow.color, kind:orderRow.kind, format:orderRow.format, finish:orderRow.finish,
          orderOnly:Boolean(orderRow.orderOnly), pcsBox:orderRow.pcsBox, sqmBox:orderRow.sqmBox,
          requestedQty:calc.requested, boxes:calc.boxes, orderQty:calc.ordered, orderUnit:calc.unit,
          societe, codeClient, contact, email, telephone, note,
          stock:isNum(orderRow.stock)?Number(orderRow.stock):null, stockUnit:orderRow.stockUnit || null
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Envoi impossible.');
      result.className = 'order-result success';
      result.innerHTML = `✓ Commande envoyée à l’usine et enregistrée dans le CRM.<br><small>Référence CRM : ${esc(data.requestId || '')}</small>`;
      result.hidden = false;
      btn.textContent = 'Commande envoyée ✓';
    } catch (error) {
      result.className = 'order-result error';
      result.textContent = error?.message || 'Impossible d’envoyer la commande.';
      result.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Réessayer l’envoi';
    }
  }

  body?.addEventListener('click', event => {
    const stockButton = event.target.closest('[data-stock-key]');
    if (stockButton) { requestStock(stockButton.dataset.stockKey); return; }
    const orderButtonEl = event.target.closest('[data-order-key]');
    if (orderButtonEl) openOrder(orderButtonEl.dataset.orderKey);
  });
  search?.addEventListener('input', render);
  colorFilter?.addEventListener('change', render);

  installFilters();
  render();
  setStatus('');
})();
