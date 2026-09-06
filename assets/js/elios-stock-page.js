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
  const cartButton = document.getElementById('order-cart-open');
  const cartCount = document.getElementById('order-cart-count');

  let activeCategory = '';
  const cart = new Map();
  let customerContext = null;
  let customerLoadPromise = null;
  let customerError = '';
  let sessionToken = '';

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
    if (row.orderUnit && isNum(row.orderPerBox) && Number(row.orderPerBox) > 0) {
      return { unit:String(row.orderUnit).toUpperCase(), perBox:Number(row.orderPerBox) };
    }
    if (isNum(row.sqmBox) && Number(row.sqmBox) > 0) return { unit:'MQ', perBox:Number(row.sqmBox) };
    return { unit:'PZ', perBox:Math.max(1, Number(row.pcsBox || 1)) };
  }

  function calculate(row, requestedRaw) {
    const info = orderInfo(row);
    let requested = Number(requestedRaw);
    if (!Number.isFinite(requested) || requested <= 0) return null;
    if (info.unit === 'PZ') requested = Math.ceil(requested);
    const boxes = Math.max(1, Math.ceil((requested - 1e-9) / info.perBox));
    const ordered = Number((boxes * info.perBox).toFixed(3));
    const pieces = isNum(row.pcsBox) ? boxes * Number(row.pcsBox) : null;
    return { ...info, requested, boxes, ordered, pieces };
  }

  function packagingText(row) {
    const info = orderInfo(row);
    const bits = [`1 carton = ${fr(info.perBox, 3)} ${unitLabel(info.unit, info.perBox)}`];
    if (isNum(row.pcsBox)) bits.push(`${fr(row.pcsBox,0)} pcs/carton`);
    return bits.join(' · ');
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
    const ml = String(row.orderUnit || '').toUpperCase() === 'ML' && isNum(row.orderPerBox) ? `${fr(row.orderPerBox,3)} ml/carton` : '';
    return `<strong>${pieces}</strong>${sqm ? `<small>${sqm}</small>` : ''}${ml ? `<small>${ml}</small>` : ''}`;
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
    const inCart = cart.has(row._key);
    return `<button class="order-btn${inCart?' in-cart':''}" type="button" data-order-key="${esc(row._key)}">${inCart?'✓ Dans le panier':'Commander'}</button>`;
  }

  function stockCell(row) {
    if (row.orderOnly) return `<span class="order-badge">Sur commande</span>${orderButton(row)}`;
    if (row.loading) return `<div class="stock-actions"><button class="stock-btn loading" type="button" disabled><span class="hourglass">⌛</span> Recherche…</button>${orderButton(row)}</div>`;
    if (row.error) return `<span class="stock-error">Stock indisponible.</span><div class="stock-actions"><button class="stock-btn retry" type="button" data-stock-key="${esc(row._key)}">Réessayer</button>${orderButton(row)}</div>`;
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
    row.loading = true; row.error = ''; render();
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
      setStatus(`${row.ref} : stock actualisé.`, 'live');
    } catch (error) {
      row.error = 'Stock indisponible pour le moment.';
      setStatus(`Impossible de récupérer le stock de ${row.ref}.`, 'error');
    } finally { row.loading = false; render(); }
  }

  function updateCartButton() {
    if (!cartButton || !cartCount) return;
    cartCount.textContent = String(cart.size);
    cartButton.hidden = cart.size === 0;
  }

  function ensureOrderModal() {
    if (document.getElementById('order-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'order-overlay';
    overlay.className = 'order-overlay';
    overlay.innerHTML = `<div class="order-modal">
      <div class="order-head"><div><span class="kicker">COMMANDE USINE</span><h2>Panier ELIOS</h2><p id="order-cart-subtitle" class="order-subtitle"></p></div><button type="button" class="order-close" id="order-close" aria-label="Fermer">×</button></div>
      <div id="order-customer" class="order-customer loading">Chargement de votre compte professionnel…</div>
      <div class="order-section-title"><strong>Références à commander</strong><span id="order-lines-count"></span></div>
      <div id="order-cart-list" class="order-cart-list"></div>
      <button type="button" class="order-add-more" id="order-add-more">＋ Ajouter une référence</button>
      <div id="order-contact-section" class="order-contact-section">
        <div class="order-grid">
          <div><label>Contact</label><select id="order-contact"></select></div>
          <div><label>Adresse e-mail</label><select id="order-email"></select></div>
          <div class="full"><label>Téléphone</label><select id="order-phone"></select></div>
          <div class="full"><label>Note / précision</label><textarea id="order-note" placeholder="Référence chantier, délai souhaité, commentaire…"></textarea></div>
        </div>
      </div>
      <div class="order-actions"><button type="button" class="order-cancel" id="order-cancel">Fermer</button><button type="button" class="order-send" id="order-send">Envoyer la commande</button></div>
      <div id="order-result" class="order-result" hidden></div>
    </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.classList.remove('open');
    document.getElementById('order-close').addEventListener('click', close);
    document.getElementById('order-cancel').addEventListener('click', close);
    document.getElementById('order-add-more').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('order-send').addEventListener('click', sendOrder);
    document.getElementById('order-contact').addEventListener('change', syncContactDefaults);
    document.getElementById('order-cart-list').addEventListener('input', handleCartInput);
    document.getElementById('order-cart-list').addEventListener('click', handleCartClick);
  }

  function addToCart(key) {
    const row = rows.find(item => item._key === key);
    if (!row) return;
    if (!cart.has(key)) {
      const info = orderInfo(row);
      cart.set(key, { key, row, requested:info.perBox });
    }
    updateCartButton();
    render();
  }

  function removeFromCart(key) {
    cart.delete(key);
    updateCartButton();
    render();
    renderCart();
    if (!cart.size) document.getElementById('order-overlay')?.classList.remove('open');
  }

  function cartItemHtml(item) {
    const row = item.row;
    const info = orderInfo(row);
    const calc = calculate(row, item.requested);
    const label = unitLabel(info.unit, 2);
    const step = info.unit === 'PZ' ? '1' : '0.01';
    const min = info.unit === 'PZ' ? '1' : '0.01';
    return `<div class="order-cart-item" data-cart-key="${esc(item.key)}">
      <div class="order-cart-head"><div><strong>${esc(row.ref || 'Pièce spéciale')} · ${esc(row.color)}</strong><span>${esc(row.kind)} · ${esc(row.format)}</span></div><button type="button" class="order-remove" data-remove-key="${esc(item.key)}" aria-label="Retirer">×</button></div>
      <div class="calc-grid">
        <div class="calc-input"><label>Besoin souhaité (${esc(label)})</label><input class="cart-qty" data-qty-key="${esc(item.key)}" type="number" min="${min}" step="${step}" value="${esc(item.requested)}"></div>
        <div class="calc-box"><span>Boîtage</span><strong>${esc(packagingText(row))}</strong></div>
        <div class="calc-box"><span>Cartons complets</span><strong data-calc-boxes>${calc ? calc.boxes : '—'}</strong></div>
        <div class="calc-box calc-final"><span>Quantité commandée</span><strong data-calc-ordered>${calc ? `${fr(calc.ordered,3)} ${esc(unitLabel(calc.unit,calc.ordered))}` : '—'}</strong><small data-calc-pieces>${calc?.pieces ? `${fr(calc.pieces,0)} pièces au total` : ''}</small></div>
      </div>
    </div>`;
  }

  function renderCart() {
    ensureOrderModal();
    const list = document.getElementById('order-cart-list');
    const lineCount = document.getElementById('order-lines-count');
    const subtitle = document.getElementById('order-cart-subtitle');
    const items = [...cart.values()];
    if (lineCount) lineCount.textContent = `${items.length} référence${items.length>1?'s':''}`;
    if (subtitle) subtitle.textContent = items.length ? 'Saisissez votre besoin : le boîtage et la quantité réellement commandée sont calculés automatiquement.' : 'Votre panier est vide.';
    if (list) list.innerHTML = items.length ? items.map(cartItemHtml).join('') : '<div class="order-cart-empty">Aucune référence dans le panier.</div>';
    updateSendButton();
  }

  function updateCardCalculation(card, item) {
    const calc = calculate(item.row, item.requested);
    const boxes = card.querySelector('[data-calc-boxes]');
    const ordered = card.querySelector('[data-calc-ordered]');
    const pieces = card.querySelector('[data-calc-pieces]');
    if (boxes) boxes.textContent = calc ? String(calc.boxes) : '—';
    if (ordered) ordered.textContent = calc ? `${fr(calc.ordered,3)} ${unitLabel(calc.unit,calc.ordered)}` : '—';
    if (pieces) pieces.textContent = calc?.pieces ? `${fr(calc.pieces,0)} pièces au total` : '';
    card.classList.toggle('invalid', !calc);
    updateSendButton();
  }

  function handleCartInput(event) {
    const input = event.target.closest('[data-qty-key]');
    if (!input) return;
    const item = cart.get(input.dataset.qtyKey);
    if (!item) return;
    item.requested = input.value;
    updateCardCalculation(input.closest('.order-cart-item'), item);
  }

  function handleCartClick(event) {
    const button = event.target.closest('[data-remove-key]');
    if (button) removeFromCart(button.dataset.removeKey);
  }

  async function readProSession() {
    let session = window.LRF_PRO_SESSION?.read?.() || null;
    if (!session && window.LRF_PRO_SESSION?.restore) session = await window.LRF_PRO_SESSION.restore();
    if (!session || session.isAdmin || !session.sessionToken) throw new Error('Connexion PRO client requise pour passer une commande.');
    return session;
  }

  async function loadCustomerContext(force = false) {
    if (customerContext && !force) return customerContext;
    if (customerLoadPromise && !force) return customerLoadPromise;
    customerLoadPromise = (async () => {
      customerError = '';
      try {
        const session = await readProSession();
        sessionToken = session.sessionToken;
        const response = await fetch(ORDER_API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'context',sessionToken}) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.success || !data?.customer) throw new Error(data?.error || 'Compte professionnel indisponible.');
        customerContext = data.customer;
        renderCustomer();
        return customerContext;
      } catch (error) {
        customerContext = null;
        sessionToken = '';
        customerError = error?.message || 'Connexion professionnelle requise.';
        renderCustomer();
        return null;
      } finally { customerLoadPromise = null; }
    })();
    return customerLoadPromise;
  }

  function renderCustomer() {
    ensureOrderModal();
    const box = document.getElementById('order-customer');
    const contactSection = document.getElementById('order-contact-section');
    if (!box) return;
    if (!customerContext) {
      box.className = 'order-customer error';
      box.innerHTML = `<strong>${esc(customerError || 'Connexion PRO requise.')}</strong><span>Connectez-vous avec votre code client LRF pour récupérer automatiquement votre société, vos contacts, vos e-mails et vos téléphones.</span><a href="tarifs-pro.html" class="order-login-link">Se connecter à l’espace PRO</a>`;
      if (contactSection) contactSection.hidden = true;
      updateSendButton();
      return;
    }
    box.className = 'order-customer ready';
    box.innerHTML = `<div><span>Client</span><strong>${esc(customerContext.societe || '')}</strong></div><div><span>Code LRF</span><strong>${esc(customerContext.codeClient || '')}</strong></div>`;
    if (contactSection) contactSection.hidden = false;

    const contact = document.getElementById('order-contact');
    const email = document.getElementById('order-email');
    const phone = document.getElementById('order-phone');
    if (contact) contact.innerHTML = (customerContext.contacts || []).map(c => `<option value="${esc(c.id)}">${esc(c.name)}${c.fonction?` — ${esc(c.fonction)}`:''}</option>`).join('');
    if (email) email.innerHTML = (customerContext.emails || []).map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if (phone) phone.innerHTML = '<option value="">Aucun numéro</option>' + (customerContext.phones || []).map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    syncContactDefaults();
    updateSendButton();
  }

  function syncContactDefaults() {
    if (!customerContext) return;
    const contactSelect = document.getElementById('order-contact');
    const emailSelect = document.getElementById('order-email');
    const phoneSelect = document.getElementById('order-phone');
    const selected = (customerContext.contacts || []).find(c => c.id === contactSelect?.value);
    if (selected?.email && [...(emailSelect?.options || [])].some(o => o.value === selected.email)) emailSelect.value = selected.email;
    if (selected?.telephone && [...(phoneSelect?.options || [])].some(o => o.value === selected.telephone)) phoneSelect.value = selected.telephone;
  }

  function updateSendButton() {
    const btn = document.getElementById('order-send');
    if (!btn) return;
    const validCart = cart.size > 0 && [...cart.values()].every(item => calculate(item.row,item.requested));
    const validCustomer = Boolean(customerContext && (customerContext.contacts||[]).length && (customerContext.emails||[]).length);
    btn.disabled = !(validCart && validCustomer);
    btn.textContent = cart.size ? `Envoyer la commande · ${cart.size} référence${cart.size>1?'s':''}` : 'Envoyer la commande';
  }

  async function openCart(addKey = '') {
    ensureOrderModal();
    if (addKey) addToCart(addKey);
    renderCart();
    const result = document.getElementById('order-result');
    if (result) result.hidden = true;
    const overlay = document.getElementById('order-overlay');
    overlay?.classList.add('open');
    const customer = document.getElementById('order-customer');
    if (!customerContext && customer) {
      customer.className = 'order-customer loading';
      customer.textContent = 'Chargement de votre compte professionnel…';
    }
    await loadCustomerContext();
  }

  async function sendOrder() {
    const items = [...cart.values()].map(item => {
      const calc = calculate(item.row,item.requested);
      if (!calc) return null;
      return {
        ref:item.row.ref || '', color:item.row.color, kind:item.row.kind, format:item.row.format, finish:item.row.finish,
        orderOnly:Boolean(item.row.orderOnly), requestedQty:calc.requested,
        stock:isNum(item.row.stock)?Number(item.row.stock):null, stockUnit:item.row.stockUnit || null
      };
    });
    if (!items.length || items.some(x => !x)) return alert('Vérifiez les quantités du panier.');
    if (!customerContext || !sessionToken) return alert('Reconnectez-vous à votre espace PRO.');

    const contactId = document.getElementById('order-contact')?.value || '';
    const email = document.getElementById('order-email')?.value || '';
    const telephone = document.getElementById('order-phone')?.value || '';
    const note = document.getElementById('order-note')?.value.trim() || '';
    if (!contactId || !email) return alert('Choisissez le contact et l’adresse e-mail à utiliser.');

    const btn = document.getElementById('order-send');
    const result = document.getElementById('order-result');
    btn.disabled = true; btn.textContent = 'Envoi de la commande…';
    result.hidden = true;
    try {
      const response = await fetch(ORDER_API, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'submit',sessionToken,items,contactId,email,telephone,note})
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { customerContext = null; sessionToken = ''; throw new Error(data?.error || 'Session expirée.'); }
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Envoi impossible.');
      result.className = 'order-result success';
      result.innerHTML = `✓ Commande envoyée à Caterina et enregistrée dans le CRM.<br><small>${items.length} référence${items.length>1?'s':''} · ${data.totalBoxes || ''} carton${Number(data.totalBoxes)>1?'s':''} · Réf. CRM ${esc(data.requestId || '')}</small>`;
      result.hidden = false;
      cart.clear(); updateCartButton(); render();
      btn.textContent = 'Commande envoyée ✓'; btn.disabled = true;
    } catch (error) {
      result.className = 'order-result error'; result.textContent = error?.message || 'Impossible d’envoyer la commande.'; result.hidden = false;
      if (!customerContext) await loadCustomerContext(true);
      updateSendButton();
    }
  }

  body?.addEventListener('click', event => {
    const stockButton = event.target.closest('[data-stock-key]');
    if (stockButton) { requestStock(stockButton.dataset.stockKey); return; }
    const orderButtonEl = event.target.closest('[data-order-key]');
    if (orderButtonEl) openCart(orderButtonEl.dataset.orderKey);
  });
  cartButton?.addEventListener('click', () => openCart());
  search?.addEventListener('input', render);
  colorFilter?.addEventListener('change', render);

  installFilters();
  updateCartButton();
  render();
  setStatus('');
})();
