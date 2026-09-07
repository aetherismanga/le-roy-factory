(() => {
  'use strict';
  if (window.__LRF_VIEW_INSPIRATIONS_V1__) return;
  window.__LRF_VIEW_INSPIRATIONS_V1__ = true;

  const DATA = Array.isArray(window.VIEW_CATALOGUE) ? window.VIEW_CATALOGUE : [];
  if (!DATA.length) return;

  const $ = (s,r=document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const euros = v => Number(v).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' € / m²';
  const currentSession = () => window.LRF_PRO_SESSION?.read?.() || (()=>{try{return JSON.parse(sessionStorage.getItem('lrfProSession')||'null')}catch{return null}})();
  const hasViewAccess = () => {
    const s=currentSession(); if(!s) return false; if(s.isAdmin||s.admin) return true;
    return Array.isArray(s.partenaires) && s.partenaires.some(p=>['view','viewceramica','viewceramiche'].includes(norm(p)));
  };
  const isView = () => norm($('#workspace-title')?.textContent) === 'viewceramica';
  const imageOf = p => p.images?.[0]?.url || p.images?.[0] || 'assets/img/view.png';
  const unique = a => [...new Set(a.filter(Boolean))].sort((x,y)=>String(x).localeCompare(String(y),'fr',{numeric:true}));

  let filters={q:'',format:'Tous',color:'Tous',effect:'Tous',finish:'Tous'};
  let activeProduct=null;
  let actionType='availability';

  function installStyle(){
    if($('#lrf-view-v1-style'))return;
    const st=document.createElement('style');st.id='lrf-view-v1-style';st.textContent=`
      .view-card-note{display:flex;align-items:center;gap:.35rem;margin-top:.55rem;font-size:.72rem;font-weight:850;color:#76580b}.view-card-price{margin-top:.65rem;font-weight:900;color:#16231d}.view-card-price.locked{color:#766f65}.view-availability{display:inline-flex;align-items:center;gap:.35rem;background:#fff8dd;border:1px solid #e8cf70;color:#5f4a08;padding:.4rem .62rem;border-radius:999px;font-size:.74rem;font-weight:900}.view-modal-grid{display:grid;grid-template-columns:minmax(240px,.85fr) 1.3fr;gap:1.1rem}.view-modal-grid>img{width:100%;max-height:460px;object-fit:cover;border-radius:12px;background:#f2eee6}.view-source{font-size:.72rem;color:#777065;margin:.35rem 0 .8rem}.view-price-table{width:100%;border-collapse:collapse;font-size:.78rem;margin:.8rem 0}.view-price-table th,.view-price-table td{border-bottom:1px solid #e5ded2;padding:.55rem .45rem;text-align:left;vertical-align:top}.view-price-table th{font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;color:#756d61}.view-price-public{color:#736b5e}.view-price-pro{font-weight:950;color:#1c6d43}.view-price-lock{font-weight:850;color:#756d61}.view-actions{display:flex;gap:.65rem;flex-wrap:wrap;margin-top:1rem}.view-action{border:0;border-radius:9px;padding:.72rem 1rem;font-weight:900;cursor:pointer}.view-action.primary{background:#111;color:#f5d65e}.view-action.secondary{background:#d4af37;color:#111}.view-action.source{background:#f1ede4;color:#24221f;text-decoration:none}.view-action-dialog{position:fixed;inset:0;z-index:22000;background:rgba(0,0,0,.62);display:none;align-items:center;justify-content:center;padding:1rem}.view-action-dialog.open{display:flex}.view-action-panel{width:min(620px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;padding:1.15rem;box-shadow:0 24px 75px rgba(0,0,0,.35)}.view-action-head{display:flex;justify-content:space-between;gap:1rem;align-items:center;margin-bottom:.7rem}.view-action-close{border:1px solid #ddd4c7;background:#fff;border-radius:8px;padding:.5rem .7rem;font-size:1.1rem}.view-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}.view-field{display:flex;flex-direction:column;gap:.3rem}.view-field.full{grid-column:1/-1}.view-field label{font-size:.72rem;font-weight:900;color:#615b52}.view-field input,.view-field select,.view-field textarea{width:100%;box-sizing:border-box;border:1px solid #d9d2c7;border-radius:8px;padding:.68rem;font:inherit}.view-field textarea{min-height:92px;resize:vertical}.view-send{width:100%;margin-top:.8rem;border:0;border-radius:9px;background:#111;color:#f3d45c;padding:.78rem 1rem;font-weight:950;cursor:pointer}.view-disclaimer{font-size:.7rem;color:#777065;margin:.7rem 0 0}@media(max-width:760px){.view-modal-grid{grid-template-columns:1fr}.view-form-grid{grid-template-columns:1fr}.view-field.full{grid-column:auto}}
    `;document.head.appendChild(st);
  }

  function updateWorkspaceHeader(){
    if(!isView())return;
    const allowed=hasViewAccess();
    const sub=$('#workspace-sub'); if(sub) sub.textContent='Italie · produits VIEW · disponibilité sur demande';
    const badge=$('#workspace-pro-badge'); if(badge){badge.textContent=allowed?'✓ Tarif PRO VIEW accessible':'🔒 Tarif PRO VIEW selon compte';badge.className=`pro-badge${allowed?' allowed':''}`;}
    const link=$('#workspace-pro-link'); if(link){link.style.display=allowed?'inline-flex':'none';link.href='tarifs-pro.html?partner=View%20Ceramica';link.textContent='Voir tarif PRO VIEW';}
  }

  function fillFilters(){
    if(!isView())return;
    const fill=(id,values,label)=>{const el=$(id);if(!el)return;const old=el.value;el.innerHTML=`<option value="Tous">${label}</option>${values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}`;el.value=values.includes(old)?old:'Tous';};
    fill('#v2-format',unique(DATA.flatMap(p=>p.formats||[])),'Tous les formats');
    fill('#v2-color',unique(DATA.flatMap(p=>p.colorFamilies||p.colors||[])),'Toutes les couleurs');
    fill('#v2-effect',unique(DATA.map(p=>p.effect)),'Tous les effets');
    fill('#v2-finish',unique(DATA.flatMap(p=>p.finishes||[])),'Toutes les finitions');
  }

  function readFilters(){
    filters.q=$('#v2-search')?.value||''; filters.format=$('#v2-format')?.value||'Tous';filters.color=$('#v2-color')?.value||'Tous';filters.effect=$('#v2-effect')?.value||'Tous';filters.finish=$('#v2-finish')?.value||'Tous';
  }
  function matches(p){
    const hay=norm([p.name,p.collection,p.description,p.category,p.effect,...(p.formats||[]),...(p.colors||[]),...(p.colorFamilies||[]),...(p.finishes||[])].join(' '));
    if(filters.q&&!hay.includes(norm(filters.q)))return false;
    if(filters.format!=='Tous'&&!(p.formats||[]).some(x=>norm(x)===norm(filters.format)))return false;
    if(filters.color!=='Tous'&&!(p.colorFamilies||p.colors||[]).some(x=>norm(x)===norm(filters.color)))return false;
    if(filters.effect!=='Tous'&&norm(p.effect)!==norm(filters.effect))return false;
    if(filters.finish!=='Tous'&&!(p.finishes||[]).some(x=>norm(x)===norm(filters.finish)))return false;
    return true;
  }
  function startingPrice(p,pro){
    const vals=[];(p.variants||[]).forEach(r=>{if(pro){if(Number.isFinite(r.proPrice))vals.push(r.proPrice);if(Number.isFinite(r.proPalette))vals.push(r.proPalette);if(Number.isFinite(r.proDetail))vals.push(r.proDetail);}else if(Number.isFinite(r.publicPrice))vals.push(r.publicPrice);});
    return vals.length?Math.min(...vals):null;
  }

  function render(){
    if(!isView())return;
    updateWorkspaceHeader();readFilters();
    const grid=$('#partner-products'),count=$('#partner-count');if(!grid)return;
    const found=DATA.filter(matches),allowed=hasViewAccess();
    if(count)count.textContent=`${found.length} collection${found.length>1?'s':''} VIEW`;
    grid.innerHTML=found.length?found.map(p=>{
      const pro=startingPrice(p,true),pub=startingPrice(p,false);
      const price=allowed&&pro!=null?`Tarif PRO dès ${euros(pro)}`:pub!=null?`Tarif public dès ${euros(pub)}`:'Tarif sur demande';
      return `<article class="product-card-v2 view-product-card" data-view-id="${esc(p.id)}"><img src="${esc(imageOf(p))}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/img/view.png'"><div class="body"><span class="eyebrow">VIEW · ${esc(p.effect||'Carrelage')}</span><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="chips">${[...(p.colors||[]).slice(0,2),...(p.formats||[]).slice(0,2)].map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="view-card-note">● Disponibilité sur demande</div><div class="view-card-price${allowed?'':' locked'}">${esc(price)}</div></div></article>`;
    }).join(''):'<div class="empty-partner"><strong>Aucune collection VIEW avec ces filtres.</strong><p>Modifiez la recherche, le format, la couleur, l’effet ou la finition.</p></div>';
  }

  function proCell(r,allowed){
    if(!allowed)return '<span class="view-price-lock">🔒 Accès PRO</span>';
    if(Number.isFinite(r.proPrice))return `<span class="view-price-pro">${euros(r.proPrice)}</span>`;
    if(Number.isFinite(r.proPalette)&&Number.isFinite(r.proDetail))return `<span class="view-price-pro">${euros(r.proPalette)} palette+<br>${euros(r.proDetail)} détail</span>`;
    return '<span class="view-price-lock">Sur demande</span>';
  }
  function openProduct(p){
    const modal=$('#product-modal-v2'),box=$('#product-modal-v2-card');if(!modal||!box)return;activeProduct=p;const allowed=hasViewAccess();
    const rows=(p.variants||[]).map(r=>`<tr><td><strong>${esc(r.format)}</strong><br><small>${esc(r.thickness||'')}</small></td><td>${esc(r.finish)}</td><td class="view-price-public">${Number.isFinite(r.publicPrice)?euros(r.publicPrice):'—'}</td><td>${proCell(r,allowed)}</td></tr>`).join('');
    box.innerHTML=`<button class="modal-v2-close" type="button" aria-label="Fermer">×</button><div class="view-modal-grid"><img src="${esc(imageOf(p))}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='assets/img/view.png'"><div><span class="eyebrow">VIEW CERAMICA · ${esc(p.effect||'Carrelage')}</span><h2>${esc(p.name)}</h2><p>${esc(p.description)}</p><div class="chips">${(p.colors||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div><p><span class="view-availability">● Disponibilité : sur demande auprès de VIEW</span></p><div class="view-source">${esc(p.sourceLabel||'Tarifs VIEW')}</div><table class="view-price-table"><thead><tr><th>Format</th><th>Finition</th><th>Tarif public</th><th>Tarif PRO</th></tr></thead><tbody>${rows}</tbody></table><div class="view-actions"><button class="view-action secondary" type="button" data-view-action="availability">Demander disponibilité</button><button class="view-action primary" type="button" data-view-action="order">Commander</button>${p.sourceUrl?`<a class="view-action source" target="_blank" rel="noopener" href="${esc(p.sourceUrl)}">Voir collection VIEW</a>`:''}</div></div></div>`;
    modal.classList.add('open');
  }

  function ensureActionDialog(){
    if($('#view-action-dialog'))return;
    const d=document.createElement('div');d.id='view-action-dialog';d.className='view-action-dialog';d.innerHTML=`<div class="view-action-panel"><div class="view-action-head"><div><strong id="view-action-title">VIEW</strong><div id="view-action-sub" class="view-source"></div></div><button class="view-action-close" type="button">×</button></div><form id="view-action-form"><div class="view-form-grid"><div class="view-field full"><label>Référence / format</label><select id="view-action-variant" required></select></div><div class="view-field"><label>Couleur</label><select id="view-action-color" required></select></div><div class="view-field"><label>Quantité souhaitée (m²)</label><input id="view-action-qty" type="number" min="0.01" step="0.01" placeholder="Ex. 42,50" required></div><div class="view-field"><label>Société</label><input id="view-action-company" autocomplete="organization" required></div><div class="view-field"><label>Contact</label><input id="view-action-contact" autocomplete="name" required></div><div class="view-field"><label>E-mail</label><input id="view-action-email" type="email" autocomplete="email"></div><div class="view-field"><label>Téléphone</label><input id="view-action-phone" autocomplete="tel"></div><div class="view-field full"><label>Note</label><textarea id="view-action-note" placeholder="Chantier, délai souhaité, livraison, précision…"></textarea></div></div><button class="view-send" type="submit">Préparer la demande</button><p class="view-disclaimer">La demande est préparée pour LE ROY FACTORY. La disponibilité VIEW n’est jamais affichée comme un stock confirmé.</p></form></div>`;document.body.appendChild(d);
    d.querySelector('.view-action-close').onclick=()=>d.classList.remove('open');d.addEventListener('click',e=>{if(e.target===d)d.classList.remove('open')});
    $('#view-action-form').addEventListener('submit',sendAction);
  }
  function openAction(type){
    if(!activeProduct)return;ensureActionDialog();actionType=type;const s=currentSession()||{};
    $('#view-action-title').textContent=type==='order'?'Commander chez VIEW':'Demander la disponibilité VIEW';$('#view-action-sub').textContent=activeProduct.name;
    $('#view-action-variant').innerHTML=(activeProduct.variants||[]).map((r,i)=>`<option value="${i}">${esc(r.format)} · ${esc(r.thickness)} · ${esc(r.finish)}</option>`).join('');
    $('#view-action-color').innerHTML=(activeProduct.colors||[]).map(c=>`<option>${esc(c)}</option>`).join('');
    $('#view-action-company').value=s.societe||'';$('#view-action-contact').value=s.name||'';$('#view-action-email').value=s.email||'';$('#view-action-phone').value='';$('#view-action-qty').value='';$('#view-action-note').value='';
    $('#view-action-dialog').classList.add('open');
  }
  function sendAction(e){
    e.preventDefault();if(!activeProduct)return;const idx=Number($('#view-action-variant').value||0),r=activeProduct.variants?.[idx]||{};const company=$('#view-action-company').value.trim(),contact=$('#view-action-contact').value.trim(),email=$('#view-action-email').value.trim(),phone=$('#view-action-phone').value.trim(),color=$('#view-action-color').value,qty=$('#view-action-qty').value,note=$('#view-action-note').value.trim();
    const isOrder=actionType==='order';const subject=`${isOrder?'[COMMANDE VIEW]':'[DISPONIBILITÉ VIEW]'} ${activeProduct.name} — ${company}`;
    const body=[`${isOrder?'COMMANDE':'DEMANDE DE DISPONIBILITÉ'} VIEW CERAMICA`,'',`Collection : ${activeProduct.name}`,`Format : ${r.format||'—'}`,`Épaisseur : ${r.thickness||'—'}`,`Finition : ${r.finish||'—'}`,`Couleur : ${color||'—'}`,`Quantité : ${qty||'—'} m²`,'',`Société : ${company}`,`Contact : ${contact}`,`E-mail : ${email||'—'}`,`Téléphone : ${phone||'—'}`,`Code client LRF : ${currentSession()?.codeClient||'—'}`,note?`Note : ${note}`:'', '', 'Disponibilité à confirmer par VIEW — aucun stock temps réel affiché.'].filter(Boolean).join('\n');
    const mailto=`mailto:jerome@leroyfactory.fr?cc=${encodeURIComponent('coryne@leroyfactory.fr')}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;window.location.href=mailto;$('#view-action-dialog').classList.remove('open');
  }

  function activate(){
    if(!isView())return;installStyle();fillFilters();render();
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest('[data-view-id]');if(card&&isView()){e.preventDefault();e.stopPropagation();const p=DATA.find(x=>x.id===card.dataset.viewId);if(p)openProduct(p);return;}
    const action=e.target.closest('[data-view-action]');if(action){e.preventDefault();e.stopPropagation();openAction(action.dataset.viewAction);return;}
    const partner=e.target.closest('[data-partner]');if(partner&&norm(partner.dataset.partner)==='viewceramica')setTimeout(activate,0);
  },true);

  ['input','change'].forEach(type=>document.addEventListener(type,e=>{if(!isView())return;if(['v2-search','v2-format','v2-color','v2-effect','v2-finish'].includes(e.target?.id))setTimeout(render,0);},false));

  const observer=new MutationObserver(()=>{if(isView())requestAnimationFrame(activate)});observer.observe($('#partner-workspace')||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('lrf-pro-session-changed',()=>{if(isView())activate()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(activate,120),{once:true});else setTimeout(activate,120);
})();