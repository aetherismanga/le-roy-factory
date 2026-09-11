(() => {
  'use strict';
  if (window.__LRF_BIOPIETRA_2026__) return;
  window.__LRF_BIOPIETRA_2026__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const money=v=>Number(v).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';

  /* Tableau Biopietra 2026 déjà net après déduction commerciale de 40 %. */
  const PRICE={
    C1:1.80,C2:2.70,C3:3.48,C4:5.10,C5:5.70,C6:6.53,C7:7.20,C8:7.80,C9:8.94,C10:9.90,C11:12.00,C12:13.80,C13:15.00,C14:15.96,C15:17.70,C16:19.20,C17:20.88,C18:21.60,C19:22.80,C20:23.40,C21:24.48,C22:25.20,
    C23:26.40,C24:27.60,C25:28.80,C26:29.58,C27:30.00,C28:31.20,C29:32.40,C30:33.60,C31:34.80,C32:36.00,C33:38.40,C34:39.90,C35:41.70,C36:45.90,C37:43.20,C38:43.78,C39:44.10,C40:47.94,C41:47.94,C42:45.00,C43:47.94,C44:46.44,
    C45:47.94,C46:47.94,C47:47.40,C48:47.88,C49:48.00,C50:47.94,C51:49.80,C52:50.40,C53:50.99,C54:51.00,C55:51.60,C56:53.94,C57:52.20,C58:52.80,C59:53.40,C60:53.76,C61:59.34,C62:55.20,C63:56.40,C64:59.88,C65:62.94,C66:64.14,
    C67:62.94,C68:64.14,C69:58.80,C70:59.16,C71:64.14,C72:59.70,C73:59.94,C74:61.20,C75:62.40,C76:63.60,C77:65.40,C78:66.00,C79:69.60,C80:70.80,C81:75.00,C82:77.40,C83:79.20,C84:81.60,C85:84.00,C86:87.00,C87:89.40,C88:94.80,
    C89:97.20,C90:100.80,C91:105.60,C92:114.00,C93:120.00,C94:123.00,C95:126.00,C96:129.00,C97:132.00,C98:135.00,C99:138.00,C100:144.00,C101:150.00,C102:155.40,C103:160.80,C104:165.00,C105:174.00,C106:180.00,C107:192.00,C108:216.00,C109:234.00,C110:252.00
  };

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
      .bio-card-body{padding:12px 15px 15px}.bio-card-body p{margin:0;color:#746d62;font-size:.79rem;line-height:1.4}.bio-card-price{margin-top:10px;font-size:.78rem;font-weight:900;color:#16663e}.bio-card-note{margin-top:7px!important;color:#8c6b16!important;font-weight:800}
      .bio-source{grid-column:1/-1;border:1px solid #ded0a3;background:#fffaf0;border-radius:14px;padding:12px 14px;color:#6c5a32;font-size:.78rem;line-height:1.45}
      .bio-modal{position:fixed;inset:0;z-index:1000020;display:none;background:rgba(8,9,8,.78);padding:16px;overflow:auto;box-sizing:border-box}.bio-modal.open{display:block}.bio-shell{width:min(900px,100%);margin:22px auto;background:#fbfaf7;border:1px solid #d4af37;border-radius:22px;overflow:hidden;box-shadow:0 28px 90px rgba(0,0,0,.42)}
      .bio-head{display:flex;justify-content:space-between;gap:16px;padding:22px 24px;background:#111;color:#fff;border-bottom:3px solid #d4af37}.bio-head small{display:block;color:#d4af37;font-size:.68rem;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.bio-head h2{margin:5px 0 0;color:#fff;font-size:clamp(1.55rem,4vw,2.2rem);line-height:1.1}.bio-close{width:48px;height:48px;flex:0 0 48px;border-radius:50%;border:1px solid #d4af37;background:#111;color:#fff;font-size:1.7rem;cursor:pointer}.bio-body{padding:18px}.bio-discount{padding:11px 13px;border-radius:12px;background:#eef8f0;border:1px solid #b7d8bf;color:#235b37;font-size:.83rem;font-weight:800;margin-bottom:13px}
      .bio-price-list{display:grid;gap:10px}.bio-price-row{display:grid;grid-template-columns:1.4fr .9fr .6fr .9fr;gap:10px;align-items:center;padding:12px;border:1px solid #e1dbcf;border-radius:13px;background:#fff}.bio-price-row .group{font-size:.68rem;color:#7d7569;font-weight:850}.bio-price-row .label{font-weight:900}.bio-price-row .code{font-weight:950;color:#725b13}.bio-price-row .unit{font-size:.78rem;color:#625c53}.bio-price-row .price{text-align:right;font-size:1.05rem;font-weight:950;color:#17653d}.bio-note{margin-top:13px;padding:10px 12px;border-radius:10px;background:#fff7df;color:#715511;font-size:.8rem;font-weight:800}
      @media(max-width:650px){.bio-modal{padding:0;background:#fbfaf7}.bio-shell{margin:0;width:100%;min-height:100dvh;border-radius:0;border-left:0;border-right:0}.bio-head{padding:18px 16px}.bio-body{padding:14px 12px}.bio-price-row{grid-template-columns:1fr auto;gap:6px 10px}.bio-price-row .group{grid-column:1/-1}.bio-price-row .label{grid-column:1/2}.bio-price-row .code{grid-column:2/3;text-align:right}.bio-price-row .unit{grid-column:1/2}.bio-price-row .price{grid-column:2/3}}
    `;document.head.appendChild(st);
  }

  function ensureModal(){
    if($('#biopietra-modal'))return;
    const m=document.createElement('div');m.id='biopietra-modal';m.className='bio-modal';m.innerHTML='<div class="bio-shell" role="dialog" aria-modal="true"><header class="bio-head"><div><small>BIOPIETRA · TARIF PRO 2026</small><h2 id="bio-title"></h2></div><button class="bio-close" type="button" aria-label="Fermer">×</button></header><div id="bio-body" class="bio-body"></div></div>';
    document.body.appendChild(m);
    $('.bio-close',m).addEventListener('click',closeModal);
    m.addEventListener('click',e=>{if(e.target===m)closeModal()});
  }
  function closeModal(){const m=$('#biopietra-modal');m?.classList.remove('open');document.body.style.overflow=''}

  function openProduct(index){
    const p=PRODUCTS[index];if(!p)return;ensureModal();
    $('#bio-title').textContent=p.name;
    const allowed=hasAccess();
    $('#bio-body').innerHTML=`<div class="bio-discount">Prix professionnels affichés après application de la remise de <strong>40 %</strong>. Les plaques sont tarifées au <strong>m²</strong>, les angles au <strong>ml</strong>; les accessoires gardent leur unité catalogue.</div><div class="bio-price-list">${p.lines.map(x=>`<div class="bio-price-row"><div class="group">${esc(x.group)}</div><div class="label">${esc(x.label)}</div><div class="code">${esc(x.code)}</div><div class="unit">Prix / ${esc(x.unit)}</div><div class="price">${allowed?money(PRICE[x.code]):'Tarif PRO masqué'}</div></div>`).join('')}</div>${p.note?`<div class="bio-note">${esc(p.note)}</div>`:''}`;
    const m=$('#biopietra-modal');m.classList.add('open');m.scrollTop=0;document.body.style.overflow='hidden';
  }

  function isBiopietra(){return norm($('#workspace-title')?.textContent)==='biopietra'}
  function render(){
    if(!isBiopietra())return;
    const host=$('#partner-products'),count=$('#partner-count');if(!host||!count)return;
    if(host.dataset.biopietra2026==='1')return;
    host.dataset.biopietra2026='1';host.className='bio-grid';
    count.textContent=`${PRODUCTS.length} produits`;
    const allowed=hasAccess();
    host.innerHTML=`<div class="bio-source"><strong>Biopietra · Liste de prix 2026</strong><br>Codes prix fusionnés avec le catalogue produit. Le tarif affiché est le prix PRO après remise de 40 %. Distinction automatique m² / ml / pièce / sac / boîte.</div>`+PRODUCTS.map((p,i)=>{
      const vals=p.lines.map(x=>PRICE[x.code]).filter(Number.isFinite);const min=vals.length?Math.min(...vals):null;
      return `<button type="button" class="bio-card" data-bio-index="${i}"><div class="bio-card-top"><img src="assets/img/biopietra.png" alt=""><div><small>${esc(p.type)}</small><strong>${esc(p.name)}</strong></div></div><div class="bio-card-body"><p>${p.lines.length} tarif${p.lines.length>1?'s':''} / configuration${p.lines.length>1?'s':''}</p><div class="bio-card-price">${allowed&&min!=null?'À partir de '+money(min):'Voir les références et tarifs'}</div>${p.note?`<p class="bio-card-note">${esc(p.note)}</p>`:''}</div></button>`;
    }).join('');
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

  window.BIOPIETRA_2026={prices:PRICE,products:PRODUCTS};
})();