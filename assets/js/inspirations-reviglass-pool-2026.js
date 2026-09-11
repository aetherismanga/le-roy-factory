(() => {
  'use strict';
  if (window.__LRF_REVIGLASS_POOL_2026__) return;
  window.__LRF_REVIGLASS_POOL_2026__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const euro=v=>Number(v).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';

  const SRC='Tarif Reviglass 2026 · Spécial piscines · Prix nets départ usine Onda H.T.';
  const PACK={
    '2,5 × 2,5':[
      ['Cordon polyuréthane / Papier','2,00 m² / carton','108 m² / palette'],
      ['PVC','2,05 m² / carton','123 m² / palette']
    ],
    '5 × 5':[
      ['Cordon polyuréthane','1,50 m² / carton','81 m² / palette']
    ]
  };

  const s=(name,palette,half,detail)=>({name,palette,half,detail});
  const row=(refs,supports)=>({refs,supports});
  const SERIES=[
    {
      id:'serie-ps-25', name:'Série PS', format:'2,5 × 2,5', type:'Standard',
      rows:[
        row(['PS50','PS53','PS40','PS41'],[
          s('Cordon polyuréthane',11.70,13.40,16.80),
          s('PVC',11.25,12.95,15.90),
          s('Papier',11.25,12.95,15.90)
        ]),
        row(['PS21','PS22','PS23','PS24','PS51','PS52','PS56','PS59'],[
          s('Cordon polyuréthane',11.95,13.65,17.15),
          s('PVC',11.50,13.20,16.20)
        ]),
        row(['PS25','PS54','PS55','PS60'],[
          s('Cordon polyuréthane',13.00,15.00,18.25),
          s('PVC',12.55,14.45,17.40)
        ]),
        row(['PS26','PS27','PS63'],[
          s('Cordon polyuréthane',13.90,16.00,19.90),
          s('PVC',13.45,15.50,19.00)
        ])
      ]
    },
    {
      id:'anti-derapant-25', name:'Antidérapant Cat. C · Classe 3 · R11', format:'2,5 × 2,5', type:'Antidérapant',
      rows:[
        row(['PS40','PS41','PS50','PS53','PS56','PS59'],[
          s('Cordon polyuréthane',17.55,20.20,25.10),
          s('PVC',17.15,19.65,24.25)
        ]),
        row(['PS25','PS55','PS60'],[
          s('Cordon polyuréthane',18.65,21.40,26.25),
          s('PVC',18.15,20.90,25.30)
        ])
      ]
    },
    {
      id:'serie-ps-mezcla', name:'Série PS · Mezcla', format:'2,5 × 2,5', type:'Mélange',
      rows:[row(['TANGANIKA','VICTORIA','NESS','MIX AQUA'],[s('Cordon polyuréthane',12.90,14.80,18.15)])]
    },
    {
      id:'serie-ps-iris', name:'Série PS · Iris', format:'2,5 × 2,5', type:'Iris',
      rows:[row(['PS50','PS53','PS55','PS60','AB02','AB03','AB14'],[s('Cordon polyuréthane',23.00,26.50,32.15)])]
    },
    {
      id:'serie-ps-mix-iris', name:'Série PS · Mix Iris', format:'2,5 × 2,5', type:'Mélange',
      rows:[row(['UROLA','ORIA','URUMEA','BIDASOA','ERNIO','DEBA','CHAVON','ADUR'],[s('Cordon polyuréthane',16.80,19.35,21.80)])]
    },
    {
      id:'pool-selection-2', name:'Pool Selection 2', format:'2,5 × 2,5', type:'Piscine',
      rows:[
        row(['DK-72','DK-74'],[s('Cordon polyuréthane',12.60,14.50,16.70)]),
        row(['DK-70','DK-75','DK-84','DK-87','DK-92','GRIS'],[s('Cordon polyuréthane',15.05,17.30,19.90)]),
        row(['GIAVA','TAHITI','COCOS','SAMOA','PLUTON'],[s('Cordon polyuréthane',15.55,17.85,21.30)]),
        row(['TAMESIS','TIGRIS','NILO','DANUBIO','TIBER','VOLGA','TER'],[s('Cordon polyuréthane',18.15,20.90,24.10)]),
        row(['SENA','INDO','ORINOCO','EBRO','MURRAY','LENA','MARKINA'],[s('Cordon polyuréthane',18.75,21.55,24.70)])
      ]
    },
    {
      id:'mix-luminis-5', name:'Mix Luminis · 5% luminescent', format:'2,5 × 2,5', type:'Luminescent',
      rows:[
        row(['LU-31 ARRAKIS','LU-33 CASTOR','LU-35 GATRIA','LU-39 NAOS'],[s('Cordon polyuréthane',16.30,18.75,22.35)]),
        row(['LU-32 BETRIA','LU-34 ELECTRA','LU-36 KUMA','LU-37 LUCIDA','LU-38 MERAK','LU-40 REGULUS','LU-41 SEAT','LU-42 TABIT','LU-44 BLUE TABIT','LU-46 NEREIDA','LU-47 STELLA','LU-48 TANIA'],[s('Cordon polyuréthane',21.15,24.40,29.10)])
      ]
    },
    {
      id:'luminis-100', name:'Luminis · 100% luminescent', format:'2,5 × 2,5', type:'Luminescent', unit:'m²',
      rows:[
        {refs:['LU-01','LU-02','LU-03','LU-04'],supports:[{name:'Cordon polyuréthane',single:115.00}]},
        {refs:['LU-11','LU-12','LU-13','LU-14','LU-15','LU-16','LU-17','LU-18','LU-19'],supports:[{name:'Cordon polyuréthane',single:100.20}]}
      ]
    },
    {
      id:'paradise-stones-25', name:'Paradise Stones', format:'2,5 × 2,5', type:'Pierre',
      rows:[
        row(['AGUAMARINA','JADE','ZAFIRO'],[s('Cordon polyuréthane',15.55,17.85,20.00)]),
        row(['BLUE BALI','SANDY BALI','GREEN BALI','DEEP RIVER','TURQUESE LAGOON','OK STONE','APATITE'],[s('Cordon polyuréthane',16.80,19.35,21.55)])
      ]
    },
    {
      id:'karma-25', name:'Karma', format:'2,5 × 2,5', type:'Pierre',
      rows:[
        row(['URA','MOANA'],[s('Cordon polyuréthane',15.55,17.85,19.85)]),
        row(['BALI STONE','ALOHA','BLUE MOON'],[s('Cordon polyuréthane',16.80,19.35,21.80)]),
        row(['CALACATTA','TRAVERTINE','SMOKY','BLACK MARBLE','WALLIS','AQUARELA','MEGHAN'],[s('Cordon polyuréthane',18.75,21.55,24.70)])
      ]
    },
    {
      id:'lumak-25', name:'Lumak', format:'2,5 × 2,5', type:'Décor',
      rows:[row(['SWAN','DOVE','ALBATROS','KIWI','FLAMINGO','FALCON'],[s('Cordon polyuréthane',23.00,26.50,32.15)])]
    },
    {
      id:'serie-ps-55', name:'Série PS', format:'5 × 5', type:'Standard',
      rows:[
        row(['PS25','PS50','PS53','PS56','DK72'],[s('Cordon polyuréthane',21.35,24.60,29.10)]),
        row(['PS27','COCOS'],[s('Cordon polyuréthane',23.55,27.20,32.20)])
      ]
    },
    {
      id:'mix-iris-55', name:'Mix Iris', format:'5 × 5', type:'Mélange',
      rows:[
        row(['ORIA','URUMEA','DEBA','UROLA','ERNIO','VOLGA','NILO','DANUBIO'],[s('Cordon polyuréthane',24.15,27.80,33.15)]),
        row(['MURRAY','LENA','ORINOCO'],[s('Cordon polyuréthane',27.05,31.05,37.15)])
      ]
    },
    {
      id:'paradise-stones-55', name:'Paradise Stones', format:'5 × 5', type:'Pierre',
      rows:[
        row(['AGUAMARINA','JADE','ZAFIRO'],[s('Cordon polyuréthane',21.35,24.60,29.35)]),
        row(['SANDY BALI','GREEN BALI'],[s('Cordon polyuréthane',24.15,27.80,33.40)])
      ]
    },
    {
      id:'karma-55', name:'Karma', format:'5 × 5', type:'Pierre',
      rows:[
        row(['URA','MOANA'],[s('Cordon polyuréthane',24.15,27.80,33.15)]),
        row(['BALI STONE','ALOHA','BLUE MOON'],[s('Cordon polyuréthane',26.15,30.05,35.95)]),
        row(['CALACATTA','TRAVERTINE','SMOKY','BLACK MARBLE','WALLIS','AQUARELA','MEGHAN'],[s('Cordon polyuréthane',29.00,33.35,39.95)])
      ]
    },
    {
      id:'lumak-55', name:'Lumak', format:'5 × 5', type:'Décor',
      rows:[row(['SWAN','DOVE','ALBATROS','KIWI','FLAMINGO','FALCON'],[s('Cordon polyuréthane',30.35,34.90,41.90)])]
    },
    {
      id:'nez-marche', name:'Nez de marche antidérapant', format:'Nez de marche', type:'Pièce spéciale', unit:'ml',
      note:'Carton de 5 ml = 100 pièces · Antidérapant classe C / R11',
      rows:[
        {refs:['PS25','PS26','PS27','PS50','PS53','PS55','AGUAMARINA','JADE','ZAFIRO'],supports:[{name:'€/ml',single:27.60}]},
        {refs:['LU-16 YELLOW','LU-18 TURCHESE','LU-11 POLAR'],supports:[{name:'€/ml',single:32.00}]}
      ]
    }
  ];

  const state={q:'',format:'Tous',support:'Tous',type:'Tous'};

  function readSession(){
    try{return window.LRF_PRO_SESSION?.read?.()||JSON.parse(sessionStorage.getItem('lrfProSession')||'null')}catch{return null}
  }
  function hasAccess(){
    const x=readSession(); if(!x)return false;
    const email=norm(x.email||'');
    if(email===norm('jerome@leroyfactory.fr')||email===norm('coryne@leroyfactory.fr'))return true;
    const p=Array.isArray(x.partenaires)?x.partenaires:[];
    return p.some(v=>norm(v)==='reviglass');
  }
  function refsOf(series){return [...new Set(series.rows.flatMap(r=>r.refs||[]))];}
  function supportsOf(series){return [...new Set(series.rows.flatMap(r=>(r.supports||[]).map(s=>s.name)))];}
  function isActive(){return norm($('#workspace-title')?.textContent)==='reviglass';}

  function installStyle(){
    if($('#reviglass-pool-2026-style'))return;
    const st=document.createElement('style');st.id='reviglass-pool-2026-style';st.textContent=`
      .reviglass-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}
      .reviglass-card{border:1px solid #ddd5c8;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 8px 24px rgba(24,21,16,.07);cursor:pointer;text-align:left;color:#1d1b18;padding:0;transition:.18s transform,.18s box-shadow}.reviglass-card:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(24,21,16,.12)}
      .reviglass-card-top{display:flex;align-items:center;gap:13px;padding:15px;border-bottom:1px solid #eee8de;background:linear-gradient(135deg,#fff,#fbf6f1)}.reviglass-card-top img{width:82px;height:48px;object-fit:contain}.reviglass-card-top span{font-size:.68rem;color:#9e183b;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.reviglass-card h3{margin:4px 0 0;font-size:1.05rem}.reviglass-card-body{padding:13px 15px 15px}.reviglass-card-body p{margin:0;color:#6d675f;font-size:.82rem;line-height:1.4}.reviglass-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.reviglass-chips span{padding:5px 8px;border-radius:999px;background:#f3efe8;color:#625a50;font-size:.68rem;font-weight:800}.reviglass-count{margin-top:10px;font-size:.72rem;font-weight:900;color:#9e183b}
      .reviglass-source{grid-column:1/-1;border:1px solid #e1d5c1;background:#fffaf1;border-radius:14px;padding:12px 14px;color:#685a43;font-size:.78rem;line-height:1.45}.reviglass-source strong{color:#2a251e}
      .reviglass-modal{position:fixed;inset:0;z-index:1000010;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(7,8,8,.78)}.reviglass-modal.open{display:flex}.reviglass-modal-card{width:min(1050px,98vw);max-height:94vh;overflow:auto;background:#fff;border-radius:20px;border:1px solid #d4af37;box-shadow:0 28px 90px rgba(0,0,0,.38);color:#211e1a}.reviglass-modal-head{position:sticky;top:0;z-index:3;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:18px 20px;background:#171512;color:#fff;border-bottom:2px solid #d4af37}.reviglass-modal-head .kicker{display:block;color:#e2b93a;font-size:.68rem;font-weight:950;letter-spacing:.12em}.reviglass-modal-head h2{margin:4px 0 0;color:#fff;font:700 clamp(1.45rem,4vw,2rem) Georgia,serif}.reviglass-modal-head p{margin:6px 0 0;color:#ddd;font-size:.82rem}.reviglass-close{width:42px;height:42px;flex:0 0 42px;border-radius:50%;border:1px solid #d4af37;background:#171512;color:#fff;font-size:1.5rem;cursor:pointer}.reviglass-modal-body{padding:16px 18px 24px}.reviglass-ref-group{border:1px solid #e3ddd2;border-radius:14px;overflow:hidden;margin-bottom:12px}.reviglass-ref-list{display:flex;flex-wrap:wrap;gap:6px;padding:11px 12px;background:#fbf9f5;border-bottom:1px solid #e8e1d7}.reviglass-ref-list span{display:inline-flex;padding:5px 8px;border-radius:999px;background:#fff;border:1px solid #ded6c9;font-size:.7rem;font-weight:850}.reviglass-table-wrap{overflow-x:auto}.reviglass-table{width:100%;border-collapse:collapse;min-width:610px}.reviglass-table th,.reviglass-table td{padding:10px 11px;border-bottom:1px solid #eee8de;text-align:left;font-size:.78rem}.reviglass-table th{background:#f5f0e7;color:#675d50;text-transform:uppercase;font-size:.65rem}.reviglass-price{font-weight:950;color:#17633e}.reviglass-lock{display:inline-flex;padding:5px 8px;border-radius:999px;background:#f1eee8;color:#625c53;font-size:.7rem;font-weight:900}.reviglass-pack{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin:14px 0}.reviglass-pack-card{border:1px solid #ded6c8;background:#faf7f1;border-radius:11px;padding:10px}.reviglass-pack-card span{display:block;font-size:.62rem;text-transform:uppercase;color:#7d7468;font-weight:900}.reviglass-pack-card strong{display:block;margin-top:3px;font-size:.8rem}.reviglass-alert{margin-top:14px;padding:11px 12px;border-radius:11px;background:#fff2ef;border:1px solid #efc7bf;color:#8d2e23;font-size:.78rem;font-weight:800}.reviglass-note{margin-top:10px;padding:10px 12px;border-radius:10px;background:#eff7f1;border:1px solid #bcd9c5;color:#315c3d;font-size:.78rem}.reviglass-modal-footer{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}.reviglass-modal-footer a{display:inline-flex;align-items:center;justify-content:center;padding:10px 13px;border-radius:10px;text-decoration:none;font-weight:900}.reviglass-catalogue{border:1px solid #d4af37;background:#171512;color:#f0ca50}.reviglass-pro{border:1px solid #d7d0c5;background:#fff;color:#302b24}
      @media(max-width:700px){.reviglass-grid{grid-template-columns:1fr}.reviglass-modal{padding:0;background:#fbfaf7}.reviglass-modal-card{width:100%;max-height:100dvh;min-height:100dvh;border:0;border-radius:0}.reviglass-modal-head{padding:14px 58px 13px 14px}.reviglass-close{position:absolute;right:10px;top:12px}.reviglass-modal-body{padding:13px 10px 26px}.reviglass-card-top img{width:72px}.reviglass-table th,.reviglass-table td{padding:9px 8px}}
    `;document.head.appendChild(st);
  }

  function configureFilters(){
    const search=$('#v2-search'),format=$('#v2-format'),support=$('#v2-color'),type=$('#v2-effect'),finish=$('#v2-finish');
    if(search){search.placeholder='Rechercher une série ou une référence Reviglass…';search.value=state.q;}
    if(format)format.innerHTML='<option value="Tous">Tous les formats</option><option>2,5 × 2,5</option><option>5 × 5</option><option>Nez de marche</option>';
    if(support)support.innerHTML='<option value="Tous">Tous les supports</option><option>Cordon polyuréthane</option><option>PVC</option><option>Papier</option>';
    if(type)type.innerHTML='<option value="Tous">Tous les types</option>'+[...new Set(SERIES.map(x=>x.type))].map(v=>`<option>${esc(v)}</option>`).join('');
    if(finish){finish.innerHTML='<option value="Tous">Tarif 2026 Piscines</option>';finish.disabled=true;}
    if(format)format.value=state.format;
    if(support)support.value=state.support;
    if(type)type.value=state.type;
  }

  function matches(series){
    const hay=norm([series.name,series.format,series.type,...refsOf(series),...supportsOf(series)].join(' '));
    if(state.q&&!hay.includes(norm(state.q)))return false;
    if(state.format!=='Tous'&&series.format!==state.format)return false;
    if(state.support!=='Tous'&&!supportsOf(series).some(v=>norm(v)===norm(state.support)))return false;
    if(state.type!=='Tous'&&series.type!==state.type)return false;
    return true;
  }

  function render(){
    if(!isActive())return;
    installStyle();configureFilters();
    const host=$('#partner-products'),count=$('#partner-count');if(!host)return;
    const found=SERIES.filter(matches);
    if(count)count.textContent=`${found.length} série${found.length>1?'s':''} tarifaire${found.length>1?'s':''} · ${SERIES.reduce((a,x)=>a+refsOf(x).length,0)} références / désignations`;
    host.className='reviglass-grid';
    host.innerHTML=`<div class="reviglass-source"><strong>${esc(SRC)}</strong><br>Les prix sont affichés uniquement aux comptes autorisés Reviglass. Les références restent consultables pour préparer les commandes et demandes de disponibilité.</div>${found.map(series=>{
      const supports=supportsOf(series), refs=refsOf(series);
      return `<button type="button" class="reviglass-card" data-reviglass-id="${esc(series.id)}"><div class="reviglass-card-top"><img src="assets/img/reviglass.png" alt="Reviglass"><div><span>${esc(series.format)} · ${esc(series.type)}</span><h3>${esc(series.name)}</h3></div></div><div class="reviglass-card-body"><p>${esc(refs.slice(0,6).join(' · '))}${refs.length>6?' …':''}</p><div class="reviglass-chips">${supports.slice(0,3).map(v=>`<span>${esc(v)}</span>`).join('')}</div><div class="reviglass-count">${refs.length} référence${refs.length>1?'s':''} / désignation${refs.length>1?'s':''}</div></div></button>`;
    }).join('')}`;
  }

  function ensureModal(){
    let modal=$('#reviglass-pool-modal');if(modal)return modal;
    modal=document.createElement('div');modal.id='reviglass-pool-modal';modal.className='reviglass-modal';modal.innerHTML='<div class="reviglass-modal-card" role="dialog" aria-modal="true"><div class="reviglass-modal-head"><div><span class="kicker">REVIGLASS · TARIF 2026 PISCINES</span><h2 id="reviglass-modal-title"></h2><p id="reviglass-modal-sub"></p></div><button type="button" class="reviglass-close" aria-label="Fermer">×</button></div><div id="reviglass-modal-body" class="reviglass-modal-body"></div></div>';
    document.body.appendChild(modal);
    const close=()=>{modal.classList.remove('open');document.body.style.overflow='';};
    $('.reviglass-close',modal).onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});
    return modal;
  }

  function priceCell(value,allowed){
    if(value==null)return '—';
    return allowed?`<span class="reviglass-price">${euro(value)} HT/m²</span>`:'<span class="reviglass-lock">🔒 Tarif PRO</span>';
  }

  function openSeries(id){
    const series=SERIES.find(x=>x.id===id);if(!series)return;
    const allowed=hasAccess(),modal=ensureModal();
    $('#reviglass-modal-title',modal).textContent=series.name;
    $('#reviglass-modal-sub',modal).textContent=`Format ${series.format} · ${series.type}`;
    const rows=series.rows.map(r=>`<section class="reviglass-ref-group"><div class="reviglass-ref-list">${r.refs.map(ref=>`<span>${esc(ref)}</span>`).join('')}</div><div class="reviglass-table-wrap"><table class="reviglass-table"><thead><tr><th>Support</th><th>Palette</th><th>½ palette</th><th>Détail</th></tr></thead><tbody>${r.supports.map(sp=>sp.single!=null?`<tr><td>${esc(sp.name)}</td><td colspan="3">${allowed?`<span class="reviglass-price">${euro(sp.single)} HT/${series.unit==='ml'?'ml':'m²'}</span>`:'<span class="reviglass-lock">🔒 Tarif PRO</span>'}</td></tr>`:`<tr><td>${esc(sp.name)}</td><td>${priceCell(sp.palette,allowed)}</td><td>${priceCell(sp.half,allowed)}</td><td>${priceCell(sp.detail,allowed)}</td></tr>`).join('')}</tbody></table></div></section>`).join('');
    const packs=PACK[series.format]||[];
    $('#reviglass-modal-body',modal).innerHTML=`${rows}${packs.length?`<div class="reviglass-pack">${packs.map(p=>`<div class="reviglass-pack-card"><span>${esc(p[0])}</span><strong>${esc(p[1])} · ${esc(p[2])}</strong></div>`).join('')}</div>`:''}${series.note?`<div class="reviglass-note">${esc(series.note)}</div>`:''}<div class="reviglass-alert">Supplément d’emballage : 15 € pour toute commande inférieure à 20 m².</div><div class="reviglass-note">${esc(SRC)}. Les cases non renseignées sur la grille d’origine restent volontairement à « — » : aucun tarif n’est inventé.</div><div class="reviglass-modal-footer"><a class="reviglass-catalogue" href="assets/pdf/REVIGLASS_catalogue%20general-baja.pdf" target="_blank" rel="noopener">Ouvrir le catalogue Reviglass</a>${allowed?'':'<a class="reviglass-pro" href="tarifs-pro.html">Demander / vérifier l’accès PRO</a>'}</div>`;
    modal.classList.add('open');document.body.style.overflow='hidden';
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest?.('[data-reviglass-id]');if(card){e.preventDefault();e.stopImmediatePropagation();openSeries(card.dataset.reviglassId);return;}
  },true);

  document.addEventListener('input',e=>{
    if(!isActive()||e.target?.id!=='v2-search')return;
    e.stopImmediatePropagation();state.q=e.target.value||'';render();
  },true);
  document.addEventListener('change',e=>{
    if(!isActive())return;
    const id=e.target?.id;if(!['v2-format','v2-color','v2-effect','v2-finish'].includes(id))return;
    e.stopImmediatePropagation();
    if(id==='v2-format')state.format=e.target.value;
    if(id==='v2-color')state.support=e.target.value;
    if(id==='v2-effect')state.type=e.target.value;
    render();
  },true);

  const title=$('#workspace-title');
  if(title){new MutationObserver(()=>{if(isActive())setTimeout(render,0);else{const finish=$('#v2-finish');if(finish)finish.disabled=false;}}).observe(title,{childList:true,subtree:true,characterData:true});}
  document.addEventListener('click',e=>{const p=e.target.closest?.('[data-partner]');if(p&&norm(p.dataset.partner)==='reviglass')setTimeout(render,0);},true);
  window.addEventListener('lrf-pro-session-updated',()=>{if(isActive())render()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(isActive())render()},{once:true});else if(isActive())render();
})();
