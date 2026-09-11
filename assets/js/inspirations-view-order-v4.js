(() => {
  'use strict';
  if (window.__LRF_VIEW_ORDER_V4__) return;
  window.__LRF_VIEW_ORDER_V4__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const fr=(v,d=2)=>Number(v||0).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const session=()=>window.LRF_PRO_SESSION?.read?.()||(()=>{try{return JSON.parse(sessionStorage.getItem('lrfProSession')||'null')}catch{return null}})();
  const data=()=> (Array.isArray(window.VIEW_CATALOGUE)?window.VIEW_CATALOGUE:[]).filter(p=>{
    const n=norm(p?.name),c=norm(p?.collection); return n!=='lux'&&n!=='rovereforte'&&!c.includes('ilegni');
  });

  let current=null, mode='availability', lines=[], nextId=1;

  function installStyle(){
    if($('#view-order-v4-style'))return;
    const st=document.createElement('style');
    st.id='view-order-v4-style';
    st.textContent=`
      .view-order-v4,.view-order-v4 *{box-sizing:border-box}
      .view-order-v4{position:fixed;inset:0;z-index:999999;display:none;background:#fbfaf7;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
      .view-order-v4.open{display:block}
      .view-order-shell{width:min(1120px,100%);margin:0 auto;min-height:100dvh;background:#fbfaf7}
      .view-order-head{position:sticky!important;top:0!important;z-index:10;display:flex!important;justify-content:space-between;align-items:flex-start;gap:18px;padding:18px 20px!important;background:#090909!important;color:#fff!important;border-bottom:2px solid #d4af37!important}
      .view-order-head>div{min-width:0}.view-order-head .eyebrow{display:block;color:#d4af37!important;font-size:.72rem;font-weight:950;letter-spacing:.12em}.view-order-head h2{margin:.25rem 0 0!important;color:#fff!important;font-size:clamp(1.45rem,4vw,2rem)!important;line-height:1.12!important}.view-order-head p{margin:.55rem 0 0!important;color:#ddd!important;font-size:.9rem!important;line-height:1.4!important;max-width:800px}
      .view-order-close{width:46px!important;height:46px!important;min-width:46px!important;flex:0 0 46px!important;display:grid!important;place-items:center!important;padding:0 0 3px!important;border:1px solid #d4af37!important;border-radius:50%!important;background:#090909!important;color:#fff!important;font:400 1.65rem/1 Arial,sans-serif!important;cursor:pointer}
      .view-order-body{padding:18px 20px 26px}.view-order-notice{padding:12px 14px;border:1px solid #acd4ba;border-radius:14px;background:#effaf3;color:#27573d;margin:0 0 16px;line-height:1.45}
      .view-order-lines{display:grid;gap:14px}.view-order-line{border:1px solid #ded8cc;border-radius:16px;background:#fff;padding:14px;overflow:hidden}.view-order-line.accessory{border-color:#dfc46a;background:#fffdf7}.view-order-line-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.view-order-line-head strong{font-size:.95rem}.view-order-kind{display:inline-block;margin-left:.45rem;padding:.2rem .42rem;border-radius:999px;background:#f1eee7;color:#6d665c;font-size:.65rem;font-weight:900}.view-order-line.accessory .view-order-kind{background:#fff1b9;color:#694f08}
      .view-order-remove{border:1px solid #e1c6c0;background:#fff7f5;color:#9b3326;border-radius:8px;padding:7px 10px;font-weight:800;cursor:pointer}
      .view-order-grid{display:grid;grid-template-columns:1.15fr 1.45fr .85fr .75fr;gap:10px}.view-order-field{display:flex;flex-direction:column;gap:5px;min-width:0}.view-order-field label{font-size:.69rem;color:#6b655b;font-weight:900;text-transform:uppercase}.view-order-field input,.view-order-field select,.view-order-contact input,.view-order-contact textarea{display:block;width:100%;min-width:0;border:1px solid #d8d0c4;border-radius:10px;background:#fff;padding:11px;font:inherit}.view-order-field select{white-space:nowrap;text-overflow:ellipsis}.view-order-field input[readonly]{background:#f6f3ed}
      .view-order-calc{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.view-order-stat{min-width:0;background:#f4f1ea;border-radius:11px;padding:10px;overflow:hidden}.view-order-line.accessory .view-order-stat{background:#fff7dc}.view-order-stat span{display:block;font-size:.66rem;color:#777066;font-weight:850;text-transform:uppercase}.view-order-stat strong{display:block;margin-top:3px;color:#17653d;font-size:.9rem;overflow-wrap:anywhere}
      .view-order-add{margin-top:14px;border:1px solid #b99526;background:#fff;color:#6d5410;border-radius:10px;padding:11px 14px;font-weight:950;cursor:pointer}.view-order-total{margin-top:18px;padding:14px;border:1px solid #d8c99b;border-radius:14px;background:#fffdf6;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.view-order-total span{display:block;font-size:.68rem;color:#786d55;font-weight:900;text-transform:uppercase}.view-order-total strong{display:block;margin-top:4px;overflow-wrap:anywhere}
      .view-order-contact{margin-top:18px;padding-top:18px;border-top:1px solid #e3ddd2;display:grid;grid-template-columns:1fr 1fr;gap:11px}.view-order-contact .full{grid-column:1/-1}.view-order-contact label{display:block;margin-bottom:5px;font-size:.7rem;color:#625c53;font-weight:900}.view-order-contact textarea{min-height:88px;resize:vertical}.view-order-routing{grid-column:1/-1;padding:10px 12px;border-radius:10px;background:#f2efe8;color:#575149;font-size:.76rem;line-height:1.45}.view-order-submit{grid-column:1/-1;border:0;background:#176c40;color:#fff;border-radius:11px;padding:14px 16px;font-weight:950;font-size:1rem;cursor:pointer}.view-order-error{grid-column:1/-1;display:none;padding:9px 11px;border-radius:9px;background:#fff1ef;border:1px solid #efc2ba;color:#9b3326;font-size:.78rem;font-weight:800}.view-order-error.show{display:block}
      @media(max-width:850px){.view-order-head{display:block!important;padding:14px 62px 14px 15px!important}.view-order-head h2{font-size:clamp(1.55rem,7vw,1.9rem)!important}.view-order-head p{font-size:.82rem!important}.view-order-close{position:absolute!important;top:13px!important;right:12px!important;width:42px!important;height:42px!important;min-width:42px!important;flex-basis:42px!important;font-size:1.55rem!important}.view-order-body{padding:14px 12px max(24px,env(safe-area-inset-bottom))}.view-order-grid{grid-template-columns:1fr}.view-order-field[style]{grid-column:auto!important}.view-order-field input,.view-order-field select,.view-order-contact input,.view-order-contact textarea{font-size:16px;padding:12px 11px}.view-order-calc{grid-template-columns:repeat(2,minmax(0,1fr))}.view-order-add{width:100%}.view-order-contact{grid-template-columns:1fr}.view-order-contact .full,.view-order-routing,.view-order-submit,.view-order-error{grid-column:auto}.view-order-total{grid-template-columns:repeat(2,minmax(0,1fr))}.view-order-submit{width:100%;min-height:48px}}
      @media(max-width:430px){.view-order-body{padding-left:10px;padding-right:10px}.view-order-line{padding:11px}.view-order-total{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function ensure(){
    installStyle(); if($('#view-order-v4'))return;
    const d=document.createElement('div');
    d.id='view-order-v4'; d.className='view-order-v4';
    d.innerHTML=`<div class="view-order-shell" role="dialog" aria-modal="true"><div class="view-order-head"><div><span class="eyebrow">VIEW CERAMICA</span><h2 id="view-order-title"></h2><p id="view-order-subtitle"></p></div><button class="view-order-close" type="button" aria-label="Fermer">×</button></div><div class="view-order-body"><div class="view-order-notice">Ajoutez dans la même demande les <strong>carreaux, plinthes et pièces spéciales</strong>. Pour les carreaux, le besoin en m² est transformé en cartons complets. Pour les accessoires, indiquez directement le nombre de pièces.</div><div id="view-order-lines" class="view-order-lines"></div><button id="view-order-add" class="view-order-add" type="button">＋ Ajouter un article VIEW</button><div class="view-order-total"><div><span>Besoin carrelage</span><strong id="view-order-total-need">0,00 m²</strong></div><div><span>Cartons calculés</span><strong id="view-order-total-boxes">0</strong></div><div><span>M² réels carrelage</span><strong id="view-order-total-real">0,00 m²</strong></div><div><span>Plinthes / pièces spéciales</span><strong id="view-order-total-pieces">0 pièce</strong></div></div><form id="view-order-form" class="view-order-contact"><div><label>Société</label><input id="view-order-company" required autocomplete="organization"></div><div><label>Contact</label><input id="view-order-contact" required autocomplete="name"></div><div><label>E-mail</label><input id="view-order-email" type="email" autocomplete="email"></div><div><label>Téléphone</label><input id="view-order-phone" autocomplete="tel"></div><div class="full"><label>Note / chantier / délai souhaité</label><textarea id="view-order-note" placeholder="Informations complémentaires…"></textarea></div><div class="view-order-routing"><strong>Destinataire VIEW :</strong> Maura — maura@viewceramiche.com<br><strong>Copie :</strong> jerome@leroyfactory.fr · coryne@leroyfactory.fr</div><div id="view-order-error" class="view-order-error"></div><button class="view-order-submit" type="submit" id="view-order-submit"></button></form></div></div>`;
    document.body.appendChild(d);
    $('.view-order-close',d).addEventListener('click',close);
    $('#view-order-add',d).addEventListener('click',()=>add());
    $('#view-order-lines',d).addEventListener('change',changeLine);
    $('#view-order-lines',d).addEventListener('input',qtyInput);
    $('#view-order-lines',d).addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;lines=lines.filter(x=>x.id!==Number(b.dataset.remove));if(!lines.length)add(current);else render();});
    $('#view-order-form',d).addEventListener('submit',submit);
  }

  const productById=id=>data().find(p=>String(p.id)===String(id));
  function itemList(p){
    if(!p)return[];
    const tiles=(p.variants||[]).map((v,i)=>({...v,_key:`tile-${i}`,_type:'tile',kind:'Carreau',name:'Carreau',unit:'m²'}));
    const accessories=(p.accessories||[]).map((a,i)=>({...a,_key:`accessory-${i}`,_type:'accessory',unit:a.unit||'pièce'}));
    return [...tiles,...accessories];
  }
  function itemOf(line){return itemList(productById(line.productId)).find(x=>x._key===line.itemKey)||null;}
  function colorsOf(p,item){return [...new Set((item?.colors?.length?item.colors:(p?.colors||[])).filter(Boolean))];}
  function itemLabel(item){
    if(item?._type==='accessory')return `${item.kind||'Pièce spéciale'} · ${item.name||''}${item.format?` · ${item.format}`:''}`;
    return `Carreau · ${item?.format||'—'}${item?.finish?` · ${item.finish}`:''}`;
  }
  function normalize(line){
    const p=productById(line.productId)||data()[0]; if(!p)return line;
    line.productId=p.id;
    const items=itemList(p); if(!items.some(x=>x._key===line.itemKey))line.itemKey=items[0]?._key||'';
    const item=itemOf(line); const cs=colorsOf(p,item); if(!cs.includes(line.color))line.color=cs[0]||'';
    line.qty=Number(line.qty||0); return line;
  }
  function add(p=null){
    const base=p&&data().some(x=>x.id===p.id)?p:data()[0]; if(!base)return;
    const first=itemList(base)[0]; lines.push(normalize({id:nextId++,productId:base.id,itemKey:first?._key||'',color:'',qty:0})); render();
  }
  function calc(line){
    const item=itemOf(line), qty=Math.max(0,Number(line.qty||0));
    if(item?._type==='accessory'){
      const pieces=Math.max(0,Math.round(qty)); return{type:'accessory',pieces,need:0,boxes:null,real:0,m2Box:null,pcsBox:null};
    }
    const pk=item?.pack;
    if(pk?.m2Box>0){const boxes=qty>0?Math.ceil((qty/Number(pk.m2Box))-1e-10):0;return{type:'tile',pieces:0,need:qty,boxes,real:boxes*Number(pk.m2Box),m2Box:Number(pk.m2Box),pcsBox:Number(pk.pcsBox||0)}}
    return{type:'tile',pieces:0,need:qty,boxes:null,real:qty,m2Box:null,pcsBox:null};
  }
  function refOf(line,item){return item?.refs?.[line.color]||item?.ref||'';}

  function render(){
    const host=$('#view-order-lines'); if(!host)return;
    lines=lines.map(normalize); const d=data();
    host.innerHTML=lines.map((line,i)=>{
      const p=productById(line.productId),items=itemList(p),item=itemOf(line)||{},cs=colorsOf(p,item),c=calc(line),accessory=item._type==='accessory',ref=refOf(line,item);
      const stat=accessory
        ? `<div class="view-order-stat"><span>Type</span><strong>${esc(item.kind||'Pièce spéciale')}</strong></div><div class="view-order-stat"><span>Unité</span><strong>Pièce</strong></div><div class="view-order-stat"><span>Quantité</span><strong>${c.pieces} pièce${c.pieces>1?'s':''}</strong></div><div class="view-order-stat"><span>Conditionnement</span><strong>À confirmer</strong></div>`
        : `<div class="view-order-stat"><span>Boîtage</span><strong>${c.m2Box?`${fr(c.m2Box)} m²/carton`:'À confirmer'}</strong></div><div class="view-order-stat"><span>Pièces / carton</span><strong>${c.pcsBox?fr(c.pcsBox,0):'—'}</strong></div><div class="view-order-stat"><span>Cartons calculés</span><strong>${c.boxes==null?'À confirmer':c.boxes}</strong></div><div class="view-order-stat"><span>M² réels</span><strong>${fr(c.real)} m²</strong></div>`;
      return `<section class="view-order-line${accessory?' accessory':''}" data-line="${line.id}"><div class="view-order-line-head"><div><strong>Article ${i+1}</strong><span class="view-order-kind">${accessory?esc(item.kind||'Pièce spéciale'):'Carreau'}</span></div>${lines.length>1?`<button class="view-order-remove" type="button" data-remove="${line.id}">Supprimer</button>`:''}</div><div class="view-order-grid"><div class="view-order-field"><label>Collection</label><select data-field="product">${d.map(x=>`<option value="${esc(x.id)}"${x.id===line.productId?' selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="view-order-field"><label>Article / format</label><select data-field="item">${items.map(x=>`<option value="${esc(x._key)}"${x._key===line.itemKey?' selected':''}>${esc(itemLabel(x))}</option>`).join('')}</select></div><div class="view-order-field"><label>Couleur</label><select data-field="color">${cs.length?cs.map(x=>`<option value="${esc(x)}"${x===line.color?' selected':''}>${esc(x)}</option>`).join(''):'<option value="">À confirmer</option>'}</select></div><div class="view-order-field"><label>${accessory?'Quantité (pièces)':'Besoin (m²)'}</label><input data-field="qty" type="number" min="0" step="${accessory?'1':'0.01'}" inputmode="${accessory?'numeric':'decimal'}" value="${line.qty>0?esc(accessory?Math.round(line.qty):line.qty):''}" placeholder="${accessory?'Ex. 12':'Ex. 42,50'}"></div><div class="view-order-field" style="grid-column:1/-1"><label>Référence VIEW</label><input readonly value="${esc(ref||'Référence à confirmer par VIEW')}"></div><div class="view-order-calc">${stat}</div></div></section>`;
    }).join(''); updateTotals();
  }

  function qtyInput(e){if(e.target?.dataset?.field!=='qty')return;const row=e.target.closest('[data-line]'),line=lines.find(x=>x.id===Number(row?.dataset.line));if(!line)return;line.qty=Number(e.target.value||0);render();}
  function changeLine(e){
    const el=e.target.closest('[data-field]'),row=e.target.closest('[data-line]'); if(!el||!row)return;
    const line=lines.find(x=>x.id===Number(row.dataset.line)); if(!line)return;
    if(el.dataset.field==='product'){line.productId=el.value;line.itemKey='';line.color='';line.qty=0;render();return;}
    if(el.dataset.field==='item'){line.itemKey=el.value;line.color='';line.qty=0;render();return;}
    if(el.dataset.field==='color'){line.color=el.value;render();return;}
    if(el.dataset.field==='qty'){line.qty=Number(el.value||0);render();}
  }
  function updateTotals(){
    const cs=lines.map(calc),need=cs.reduce((a,c)=>a+c.need,0),real=cs.reduce((a,c)=>a+c.real,0),boxes=cs.filter(c=>c.boxes!=null).reduce((a,c)=>a+c.boxes,0),unknown=cs.some(c=>c.type==='tile'&&c.boxes==null&&c.need>0),pieces=cs.reduce((a,c)=>a+c.pieces,0);
    $('#view-order-total-need').textContent=`${fr(need)} m²`;
    $('#view-order-total-boxes').textContent=`${boxes}${unknown?' + à confirmer':''}`;
    $('#view-order-total-real').textContent=`${fr(real)} m²`;
    $('#view-order-total-pieces').textContent=`${pieces} pièce${pieces>1?'s':''}`;
  }
  function inferCurrent(){
    if(current&&data().some(p=>p.id===current.id))return current;
    const title=$('.view-safe-info h2')?.textContent||$('.modal-v2-info h2')?.textContent||'';
    return data().find(p=>norm(p.name)===norm(title)||norm(p.collection)===norm(title))||null;
  }
  function open(type,p=null){
    current=p||inferCurrent(); ensure(); mode=type==='order'?'order':'availability'; lines=[];nextId=1;add(current||data()[0]);
    const s=session()||{};
    $('#view-order-title').textContent=mode==='order'?'Commande VIEW':'Demande de disponibilité VIEW';
    $('#view-order-subtitle').textContent=mode==='order'?'Composez la commande avec les carreaux, plinthes et pièces spéciales nécessaires.':'Sélectionnez les carreaux, plinthes et pièces spéciales dont vous souhaitez vérifier la disponibilité.';
    $('#view-order-submit').textContent=mode==='order'?'Préparer la commande VIEW':'Préparer la demande de disponibilité';
    $('#view-order-company').value=s.societe||s.company||''; $('#view-order-contact').value=s.name||s.contact||''; $('#view-order-email').value=s.email||''; $('#view-order-phone').value=s.phone||s.telephone||''; $('#view-order-note').value=''; $('#view-order-error').classList.remove('show');
    $('#view-order-v4').classList.add('open'); document.body.style.overflow='hidden';
  }
  function close(){$('#view-order-v4')?.classList.remove('open');document.body.style.overflow=$('#product-modal-v2')?.classList.contains('open')?'hidden':'';}

  function submit(e){
    e.preventDefault(); const error=$('#view-order-error');
    const company=$('#view-order-company').value.trim(),contact=$('#view-order-contact').value.trim(),email=$('#view-order-email').value.trim(),phone=$('#view-order-phone').value.trim(),note=$('#view-order-note').value.trim();
    const valid=lines.filter(l=>Number(l.qty||0)>0); if(!valid.length){error.textContent='Indiquez une quantité pour au moins un article.';error.classList.add('show');return;} error.classList.remove('show');
    const blocks=valid.map((line,i)=>{
      const p=productById(line.productId),item=itemOf(line)||{},c=calc(line),ref=refOf(line,item)||'à confirmer par VIEW';
      if(item._type==='accessory')return [`ARTICLE ${i+1} — ${p?.name||'VIEW'}`,`Type : ${item.kind||'Pièce spéciale'}`,`Désignation : ${item.name||item.kind||'Pièce spéciale'}`,`Format : ${item.format||'à confirmer'}`,`Couleur : ${line.color||'à confirmer'}`,`Référence : ${ref}`,`Quantité : ${c.pieces} pièce${c.pieces>1?'s':''}`,`Conditionnement : à confirmer par VIEW`].join('\n');
      return [`ARTICLE ${i+1} — ${p?.name||'VIEW'}`,'Type : Carreau',`Référence : ${ref}`,`Format : ${item.format||'—'}`,`Épaisseur : ${item.thickness||'—'}`,`Finition : ${item.finish||'—'}`,`Couleur : ${line.color||'—'}`,`Besoin : ${fr(c.need)} m²`,c.m2Box?`Conditionnement : ${fr(c.m2Box)} m²/carton${c.pcsBox?` · ${fr(c.pcsBox,0)} pcs/carton`:''}`:'Conditionnement : à confirmer',c.boxes!=null?`Quantité calculée : ${c.boxes} carton${c.boxes>1?'s':''} = ${fr(c.real)} m²`:`Quantité : ${fr(c.real)} m² — boîtage à confirmer`].join('\n');
    });
    const cs=valid.map(calc),need=cs.reduce((a,c)=>a+c.need,0),real=cs.reduce((a,c)=>a+c.real,0),boxes=cs.filter(c=>c.boxes!=null).reduce((a,c)=>a+c.boxes,0),unknown=cs.some(c=>c.type==='tile'&&c.boxes==null),pieces=cs.reduce((a,c)=>a+c.pieces,0),s=session()||{},isOrder=mode==='order';
    const subject=`${isOrder?'[COMMANDE VIEW]':'[DISPONIBILITÉ VIEW]'} ${company||contact||'LE ROY FACTORY'} — ${valid.length} article${valid.length>1?'s':''}`;
    const body=[isOrder?'COMMANDE VIEW CERAMICA':'DEMANDE DE DISPONIBILITÉ VIEW CERAMICA','',...blocks.flatMap((b,i)=>[b,i<blocks.length-1?'\n------------------------------':'']),'','RÉCAPITULATIF',`Besoin carrelage : ${fr(need)} m²`,`Total cartons carrelage : ${boxes}${unknown?' + conditionnement(s) à confirmer':''}`,`M² réels carrelage : ${fr(real)} m²`,`Plinthes / pièces spéciales : ${pieces} pièce${pieces>1?'s':''}`,'','CLIENT / CONTACT',`Société : ${company||'—'}`,`Contact : ${contact||'—'}`,`E-mail : ${email||'—'}`,`Téléphone : ${phone||'—'}`,`Code client LRF : ${s.codeClient||'—'}`,note?`Note : ${note}`:'','','Merci de confirmer la disponibilité, les références, tarifs et conditionnements avant validation définitive.'].filter(v=>v!=='').join('\n');
    const to='maura@viewceramiche.com',cc='jerome@leroyfactory.fr,coryne@leroyfactory.fr';
    window.location.href=`mailto:${to}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest?.('[data-view-safe-id],[data-view-id]');
    if(card){const id=card.dataset.viewSafeId||card.dataset.viewId||'',title=$('h3',card)?.textContent||'';current=productById(id)||data().find(p=>norm(p.name)===norm(title))||current;return;}
    const action=e.target.closest?.('[data-view-safe-action],[data-view-action]'); if(!action)return;
    const type=action.dataset.viewSafeAction||action.dataset.viewAction||'availability'; e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open(type);
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#view-order-v4')?.classList.contains('open')){e.preventDefault();e.stopImmediatePropagation();close();}},true);
})();