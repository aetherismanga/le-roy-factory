(() => {
  const CATEGORIES=[
    {id:'carrelage',label:'Carrelage',icon:'▦',partners:['Elios Ceramica','View Ceramica','La Fenice']},
    {id:'exception',label:"Carrelage d'exception",icon:'✦',partners:["Petracer's",'Pecchioli Firenze','Bulbo']},
    {id:'mosaique',label:'Mosaïque',icon:'◈',partners:['Reviglass']},
    {id:'parement',label:'Parement',icon:'▤',partners:['Biopietra']},
    {id:'meubles',label:'Meubles',icon:'▥',partners:['Neobath','Randal Pro']},
    {id:'robinetterie',label:'Robinetterie & miroir',icon:'◉',partners:['Aquahome','Opal']},
    {id:'sanitaire',label:'Sanitaire',icon:'○',partners:[]}
  ];
  const PARTNERS={
    'Elios Ceramica':{slug:'elios-ceramica',logo:'assets/img/elios.png',country:'Italie',data:'elios'},
    'View Ceramica':{slug:'view-ceramica',logo:'assets/img/view.png',country:'Italie'},
    'La Fenice':{slug:'la-fenice',logo:'assets/img/lafenice.png',country:'Italie'},
    "Petracer's":{slug:'petracers',logo:'assets/img/petracer.png',country:'Italie'},
    'Pecchioli Firenze':{slug:'pecchioli-firenze',logo:'assets/img/pecchioli.png',country:'Italie'},
    'Bulbo':{slug:'bulbo',logo:'assets/img/bulbo.png',country:'Italie'},
    'Reviglass':{slug:'reviglass',logo:'assets/img/reviglass.png',country:'Espagne'},
    'Biopietra':{slug:'biopietra',logo:'assets/img/biopietra.png',country:'Italie'},
    'Neobath':{slug:'neobath',logo:'assets/img/neobath.png',country:'Italie',data:'neobath'},
    'Randal Pro':{slug:'randal-pro',logo:'assets/img/randal.png',country:'Espagne'},
    'Aquahome':{slug:'aquahome',logo:'assets/img/aquahome.png',country:'Espagne'},
    'Opal':{slug:'opal',logo:'assets/img/opal.png',country:'Espagne'}
  };
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const session=()=>{try{return JSON.parse(sessionStorage.getItem('lrfProSession')||'null')}catch{return null}};
  const hasAccess=slug=>{const s=session();if(!s||!Array.isArray(s.partenaires))return false;return s.partenaires.some(p=>{const n=norm(p),w=norm(slug);return n===w||n===norm(PARTNERS_BY_SLUG[slug]?.name||'')||(slug==='elios-ceramica'&&(n==='elios'||n==='eliosceramica'))})};
  const PARTNERS_BY_SLUG={};Object.entries(PARTNERS).forEach(([name,p])=>PARTNERS_BY_SLUG[p.slug]={...p,name});

  const eliosImages=window.ELIOS_IMAGE_DATA||{};
  const eliosRaw=Array.isArray(window.ELIOS_CATALOGUE)?window.ELIOS_CATALOGUE:[];
  const neoRaw=Array.isArray(window.NEOBATH_CATALOGUE)?window.NEOBATH_CATALOGUE:[];
  const DATA={
    'Elios Ceramica':eliosRaw.map(p=>({...p,id:`elios-${p.slug}`,name:p.name,description:p.description||'',formats:p.formats||[],colors:p.colors||[],finishes:p.finishes||[],images:(p.gallery||[]).map(k=>eliosImages[k]).filter(Boolean),category:p.category||'Carrelage'})),
    'Neobath':neoRaw.map((p,i)=>({...p,id:p.id||`neo-${i}`,name:p.name||p.collection||`Composition ${i+1}`,description:p.description||'',formats:p.dimensions||p.formats||[],colors:p.colors||[],finishes:p.finishes||[],images:p.images||[],category:p.productType||'Meuble salle de bain'}))
  };

  let state={category:'carrelage',partner:'Elios Ceramica',q:'',format:'Tous',color:'Tous',finish:'Tous'};
  const categories=$('#insp-categories'),partnerPanel=$('#partner-panel'),partnerGrid=$('#partner-grid'),partnerTrigger=$('#mobile-partner-trigger'),workspace=$('#partner-workspace'),productGrid=$('#partner-products'),count=$('#partner-count');
  if(!categories||!partnerGrid||!workspace||!productGrid)return;

  function catMeta(c){return c.partners.length?c.partners.join(' · '):'Bientôt disponible'}
  function renderCategories(){categories.innerHTML=CATEGORIES.map(c=>`<button class="category-card ${c.id===state.category?'active':''}" data-cat="${c.id}"><span class="category-icon">${c.icon}</span><span class="category-name">${esc(c.label)}</span><span class="category-meta">${esc(catMeta(c))}</span></button>`).join('')}
  function renderPartners(){const c=CATEGORIES.find(x=>x.id===state.category);const list=c?.partners||[];$('#partner-panel-title').textContent=c?.label||'Partenaires';partnerGrid.innerHTML=list.length?list.map(name=>{const p=PARTNERS[name];const allowed=hasAccess(p.slug);return `<button class="partner-card ${name===state.partner?'active':''}" data-partner="${esc(name)}"><img src="${p.logo}" alt="${esc(name)}"><span><strong>${esc(name)}</strong><small>${esc(p.country)}</small><span class="access ${allowed?'':'locked'}">${allowed?'✓ Tarif PRO autorisé':'🔒 Tarif PRO selon compte'}</span></span></button>`}).join(''):`<div class="empty-partner"><strong>Sanitaire</strong><p>Aucun partenaire sanitaire n'est encore intégré.</p></div>`;partnerTrigger.textContent=`☰ Choisir une usine${state.partner?` — ${state.partner}`:''}`}
  function unique(arr){return [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'fr',{numeric:true}))}
  function products(){return DATA[state.partner]||[]}
  function imageOf(p){return (p.images||[])[0]||'assets/img/03.png'}
  function fillFilters(){const data=products();const formats=unique(data.flatMap(p=>p.formats||[])),colors=unique(data.flatMap(p=>p.colors||[])),finishes=unique(data.flatMap(p=>p.finishes||[]));const fill=(id,vals,label)=>{const el=$(id);if(!el)return;el.innerHTML=`<option value="Tous">${label}</option>${vals.map(v=>`<option>${esc(v)}</option>`).join('')}`};fill('#v2-format',formats,'Tous les formats');fill('#v2-color',colors,'Toutes les couleurs');fill('#v2-finish',finishes,'Toutes les finitions')}
  function match(p){const hay=norm([p.name,p.description,p.category,...(p.formats||[]),...(p.colors||[]),...(p.finishes||[])].join(' '));if(state.q&&!hay.includes(norm(state.q)))return false;if(state.format!=='Tous'&&!(p.formats||[]).some(x=>norm(x)===norm(state.format)))return false;if(state.color!=='Tous'&&!(p.colors||[]).some(x=>norm(x)===norm(state.color)))return false;if(state.finish!=='Tous'&&!(p.finishes||[]).some(x=>norm(x)===norm(state.finish)))return false;return true}
  function renderProducts(){const data=products();const found=data.filter(match);count.textContent=data.length?`${found.length} produit${found.length>1?'s':''}`:'Catalogue produits à intégrer';if(!data.length){const p=PARTNERS[state.partner];productGrid.innerHTML=`<div class="empty-partner"><img src="${p.logo}" alt="${esc(state.partner)}"><strong>${esc(state.partner)} est maintenant séparé dans son propre espace.</strong><p>La structure produits, formats, finitions et tarifs PRO est prête. Les références de cette usine seront intégrées depuis son catalogue sans les mélanger aux autres partenaires.</p>${hasAccess(p.slug)?`<a class="pro-link" href="tarifs-pro.html">Voir mon tarif PRO ${esc(state.partner)}</a>`:''}</div>`;return}productGrid.innerHTML=found.length?found.map(p=>`<article class="product-card-v2" data-id="${esc(p.id)}"><img src="${esc(imageOf(p))}" alt="${esc(p.name)}" loading="lazy"><div class="body"><span class="eyebrow">${esc(state.partner)} · ${esc(p.category||'Produit')}</span><h3>${esc(p.name)}</h3><p>${esc(p.description||'')}</p><div class="chips">${[...(p.colors||[]).slice(0,2),...(p.formats||[]).slice(0,2)].map(x=>`<span>${esc(x)}</span>`).join('')}</div></div></article>`).join(''):`<div class="empty-partner"><strong>Aucun produit avec ces filtres.</strong><p>Modifiez le format, la couleur ou la finition.</p></div>`}
  function renderWorkspace(){const p=PARTNERS[state.partner];if(!p){workspace.classList.remove('open');return}workspace.classList.add('open');$('#workspace-logo').src=p.logo;$('#workspace-title').textContent=state.partner;$('#workspace-sub').textContent=`${p.country} · espace produits dédié`;const allowed=hasAccess(p.slug);const badge=$('#workspace-pro-badge');badge.textContent=allowed?'✓ Tarif PRO accessible':'🔒 Tarif PRO non associé à ce compte';badge.className=`pro-badge${allowed?' allowed':''}`;const link=$('#workspace-pro-link');link.style.display=allowed?'inline-flex':'none';link.href='tarifs-pro.html';link.textContent=`Voir tarif PRO ${state.partner}`;fillFilters();renderProducts()}
  function chooseCategory(id){state.category=id;const c=CATEGORIES.find(x=>x.id===id);if(!c)return;state.partner=c.partners[0]||'';state.q='';state.format=state.color=state.finish='Tous';renderCategories();renderPartners();renderWorkspace()}
  function choosePartner(name){state.partner=name;state.q='';state.format=state.color=state.finish='Tous';renderPartners();renderWorkspace();partnerPanel.classList.remove('mobile-open')}
  function openProduct(id){const p=products().find(x=>x.id===id);if(!p)return;const modal=$('#product-modal-v2'),box=$('#product-modal-v2-card');const partner=PARTNERS[state.partner],allowed=hasAccess(partner.slug),dims=p.formats||[];let tariff='';if(state.partner==='Elios Ceramica'&&dims.length){const api=window.LRF_INSPIRATIONS_PRICING;tariff=`<table class="formats-table"><thead><tr><th>Format</th><th>Tarif PRO</th></tr></thead><tbody>${dims.map(f=>{let val='<span class="price-lock">🔒 Accès PRO</span>';if(allowed&&api?.getPrice){const q=api.getPrice('elios-ceramica',p,f);if(q&&!q.locked&&!q.unavailable)val=`<span class="price-ok">${esc(q.label||q.amount)}</span>`;else if(q?.unavailable)val='<span class="price-lock">Sur demande</span>'}return `<tr><td>${esc(f)}</td><td>${val}</td></tr>`}).join('')}</tbody></table>`}else{tariff=allowed?`<p><span class="pro-badge allowed">✓ Tarif PRO accessible</span></p><p>Le tarif de ce partenaire est disponible dans votre espace PRO. Les prix ligne par ligne seront reliés aux produits au fur et à mesure de l'intégration du catalogue.</p><a class="pro-link" href="tarifs-pro.html">Ouvrir le tarif ${esc(state.partner)}</a>`:`<p><span class="pro-badge">🔒 Tarif PRO non associé à ce compte</span></p>`}box.innerHTML=`<button class="modal-v2-close" type="button">×</button><div class="modal-v2-main"><img src="${esc(imageOf(p))}" alt="${esc(p.name)}"><div class="modal-v2-info"><img src="${partner.logo}" alt="${esc(state.partner)}" style="height:38px;max-width:120px;object-fit:contain"><h2>${esc(p.name)}</h2><p>${esc(p.description||'')}</p>${(p.colors||[]).length?`<h4>Couleurs</h4><div class="chips">${p.colors.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}${dims.length?`<h4>Formats</h4><div class="chips">${dims.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}<h4>Tarifs professionnels</h4>${tariff}</div></div>`;modal.classList.add('open');document.body.style.overflow='hidden';$('.modal-v2-close',box).onclick=()=>{modal.classList.remove('open');document.body.style.overflow=''}}

  categories.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(b)chooseCategory(b.dataset.cat)});partnerGrid.addEventListener('click',e=>{const b=e.target.closest('[data-partner]');if(b)choosePartner(b.dataset.partner)});partnerTrigger.onclick=()=>partnerPanel.classList.toggle('mobile-open');$('#mobile-filter-trigger').onclick=()=>$('#v2-filters').classList.toggle('mobile-open');$('#v2-search').addEventListener('input',e=>{state.q=e.target.value;renderProducts()});[['#v2-format','format'],['#v2-color','color'],['#v2-finish','finish']].forEach(([id,key])=>$(id).addEventListener('change',e=>{state[key]=e.target.value;renderProducts()}));productGrid.addEventListener('click',e=>{const c=e.target.closest('[data-id]');if(c)openProduct(c.dataset.id)});$('#product-modal-v2').addEventListener('click',e=>{if(e.target.id==='product-modal-v2'){e.currentTarget.classList.remove('open');document.body.style.overflow=''}});

  renderCategories();renderPartners();renderWorkspace();
})();