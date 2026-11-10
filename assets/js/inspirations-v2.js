(() => {
  const CATEGORIES=[
    {id:'carrelage',label:'Carrelage',icon:'▦',partners:['Elios Ceramica','View Ceramica','La Fenice']},
    {id:'exception',label:"Carrelage d'exception",icon:'✦',partners:["Petracer's",'Pecchioli Firenze','Bulbo']},
    {id:'mosaique',label:'Mosaïque',icon:'◈',partners:['Reviglass']},
    {id:'parement',label:'Pierre',icon:'▤',partners:['Biopietra']},
    {id:'meubles',label:'Meubles',icon:'▥',partners:['Randal Pro','Neobath',"Petracer's",'Bulbo']},
    {id:'robinetterie',label:'Robinetterie & miroir',icon:'◉',partners:['Aquahome','Opal','Reitano Rubinetterie',"Petracer's"]},
    {id:'sanitaire',label:'Sanitaire',icon:'○',partners:["Petracer's",'UPTREND']},
    {id:'outillages',label:'Outillages / divers',icon:'⚒',partners:['Bilt']}
  ];
  const PARTNERS={
    'Elios Ceramica':{slug:'elios-ceramica',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios.png',country:'Italie',data:'elios'},
    'View Ceramica':{slug:'view-ceramica',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/view.png',country:'Italie'},
    'La Fenice':{slug:'la-fenice',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/lafenice.png',country:'Italie'},
    "Petracer's":{slug:'petracers',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/petracer.png',country:'Italie'},
    'Pecchioli Firenze':{slug:'pecchioli-firenze',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/pecchioli.png',country:'Italie'},
    'Bulbo':{slug:'bulbo',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/bulbo.png',country:'Italie'},
    'Reviglass':{slug:'reviglass',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/reviglass.png',country:'Espagne'},
    'Biopietra':{slug:'biopietra',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/biopietra.png',country:'Italie'},
    'Neobath':{slug:'neobath',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/neobath.png',country:'Italie',data:'neobath'},
    'Randal Pro':{slug:'randal-pro',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal.png',country:'Espagne'},
    'Aquahome':{slug:'aquahome',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/aquahome.png',country:'Espagne'},
    'Opal':{slug:'opal',logo:'assets/img/opal-catalogue-2026/opal-wordmark.svg',country:'Espagne'},
    'Bilt':{slug:'bilt',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/bilt.png',country:'International'},
    'UPTREND':{slug:'uptrend',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/uptrend.svg',country:'International'},
    'Reitano Rubinetterie':{slug:'reitano-rubinetterie',logo:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/reitano.svg',country:'Italie'}
  };
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const session=()=>{try{return window.LRF_PRO_SESSION?.read?.()||JSON.parse(sessionStorage.getItem('lrfProSession')||'null')}catch{return null}};
  const hasAccess=slug=>{if(slug==='bilt'){const s=session();return !!(s&&(s.isAdmin||s.admin||Array.isArray(s.partenaires)&&s.partenaires.some(p=>norm(p)==='bilt')))}if(slug==='pecchioli-firenze')return window.LRF_PECCHIOLI_ACCESS?.canAccess?.()===true;if(slug==='bulbo')return window.LRF_BULBO_ACCESS?.canAccess?.()===true;if(slug==='biopietra')return window.LRF_BIOPIETRA_ACCESS?.canAccess?.()===true;if(['elios-ceramica','view-ceramica'].includes(slug))return window.LRF_AGENT_TARIFFS?.canAccess?.(slug)===true;const s=session();if(!s||!Array.isArray(s.partenaires))return false;return s.partenaires.some(p=>{const n=norm(p),w=norm(slug);return n===w||n===norm(PARTNERS_BY_SLUG[slug]?.name||'')||(slug==='reitano-rubinetterie'&&(n==='reitano'||n==='reitanorubinetteria'))})};
  const PARTNERS_BY_SLUG={};Object.entries(PARTNERS).forEach(([name,p])=>PARTNERS_BY_SLUG[p.slug]={...p,name});

  const COLOR_RULES=[
    ['Blanc',['white','bianco','blanc','ivory','avorio','cotton','zucchero','calce','moonwhite','burro','silk','linen']],
    ['Gris',['grey','gray','grigio','ash','polvere','roccia','pearl','cenere']],
    ['Noir',['black','dark','nero','antracite','anthracite','carbone','vulcano']],
    ['Beige',['beige','sand','cream','crema','taupe','tortora','cava','avena','biscotto','almond','greige']],
    ['Marron',['brown','marron','amber','honey','gold','caramello','malto','terra','deserto','canyon rust']],
    ['Bleu',['blue','blu','ocean','acqua','aqua','ciano','sky','teal','light blue','blue lagoon','virginia']],
    ['Vert',['green','verde','emerald','matcha','ginepro','nordic green','forest','salvia','rainforest']],
    ['Terracotta',['terracotta','coccio','clay red','terra di siena','sunset rose','arizona']],
    ['Jaune',['yellow','mustard']],
    ['Rose',['pink','rose','bouquet']],
    ['Multicolore',['mix','decor','décor','decors','décors','amalfi','positano','sorrento','vietri']]
  ];
  function basicColors(product){
    const out=[];
    if(norm(product.category).includes('bois'))out.push('Bois');
    (product.colors||[]).forEach(raw=>{
      const n=norm(raw);
      const hit=COLOR_RULES.find(([,terms])=>terms.some(t=>n.includes(norm(t))));
      if(hit&&!out.includes(hit[0]))out.push(hit[0]);
    });
    return out.length?out:['Autres'];
  }
  function basicEffect(product){
    const c=norm(product.category);
    if(c.includes('bois'))return 'Bois';
    if(c.includes('pierre')||c.includes('marbre'))return 'Pierre / marbre';
    if(c.includes('ciment')||c.includes('ceramique'))return 'Ciment / céramique';
    if(c.includes('grandesdalles')||c.includes('dalles'))return 'Grandes dalles';
    return 'Autres';
  }

  const eliosImages=window.ELIOS_IMAGE_DATA||{};
  const eliosRaw=Array.isArray(window.ELIOS_CATALOGUE)?window.ELIOS_CATALOGUE:[];
  const neoRaw=Array.isArray(window.NEOBATH_CATALOGUE)?window.NEOBATH_CATALOGUE:[];
  const DATA={
    'Elios Ceramica':eliosRaw.map(p=>({
      ...p,
      id:`elios-${p.slug}`,
      name:p.name,
      collection:p.catalogueLabel||p.collection||p.name,
      description:p.description||'',
      formats:p.formats||[],
      colors:p.colors||[],
      colorFamilies:p.colorFamilies||basicColors(p),
      effect:basicEffect(p),
      finishes:p.finishes||[],
      images:(p.gallery||[]).map(k=>eliosImages[k]).filter(Boolean),
      category:p.category||'Carrelage'
    })),
    'Neobath':neoRaw.map((p,i)=>({...p,id:p.id||`neo-${i}`,name:p.name||p.collection||`Composition ${i+1}`,collection:p.collection||p.name||'',description:p.description||'',formats:p.dimensions||p.formats||[],colors:p.colors||[],colorFamilies:p.colors||[],effect:p.productType||'Meuble salle de bain',finishes:p.finishes||[],images:p.images||[],category:p.productType||'Meuble salle de bain'}))
  };

  const DEFAULT_SELECTION={category:'carrelage',partner:'Elios Ceramica',q:'',format:'Tous',color:'Tous',effect:'Tous',finish:'Tous',poolGroup:false};
  const partnerAliases={elios:'Elios Ceramica',view:'View Ceramica',petracer:"Petracer's",pecchioli:'Pecchioli Firenze',randal:'Randal Pro',opalhome:'Opal'};
  function selectionFromUrl(value=location.href){
    const params=new URL(value,location.href).searchParams;
    const requestedCategory=params.get('category')||params.get('cat')||'';
    const categoryId=requestedCategory==='piscine'?'carrelage':requestedCategory;
    const requestedPartner=norm(params.get('partner'));
    const partner=Object.keys(PARTNERS).find(name=>[norm(name),norm(PARTNERS[name].slug)].includes(requestedPartner))||partnerAliases[requestedPartner]||'';
    const category=CATEGORIES.find(item=>item.id===categoryId&&(!partner||item.partners.includes(partner)))
      ||(partner?CATEGORIES.find(item=>item.partners.includes(partner)):null)
      ||CATEGORIES.find(item=>item.id===categoryId)||CATEGORIES[0];
    const next={...DEFAULT_SELECTION,category:category.id,partner:partner&&category.partners.includes(partner)?partner:category.partners[0]||''};
    next.poolGroup=next.partner==='Elios Ceramica'&&(requestedCategory==='piscine'||params.get('pool')==='1');
    for(const key of ['q','format','color','effect','finish']){const text=params.get(key);if(text&&text.length<=(key==='q'?180:120))next[key]=text;}
    return next;
  }
  let state=selectionFromUrl();
  function updateInitialChrome(){
    document.documentElement.dataset.lrfSelectionCategory=state.category;
    document.documentElement.dataset.lrfSelectionPartner=PARTNERS[state.partner]?.slug||'';
  }
  updateInitialChrome();
  const categories=$('#insp-categories'),partnerPanel=$('#partner-panel'),partnerGrid=$('#partner-grid'),partnerTrigger=$('#mobile-partner-trigger'),workspace=$('#partner-workspace'),productGrid=$('#partner-products'),count=$('#partner-count');
  if(!categories||!partnerGrid||!workspace||!productGrid)return;

  function catMeta(c){return c.partners.length?c.partners.join(' · '):'Bientôt disponible'}
  function renderCategories(){categories.innerHTML=CATEGORIES.map(c=>`<button type="button" aria-label="${esc(c.label)}" aria-pressed="${c.id===state.category}" class="category-card ${c.id===state.category?'active':''}" data-cat="${c.id}"><span class="category-icon">${c.icon}</span><span class="category-name">${esc(c.label)}</span><span class="category-meta">${esc(catMeta(c))}</span></button>`).join('')}
  function renderPartners(){const c=CATEGORIES.find(x=>x.id===state.category);const list=[...(c?.partners||[])].sort((a,b)=>c?.id==='meubles'?c.partners.indexOf(a)-c.partners.indexOf(b):String(a).localeCompare(String(b),'fr',{sensitivity:'base'}));$('#partner-panel-title').textContent=c?.label||'Partenaires';partnerGrid.innerHTML=list.length?list.map(name=>{const p=PARTNERS[name];const allowed=hasAccess(p.slug),isBio=name==='Biopietra';return `<button class="partner-card ${name===state.partner?'active':''}" data-partner="${esc(name)}"><img src="${p.logo}" alt="${esc(name)}"><span><strong>${esc(name)}</strong><small>${esc(p.country)}</small>${isBio?'':name==="Petracer's"?'<span class="access">Catalogue & conseils</span>':`<span class="access ${allowed?'':'locked'}">${allowed?'✓ Tarif PRO autorisé':'🔒 Tarif PRO selon compte'}</span>`}</span></button>`}).join(''):`<div class="empty-partner"><strong>Sanitaire</strong><p>Aucun partenaire sanitaire n'est encore intégré.</p></div>`;partnerTrigger.textContent=`☰ Choisir une usine${state.partner?` — ${state.partner}`:''}`}
  function unique(arr){return [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'fr',{numeric:true}))}
  function products(){
    if(state.partner==="Petracer's") return window.LRF_PETRACER_SELECTION?.normaliseProducts(state.category) || [];
    if(state.partner==='Pecchioli Firenze') return window.LRF_PECCHIOLI_SELECTION?.normaliseProducts() || [];
    if(state.partner==='Bulbo') return window.LRF_BULBO_SELECTION?.normaliseProducts() || [];
    if(state.partner==='Biopietra') return window.LRF_BIOPIETRA_SELECTION?.normaliseProducts() || [];
    if(state.partner==='La Fenice') return (window.FENICE_CATALOGUE || []).map(p=>({...p,category:p.productType||'Carrelage',colorFamilies:p.colorFamilies||basicColors(p)}));
    if(state.partner==='View Ceramica' && Array.isArray(window.VIEW_CATALOGUE)) return window.VIEW_CATALOGUE;
    if(state.partner==='Elios Ceramica' && state.poolGroup) return (DATA[state.partner]||[]).filter(window.LRF_ELIOS_SELECTION_MODEL.isPool);
    return DATA[state.partner]||[];
  }
  function imageOf(p){if(state.partner==='La Fenice'&&p.coverImage)return p.coverImage;const first=(state.partner==='Elios Ceramica'&&window.ELIOS_SELECTION_MEDIA?.galleries?.[p.slug]?.[0])||(p.images||[])[0];return (typeof first==='string'?first:first?.url)||'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/03.png'}
  function fillFilters(){
    const data=state.partner==="Petracer's"?products().filter(p=>window.LRF_PETRACER_SELECTION?.matches(p)):state.partner==='Pecchioli Firenze'?products().filter(p=>window.LRF_PECCHIOLI_SELECTION?.matches(p)):state.partner==='Bulbo'?products().filter(p=>window.LRF_BULBO_SELECTION?.matches(p)):products();
    const formats=unique(data.flatMap(p=>p.formats||[]));
    const colors=unique(data.flatMap(p=>p.colorFamilies||p.colors||[]));
    const effects=unique(data.map(p=>p.effect).filter(Boolean));
    const finishes=unique(data.flatMap(p=>p.finishes||[]));
    const fill=(id,vals,label)=>{const el=$(id);if(!el)return;const empty=state.partner==="Petracer's"&&!vals.length;el.hidden=empty;el.style.display=empty?"none":"";el.innerHTML=`<option value="Tous">${label}</option>${vals.map(v=>`<option>${esc(v)}</option>`).join('')}`;const selected=state[id.replace('#v2-','')];if(vals.includes(selected)||selected==='Tous')el.value=selected;};
    const search=$('#v2-search');if(search&&search.value!==state.q)search.value=state.q;
    fill('#v2-format',formats,state.partner==='Biopietra'?'Tous les éléments':state.partner==="Petracer's"&&state.category!=='exception'?'Toutes les dimensions':'Tous les formats');
    fill('#v2-color',colors,'Toutes les couleurs');
    fill('#v2-effect',effects,state.partner==='Biopietra'||state.partner==="Petracer's"?'Toutes les familles':'Tous les effets');
    fill('#v2-finish',finishes,state.partner==='Biopietra'?'Toutes les épaisseurs':'Toutes les finitions');
  }
  function match(p){
    if(state.partner==="Petracer's" && !window.LRF_PETRACER_SELECTION?.matches(p))return false;
    if(state.partner==='Pecchioli Firenze' && !window.LRF_PECCHIOLI_SELECTION?.matches(p))return false;
    if(state.partner==='Bulbo' && !window.LRF_BULBO_SELECTION?.matches(p))return false;
    if(state.partner==='La Fenice' && window.LRF_FENICE_SELECTION?.matchesCatalogue && !window.LRF_FENICE_SELECTION.matchesCatalogue(p))return false;
    const hay=norm([
      p.collection,p.name,p.catalogueLabel,p.slug,p.description,p.category,p.effect,p.badge,p.keywords,...(p.categories||[]),
      ...(p.formats||[]),...(p.colors||[]),...(p.colorFamilies||[]),...(p.finishes||[])
    ].join(' '));
    if(state.q && ['La Fenice','Biopietra','Bulbo','Pecchioli Firenze',"Petracer's"].includes(state.partner)){const terms=state.q.toLowerCase().replace(/\bimitations?\b/g,'effet').replace(/\bpolis?\b/g,'brillant').replace(/\b(carrelages?|la|fenice|biopietra|bulbo|pecchioli|firenze|petracers?|parement|ceramique|céramique|en|de|du|des|pour)\b/g,' ').replace(/(\d)\s*[×x]\s*(?=\d)/g,'$1x').split(/\s+/).map(norm).filter(Boolean);if(!terms.every(t=>hay.includes(t)))return false;}
    else if(state.q){const discovery=state.partner==='Elios Ceramica'&&window.LRF_ELIOS_DISCOVERY; if(discovery?!discovery.matches(p,state.q):!hay.includes(norm(state.q)))return false;}
    if(state.format!=='Tous'&&!(p.formats||[]).some(x=>norm(x)===norm(state.format)))return false;
    if(state.color!=='Tous'&&!(p.colorFamilies||p.colors||[]).some(x=>norm(x)===norm(state.color)))return false;
    if(state.effect!=='Tous'&&norm(p.effect)!==norm(state.effect))return false;
    if(state.finish!=='Tous'&&!(p.finishes||[]).some(x=>norm(x)===norm(state.finish)))return false;
    return true;
  }
  function renderProducts(){
    if(state.partner==='Opal'){
      count.textContent='Catalogue interactif OPAL Home';
      // Access/session refreshes reuse both the initial HTML shell and the live
      // catalogue. A pending module must never be imported/mounted twice.
      let target=productGrid.querySelector('[data-opal-catalogue-content]');
      if(!target){
        productGrid.innerHTML='<section class="opal-selection-catalogue"><a class="opal-full-link" href="opal-catalogue-interactif.html">Ouvrir le catalogue en pleine page ↗</a><div data-opal-catalogue-content></div></section>';
        target=productGrid.querySelector('[data-opal-catalogue-content]');
      }
      if(target.dataset.opalMountState)return;
      target.dataset.opalMountState='loading';
      import('./opal-catalogue.js?v=20261106-firstpaint1').then(module=>{if(target.isConnected)return module.renderOpalCatalogue(target);}).then(()=>{if(target.isConnected)target.dataset.opalMountState='ready';}).catch(()=>{if(target.isConnected){target.dataset.opalMountState='error';target.innerHTML='<p>Le catalogue ne se charge pas. <a href="opal-catalogue-interactif.html">Réessayer en pleine page</a>.</p>';}});
      return;
    }

    const data=products();const matched=data.filter(match);const visible=state.partner==='Elios Ceramica'&&!state.poolGroup?window.LRF_ELIOS_SELECTION_MODEL.groupPools(matched):matched;const found=visible.slice().sort((a,b)=>String(a.name||a.collection||'').localeCompare(String(b.name||b.collection||''),'fr',{numeric:true,sensitivity:'base'}));
    count.textContent=data.length?`${found.length} ${state.poolGroup?('collection'+(found.length>1?'s':'')+' Pool Surfaces'):state.partner==='Elios Ceramica'?('sélection'+(found.length>1?'s':'')):('produit'+(found.length>1?'s':''))}`:'Catalogue produits à intégrer';
    if(state.partner==="Petracer's"){
      count.textContent=data.length?`${found.length} ${state.category==='exception'?'collection':'référence'}${found.length>1?'s':''} Petracer’s`:'Collections Petracer’s';
      productGrid.innerHTML=window.LRF_PETRACER_SELECTION?.renderCards(found)||'';
      return;
    }
    if(state.partner==='Pecchioli Firenze'){
      count.textContent=data.length?`${found.length} création${found.length>1?'s':''} Pecchioli`:'Créations Pecchioli';
      productGrid.innerHTML=window.LRF_PECCHIOLI_SELECTION?.renderCards(found)||'';
      return;
    }
    if(state.partner==='Bulbo'){
      count.textContent=data.length?`${found.length} ${state.category==='meubles'?'meuble':'collection'}${found.length>1?'s':''} BULBO`:'Collections BULBO';
      productGrid.innerHTML=window.LRF_BULBO_SELECTION?.renderCards(found)||'';
      return;
    }
    if(state.partner==='Biopietra'){
      count.textContent=data.length?`${found.length} séries et compositions`:'Chargement du catalogue Biopietra…';
      productGrid.innerHTML=data.length?window.LRF_BIOPIETRA_SELECTION.renderCards(found):'<div class="empty-partner" role="status"><strong>Chargement des séries et des Mix Biopietra…</strong><button type="button" class="pro-link" data-biopietra-retry>Recharger le catalogue</button></div>';
      if(!data.length)window.LRF_BIOPIETRA_LOAD?.().catch(()=>{});
      return;
    }
    if(state.partner==='Bilt'){
      const allowed=hasAccess('bilt');
      count.textContent=allowed?'Catalogue & commande BILT':'Catalogue BILT';
      productGrid.innerHTML=`<section class="empty-partner bilt-selection-space" aria-label="Outillage BILT"><img src="${PARTNERS.Bilt.logo}" alt="Bilt" loading="lazy" decoding="async"><strong>${allowed?'Catalogue BILT 2026 prêt à commander':'Outillage & systèmes de pose BILT'}</strong><p>${allowed?'Choisissez vos produits, quantités et minimums de livraison dans le catalogue professionnel.':'Connectez-vous à votre compte professionnel pour retrouver vos tarifs et commander les produits BILT.'}</p><div><a class="pro-link" href="${allowed?'commande-bilt.html':'tarifs-pro.html'}">${allowed?'Ouvrir le catalogue & commander':'Accès PRO BILT'}</a>${allowed?' <a class="pro-link" href="commande-bilt.html#historique">Historique BILT</a>':''}</div></section>`;
      return;
    }
    if(state.partner==='Randal Pro'){
      count.textContent='Meubles RANDAL';
      productGrid.innerHTML=`
        <section class="randal-selection-card" aria-label="Meubles de salle de bain RANDAL">
          <div class="randal-selection-card__photo" role="img" aria-label="Meuble de salle de bain RANDAL"></div>
          <div class="randal-selection-card__content">
            <span class="randal-selection-card__eyebrow">RANDAL · Salle de bain</span>
            <h3>Configurez votre meuble</h3>
            <p>Choisissez votre collection, votre modèle et vos options.</p>
            <div class="randal-selection-card__actions">
              <a href="configurateurs-randal.html" class="randal-selection-card__button randal-selection-card__button--primary">Configurer mon meuble sur mesure <span aria-hidden="true">→</span></a>
              <a href="randal-catalogue-interactif.html" class="randal-selection-card__button randal-selection-card__button--secondary">Catalogue interactif <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </section>`;
      return;
    }
    if(!data.length && state.partner==='La Fenice'){productGrid.innerHTML='<div class="empty-partner" role="status"><strong>Chargement des collections La Fenice…</strong><p>Catalogues, photos et formats.</p><button type="button" class="pro-link" data-fenice-retry>Recharger le catalogue</button></div>';return;}
    if(!data.length){const p=PARTNERS[state.partner];productGrid.innerHTML=`<div class="empty-partner"><img src="${p.logo}" alt="${esc(state.partner)}"><strong>${esc(state.partner)} est maintenant séparé dans son propre espace.</strong><p>La structure produits, formats, finitions et tarifs PRO est prête. Les références de cette usine seront intégrées depuis son catalogue sans les mélanger aux autres partenaires.</p>${hasAccess(p.slug)?`<a class="pro-link" href="tarifs-pro.html">Voir mon tarif PRO ${esc(state.partner)}</a>`:''}</div>`;return}
    const groupHeader=state.poolGroup?'<div class="pool-group-header"><button type="button" data-pool-back>← Toutes les collections Elios</button><h3>Pool Surfaces</h3><p>Choisissez une collection pour découvrir ses photos et ses coloris.</p></div>':'';
    productGrid.innerHTML=(state.partner==='Neobath'?`<section class="empty-partner"><strong>NEOBATH · ANIMA & DNA</strong><p>Meubles, plans, vasques et miroirs.</p><a class="pro-link" href="neobath-catalogues-interactifs.html">Catalogue interactif ANIMA ↗</a><a class="pro-link" href="neobath-dna-interactif.html">Catalogue interactif DNA ↗</a><a class="pro-link" href="neobath-anima-configurateur.html">Configurateur ANIMA 3D ↗</a></section>`:'')+groupHeader+(found.length?found.map(p=>`<article class="product-card-v2" data-id="${esc(p.id)}"><img src="${esc(imageOf(p))}" alt="${esc(state.partner==='Elios Ceramica'?`${p.name} — Elios Ceramica — ${window.LRF_ELIOS_SEARCH_META?.[p.slug]?.effect||p.effect||p.category}`:p.name)}" loading="lazy" onerror="this.onerror=null;this.src='https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/03.png'"><div class="body"><span class="eyebrow">${esc(state.partner)} · ${esc(p.effect||p.category||'Produit')}</span><h3>${esc(p.name)}</h3><p>${esc(p.description||'')}</p><div class="chips">${[...(p.colorFamilies||[]).slice(0,2),...(p.formats||[]).slice(0,2)].map(x=>`<span>${esc(x)}</span>`).join('')}</div>${p.groupSize?`<span class="pool-group-open">Découvrir les ${p.groupSize} collections →</span>`:''}</div></article>`).join(''):`<div class="empty-partner"><strong>Aucun produit avec ces filtres.</strong><p>Modifiez la recherche, le format, la couleur, l'effet ou la finition.</p></div>`);
  }
  function renderWorkspace(){const previousOpalBadge=state.partner==='Opal'&&productGrid.querySelector('[data-opal-catalogue-content]')?{text:$('#workspace-pro-badge').textContent,className:$('#workspace-pro-badge').className}:null;if(state.partner==="Petracer's")window.LRF_PETRACER_SELECTION?.setCategory?.(state.category);if(state.partner==='Bulbo')window.LRF_BULBO_SELECTION?.setCategory?.(state.category);workspace.dataset.category=state.category;workspace.dataset.partner=state.partner;const p=PARTNERS[state.partner];if(!p){workspace.classList.remove('open');return}workspace.classList.add('open');$('#workspace-logo').src=p.logo;$('#workspace-title').textContent=state.partner;$('#workspace-sub').textContent=state.partner==='Bilt'?'Outillage & systèmes de pose · espace produits dédié':state.poolGroup?'Pool Surfaces · collections piscine':`${p.country} · espace produits dédié`;const allowed=hasAccess(p.slug),isBio=state.partner==='Biopietra';const badge=$('#workspace-pro-badge');badge.style.display='';badge.textContent=allowed?'✓ Tarif PRO accessible':'🔒 Tarif PRO non associé à ce compte';badge.className=`pro-badge${allowed?' allowed':''}`;const link=$('#workspace-pro-link');link.hidden=!allowed;link.style.display=allowed?'inline-flex':'none';link.href=state.partner==='Bilt'&&allowed?'commande-bilt.html':'tarifs-pro.html';link.textContent=state.partner==='Bilt'&&allowed?'Commander BILT':`Voir tarif PRO ${state.partner}`;
    if(state.partner==='Opal'){badge.textContent=previousOpalBadge?.text||'Catalogue · prix publics TTC';badge.className=previousOpalBadge?.className||'pro-badge';link.hidden=true;link.style.display='none';}
    const isRandal=state.partner==='Randal Pro';
    const filters=$('#v2-filters');
    if(filters){
      // RANDAL est du mobilier : les filtres de carreaux et le lexique n'ont rien à faire ici.
      filters.style.display=state.category==='outillages'||state.category==='meubles'&&!["Petracer's",'Bulbo'].includes(state.partner)?'none':'';
      filters.classList.remove('mobile-open');
    }
    const productHint=count?.parentElement?.querySelector('span');
    if(productHint)productHint.textContent=state.partner==='Opal'?'Choisissez un modèle et son format':isRandal?'Choisissez votre meuble et préparez votre commande':'Cliquez sur un produit pour les détails et tarifs PRO';
    for(const[id,label]of [['v2-search','Rechercher dans cette sélection'],['v2-format','Filtrer les formats'],['v2-color','Filtrer les couleurs'],['v2-effect','Filtrer les effets'],['v2-finish','Filtrer les finitions']])document.getElementById(id)?.setAttribute('aria-label',label);
    const poolNav=$('#elios-pool-nav');if(poolNav)poolNav.hidden=state.partner!=='Elios Ceramica';
    $('#elios-all-collections')?.setAttribute('aria-pressed',String(!state.poolGroup));$('#elios-pool-collections')?.setAttribute('aria-pressed',String(state.poolGroup));
    fillFilters();renderProducts();window.LRF_BIOPIETRA_SELECTION?.refreshChrome();window.LRF_BULBO_SELECTION?.refreshChrome();window.LRF_PECCHIOLI_SELECTION?.refreshChrome();window.LRF_PETRACER_SELECTION?.refreshChrome(state.category);window.LRF_UPTREND_SELECTION?.refresh?.();}
  function resetFilters(){state.poolGroup=false;state.q='';state.format=state.color=state.effect=state.finish='Tous';const s=$('#v2-search');if(s)s.value=''}
  function syncSelectionUrl(mode='push',{clearCollection=false}={}){
    const url=new URL(location.href);url.searchParams.delete('cat');
    url.searchParams.set('category',state.poolGroup?'piscine':state.category);
    url.searchParams.set('partner',PARTNERS[state.partner]?.slug||state.partner);
    url.searchParams.delete('pool');
    if(clearCollection)url.searchParams.delete('collection');
    for(const key of ['q','format','color','effect','finish']){
      if(state[key]&&state[key]!=='Tous')url.searchParams.set(key,state[key]);else url.searchParams.delete(key);
    }
    try{const previous=history.state&&typeof history.state==='object'?history.state:{};const snapshot={...previous,lrfSelection:{...state}};
      if(mode==='push'&&url.href!==location.href)history.pushState(snapshot,'',url);else history.replaceState(snapshot,'',url);
    }catch(_){} // Navigation and rendering still work with restricted History APIs.
  }
  function announceSelection(){
    updateInitialChrome();document.documentElement.dataset.lrfSelectionReady='true';
    window.dispatchEvent(new CustomEvent('lrf-selection-ready',{detail:{category:state.category,partner:state.partner,partnerSlug:PARTNERS[state.partner]?.slug||'',poolGroup:state.poolGroup}}));
  }
  function refreshAccess(){renderPartners();renderWorkspace();}
  function chooseCategory(id){const c=CATEGORIES.find(x=>x.id===id);if(!c||state.category===id)return;state.category=id;state.partner=c.partners[0]||'';resetFilters();updateInitialChrome();renderCategories();renderPartners();renderWorkspace();syncSelectionUrl('push',{clearCollection:true});announceSelection();}
  function choosePartner(name){if(!CATEGORIES.find(c=>c.id===state.category)?.partners.includes(name))return;if(state.partner===name){partnerPanel.classList.remove('mobile-open');return;}state.partner=name;resetFilters();updateInitialChrome();renderPartners();renderWorkspace();partnerPanel.classList.remove('mobile-open');syncSelectionUrl('push',{clearCollection:true});announceSelection();}
  window.LRF_SELECTION_NAVIGATION=Object.freeze({read:()=>({...state}),refreshAccess});

  function openProduct(id){
    if(state.partner==="Petracer's" && window.LRF_PETRACER_SELECTION?.openCollection){window.LRF_PETRACER_SELECTION.openCollection(id);return;}
    if(state.partner==='Pecchioli Firenze' && window.LRF_PECCHIOLI_SELECTION?.openCollection){window.LRF_PECCHIOLI_SELECTION.openCollection(id);return;}
    if(state.partner==='Bulbo' && window.LRF_BULBO_SELECTION?.openCollection){window.LRF_BULBO_SELECTION.openCollection(id);return;}
    if(state.partner==='Biopietra' && window.LRF_BIOPIETRA_SELECTION?.openCollection){window.LRF_BIOPIETRA_SELECTION.openCollection(id);return;}
    if(state.partner==='La Fenice' && window.LRF_FENICE_SELECTION?.openCollection){window.LRF_FENICE_SELECTION.openCollection(id);return;}
    if(id==='elios-pool-surfaces'){resetFilters();state.poolGroup=true;renderWorkspace();syncSelectionUrl();announceSelection();workspace.scrollIntoView({behavior:'smooth',block:'start'});return;}
    const p=products().find(x=>x.id===id);if(!p)return;
    const modal=$('#product-modal-v2'),box=$('#product-modal-v2-card');const partner=PARTNERS[state.partner],allowed=hasAccess(partner.slug),dims=p.formats||[];
    let tariff='';
    if(state.partner==='Elios Ceramica'&&dims.length){const api=window.LRF_INSPIRATIONS_PRICING;tariff=`<table class="formats-table"><thead><tr><th>Format</th><th>Tarif PRO</th></tr></thead><tbody>${dims.map(f=>{let val='<span class="price-lock">🔒 Accès PRO</span>';if(allowed&&api?.getPrice){const q=api.getPrice('elios-ceramica',p,f);if(q&&!q.locked&&!q.unavailable)val=`<span class="price-ok">${esc(q.label||q.amount)}</span>`;else if(q?.unavailable)val='<span class="price-lock">Sur demande</span>'}return `<tr><td>${esc(f)}</td><td>${val}</td></tr>`}).join('')}</tbody></table>`}
    else{tariff=allowed?`<p><span class="pro-badge allowed">✓ Tarif PRO accessible</span></p><p>Le tarif de ce partenaire est disponible dans votre espace PRO. Les prix ligne par ligne seront reliés aux produits au fur et à mesure de l'intégration du catalogue.</p><a class="pro-link" href="tarifs-pro.html">Ouvrir le tarif ${esc(state.partner)}</a>`:`<p><span class="pro-badge">🔒 Tarif PRO non associé à ce compte</span></p>`}
    if(state.partner==='Elios Ceramica')tariff += `<div data-tariff-status role="status" ${allowed?'hidden':''} style="margin-top:12px;line-height:1.5"><p data-tariff-message>${window.LRF_AGENT_TARIFFS?.message||'Connectez-vous à l’espace PRO pour afficher vos tarifs.'}</p><button type="button" data-tariff-retry>Réessayer</button> · <a href="tarifs-pro.html">Accès PRO</a></div>`;
    box.innerHTML=`<button class="modal-v2-close" type="button">×</button><div class="modal-v2-main"><img src="${esc(imageOf(p))}" alt="${esc(state.partner==='Elios Ceramica'?`${p.name} — Elios Ceramica — ${window.LRF_ELIOS_SEARCH_META?.[p.slug]?.effect||p.effect||p.category}`:p.name)}" onerror="this.onerror=null;this.src='https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/03.png'"><div class="modal-v2-info"><img src="${partner.logo}" alt="${esc(state.partner)}" style="height:38px;max-width:120px;object-fit:contain"><h2>${esc(p.name)}</h2>${p.collection&&norm(p.collection)!==norm(p.name)?`<p class="product-collection">Collection : ${esc(p.collection)}</p>`:''}<p>${esc(p.description||'')}</p>${(p.colors||[]).length?`<h4>Couleurs / déclinaisons</h4><div class="chips">${p.colors.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}${dims.length?`<h4>Formats</h4><div class="chips">${dims.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}${state.partner==='Elios Ceramica'&&window.LRF_ELIOS_SEARCH_META?.[p.slug]?`<p><a class="pro-link" href="${esc(window.LRF_ELIOS_SEARCH_META[p.slug].page)}">Fiche collection, photos et formats proches</a></p>`:''}<h4>Tarifs professionnels</h4>${tariff}</div></div>`;
    const gallery=(p.images||[]).map(image=>typeof image==='string'?image:image?.url||image?.src).filter(url=>/^(https:\/\/|\/(?!\/)|assets\/)/i.test(url||''));
    const mainPhoto=$('.modal-v2-main > img',box);
    if(mainPhoto && gallery.length>1 && !['Elios Ceramica','View Ceramica'].includes(state.partner)){
      let photoIndex=0;
      const counter=document.createElement('span');mainPhoto.parentElement.style.position='relative';counter.style.cssText='position:absolute;top:12px;left:12px;padding:5px 9px;background:#fffffff0;color:#30372b;border-radius:6px;font-size:12px;pointer-events:none';counter.className='generic-gallery-count';counter.textContent=`1 / ${gallery.length}`;counter.setAttribute('aria-live','polite');mainPhoto.after(counter);
      const show=delta=>{photoIndex=(photoIndex+delta+gallery.length)%gallery.length;mainPhoto.src=gallery[photoIndex];counter.textContent=`${photoIndex+1} / ${gallery.length}`;};
      window.LRF_GALLERY_GESTURES?.bind(mainPhoto,{onSwipe:show,isEnabled:()=>modal.classList.contains('open')});
    }
    modal.classList.add('open');document.body.style.overflow='hidden';$('.modal-v2-close',box).onclick=()=>{modal.classList.remove('open');document.body.style.overflow=''};
  }

  $('#elios-all-collections')?.addEventListener('click',()=>{if(state.partner!=='Elios Ceramica'||!state.poolGroup)return;resetFilters();renderWorkspace();syncSelectionUrl();announceSelection();});
  $('#elios-pool-collections')?.addEventListener('click',()=>{if(state.partner!=='Elios Ceramica'||state.poolGroup)return;resetFilters();state.poolGroup=true;renderWorkspace();syncSelectionUrl();announceSelection();});
  categories.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(b)chooseCategory(b.dataset.cat)});
  partnerGrid.addEventListener('click',e=>{const b=e.target.closest('[data-partner]');if(b)choosePartner(b.dataset.partner)});
  partnerTrigger.onclick=()=>partnerPanel.classList.toggle('mobile-open');
  $('#mobile-filter-trigger').onclick=()=>$('#v2-filters').classList.toggle('mobile-open');
  $('#v2-search').addEventListener('input',e=>{state.q=e.target.value.slice(0,180);renderProducts();syncSelectionUrl('replace');});
  [['#v2-format','format'],['#v2-color','color'],['#v2-effect','effect'],['#v2-finish','finish']].forEach(([id,key])=>{const el=$(id);if(el)el.addEventListener('change',e=>{state[key]=e.target.value;renderProducts();syncSelectionUrl('replace');})});
  productGrid.addEventListener('click',e=>{if(e.target.closest('[data-pool-back]')){resetFilters();renderWorkspace();syncSelectionUrl();announceSelection();workspace.scrollIntoView({behavior:'smooth',block:'start'});return;}const c=e.target.closest('[data-id]');if(c)openProduct(c.dataset.id)});
  $('#product-modal-v2').addEventListener('click',e=>{if(e.target.id==='product-modal-v2'){e.currentTarget.classList.remove('open');document.body.style.overflow=''}});

  window.addEventListener('lrf-pro-session-changed',refreshAccess);
  window.addEventListener('lrf-agent-tariffs-ready',refreshAccess);
  window.addEventListener('pageshow',()=>{if(window.LRF_PRO_SESSION?.read?.())refreshAccess();},{passive:true});

  let requestedPetracerOpened=false;
  function openRequestedPetracer(){const collection=new URLSearchParams(location.search).get('collection');if(!requestedPetracerOpened && state.partner==="Petracer's" && collection && window.LRF_PETRACER_SELECTION?.openCollection(collection))requestedPetracerOpened=true;}
  window.addEventListener('lrf-petracer-data-ready',()=>{if(state.partner==="Petracer's"){fillFilters();renderProducts();openRequestedPetracer();}});
  window.addEventListener('lrf-petracer-data-error',()=>{if(state.partner==="Petracer's")renderProducts();});
  window.addEventListener('lrf-petracer-filter-change',event=>{if(state.partner==="Petracer's"){if(event.detail?.reset){resetFilters();fillFilters();}renderProducts();}});
  let requestedFeniceOpened=false;
  let requestedPecchioliOpened=false;
  function openRequestedPecchioli(){const collection=new URLSearchParams(location.search).get('collection');if(!requestedPecchioliOpened && state.partner==='Pecchioli Firenze' && collection && window.LRF_PECCHIOLI_SELECTION?.openCollection(collection))requestedPecchioliOpened=true;}
  window.addEventListener('lrf-pecchioli-data-ready',()=>{if(state.partner==='Pecchioli Firenze'){fillFilters();renderProducts();openRequestedPecchioli();}});
  window.addEventListener('lrf-pecchioli-data-error',()=>{if(state.partner==='Pecchioli Firenze')renderProducts();});
  window.addEventListener('lrf-pecchioli-filter-change',event=>{if(state.partner==='Pecchioli Firenze'){if(event.detail?.reset){resetFilters();fillFilters();}renderProducts();}});
  let requestedBulboOpened=false;
  function openRequestedBulbo(){const collection=new URLSearchParams(location.search).get('collection');if(!requestedBulboOpened && state.partner==='Bulbo' && collection && window.LRF_BULBO_SELECTION?.openCollection(collection))requestedBulboOpened=true;}
  window.addEventListener('lrf-bulbo-data-ready',()=>{if(state.partner==='Bulbo'){fillFilters();renderProducts();openRequestedBulbo();}});
  window.addEventListener('lrf-bulbo-data-error',()=>{if(state.partner==='Bulbo')renderProducts();});
  window.addEventListener('lrf-bulbo-filter-change',event=>{if(state.partner==='Bulbo'){if(event.detail?.reset){resetFilters();fillFilters();}renderProducts();}});
  function openRequestedFenice(){const collection=new URLSearchParams(location.search).get('collection');if(!requestedFeniceOpened && state.partner==='La Fenice' && collection && window.LRF_FENICE_SELECTION?.openCollection('fenice-'+collection))requestedFeniceOpened=true;}
  window.addEventListener('lrf-fenice-data-ready',()=>{if(state.partner==='La Fenice'){fillFilters();renderProducts();openRequestedFenice();}});
  window.addEventListener('lrf-fenice-filter-change',()=>{if(state.partner==='La Fenice')renderProducts();});
  window.addEventListener('lrf-fenice-data-error',()=>{if(state.partner==='La Fenice')productGrid.innerHTML='<div class="empty-partner" role="alert"><strong>Le catalogue n’a pas pu être chargé.</strong><button type="button" class="pro-link" data-fenice-retry>Réessayer</button></div>';});
  let requestedBiopietraOpened=false;
  function openRequestedBiopietra(){const collection=new URLSearchParams(location.search).get('collection');if(!requestedBiopietraOpened && state.partner==='Biopietra' && collection && window.LRF_BIOPIETRA_SELECTION?.openCollection(collection))requestedBiopietraOpened=true;}
  window.addEventListener('lrf-biopietra-data-ready',()=>{if(state.partner==='Biopietra'){fillFilters();renderProducts();openRequestedBiopietra();}});
  window.addEventListener('lrf-biopietra-data-error',()=>{if(state.partner==='Biopietra')productGrid.innerHTML='<div class="empty-partner" role="alert"><strong>Le catalogue n’a pas pu être chargé.</strong><button type="button" class="pro-link" data-biopietra-retry>Réessayer</button></div>';});
  productGrid.addEventListener('click',event=>{if(event.target.closest('[data-biopietra-retry]'))window.LRF_BIOPIETRA_LOAD?.().catch(()=>{});});
  function openRequestedCollection(){openRequestedPetracer();openRequestedPecchioli();openRequestedFenice();openRequestedBiopietra();openRequestedBulbo();}
  window.addEventListener('popstate',()=>{
    const next=selectionFromUrl();
    const unchanged=Object.keys(DEFAULT_SELECTION).every(key=>next[key]===state[key]);
    state=next;updateInitialChrome();
    if(!unchanged){
      requestedPetracerOpened=requestedPecchioliOpened=requestedFeniceOpened=requestedBiopietraOpened=requestedBulboOpened=false;
      renderCategories();renderPartners();renderWorkspace();openRequestedCollection();
    }
    announceSelection();
  });
  renderCategories();renderPartners();renderWorkspace();openRequestedCollection();announceSelection();
})();

