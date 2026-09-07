(() => {
  'use strict';
  if (window.__LRF_VIEW_ORDER_V3__) return;
  window.__LRF_VIEW_ORDER_V3__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const fr=(v,d=2)=>Number(v||0).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const session=()=>window.LRF_PRO_SESSION?.read?.()||(()=>{try{return JSON.parse(sessionStorage.getItem('lrfProSession')||'null')}catch{return null}})();
  const data=()=> (Array.isArray(window.VIEW_CATALOGUE)?window.VIEW_CATALOGUE:[]).filter(p=>{
    const n=norm(p?.name), c=norm(p?.collection); return n!=='lux'&&n!=='rovereforte'&&!c.includes('ilegni');
  });

  let current=null, mode='availability', lines=[], nextId=1;

  function installStyle(){
    if($('#view-order-v3-style'))return;
    const st=document.createElement('style'); st.id='view-order-v3-style'; st.textContent=`
    .view-order-v3,.view-order-v3 *{box-sizing:border-box}
    .view-order-v3{position:fixed;inset:0;z-index:999999;display:none;background:#fbfaf7;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    .view-order-v3.open{display:block}
    .view-order-shell{width:min(1120px,100%);max-width:100%;margin:0 auto;min-height:100dvh;background:#fbfaf7;overflow-x:hidden}
    .view-order-head{position:sticky!important;top:0!important;z-index:10;display:flex!important;justify-content:space-between;align-items:flex-start;gap:18px;width:100%;height:auto!important;min-height:0!important;max-height:none!important;margin:0!important;padding:18px 20px!important;background:#090909!important;color:#fff!important;border:0!important;border-bottom:2px solid #d4af37!important;overflow:visible!important}
    .view-order-head>div:first-child{flex:1 1 auto;min-width:0;max-width:100%}.view-order-head .eyebrow{display:block;color:#d4af37!important;font-weight:950;font-size:.72rem;letter-spacing:.12em;line-height:1.2}.view-order-head h2{margin:.25rem 0 0!important;color:#fff!important;font-size:clamp(1.45rem,4vw,2rem)!important;line-height:1.12!important;overflow-wrap:anywhere}.view-order-head p{display:block!important;margin:.55rem 0 0!important;color:#ddd!important;font-size:.9rem!important;line-height:1.4!important;max-width:780px;position:static!important;transform:none!important;opacity:1!important;overflow-wrap:anywhere}
    .view-order-close{appearance:none!important;-webkit-appearance:none!important;width:46px!important;height:46px!important;min-width:46px!important;max-width:46px!important;min-height:46px!important;max-height:46px!important;flex:0 0 46px!important;display:grid!important;place-items:center!important;margin:0!important;padding:0 0 3px!important;border:1px solid #d4af37!important;border-radius:50%!important;background:#090909!important;color:#fff!important;box-shadow:none!important;transform:none!important;font-family:Arial,sans-serif!important;font-size:1.65rem!important;font-weight:400!important;line-height:1!important;text-align:center!important;cursor:pointer}
    .view-order-body{padding:18px 20px 26px;max-width:100%}.view-order-notice{position:relative;z-index:1;padding:12px 14px;border:1px solid #acd4ba;border-radius:14px;background:#effaf3;color:#27573d;margin:0 0 16px;line-height:1.45;overflow-wrap:anywhere}
    .view-order-lines{display:grid;gap:14px;min-width:0}.view-order-line{min-width:0;border:1px solid #ded8cc;border-radius:16px;background:#fff;padding:14px;overflow:hidden}.view-order-line-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}
    .view-order-remove{border:1px solid #e1c6c0;background:#fff7f5;color:#9b3326;border-radius:8px;padding:7px 10px;font-weight:800}
    .view-order-grid{display:grid;grid-template-columns:1.2fr 1.2fr .8fr .8fr;gap:10px;min-width:0}.view-order-field{display:flex;flex-direction:column;gap:5px;min-width:0;max-width:100%}.view-order-field label{font-size:.69rem;color:#6b655b;font-weight:900;text-transform:uppercase}
    .view-order-field input,.view-order-field select,.view-order-contact input,.view-order-contact textarea{display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;border:1px solid #d8d0c4;border-radius:10px;background:#fff;padding:11px;font:inherit}.view-order-field select{white-space:nowrap;text-overflow:ellipsis}.view-order-field input[readonly]{background:#f6f3ed}
    .view-order-calc{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;min-width:0}.view-order-stat{min-width:0;background:#f4f1ea;border-radius:11px;padding:10px;overflow:hidden}.view-order-stat span{display:block;font-size:.66rem;color:#777066;font-weight:850;text-transform:uppercase;overflow-wrap:anywhere}.view-order-stat strong{display:block;margin-top:3px;color:#17653d;font-size:.9rem;overflow-wrap:anywhere}
    .view-order-add{margin-top:14px;border:1px solid #b99526;background:#fff;color:#6d5410;border-radius:10px;padding:11px 14px;font-weight:950}.view-order-total{margin-top:18px;padding:14px;border:1px solid #d8c99b;border-radius:14px;background:#fffdf6;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;min-width:0}.view-order-total>div{min-width:0}.view-order-total span{display:block;font-size:.68rem;color:#786d55;font-weight:900;text-transform:uppercase;overflow-wrap:anywhere}.view-order-total strong{display:block;margin-top:4px;overflow-wrap:anywhere}
    .view-order-contact{margin-top:18px;padding-top:18px;border-top:1px solid #e3ddd2;display:grid;grid-template-columns:1fr 1fr;gap:11px;min-width:0}.view-order-contact>div{min-width:0}.view-order-contact .full{grid-column:1/-1}.view-order-contact label{display:block;margin-bottom:5px;font-size:.7rem;color:#625c53;font-weight:900}.view-order-contact textarea{min-height:88px;resize:vertical}.view-order-routing{grid-column:1/-1;padding:10px 12px;border-radius:10px;background:#f2efe8;color:#575149;font-size:.76rem;line-height:1.45;overflow-wrap:anywhere}.view-order-submit{grid-column:1/-1;border:0;background:#176c40;color:#fff;border-radius:11px;padding:14px 16px;font-weight:950;font-size:1rem}.view-order-error{grid-column:1/-1;display:none;padding:9px 11px;border-radius:9px;background:#fff1ef;border:1px solid #efc2ba;color:#9b3326;font-size:.78rem;font-weight:800}.view-order-error.show{display:block}
    @media(max-width:850px){
      .view-order-shell{width:100%;min-height:100dvh}
      .view-order-head{display:block!important;padding:14px 62px 14px 15px!important;min-height:0!important}
      .view-order-head .eyebrow{font-size:.7rem}
      .view-order-head h2{font-size:clamp(1.55rem,7vw,1.9rem)!important;line-height:1.08!important;margin-top:5px!important}
      .view-order-head p{font-size:.82rem!important;line-height:1.35!important;margin-top:8px!important}
      .view-order-close{position:absolute!important;top:13px!important;right:12px!important;width:42px!important;height:42px!important;min-width:42px!important;max-width:42px!important;min-height:42px!important;max-height:42px!important;flex-basis:42px!important;font-size:1.55rem!important;z-index:2}
      .view-order-body{padding:14px 12px max(24px,env(safe-area-inset-bottom));width:100%}
      .view-order-notice{font-size:.9rem;line-height:1.5;padding:13px 14px;border-radius:13px;margin-bottom:14px}
      .view-order-line{padding:12px;border-radius:14px}
      .view-order-line-head{margin-bottom:11px}.view-order-line-head>strong{font-size:1.05rem}
      .view-order-grid{grid-template-columns:minmax(0,1fr);gap:11px}
      .view-order-field[style]{grid-column:auto!important}
      .view-order-field input,.view-order-field select,.view-order-contact input,.view-order-contact textarea{font-size:16px;padding:12px 11px;border-radius:10px}
      .view-order-calc{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .view-order-stat{padding:9px}.view-order-stat span{font-size:.61rem;line-height:1.2}.view-order-stat strong{font-size:.84rem;line-height:1.25}
      .view-order-add{width:100%;margin-top:12px;padding:12px}
      .view-order-contact{grid-template-columns:minmax(0,1fr);gap:11px}
      .view-order-contact .full,.view-order-routing,.view-order-submit,.view-order-error{grid-column:auto}
      .view-order-total{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px}.view-order-total>div:last-child{grid-column:1/-1}
      .view-order-submit{width:100%;min-height:48px;font-size:.95rem}
      .view-order-routing{font-size:.72rem}
    }
    @media(max-width:430px){
      .view-order-head{padding-left:13px!important;padding-right:58px!important}
      .view-order-head h2{font-size:1.65rem!important}
      .view-order-head p{font-size:.79rem!important}
      .view-order-body{padding-left:10px;padding-right:10px}
      .view-order-line{padding:11px}
      .view-order-calc{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
      .view-order-total{grid-template-columns:minmax(0,1fr)}.view-order-total>div:last-child{grid-column:auto}
    }
    `; document.head.appendChild(st);
  }

  function ensure(){
    installStyle(); if($('#view-order-v3'))return;
    const d=document.createElement('div'); d.id='view-order-v3'; d.className='view-order-v3'; d.innerHTML=`
      <div class="view-order-shell" role="dialog" aria-modal="true">
        <div class="view-order-head"><div><span class="eyebrow">VIEW CERAMICA</span><h2 id="view-order-title"></h2><p id="view-order-subtitle"></p></div><button class="view-order-close" type="button" aria-label="Fermer">×</button></div>
        <div class="view-order-body"><div class="view-order-notice">Aucun stock VIEW en temps réel n’est affiché. Le calcul transforme votre besoin en <strong>cartons complets</strong> et affiche automatiquement le <strong>m² réellement commandé</strong>.</div>
        <div id="view-order-lines" class="view-order-lines"></div><button id="view-order-add" class="view-order-add" type="button">＋ Ajouter un produit VIEW</button>
        <div class="view-order-total"><div><span>Besoin total</span><strong id="view-order-total-need">0,00 m²</strong></div><div><span>Total cartons</span><strong id="view-order-total-boxes">0</strong></div><div><span>M² réels commandés</span><strong id="view-order-total-real">0,00 m²</strong></div></div>
        <form id="view-order-form" class="view-order-contact"><div><label>Société</label><input id="view-order-company" required></div><div><label>Contact</label><input id="view-order-contact" required></div><div><label>E-mail</label><input id="view-order-email" type="email"></div><div><label>Téléphone</label><input id="view-order-phone"></div><div class="full"><label>Note / chantier / délai souhaité</label><textarea id="view-order-note"></textarea></div><div class="view-order-routing"><strong>Destinataire VIEW :</strong> Maura — maura@viewceramiche.com<br><strong>Copie :</strong> jerome@leroyfactory.fr · coryne@leroyfactory.fr</div><div id="view-order-error" class="view-order-error"></div><button class="view-order-submit" type="submit" id="view-order-submit"></button></form></div>
      </div>`;
    document.body.appendChild(d);
    $('.view-order-close',d).onclick=close;
    $('#view-order-add',d).onclick=()=>add();
    $('#view-order-lines',d).addEventListener('change',changeLine);
    $('#view-order-lines',d).addEventListener('input',qtyInput);
    $('#view-order-lines',d).addEventListener('click',e=>{const b=e.target.closest('[data-remove]'); if(!b)return; lines=lines.filter(x=>x.id!==Number(b.dataset.remove)); if(!lines.length)add(current); else render();});
    $('#view-order-form',d).addEventListener('submit',submit);
  }

  const productById=id=>data().find(p=>String(p.id)===String(id));
  const variant=line=>productById(line.productId)?.variants?.[line.variantIndex]||null;
  const colors=(p,v)=>[...new Set((v?.colors?.length?v.colors:(p?.colors||[])).filter(Boolean))];
  function normalize(line){const p=productById(line.productId)||data()[0]; if(!p)return line; line.productId=p.id; if(!p.variants?.[line.variantIndex])line.variantIndex=0; const cs=colors(p,p.variants?.[line.variantIndex]); if(!cs.includes(line.color))line.color=cs[0]||''; line.qty=Number(line.qty||0); return line;}
  function add(p=null){const base=p&&data().some(x=>x.id===p.id)?p:data()[0]; if(!base)return; lines.push(normalize({id:nextId++,productId:base.id,variantIndex:0,color:'',qty:0})); render();}
  function calc(line){const v=variant(line),pk=v?.pack,need=Math.max(0,Number(line.qty||0)); if(pk?.m2Box>0){const boxes=need>0?Math.ceil((need/Number(pk.m2Box))-1e-10):0; return{need,boxes,real:boxes*Number(pk.m2Box),m2Box:Number(pk.m2Box),pcsBox:Number(pk.pcsBox||0)}} return{need,boxes:null,real:need,m2Box:null,pcsBox:null};}

  function render(){const host=$('#view-order-lines'); if(!host)return; lines=lines.map(normalize); const d=data(); host.innerHTML=lines.map((line,i)=>{const p=productById(line.productId),vs=p?.variants||[],v=vs[line.variantIndex]||{},cs=colors(p,v),c=calc(line),ref=v.refs?.[line.color]||''; return `<section class="view-order-line" data-line="${line.id}"><div class="view-order-line-head"><strong>Produit ${i+1}</strong>${lines.length>1?`<button class="view-order-remove" type="button" data-remove="${line.id}">Supprimer</button>`:''}</div><div class="view-order-grid"><div class="view-order-field"><label>Produit / collection</label><select data-field="product">${d.map(x=>`<option value="${esc(x.id)}"${x.id===line.productId?' selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="view-order-field"><label>Format / finition</label><select data-field="variant">${vs.map((r,j)=>`<option value="${j}"${j===line.variantIndex?' selected':''}>${esc(r.format||'—')} · ${esc(r.thickness||'')} · ${esc(r.finish||'')}</option>`).join('')}</select></div><div class="view-order-field"><label>Couleur</label><select data-field="color">${cs.map(x=>`<option value="${esc(x)}"${x===line.color?' selected':''}>${esc(x)}</option>`).join('')}</select></div><div class="view-order-field"><label>Besoin (m²)</label><input data-field="qty" type="number" min="0" step="0.01" inputmode="decimal" value="${line.qty>0?esc(line.qty):''}" placeholder="Ex. 42,50"></div><div class="view-order-field" style="grid-column:1/-1"><label>Référence VIEW</label><input readonly value="${esc(ref||'Référence à confirmer')}"></div><div class="view-order-calc"><div class="view-order-stat"><span>Boîtage</span><strong>${c.m2Box?`${fr(c.m2Box)} m²/carton`:'À confirmer'}</strong></div><div class="view-order-stat"><span>Pièces / carton</span><strong>${c.pcsBox?fr(c.pcsBox,0):'—'}</strong></div><div class="view-order-stat"><span>Cartons calculés</span><strong>${c.boxes==null?'À confirmer':c.boxes}</strong></div><div class="view-order-stat"><span>M² réels</span><strong>${fr(c.real)} m²</strong></div></div></div></section>`}).join(''); totals();}
  function totals(){const cs=lines.map(calc),need=cs.reduce((a,c)=>a+c.need,0),boxes=cs.filter(c=>c.boxes!=null).reduce((a,c)=>a+c.boxes,0),unknown=cs.some(c=>c.boxes==null&&c.need>0),real=cs.reduce((a,c)=>a+c.real,0); $('#view-order-total-need').textContent=`${fr(need)} m²`; $('#view-order-total-boxes').textContent=`${boxes}${unknown?' + à confirmer':''}`; $('#view-order-total-real').textContent=`${fr(real)} m²`;}
  function changeLine(e){const el=e.target.closest('[data-field]'),row=e.target.closest('[data-line]'); if(!el||!row)return; const line=lines.find(x=>x.id===Number(row.dataset.line)); if(!line)return; if(el.dataset.field==='product'){line.productId=el.value;line.variantIndex=0;line.color='';} else if(el.dataset.field==='variant'){line.variantIndex=Number(el.value||0);line.color='';} else if(el.dataset.field==='color')line.color=el.value; render();}
  function qtyInput(e){if(e.target.dataset.field!=='qty')return; const row=e.target.closest('[data-line]'),line=lines.find(x=>x.id===Number(row?.dataset.line)); if(!line)return; line.qty=Number(e.target.value||0); render();}

  function currentFromOpenModal(){const title=$('.view-safe-info h2')?.textContent||$('.modal-v2-info h2')?.textContent||''; return data().find(p=>norm(p.name)===norm(title))||null;}
  function closeProductModal(){const m=$('#product-modal-v2'),box=$('#product-modal-v2-card'); if(m)m.classList.remove('open'); if(box){box.className='modal-v2-card';box.innerHTML='';} }
  function open(type){ensure(); current=currentFromOpenModal()||current||data()[0]; closeProductModal(); mode=type==='order'?'order':'availability'; lines=[];nextId=1;add(current); const s=session()||{}; $('#view-order-title').textContent=mode==='order'?'Commande VIEW':'Demande de disponibilité VIEW'; $('#view-order-subtitle').textContent=mode==='order'?'Composez la commande : plusieurs produits peuvent être ajoutés dans la même demande.':'Sélectionnez les références à vérifier : plusieurs produits peuvent être ajoutés dans la même demande.'; $('#view-order-submit').textContent=mode==='order'?'Préparer la commande VIEW':'Préparer la demande de disponibilité'; $('#view-order-company').value=s.societe||s.company||''; $('#view-order-contact').value=s.name||s.contact||''; $('#view-order-email').value=s.email||''; $('#view-order-phone').value=s.phone||s.telephone||''; $('#view-order-note').value=''; $('#view-order-error').classList.remove('show'); $('#view-order-v3').classList.add('open'); document.body.style.overflow='hidden'; window.scrollTo(0,0);}
  function close(){$('#view-order-v3')?.classList.remove('open'); document.body.style.overflow='';}

  function submit(e){e.preventDefault(); const valid=lines.filter(l=>Number(l.qty||0)>0),err=$('#view-order-error'); if(!valid.length){err.textContent='Indiquez une quantité en m² pour au moins un produit.';err.classList.add('show');return;} err.classList.remove('show'); const company=$('#view-order-company').value.trim(),contact=$('#view-order-contact').value.trim(),email=$('#view-order-email').value.trim(),phone=$('#view-order-phone').value.trim(),note=$('#view-order-note').value.trim(),s=session()||{},isOrder=mode==='order'; const blocks=valid.map((line,i)=>{const p=productById(line.productId),v=variant(line)||{},c=calc(line),ref=v.refs?.[line.color]||'à confirmer'; return [`PRODUIT ${i+1} — ${p?.name||'VIEW'}`,`Référence : ${ref}`,`Format : ${v.format||'—'}`,`Épaisseur : ${v.thickness||'—'}`,`Finition : ${v.finish||'—'}`,`Couleur : ${line.color||'—'}`,`Besoin : ${fr(c.need)} m²`,c.m2Box?`Conditionnement : ${fr(c.m2Box)} m²/carton${c.pcsBox?` · ${fr(c.pcsBox,0)} pcs/carton`:''}`:'Conditionnement : à confirmer',c.boxes!=null?`Quantité calculée : ${c.boxes} carton${c.boxes>1?'s':''} = ${fr(c.real)} m²`:`Quantité : ${fr(c.real)} m² — boîtage à confirmer`].join('\n')}); const cs=valid.map(calc),totalNeed=cs.reduce((a,c)=>a+c.need,0),totalReal=cs.reduce((a,c)=>a+c.real,0),totalBoxes=cs.filter(c=>c.boxes!=null).reduce((a,c)=>a+c.boxes,0),unknown=cs.some(c=>c.boxes==null); const subject=`${isOrder?'[COMMANDE VIEW]':'[DISPONIBILITÉ VIEW]'} ${company||contact||'LE ROY FACTORY'} — ${valid.length} produit${valid.length>1?'s':''}`; const body=[isOrder?'COMMANDE VIEW CERAMICA':'DEMANDE DE DISPONIBILITÉ VIEW CERAMICA','',...blocks.flatMap((b,i)=>[b,i<blocks.length-1?'\n------------------------------':'']),'','RÉCAPITULATIF',`Besoin total : ${fr(totalNeed)} m²`,`Total cartons calculés : ${totalBoxes}${unknown?' + conditionnement(s) à confirmer':''}`,`M² réels calculés : ${fr(totalReal)} m²`,'','CLIENT / CONTACT',`Société : ${company||'—'}`,`Contact : ${contact||'—'}`,`E-mail : ${email||'—'}`,`Téléphone : ${phone||'—'}`,`Code client LRF : ${s.codeClient||'—'}`,note?`Note : ${note}`:'','','Merci de confirmer la disponibilité, les références et le conditionnement avant validation définitive.'].filter(v=>v!=='').join('\n'); window.location.href=`mailto:maura@viewceramiche.com?cc=${encodeURIComponent('jerome@leroyfactory.fr,coryne@leroyfactory.fr')}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;}

  document.addEventListener('click',e=>{const card=e.target.closest?.('[data-view-safe-id],[data-view-id]'); if(card){const id=card.dataset.viewSafeId||card.dataset.viewId||'',title=$('h3',card)?.textContent||''; current=productById(id)||data().find(p=>norm(p.name)===norm(title))||current; return;} const action=e.target.closest?.('[data-view-safe-action],[data-view-action]'); if(!action)return; e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); open(action.dataset.viewSafeAction||action.dataset.viewAction||'availability');},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#view-order-v3')?.classList.contains('open')){e.preventDefault();e.stopImmediatePropagation();close();}},true);
})();