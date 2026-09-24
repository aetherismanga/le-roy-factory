(() => {
  'use strict';
  if (window.__LRF_BIOPIETRA_2026__) return;
  window.__LRF_BIOPIETRA_2026__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  const line=(label,code,unit,group='Toutes les couleurs')=>({label,code,unit,group});
  const PRODUCTS=[
    {name:'Acropoli',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Angles / Spigoli','C51','ml')]},
    {name:'Bergamo + Mix BER',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Angles / Spigoli','C51','ml')]},
    {name:'Brick Design',type:'Revêtement',lines:[line('Plaques / Fondo','C79','m²'),line('Plaques / Fondo','C83','m²','Couleurs spéciales · Bianco / Quarzo / Vintage')]},
    {name:'Ciottolo River + Mix CIO',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Angles / Spigoli','C51','ml'),line('Plaques / Fondo','C66','m²','Couleurs spéciales · Bianco / Quarzo'),line('Angles / Spigoli','C58','ml','Couleurs spéciales · Bianco / Quarzo')]},
    {name:'Credaro + Mix CRE',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Angles / Spigoli','C51','ml'),line('Plaques / Fondo','C66','m²','Couleurs spéciales · Bianco / Quarzo'),line('Angles / Spigoli','C58','ml','Couleurs spéciales · Bianco / Quarzo')]},
    {name:'Listello Liguria',type:'Listello',lines:[line('Plaques / Fondo','C57','m²'),line('Angles / Spigoli','C36','ml'),line('Plaques / Fondo','C60','m²','Couleurs spéciales · Bianco / Quarzo / Vintage'),line('Angles / Spigoli','C41','ml','Couleurs spéciales · Bianco / Quarzo / Vintage')]},
    {name:'Listello Mattone Antico',type:'Listello',lines:[line('Plaques / Fondo','C57','m²'),line('Angles / Spigoli','C36','ml'),line('Plaques / Fondo','C60','m²','Couleurs spéciales · Bianco / Quarzo / Vintage'),line('Angles / Spigoli','C41','ml','Couleurs spéciales · Bianco / Quarzo / Vintage')]},
    {name:'Listello Toscana · 1,5 cm',type:'Listello',lines:[line('Plaques / Fondo','C40','m²'),line('Angles / Spigoli','C35','ml'),line('Plaques / Fondo','C60','m²','Couleurs spéciales · Bianco / Quarzo / Vintage'),line('Angles / Spigoli','C41','ml','Couleurs spéciales · Bianco / Quarzo / Vintage')]},
    {name:'Listello Toscana · 3 cm',type:'Listello',lines:[line('Plaques / Fondo','C59','m²'),line('Angles / Spigoli','C42','ml'),line('Plaques / Fondo','C60','m²','Couleurs spéciales · Bianco / Quarzo / Vintage'),line('Angles / Spigoli','C41','ml','Couleurs spéciales · Bianco / Quarzo / Vintage')]},
    {name:'Composizioni',type:'Composition',note:'Commande minimum : 6 m²',lines:[line('Plaques / Fondo','C64','m²'),line('Angles / Spigoli','C51','ml')]},
    {name:'Ortisei + Mix ORT',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Angles / Spigoli','C51','ml'),line('Plaques / Fondo','C66','m²','Couleurs spéciales · Bianco / Quarzo'),line('Angles / Spigoli','C58','ml','Couleurs spéciales · Bianco / Quarzo')]},
    {name:'Roccia + Mix ROC',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Angles / Spigoli','C51','ml'),line('Plaques / Fondo','C66','m²','Couleurs spéciales · Bianco / Quarzo'),line('Angles / Spigoli','C58','ml','Couleurs spéciales · Bianco / Quarzo')]},
    {name:'Roma',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Plaques / Fondo','C66','m²','Couleurs spéciales · Bianco / Quarzo')]},
    {name:'Scaglia Carsica',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Angles / Spigoli','C51','ml'),line('Plaques / Fondo','C66','m²','Couleurs spéciales · Bianco / Quarzo'),line('Angles / Spigoli','C58','ml','Couleurs spéciales · Bianco / Quarzo')]},
    {name:'Scaglia Marmolada',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Angles / Spigoli','C51','ml'),line('Plaques / Fondo','C66','m²','Couleurs spéciales · Bianco / Quarzo'),line('Angles / Spigoli','C58','ml','Couleurs spéciales · Bianco / Quarzo')]},
    {name:'Scaglia Montebello',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Angles / Spigoli','C51','ml'),line('Plaques / Fondo','C66','m²','Couleurs spéciales · Bianco / Quarzo'),line('Angles / Spigoli','C58','ml','Couleurs spéciales · Bianco / Quarzo')]},
    {name:'Sierra Nevada + Mix SIE',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Angles / Spigoli','C51','ml'),line('Plaques / Fondo','C66','m²','Couleurs spéciales · Bianco / Quarzo'),line('Angles / Spigoli','C58','ml','Couleurs spéciales · Bianco / Quarzo')]},
    {name:'Spaccatello + Mix SPC',type:'Revêtement',lines:[line('Plaques / Fondo','C79','m²')]},
    {name:'Stelvio + Mix STE',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Angles / Spigoli','C51','ml')]},
    {name:'Travertino',type:'Revêtement',lines:[line('Plaques / Fondo','C64','m²'),line('Plaques / Fondo','C66','m²','Couleurs spéciales · Bianco / Quarzo')]},
    {name:'Inserti pour ORT / STE / ROC / MIX',type:'Pièce spéciale',lines:[line('Boîte','C81','boîte')]},
    {name:'Cornici di finitura',type:'Pièce spéciale',lines:[line('Épaisseur 2,5 cm','C4','pièce'),line('Épaisseur 3,5 cm','C5','pièce'),line('Épaisseur 2,5 cm','C4','pièce','Couleurs spéciales · Bianco / Quarzo'),line('Épaisseur 3,5 cm','C5','pièce','Couleurs spéciales · Bianco / Quarzo')]},
    {name:'Ecokoll · 25 kg',type:'Accessoire pose',lines:[line('Grigio · sac 25 kg','C20','sac')]},
    {name:'Multikoll · 25 kg',type:'Accessoire pose',lines:[line('Grigio · sac 25 kg','C20','sac'),line('Ardesia · sac 25 kg','C22','sac'),line('Bianco · sac 25 kg','C22','sac')]},
    {name:'Biostucco · 25 kg',type:'Accessoire pose',lines:[line('Tous coloris · sac 25 kg','C23','sac')]},
    {name:'Biofin',type:'Accessoire pose',lines:[line('Biofin 1 L','C17','pièce'),line('Biofin 5 L','C56','pièce'),line('Biofin 10 L','C84','pièce')]}
  ];

  function hasAccess(){
    try{
      const s=window.LRF_PRO_SESSION?.read?.()||JSON.parse(sessionStorage.getItem('lrfProSession')||'null');
      if(!s)return false;
      const email=norm(s.email||'');
      if(email==='jerome leroyfactory fr'||email==='coryne leroyfactory fr')return true;
      return (s.partenaires||[]).some(x=>norm(x)==='biopietra');
    }catch{return false}
  }

  function installStyle(){
    if($('#biopietra-2026-style'))return;
    const st=document.createElement('style');st.id='biopietra-2026-style';st.textContent=`
      .bio-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:14px}
      .bio-card{border:1px solid #ddd3c2;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 8px 24px rgba(28,23,15,.07);cursor:pointer;text-align:left;padding:0;color:#201d18;transition:.18s transform,.18s box-shadow}
      .bio-card:hover{transform:translateY(-2px);box-shadow:0 13px 30px rgba(28,23,15,.12)}
      .bio-card-top{padding:15px;background:linear-gradient(135deg,#fbfaf5,#efe9dc);border-bottom:1px solid #e9e1d4;min-height:92px;display:flex;align-items:center;gap:12px}
      .bio-card-top img{width:76px;height:58px;object-fit:contain;background:#fff;border-radius:12px;padding:7px;border:1px solid #ece5d8}.bio-card-top small{display:block;color:#638943;font-size:.68rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.bio-card-top strong{display:block;margin-top:4px;font-size:1.03rem;line-height:1.18}
      .bio-card-body{padding:12px 15px 15px}.bio-card-body p{margin:0;color:#746d62;font-size:.79rem;line-height:1.4}.bio-card-detail{margin-top:10px;font-size:.78rem;font-weight:900;color:#16663e}.bio-card-note{margin-top:7px!important;color:#8c6b16!important;font-weight:800}
      .bio-source{grid-column:1/-1;border:1px solid #ded0a3;background:#fffaf0;border-radius:14px;padding:12px 14px;color:#6c5a32;font-size:.78rem;line-height:1.45}
      .bio-modal{position:fixed;inset:0;z-index:1000020;display:none;background:rgba(8,9,8,.78);padding:16px;overflow:auto;box-sizing:border-box}.bio-modal.open{display:block}.bio-shell{width:min(900px,100%);margin:22px auto;background:#fbfaf7;border:1px solid #d4af37;border-radius:22px;overflow:hidden;box-shadow:0 28px 90px rgba(0,0,0,.42)}
      .bio-head{display:flex;justify-content:space-between;gap:16px;padding:22px 24px;background:#111;color:#fff;border-bottom:3px solid #d4af37}.bio-head small{display:block;color:#d4af37;font-size:.68rem;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.bio-head h2{margin:5px 0 0;color:#fff;font-size:clamp(1.55rem,4vw,2.2rem);line-height:1.1}.bio-close{width:48px;height:48px;flex:0 0 48px;border-radius:50%;border:1px solid #d4af37;background:#111;color:#fff;font-size:1.7rem;cursor:pointer}.bio-body{padding:18px}
      .bio-reference-list{display:grid;gap:10px}.bio-reference-row{display:grid;grid-template-columns:1.4fr .9fr .6fr .9fr;gap:10px;align-items:center;padding:12px;border:1px solid #e1dbcf;border-radius:13px;background:#fff}.bio-reference-row .group{font-size:.68rem;color:#7d7569;font-weight:850}.bio-reference-row .label{font-weight:900}.bio-reference-row .code{font-weight:950;color:#725b13}.bio-reference-row .unit{font-size:.78rem;color:#625c53}.bio-note{margin-top:13px;padding:10px 12px;border-radius:10px;background:#fff7df;color:#715511;font-size:.8rem;font-weight:800}
      @media(max-width:650px){.bio-modal{padding:0;background:#fbfaf7}.bio-shell{margin:0;width:100%;min-height:100dvh;border-radius:0;border-left:0;border-right:0}.bio-head{padding:18px 16px}.bio-body{padding:14px 12px}.bio-price-row{grid-template-columns:1fr auto;gap:6px 10px}.bio-price-row .group{grid-column:1/-1}.bio-price-row .label{grid-column:1/2}.bio-price-row .code{grid-column:2/3;text-align:right}.bio-price-row .unit{grid-column:1/2}.bio-price-row .price{grid-column:2/3}}
    `;document.head.appendChild(st);
  }

  function ensureModal(){
    if($('#biopietra-modal'))return;
    const m=document.createElement('div');m.id='biopietra-modal';m.className='bio-modal';m.innerHTML='<div class="bio-shell" role="dialog" aria-modal="true"><header class="bio-head"><div><small>BIOPIETRA · FICHE PRODUIT</small><h2 id="bio-title"></h2></div><button class="bio-close" type="button" aria-label="Fermer">×</button></header><div id="bio-body" class="bio-body"></div></div>';
    document.body.appendChild(m);
    $('.bio-close',m).addEventListener('click',closeModal);
    m.addEventListener('click',e=>{if(e.target===m)closeModal()});
  }
  function closeModal(){const m=$('#biopietra-modal');m?.classList.remove('open');document.body.style.overflow=''}

  function openProduct(index){
    const p=PRODUCTS[index];if(!p)return;ensureModal();
    $('#bio-title').textContent=p.name;
    $('#bio-body').innerHTML=`<div class="bio-reference-list">${p.lines.map(x=>`<div class="bio-reference-row"><div class="group">${esc(x.group)}</div><div class="label">${esc(x.label)}</div><div class="code">${esc(x.code)}</div><div class="unit">Unité : ${esc(x.unit)}</div></div>`).join('')}</div>${p.note?`<div class="bio-note">${esc(p.note)}</div>`:''}`;
    const m=$('#biopietra-modal');m.classList.add('open');m.scrollTop=0;document.body.style.overflow='hidden';
  }

  function isBiopietra(){return norm($('#workspace-title')?.textContent)==='biopietra'}
  function render(){
    if(!isBiopietra())return;
    const host=$('#partner-products'),count=$('#partner-count');if(!host||!count)return;
    if(host.dataset.biopietra2026==='1')return;
    host.dataset.biopietra2026='1';host.className='bio-grid';
    count.textContent=`${PRODUCTS.length} produits`;
    host.innerHTML=PRODUCTS.map((p,i)=>`<button type="button" class="bio-card" data-bio-index="${i}"><div class="bio-card-top"><img src="assets/img/biopietra.png" alt=""><div><small>${esc(p.type)}</small><strong>${esc(p.name)}</strong></div></div><div class="bio-card-body"><p>${p.lines.length} configuration${p.lines.length>1?'s':''}</p><div class="bio-card-detail">Voir les références et configurations</div>${p.note?`<p class="bio-card-note">${esc(p.note)}</p>`:''}</div></button>`).join('');
  }

  document.addEventListener('click',e=>{
    const c=e.target.closest?.('[data-bio-index]');if(c){e.preventDefault();openProduct(Number(c.dataset.bioIndex));}
  },true);

  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(render,80)};
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',schedule,true);
  window.addEventListener('load',schedule);
  installStyle();ensureModal();schedule();

  window.BIOPIETRA_2026={products:PRODUCTS};
})();