(() => {
  'use strict';
  if (window.__LRF_VIEW_ORDER_V5_POLISH__) return;
  window.__LRF_VIEW_ORDER_V5_POLISH__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let bypassSubmit=false;

  function installStyle(){
    if($('#lrf-view-order-v5-polish-style'))return;
    const st=document.createElement('style');
    st.id='lrf-view-order-v5-polish-style';
    st.textContent=`
      .view-order-v4.open{display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important;background:rgba(8,9,8,.74)!important}
      .view-order-v4 .view-order-shell{width:min(980px,98vw)!important;min-height:0!important;max-height:94vh!important;overflow:auto!important;background:#fff!important;border:1px solid #d4af37!important;border-radius:20px!important;box-shadow:0 28px 90px rgba(0,0,0,.32)!important}
      .view-order-v4 .view-order-head{position:sticky!important;top:0!important;padding:18px 20px!important;background:#171512!important;border-bottom:1px solid #b28b26!important}
      .view-order-v4 .view-order-head h2{font:700 clamp(1.55rem,4vw,1.9rem) Georgia,serif!important}.view-order-v4 .view-order-head p{font-size:.84rem!important;max-width:680px!important;color:#ddd!important}
      .view-order-v4 .view-order-body{padding:18px 20px 24px!important;background:#fff!important}
      .view-order-v4 .view-order-notice{margin:0 0 14px!important;padding:10px 12px!important;border:1px solid #ead78f!important;border-radius:10px!important;background:#fff8df!important;color:#665318!important;font-size:.8rem!important;line-height:1.4!important}
      .view-order-v4 .view-order-line{padding:13px!important;border:1px solid #e0d7c8!important;border-radius:13px!important;background:#fff!important;box-shadow:none!important}
      .view-order-v4 .view-order-line.accessory{background:#fffdf8!important;border-color:#dfd6c4!important}
      .view-order-v4 .view-order-line-head{margin-bottom:10px!important}.view-order-v4 .view-order-kind{background:#f4f0e8!important;color:#675f53!important}.view-order-v4 .view-order-line.accessory .view-order-kind{background:#fff1b9!important;color:#694f08!important}
      .view-kind-switch{grid-column:1/-1;display:flex;gap:7px;flex-wrap:wrap;margin:0 0 2px}.view-kind-switch button{border:1px solid #d8d0c4;background:#fff;color:#5f584d;border-radius:999px;padding:7px 11px;font-size:.72rem;font-weight:900;cursor:pointer}.view-kind-switch button.active{background:#171512;color:#f2cf64;border-color:#b28b26}.view-kind-switch button:disabled{display:none}
      .view-order-v4 .view-order-field label{color:#8d6b18!important}.view-order-v4 .view-order-field input,.view-order-v4 .view-order-field select,.view-order-v4 .view-order-contact input,.view-order-v4 .view-order-contact textarea{border-color:#cfc6b8!important;border-radius:10px!important;padding:10px 11px!important;background:#fff!important}
      .view-order-v4 .view-order-field input:focus,.view-order-v4 .view-order-field select:focus,.view-order-v4 .view-order-contact input:focus,.view-order-v4 .view-order-contact textarea:focus{outline:none!important;border-color:#d4af37!important;box-shadow:0 0 0 3px rgba(212,175,55,.12)!important}
      .view-order-v4 .view-order-calc{gap:7px!important}.view-order-v4 .view-order-stat{background:#f7f3eb!important;padding:9px!important;border-radius:9px!important}.view-order-v4 .view-order-line.accessory .view-order-stat{background:#fff8df!important}.view-order-v4 .view-order-stat strong{color:#57430f!important}
      .view-order-v4 .view-order-add{border-radius:999px!important;padding:9px 13px!important;background:#fff!important;color:#54420f!important}.view-order-v4 .view-order-total{padding:12px!important;margin-top:14px!important;background:#f8f5ee!important;border-radius:12px!important}.view-order-v4 .view-order-total strong{font-size:.92rem!important}
      .view-order-v4 .view-order-contact{margin-top:14px!important;padding-top:14px!important}.view-order-v4 .view-order-routing{background:#f7f3eb!important;border-radius:9px!important}.view-order-v4 .view-order-submit{background:#171512!important;color:#f2cf64!important;border:1px solid #b28b26!important;border-radius:10px!important}
      .view-review-overlay{position:fixed;inset:0;z-index:1000002;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(8,9,8,.76)}.view-review-overlay.open{display:flex}.view-review-modal{width:min(900px,98vw);max-height:94vh;overflow:auto;background:#fff;border:1px solid #d4af37;border-radius:20px;padding:20px;color:#211d17;box-shadow:0 28px 90px rgba(0,0,0,.35)}
      .view-review-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;border-bottom:1px solid #ece5d8;padding-bottom:13px}.view-review-head .kicker{display:block;font-size:.62rem;letter-spacing:.13em;font-weight:900;color:#9a7620}.view-review-head h2{margin:3px 0 0;font:700 1.55rem Georgia,serif}.view-review-head p{margin:5px 0 0;color:#71695d;font-size:.82rem}.view-review-close{border:0;background:#171512;color:#fff;width:38px;height:38px;border-radius:50%;font-size:1.25rem;cursor:pointer;flex:0 0 auto}
      .view-review-lines{display:grid;gap:8px;margin-top:14px}.view-review-line{border:1px solid #e3ddd1;border-radius:11px;padding:11px;background:#fff}.view-review-line-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.view-review-line-head strong{font-size:.88rem}.view-review-line-head span{font-size:.7rem;font-weight:900;color:#856515}.view-review-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:9px}.view-review-meta div{background:#f7f3eb;border-radius:8px;padding:8px}.view-review-meta span{display:block;font-size:.61rem;text-transform:uppercase;color:#746d62;font-weight:900}.view-review-meta strong{display:block;margin-top:3px;font-size:.78rem;overflow-wrap:anywhere}
      .view-review-contact{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:13px}.view-review-card{border:1px solid #e4ddd2;background:#faf8f3;border-radius:10px;padding:10px}.view-review-card span{display:block;font-size:.62rem;text-transform:uppercase;color:#777065;font-weight:900}.view-review-card strong{display:block;margin-top:3px;font-size:.82rem;overflow-wrap:anywhere}.view-review-card.full{grid-column:1/-1}.view-review-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:16px}.view-review-actions button{border-radius:10px;padding:11px 14px;font-weight:900;cursor:pointer}.view-review-back{background:#fff;border:1px solid #d5cdbf;color:#333}.view-review-send{background:#171512;color:#f2cf64;border:1px solid #b28b26}
      @media(max-width:700px){.view-order-v4.open{display:block!important;padding:0!important;background:#fbfaf7!important}.view-order-v4 .view-order-shell{width:100%!important;max-width:none!important;min-height:100dvh!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}.view-order-v4 .view-order-head{padding:14px 58px 13px 14px!important}.view-order-v4 .view-order-body{padding:12px 10px max(24px,env(safe-area-inset-bottom))!important}.view-order-v4 .view-order-notice{font-size:.76rem!important;padding:9px 10px!important}.view-order-v4 .view-order-total{grid-template-columns:1fr 1fr!important}.view-kind-switch{gap:6px}.view-kind-switch button{flex:1 1 auto;padding:8px 9px}.view-review-overlay{padding:0;background:#fbfaf7}.view-review-modal{width:100%;max-height:100dvh;min-height:100dvh;border:0;border-radius:0;padding:14px 12px 24px}.view-review-meta{grid-template-columns:1fr 1fr}.view-review-contact{grid-template-columns:1fr}.view-review-card.full{grid-column:auto}.view-review-actions{position:sticky;bottom:0;background:#fff;padding:10px 0 0;flex-direction:column-reverse}.view-review-actions button{width:100%}}
    `;
    document.head.appendChild(st);
  }

  function groupOfText(text){const t=norm(text);if(t.startsWith('carreau'))return'tile';if(t.startsWith('plinthe'))return'plinth';return'special';}
  function groupLabel(group){return group==='tile'?'Carrelage':group==='plinth'?'Plinthes':'Pièces spéciales';}
  function cleanLabel(text,group){
    let t=String(text||'').trim();
    if(group==='tile')return t.replace(/^Carreau\s*·\s*/i,'');
    if(group==='plinth')return t.replace(/^Plinthe\s*·\s*Plinthe\s*·\s*/i,'').replace(/^Plinthe\s*·\s*/i,'');
    return t.replace(/^Pi[eè]ce sp[eé]ciale\s*·\s*/i,'');
  }

  function decorateRow(row){
    const select=$('select[data-field="item"]',row);if(!select||select.dataset.viewV5==='1')return;
    const options=[...select.options].map(o=>({value:o.value,text:o.textContent,selected:o.selected,group:groupOfText(o.textContent)}));
    if(!options.length)return;
    const current=options.find(o=>o.selected)||options[0];const active=current.group;
    const groups=['tile','plinth','special'].filter(g=>options.some(o=>o.group===g));
    const field=select.closest('.view-order-field');if(!field)return;
    const sw=document.createElement('div');sw.className='view-kind-switch';sw.setAttribute('aria-label','Type d’article');
    groups.forEach(g=>{const b=document.createElement('button');b.type='button';b.textContent=groupLabel(g);b.className=g===active?'active':'';b.dataset.group=g;b.addEventListener('click',()=>{if(g===active)return;const candidates=options.filter(o=>o.group===g);if(!candidates.length)return;select.innerHTML=candidates.map((o,i)=>`<option value="${esc(o.value)}"${i===0?' selected':''}>${esc(cleanLabel(o.text,g))}</option>`).join('');select.dispatchEvent(new Event('change',{bubbles:true}));});sw.appendChild(b)});
    field.parentElement.insertBefore(sw,field);
    const filtered=options.filter(o=>o.group===active);
    select.innerHTML=filtered.map(o=>`<option value="${esc(o.value)}"${o.value===current.value?' selected':''}>${esc(cleanLabel(o.text,active))}</option>`).join('');
    select.dataset.viewV5='1';
    const label=$('label',field);if(label)label.textContent=active==='tile'?'Format / finition':active==='plinth'?'Format de plinthe':'Pièce spéciale / format';
  }

  function polishDialog(){
    const dialog=$('#view-order-v4');if(!dialog)return;
    const note=$('.view-order-notice',dialog);if(note)note.innerHTML='Choisissez d’abord le <strong>type d’article</strong>, puis le format et la couleur. Les carreaux sont calculés en cartons complets ; les accessoires en pièces.';
    $$('.view-order-line',dialog).forEach(decorateRow);
  }

  function ensureReview(){
    let o=$('#view-order-v5-review');if(o)return o;
    o=document.createElement('div');o.id='view-order-v5-review';o.className='view-review-overlay';o.innerHTML=`<div class="view-review-modal"><div class="view-review-head"><div><span class="kicker">VÉRIFICATION AVANT ENVOI</span><h2 id="view-review-title">Aperçu</h2><p>Contrôlez la demande. Vous pouvez revenir en arrière avant l’envoi.</p></div><button type="button" class="view-review-close" aria-label="Fermer">×</button></div><div id="view-review-content"></div><div class="view-review-actions"><button type="button" class="view-review-back">Modifier</button><button type="button" class="view-review-send">Envoyer via e-mail</button></div></div>`;document.body.appendChild(o);
    const close=()=>o.classList.remove('open');$('.view-review-close',o).onclick=close;$('.view-review-back',o).onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    $('.view-review-send',o).onclick=()=>{const form=$('#view-order-form');if(!form)return;bypassSubmit=true;close();form.requestSubmit();setTimeout(()=>{bypassSubmit=false},0)};
    return o;
  }

  function buildReview(){
    const order=$('#view-order-v4');if(!order)return;
    const rows=$$('.view-order-line',order).map((row,i)=>{
      const qty=Number($('input[data-field="qty"]',row)?.value||0);if(!(qty>0))return'';
      const collection=$('select[data-field="product"] option:checked',row)?.textContent||'VIEW';
      const item=$('select[data-field="item"] option:checked',row)?.textContent||'—';
      const color=$('select[data-field="color"] option:checked',row)?.textContent||'—';
      const ref=$('.view-order-field input[readonly]',row)?.value||'À confirmer par VIEW';
      const kind=$('.view-kind-switch button.active',row)?.textContent||$('.view-order-kind',row)?.textContent||'Article';
      const stats=$$('.view-order-stat',row).map(s=>({label:$('span',s)?.textContent||'',value:$('strong',s)?.textContent||''}));
      return `<div class="view-review-line"><div class="view-review-line-head"><strong>${esc(collection)} · ${esc(item)}</strong><span>${esc(kind)}</span></div><div class="view-review-meta"><div><span>Couleur</span><strong>${esc(color)}</strong></div><div><span>Référence</span><strong>${esc(ref)}</strong></div><div><span>Quantité demandée</span><strong>${esc(String(qty))}${norm(kind).includes('carrelage')?' m²':' pièce(s)'}</strong></div>${stats.slice(-1).map(s=>`<div><span>${esc(s.label)}</span><strong>${esc(s.value)}</strong></div>`).join('')}</div></div>`;
    }).filter(Boolean).join('');
    if(!rows)return;
    const mode=norm($('#view-order-title')?.textContent).includes('commande')?'order':'availability';
    const company=$('#view-order-company')?.value||'—',contact=$('#view-order-contact')?.value||'—',email=$('#view-order-email')?.value||'—',phone=$('#view-order-phone')?.value||'—',note=$('#view-order-note')?.value||'';
    const o=ensureReview();$('#view-review-title',o).textContent=mode==='order'?'Aperçu de la commande VIEW':'Aperçu de la demande de disponibilité VIEW';
    $('#view-review-content',o).innerHTML=`<div class="view-review-lines">${rows}</div><div class="view-review-contact"><div class="view-review-card"><span>Société</span><strong>${esc(company)}</strong></div><div class="view-review-card"><span>Contact</span><strong>${esc(contact)}</strong></div><div class="view-review-card"><span>E-mail</span><strong>${esc(email)}</strong></div><div class="view-review-card"><span>Téléphone</span><strong>${esc(phone)}</strong></div>${note?`<div class="view-review-card full"><span>Observation</span><strong>${esc(note)}</strong></div>`:''}<div class="view-review-card full"><span>Envoi</span><strong>Maura · copie Jérôme & Coryne</strong></div></div>`;
    o.classList.add('open');
  }

  document.addEventListener('submit',e=>{if(e.target?.id!=='view-order-form'||bypassSubmit)return;const valid=$$('.view-order-line input[data-field="qty"]',e.target.closest('#view-order-v4')).some(i=>Number(i.value||0)>0);if(!valid)return;e.preventDefault();e.stopImmediatePropagation();buildReview();},true);
  const observer=new MutationObserver(()=>requestAnimationFrame(polishDialog));
  const start=()=>{installStyle();observer.observe(document.body,{childList:true,subtree:true});polishDialog()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();