(() => {
  'use strict';

  const trigger = document.getElementById('lrf-open-search');
  if (!trigger) return;

  const PARTNERS = [
    'Elios Ceramica','View Ceramica','La Fenice',"Petracer's",'Pecchioli Firenze','Bulbo',
    'Reviglass','Biopietra','Neobath','Randal Pro','Aquahome','Opal','Koibath','Bilt'
  ];

  const partnerAliases = {
    'Elios Ceramica':['elios','elios ceramica'],
    'View Ceramica':['view','view ceramica'],
    'La Fenice':['fenice','la fenice'],
    "Petracer's":['petracer','petracers'],
    'Pecchioli Firenze':['pecchioli','firenze'],
    'Randal Pro':['randal','randal pro'],
    'Aquahome':['aqua home','robinetterie'],
    'Biopietra':['bio pietra','parement'],
    'Reviglass':['revi glass','mosaique','mosaïque'],
    'Neobath':['neo bath','meuble salle de bain'],
    'Koibath':['koi bath'],
    'Bilt':['croisillon','croisillons','nivellement']
  };

  const norm = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const compact = value => norm(value).replace(/\s+/g, '');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const u = value => encodeURIComponent(value);

  const items = [];
  const add = item => items.push({...item, aliases:item.aliases || []});

  add({type:'Page', icon:'✦', title:'Inspirations & Produits', desc:'Collections, produits, formats et finitions', url:'univers.html', aliases:['inspiration','produit','collection','carrelage','meuble']});
  add({type:'Page', icon:'▦', title:'Partenaires', desc:'Tous les fabricants LE ROY FACTORY', url:'partenaires.html', aliases:['fabricant','usine','marque']});
  add({type:'Page', icon:'▤', title:'Catalogues', desc:'Catalogues et documentations fabricants', url:'catalogues.html', aliases:['catalogue','pdf','documentation']});
  add({type:'Page', icon:'€', title:'Accès PRO & Tarifs', desc:'Grilles tarifaires et informations professionnelles', url:'tarifs-pro.html', aliases:['tarif','tarifs','prix','grille tarifaire','pro']});
  add({type:'Page', icon:'⌂', title:'Réalisations', desc:'Projets et réalisations LE ROY FACTORY', url:'realisations.html', aliases:['realisation','réalisation','chantier']});
  add({type:'Page', icon:'✉', title:'Contact', desc:'Contacter LE ROY FACTORY', url:'contact.html', aliases:['contact','telephone','téléphone','mail','email']});

  PARTNERS.forEach(name => {
    add({
      type:'Fabricant', icon:'◆', title:name,
      desc:'Ouvrir son espace Inspirations & Produits',
      url:`univers.html?partner=${u(name)}`,
      aliases:[...(partnerAliases[name] || []),'fabricant','usine','partenaire']
    });
    add({
      type:'Tarif PRO', icon:'€', title:`Tarifs ${name}`,
      desc:`Grilles tarifaires professionnelles ${name}`,
      url:`tarifs-pro.html?partner=${u(name)}`,
      aliases:[name,...(partnerAliases[name] || []),'tarif','tarifs','prix','grille','pro']
    });
  });

  const addProducts = (source, partner, defaultType) => {
    if (!Array.isArray(source)) return;
    source.forEach((p, i) => {
      const name = p.name || p.collection || `Produit ${i + 1}`;
      const searchBits = [
        p.collection,p.catalogueLabel,p.slug,p.description,p.category,p.productType,
        ...(p.formats || p.dimensions || []),...(p.colors || []),...(p.finishes || [])
      ].filter(Boolean);
      add({
        type:defaultType,
        icon:partner === 'Elios Ceramica' ? '▦' : '▥',
        title:name,
        desc:`${partner}${p.category ? ` · ${p.category}` : (p.productType ? ` · ${p.productType}` : '')}`,
        url:`univers.html?partner=${u(partner)}&search=${u(name)}&open=1`,
        aliases:[partner,...(partnerAliases[partner] || []),...searchBits]
      });
    });
  };

  addProducts(window.ELIOS_CATALOGUE, 'Elios Ceramica', 'Produit Elios');
  addProducts(window.NEOBATH_CATALOGUE, 'Neobath', 'Produit Neobath');

  // Collection View déjà connue commercialement, même si la fiche View détaillée
  // n'est pas encore alimentée dans le catalogue Inspirations V2.
  add({
    type:'Collection View', icon:'▦', title:'COCO',
    desc:'View Ceramica · effet travertin · 40×60',
    url:`univers.html?partner=${u('View Ceramica')}&search=${u('COCO')}`,
    aliases:['coco beige','coco light','travertin','40x60','40 x 60','view']
  });

  const haystack = item => norm([item.title,item.desc,...item.aliases].join(' '));
  const score = (item, rawQuery) => {
    const q = norm(rawQuery);
    if (!q) return 0;
    const qc = compact(q);
    const title = norm(item.title);
    const titlec = compact(title);
    const hay = haystack(item);
    const hayc = compact(hay);
    const tokens = q.split(/\s+/).filter(Boolean);
    let s = 0;

    if (titlec === qc) s += 1000;
    else if (titlec.startsWith(qc)) s += 520;
    else if (titlec.includes(qc)) s += 330;
    if (hayc.includes(qc)) s += 170;

    let matched = 0;
    tokens.forEach(t => {
      if (title.includes(t)) { s += 95; matched += 1; }
      else if (hay.includes(t)) { s += 45; matched += 1; }
    });
    if (matched === tokens.length) s += 140;

    const tariffIntent = /\b(tarif|tarifs|prix|grille|pro)\b/.test(q);
    if (tariffIntent && item.type === 'Tarif PRO') s += 420;
    if (tariffIntent && item.type === 'Page' && compact(item.title).includes('tarif')) s += 170;
    if (!tariffIntent && item.type.startsWith('Produit')) s += 35;

    return matched || hayc.includes(qc) ? s : 0;
  };

  const overlay = document.createElement('div');
  overlay.id = 'lrf-search-overlay';
  overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML = `
    <div class="lrf-search-panel" role="dialog" aria-modal="true" aria-labelledby="lrf-search-title">
      <div class="lrf-search-head">
        <div class="lrf-search-brand">
          <div class="lrf-search-mark">⌕</div>
          <div><div id="lrf-search-title" class="lrf-search-title">Recherche LE ROY FACTORY</div><div class="lrf-search-subtitle">Produit, collection, fabricant, tarif, catalogue…</div></div>
        </div>
        <button class="lrf-search-close" type="button" aria-label="Fermer">×</button>
      </div>
      <div class="lrf-search-box"><input class="lrf-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="Ex. Roma, tarif Elios, Coco…" aria-label="Rechercher dans le site"></div>
      <div class="lrf-search-results" aria-live="polite"></div>
      <div class="lrf-search-footer"><span><b>Entrée</b> ouvrir le meilleur résultat</span><span><b>Échap</b> fermer</span></div>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.lrf-search-input');
  const results = overlay.querySelector('.lrf-search-results');
  const closeBtn = overlay.querySelector('.lrf-search-close');
  let current = [];
  let active = 0;

  function resultMarkup(item, index) {
    return `<a class="lrf-search-item${index === active ? ' active' : ''}" href="${esc(item.url)}" data-result-index="${index}">
      <span class="lrf-search-icon">${esc(item.icon)}</span>
      <span class="lrf-search-copy"><span class="lrf-search-type">${esc(item.type)}</span><span class="lrf-search-name">${esc(item.title)}</span><span class="lrf-search-desc">${esc(item.desc)}</span></span>
      <span class="lrf-search-arrow">›</span>
    </a>`;
  }

  function render(raw) {
    const q = raw.trim();
    active = 0;
    if (!q) {
      current = [
        items.find(x => x.title === 'Inspirations & Produits'),
        items.find(x => x.title === 'Accès PRO & Tarifs'),
        items.find(x => x.title === 'Catalogues'),
        items.find(x => x.title === 'Elios Ceramica')
      ].filter(Boolean);
      results.innerHTML = `<div class="lrf-search-hint">Suggestions rapides</div>${current.map(resultMarkup).join('')}`;
      return;
    }

    current = items
      .map(item => ({item, score:score(item,q)}))
      .filter(x => x.score > 0)
      .sort((a,b) => b.score - a.score || a.item.title.localeCompare(b.item.title,'fr'))
      .slice(0,9)
      .map(x => x.item);

    if (!current.length) {
      const fallback = {
        type:'Recherche', icon:'⌕', title:`Rechercher « ${q} » dans Inspirations`,
        desc:'Afficher les produits et collections correspondant à votre recherche',
        url:`univers.html?search=${u(q)}`
      };
      current = [fallback];
    }
    results.innerHTML = current.map(resultMarkup).join('');
  }

  function openSearch() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    input.value = '';
    render('');
    setTimeout(() => input.focus(), 30);
  }

  function closeSearch() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    trigger.focus?.();
  }

  function refreshActive() {
    results.querySelectorAll('.lrf-search-item').forEach((el,i) => el.classList.toggle('active',i === active));
    results.querySelector(`.lrf-search-item[data-result-index="${active}"]`)?.scrollIntoView({block:'nearest'});
  }

  trigger.addEventListener('click', openSearch);
  closeBtn.addEventListener('click', closeSearch);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
  input.addEventListener('input', e => render(e.target.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeSearch(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, Math.max(0,current.length - 1)); refreshActive(); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); refreshActive(); return; }
    if (e.key === 'Enter' && current[active]) { e.preventDefault(); window.location.href = current[active].url; }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeSearch();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
  });
})();