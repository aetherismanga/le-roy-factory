(() => {
  'use strict';

  const API = 'https://us-central1-le-roy-factory.cloudfunctions.net/eliosStock';
  const params = new URLSearchParams(location.search);
  const collection = (params.get('collection') || 'ROMA').toUpperCase();

  const verifiedTest = [
    { ref:'085M140P', searchRef:'085M140', name:'ROMA AVENTINO MOD 40 5X61MO', format:'40,5 × 61 MO', stock:106.54, production:0, verified:true },
    { ref:'0852040', name:'ROMA AVENTINO', format:'20,3 × 20,3 cm', stock:null },
    { ref:'0852640', name:'ROMA AVENTINO', format:'20,3 × 40,6 cm', stock:null },
    { ref:'0854240', name:'ROMA AVENTINO', format:'40,6 × 40,6 cm', stock:null },
    { ref:'0854640', name:'ROMA AVENTINO', format:'40,6 × 60,9 cm', stock:null },
    { ref:'0856140', name:'ROMA AVENTINO', format:'61 × 61 cm', stock:null },
    { ref:'0852005', name:'ROMA CELIO', format:'20,3 × 20,3 cm', stock:null },
    { ref:'0852605', name:'ROMA CELIO', format:'20,3 × 40,6 cm', stock:null },
    { ref:'0854205', name:'ROMA CELIO', format:'40,6 × 40,6 cm', stock:null },
    { ref:'0854605', name:'ROMA CELIO', format:'40,6 × 60,9 cm', stock:null },
    { ref:'0856105', name:'ROMA CELIO', format:'61 × 61 cm', stock:null }
  ];

  const body = document.getElementById('stock-body');
  const empty = document.getElementById('stock-empty');
  const search = document.getElementById('stock-search');
  const status = document.getElementById('stock-status');
  const statusText = document.getElementById('status-text');
  const refresh = document.getElementById('refresh-stock');
  const title = document.getElementById('collection-title');
  if (title) title.textContent = collection;

  let rows = verifiedTest;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const fr = n => Number(n).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});

  function stockCell(r) {
    if (Number.isFinite(Number(r.stock))) {
      const value = Number(r.stock);
      return `<span class="stock ${value <= 0 ? 'zero' : ''}">${fr(value)} m²</span>${r.production ? `<br><span class="badge">+ ${fr(r.production)} m² en production</span>` : ''}`;
    }
    return '<span class="badge">À interroger via EliosBOT</span>';
  }

  function render() {
    const q = norm(search?.value);
    const filtered = rows.filter(r => !q || norm(`${r.ref} ${r.searchRef||''} ${r.name} ${r.format}`).includes(q));
    body.innerHTML = filtered.map(r => `<tr><td><span class="ref">${esc(r.ref || r.searchRef || '—')}</span></td><td>${esc(r.name || '—')}</td><td>${esc(r.format || '—')}</td><td>${stockCell(r)}</td></tr>`).join('');
    empty.hidden = filtered.length > 0;
  }

  function setLive(message) {
    status.classList.remove('test');
    statusText.textContent = message;
  }

  function setTest(message) {
    status.classList.add('test');
    statusText.textContent = message;
  }

  async function loadLive() {
    refresh.disabled = true;
    refresh.textContent = 'Actualisation…';
    setTest('Interrogation de la passerelle EliosBOT…');
    try {
      const response = await fetch(`${API}?collection=${encodeURIComponent(collection)}`, { cache:'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || !Array.isArray(data.products) || !data.products.length) throw new Error('Aucune référence reçue');
      rows = data.products;
      render();
      const when = data.updatedAt ? new Date(data.updatedAt).toLocaleString('fr-FR') : 'à l’instant';
      setLive(`EliosBOT connecté · ${rows.length} référence${rows.length > 1 ? 's' : ''} · actualisé ${when}.`);
    } catch (err) {
      rows = verifiedTest;
      render();
      setTest('Mode test : la page fonctionne. La connexion sécurisée au compte Telegram doit encore être autorisée pour récupérer tous les stocks en direct.');
    } finally {
      refresh.disabled = false;
      refresh.textContent = '↻ Actualiser le stock';
    }
  }

  search?.addEventListener('input', render);
  refresh?.addEventListener('click', loadLive);
  render();
  loadLive();
})();
