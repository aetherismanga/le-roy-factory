(() => {
  const SESSION_KEY = 'lrfProSession';
  const PARTNER = 'elios-ceramica';
  const POOL_PDF = 'assets/pdf/ELIOS_CATALOGO%20PISCINE_2026.pdf';

  const norm = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/,/g, '.').replace(/\s+/g, '').trim();

  const baseFormat = value => {
    const m = String(value || '').replace(/,/g, '.').match(/\d+(?:\.\d+)?x\d+(?:\.\d+)?/i);
    return m ? m[0].toLowerCase() : norm(value);
  };
  const is20mmFormat = value => /20\s*mm/i.test(String(value || ''));

  const money = amount => Number(amount).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.partenaires)) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function hasPartner(session, partner) {
    const wanted = norm(partner);
    return !!session && session.partenaires.some(p => {
      const current = norm(p);
      return current === wanted || (wanted === PARTNER && (current === 'elios' || current === 'eliosceramica'));
    });
  }

  const result = (amount, options = {}) => ({
    amount,
    unit: options.unit || 'net/m²',
    label: options.label || `${money(amount)} € ${options.unit || 'net/m²'}`,
    note: options.note || '',
    variants: options.variants || []
  });

  const generic = {
    '30x60': 12, '60x60': 12, '30.5x61': 12, '30.5x60.5': 12,
    '40.5x40.5': 12, '40.6x40.6': 12, '40.5x61': 12, '40.6x60.9': 12,
    '61x61': 12, '20x20': 14, '20.3x20.3': 14, '20x40': 14,
    '20.3x40.6': 14, '60x120': 15, '100x100': 17.5, '50x100': 17.5,
    '120x120': 22, '20.3x90.6': 11.5, '24x120': 13.5, '24x150': 15.9,
    '23x119': 14.5, '23.4x119.5': 14.5, '5x20': 22, '6x25': 22,
    '4.8x45': 22, '17.5x20': 23, '22x25': 23, '25x22': 23
  };

  const price20 = { '60x60': 21, '60x120': 24, '40x120': 24, '100x100': 28, '50x100': 28 };

  function isPolished(product) {
    return (product.finishes || []).some(f => /poli/i.test(f));
  }

  function specialPrice(product, format) {
    const slug = norm(product.slug);
    const f = baseFormat(format);

    if (is20mmFormat(format)) {
      const p20 = price20[f];
      if (p20 !== undefined) return result(p20, { note: `${f.replace('x','×')} — épaisseur 20 mm, version extérieure R11.` });
    }

    if (slug.startsWith('pool-') && f === '15x15') {
      return result(18, { note: 'POOL SURFACE 15×15. Bullnose 15×15 : 1,90 € net/pièce.' });
    }

    if (slug === 'venere' && (f === '33.3x100' || f === '33x100')) return result(17, { note: 'Finition Matt. Décor : 19,00 € net/m².' });
    if (slug === 'loveanddecors' && f === '120x278') return result(29, { note: 'MAGNUS Matt. Version polie : 38,00 € net/m². Décor : 43,00 € net/m². Emballage caisse bois selon quantité.' });
    if (slug === 'yosemite') {
      if (f === '7.5x40' || f === '7.5x40.7') return result(19);
      if (f === '15x85') return result(17.5);
      if (f === '23.4x95.7') return result(32);
      if (f === '23.4x148') return result(17.5);
    }
    if (slug === 'allure' && f === '60x120') return result(24);
    if (slug === 'segmento' && f === '15x15') return result(25);
    if (slug === 'clay' && f === '10x10') return result(23, { note: 'Uni. Décor PAT : +5,00 € net/pièce ; décor FLO : +7,00 € net/pièce.' });
    if (slug === 'd-esign-evo' && f === '20x20') return result(20, { note: 'Uni. Décor : 23,00 € net/m².' });
    if (slug === 'loveanddecors-creative' && f === '60x120') return result(179, { unit: 'net / 2 pièces', label: '179,00 € net / 2 pièces' });
    if (slug === 'creta' && f === '60x120') return result(15, { note: 'Version décor CRETA indiquée au tarif : 22,00 € net/m².' });
    return null;
  }

  function genericPrice(product, format) {
    const f = baseFormat(format);
    const price = generic[f];
    if (price === undefined) return null;
    if (f === '60x120' && isPolished(product)) return result(23, { note: 'Finition polie rectifiée.' });
    return result(price, { note: /8[,.]5\s*mm/i.test(String(format)) ? 'Épaisseur standard 8,5 mm.' : '' });
  }

  function lookup(product, format) {
    return specialPrice(product, format) || genericPrice(product, format);
  }

  window.ELIOS_IMAGE_DATA = window.ELIOS_IMAGE_DATA || {};
  const poolImageKeys = ['abyss','acqua','greek-isles','italian-slate','lakes','mare','nevada','pacific','quantum','sea-breeze','seychelles','twelfth-night'];
  poolImageKeys.forEach(slug => { window.ELIOS_IMAGE_DATA[`pool-${slug}`] = 'assets/img/03.png'; });
  const poolProducts = [{"name":"Pool Surfaces — Abyss","slug":"pool-abyss","category":"Piscine / Pool Surfaces","page":10,"colors":["Tikal","Port Royal","Atlantis","Thonis"],"formats":["15x15"],"finishes":["Glossy","7,5 mm"],"uses":["Piscine"],"description":"L’élégance silencieuse des abysses prend forme en surface.","gallery":["pool-abyss"],"catalogueLabel":"Pool Surfaces — Abyss","detailed":true},{"name":"Pool Surfaces — Acqua","slug":"pool-acqua","category":"Piscine / Pool Surfaces","page":16,"colors":["Light","River","Deep","Cobalt"],"formats":["15x15"],"finishes":["Glossy","7,5 mm"],"uses":["Piscine"],"description":"Vagues de lumière et transparences naturelles pour des atmosphères authentiques.","gallery":["pool-acqua"],"catalogueLabel":"Pool Surfaces — Acqua","detailed":true},{"name":"Pool Surfaces — Greek Isles","slug":"pool-greek-isles","category":"Piscine / Pool Surfaces","page":22,"colors":["Crete"],"formats":["15x15"],"finishes":["Matt & glossy grit","7,5 mm"],"uses":["Piscine"],"description":"La vitalité de la mer capturée dans chaque nuance.","gallery":["pool-greek-isles"],"catalogueLabel":"Pool Surfaces — Greek Isles","detailed":true},{"name":"Pool Surfaces — Italian Slate","slug":"pool-italian-slate","category":"Piscine / Pool Surfaces","page":28,"colors":["Naples","Firenze"],"formats":["15x15"],"finishes":["Matt","7,5 mm"],"uses":["Piscine"],"description":"Élégance naturelle et veinures italiennes pour des piscines intemporelles.","gallery":["pool-italian-slate"],"catalogueLabel":"Pool Surfaces — Italian Slate","detailed":true},{"name":"Pool Surfaces — Lakes","slug":"pool-lakes","category":"Piscine / Pool Surfaces","page":34,"colors":["Shasta","Tahoe"],"formats":["15x15"],"finishes":["Glossy","7,5 mm"],"uses":["Piscine"],"description":"Des atmosphères sereines inspirées des lacs les plus enchanteurs.","gallery":["pool-lakes"],"catalogueLabel":"Pool Surfaces — Lakes","detailed":true},{"name":"Pool Surfaces — Mare","slug":"pool-mare","category":"Piscine / Pool Surfaces","page":40,"colors":["Viridus","Altum","Caeles"],"formats":["15x15"],"finishes":["Matt & glossy grit","7,5 mm"],"uses":["Piscine"],"description":"La richesse des détails de la collection Mare rend les surfaces précieuses, recréant des textures naturelles et offrant des reflets d’effet.","gallery":["pool-mare"],"catalogueLabel":"Pool Surfaces — Mare","detailed":true},{"name":"Pool Surfaces — Nevada","slug":"pool-nevada","category":"Piscine / Pool Surfaces","page":46,"colors":["Mohave","Carson","Vegas","Reno"],"formats":["15x15","15x61 RET"],"finishes":["Matt","7,5 mm"],"uses":["Piscine"],"description":"Suggestions désertiques illuminées par des reflets cristallins.","gallery":["pool-nevada"],"catalogueLabel":"Pool Surfaces — Nevada","detailed":true},{"name":"Pool Surfaces — Pacific","slug":"pool-pacific","category":"Piscine / Pool Surfaces","page":52,"colors":["Japan","Mex","Australia"],"formats":["15x15"],"finishes":["Glossy 3D","7,5 mm"],"uses":["Piscine"],"description":"L’énergie puissante du Pacifique traduite en pure beauté.","gallery":["pool-pacific"],"catalogueLabel":"Pool Surfaces — Pacific","detailed":true},{"name":"Pool Surfaces — Quantum","slug":"pool-quantum","category":"Piscine / Pool Surfaces","page":58,"colors":["Prism","Vector","Nova"],"formats":["15x15"],"finishes":["Glossy 3D","7,5 mm"],"uses":["Piscine"],"description":"Un nouvel équilibre entre matière, couleur et énergie.","gallery":["pool-quantum"],"catalogueLabel":"Pool Surfaces — Quantum","detailed":true},{"name":"Pool Surfaces — Sea Breeze","slug":"pool-sea-breeze","category":"Piscine / Pool Surfaces","page":64,"colors":["Sky","Teal"],"formats":["15x15"],"finishes":["Glossy","7,5 mm"],"uses":["Piscine"],"description":"Une brise marine qui caresse des surfaces lumineuses.","gallery":["pool-sea-breeze"],"catalogueLabel":"Pool Surfaces — Sea Breeze","detailed":true},{"name":"Pool Surfaces — Seychelles","slug":"pool-seychelles","category":"Piscine / Pool Surfaces","page":70,"colors":["Original","Blue","Cobalt","Light","Pearl"],"formats":["15x15"],"finishes":["Matt & glossy grit","7,5 mm"],"uses":["Piscine"],"description":"Des eaux turquoise et des sables coralliens pour des atmosphères de rêve.","gallery":["pool-seychelles"],"catalogueLabel":"Pool Surfaces — Seychelles","detailed":true},{"name":"Pool Surfaces — Twelfth Night","slug":"pool-twelfth-night","category":"Piscine / Pool Surfaces","page":76,"colors":["Orsino","Viola"],"formats":["15x15"],"finishes":["Matt & glossy grit","7,5 mm"],"uses":["Piscine"],"description":"Des profondeurs nocturnes illuminées par des reflets inattendus.","gallery":["pool-twelfth-night"],"catalogueLabel":"Pool Surfaces — Twelfth Night","detailed":true}];
  window.ELIOS_CATALOGUE = Array.isArray(window.ELIOS_CATALOGUE) ? window.ELIOS_CATALOGUE : [];
  const knownSlugs = new Set(window.ELIOS_CATALOGUE.map(p => String(p?.slug || '')));
  poolProducts.forEach(product => { if (!knownSlugs.has(product.slug)) window.ELIOS_CATALOGUE.push(product); });

  window.LRF_INSPIRATIONS_PRICING = {
    source: 'ELIOS TARIF NET - 2026 V01',
    sessionKey: SESSION_KEY,
    getSession: readSession,
    canAccess(partner = PARTNER) { return hasPartner(readSession(), partner); },
    getPrice(partner, product, format) {
      if (norm(partner) !== PARTNER && norm(partner) !== 'elios' && norm(partner) !== 'eliosceramica') return null;
      if (!hasPartner(readSession(), PARTNER)) return { locked: true };
      const price = lookup(product || {}, format);
      return price || { unavailable: true };
    }
  };

  const pageById = {
    'elios-pool-abyss': 8, 'elios-pool-acqua': 11, 'elios-pool-greek-isles': 14,
    'elios-pool-italian-slate': 17, 'elios-pool-lakes': 20, 'elios-pool-mare': 23,
    'elios-pool-nevada': 26, 'elios-pool-pacific': 29, 'elios-pool-quantum': 32,
    'elios-pool-sea-breeze': 35, 'elios-pool-seychelles': 38, 'elios-pool-twelfth-night': 41
  };
  const poolCache = new Map();
  let pdfPromise = null;

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('lrf-pool-pdfjs');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.pdfjsLib), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.id = 'lrf-pool-pdfjs';
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      script.onload = () => {
        if (window.pdfjsLib?.GlobalWorkerOptions) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        }
        resolve(window.pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function getPoolPdf() {
    if (!pdfPromise) {
      pdfPromise = loadPdfJs().then(lib => lib.getDocument({ url: POOL_PDF }).promise);
    }
    return pdfPromise;
  }

  async function renderPoolPage(id) {
    if (poolCache.has(id)) return poolCache.get(id);
    const pageNumber = pageById[id];
    if (!pageNumber) return null;
    try {
      const pdf = await getPoolPdf();
      const page = await pdf.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(1, 1050 / base.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d', { alpha: false });
      await page.render({ canvasContext: ctx, viewport }).promise;
      const url = canvas.toDataURL('image/jpeg', 0.78);
      poolCache.set(id, url);
      return url;
    } catch (error) {
      console.warn('Visuel Pool Surfaces indisponible :', error);
      return null;
    }
  }

  async function hydratePoolCards() {
    const cards = [...document.querySelectorAll('#partner-products [data-id^="elios-pool-"]')];
    for (const card of cards) {
      const id = card.dataset.id;
      const img = card.querySelector('img');
      if (!img || img.dataset.poolHydrated) continue;
      img.dataset.poolHydrated = 'loading';
      const url = await renderPoolPage(id);
      if (url) {
        img.src = url;
        img.dataset.poolHydrated = '1';
      } else {
        delete img.dataset.poolHydrated;
      }
      const eyebrow = card.querySelector('.eyebrow');
      if (eyebrow) eyebrow.textContent = 'Elios Ceramica · Piscine';
    }
  }

  function hydrateModal() {
    const modal = document.getElementById('product-modal-v2-card');
    if (!modal) return;
    const title = modal.querySelector('h2')?.textContent || '';
    const product = poolProducts.find(p => p.name === title);
    if (!product) return;
    const id = `elios-${product.slug}`;
    renderPoolPage(id).then(url => {
      const img = modal.querySelector('.modal-v2-main > img');
      if (url && img) img.src = url;
    });
  }

  function installPoolShortcut() {
    const categories = document.getElementById('insp-categories');
    if (!categories) return;

    const addButton = () => {
      const existing = categories.querySelector('[data-pool-shortcut]');
      if (existing) return existing;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'category-card';
      button.dataset.poolShortcut = '1';
      button.innerHTML = '<span class="category-icon">≈</span><span class="category-name">Piscine</span><span class="category-meta">ELIOS · Pool Surfaces 2026</span>';
      button.addEventListener('click', () => {
        categories.querySelector('[data-cat="carrelage"]')?.click();
        const restored = addButton();
        categories.querySelectorAll('.category-card').forEach(el => el.classList.remove('active'));
        restored?.classList.add('active');
        document.querySelector('#partner-grid [data-partner="Elios Ceramica"]')?.click();
        const search = document.getElementById('v2-search');
        if (search) {
          search.value = 'Piscine';
          search.dispatchEvent(new Event('input', { bubbles: true }));
        }
        setTimeout(hydratePoolCards, 0);
        document.getElementById('partner-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      categories.appendChild(button);
      return button;
    };

    addButton();
    categories.addEventListener('click', event => {
      if (event.target.closest('[data-cat]')) setTimeout(addButton, 0);
    });

    const grid = document.getElementById('partner-products');
    if (grid && !grid.dataset.poolObserver) {
      grid.dataset.poolObserver = '1';
      new MutationObserver(() => {
        if (grid.querySelector('[data-id^="elios-pool-"]')) hydratePoolCards();
      }).observe(grid, { childList: true, subtree: true });
    }

    const modal = document.getElementById('product-modal-v2-card');
    if (modal && !modal.dataset.poolObserver) {
      modal.dataset.poolObserver = '1';
      new MutationObserver(hydrateModal).observe(modal, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installPoolShortcut, { once: true });
  } else {
    setTimeout(installPoolShortcut, 0);
  }
})();