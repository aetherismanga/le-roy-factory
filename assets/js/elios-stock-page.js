(() => {
  'use strict';

  const API = 'https://us-central1-le-roy-factory.cloudfunctions.net/eliosStock';
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

  if (title) title.textContent = source.collection || 'ROMA';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const fr = (value, digits = 2) => Number(value).toLocaleString('fr-FR', { maximumFractionDigits:digits, minimumFractionDigits:0 });
  const show = (value, suffix = '', digits = 2) => Number.isFinite(Number(value)) ? `${fr(value, digits)}${suffix}` : '—';

  function installFilters() {
    if (!colorFilter) return;
    colorFilter.innerHTML = '<option value="Tous">Toutes les couleurs</option>' +
      (source.colors || []).map(color => `<option value="${esc(color)}">${esc(color)}</option>`).join('');
  }

  function packageCell(row) {
    const pieces = Number.isFinite(Number(row.pcsBox)) ? `${fr(row.pcsBox, 0)} pcs/carton` : '—';
    const sqm = Number.isFinite(Number(row.sqmBox)) ? `${fr(row.sqmBox, 3)} m²/carton` : '';
    return `<strong>${pieces}</strong>${sqm ? `<small>${sqm}</small>` : ''}`;
  }

  function paletteCell(row) {
    if (![row.boxesPal, row.sqmPal, row.kgPal].some(v => Number.isFinite(Number(v)))) return '<span class="muted">—</span>';
    const bits = [];
    if (Number.isFinite(Number(row.boxesPal))) bits.push(`${fr(row.boxesPal,0)} cartons`);
    if (Number.isFinite(Number(row.sqmPal))) bits.push(`${fr(row.sqmPal,2)} m²`);
    if (Number.isFinite(Number(row.kgPal))) bits.push(`${fr(row.kgPal,0)} kg`);
    return bits.map((bit, i) => i === 0 ? `<strong>${esc(bit)}</strong>` : `<small>${esc(bit)}</small>`).join('');
  }

  function stockCell(row) {
    if (row.orderOnly) {
      return '<span class="order-badge">Sur commande</span><small class="stock-note">Pièce spéciale indiquée sur commande dans le catalogue ELIOS.</small>';
    }
    if (row.loading) return '<button class="stock-btn loading" type="button" disabled>Recherche EliosBOT…</button>';
    if (row.error) {
      return `<span class="stock-error">${esc(row.error)}</span><button class="stock-btn retry" type="button" data-stock-key="${esc(row._key)}">Réessayer</button>`;
    }
    if (Number.isFinite(Number(row.stock))) {
      const value = Number(row.stock);
      const production = Number(row.production || 0);
      const when = row.updatedAt ? new Date(row.updatedAt).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '';
      return `<span class="stock-value ${value <= 0 ? 'zero' : ''}">${fr(value,2)} m²</span>` +
        (production > 0 ? `<span class="production">Production prévue : +${fr(production,2)} m²</span>` : '<span class="production none">Aucune production prévue</span>') +
        `<small class="stock-note">${row.cached ? 'Résultat en cache' : 'EliosBOT en direct'}${when ? ` · ${esc(when)}` : ''}</small>` +
        `<button class="stock-btn refresh-one" type="button" data-stock-key="${esc(row._key)}">↻ Actualiser</button>`;
    }
    return `<button class="stock-btn" type="button" data-stock-key="${esc(row._key)}">Voir le stock</button><small class="stock-note">Aucune requête Telegram tant que vous ne cliquez pas.</small>`;
  }

  function matches(row) {
    const q = norm(search?.value);
    const color = colorFilter?.value || 'Tous';
    if (color !== 'Tous' && row.color !== color) return false;
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

  function setStatus(message, mode = 'ready') {
    if (!status || !statusText) return;
    status.className = `status ${mode}`;
    statusText.textContent = message;
  }

  async function requestStock(key) {
    const row = rows.find(item => item._key === key);
    if (!row || !row.ref || row.orderOnly || row.loading) return;

    row.loading = true;
    row.error = '';
    render();
    setStatus(`Interrogation d’EliosBOT pour ${row.ref} · ${row.color}…`, 'working');

    try {
      const response = await fetch(`${API}?collection=ROMA&ref=${encodeURIComponent(row.ref)}`, { cache:'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !data?.product) throw new Error(data?.error || `Erreur HTTP ${response.status}`);
      row.stock = Number(data.product.stock);
      row.production = Number(data.product.production || 0);
      row.updatedAt = data.updatedAt || new Date().toISOString();
      row.cached = Boolean(data.cached);
      row.telegramDescription = data.product.description || '';
      setStatus(`${row.ref} : ${fr(row.stock,2)} m² disponibles${row.production > 0 ? ` · ${fr(row.production,2)} m² en production` : ''}.`, 'live');
    } catch (error) {
      row.error = 'Stock indisponible pour le moment.';
      setStatus(`Impossible de récupérer ${row.ref}. Vous pouvez réessayer sans lancer les autres références.`, 'error');
    } finally {
      row.loading = false;
      render();
    }
  }

  body?.addEventListener('click', event => {
    const button = event.target.closest('[data-stock-key]');
    if (button) requestStock(button.dataset.stockKey);
  });
  search?.addEventListener('input', render);
  colorFilter?.addEventListener('change', render);

  installFilters();
  render();
  setStatus('Consultation à la demande : EliosBOT n’est interrogé que lorsque vous cliquez sur « Voir le stock » d’une référence.', 'ready');
})();
