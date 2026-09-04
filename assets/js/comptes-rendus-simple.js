(()=>{
  'use strict';
  if(window.__LRF_CR_SIMPLE__)return;
  window.__LRF_CR_SIMPLE__=true;

  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function addStyle(){
    if(document.getElementById('lrf-cr-simple-style'))return;
    const style=document.createElement('style');
    style.id='lrf-cr-simple-style';
    style.textContent=`
      #cr-select-client{display:none!important}
      .lrf-cr-client-picker{position:relative}
      .lrf-cr-search{width:100%;box-sizing:border-box;min-height:52px;padding:0 15px 0 45px;border:1px solid #d9cfbd;border-radius:14px;background:#fff;color:#1a2530;font:600 16px/1.2 Inter,sans-serif;outline:none;box-shadow:0 3px 12px rgba(55,40,14,.04)}
      .lrf-cr-search:focus{border-color:#d4af37;box-shadow:0 0 0 3px rgba(212,175,55,.16)}
      .lrf-cr-search-icon{position:absolute;left:15px;top:16px;font-size:18px;pointer-events:none}
      .lrf-cr-results{display:none;position:absolute;z-index:10005;left:0;right:0;top:58px;max-height:270px;overflow:auto;background:#fff;border:1px solid #d9cfbd;border-radius:14px;box-shadow:0 18px 40px rgba(40,29,9,.17);padding:6px}
      .lrf-cr-results.open{display:block}
      .lrf-cr-result{width:100%;border:0;border-bottom:1px solid #eee7dc;background:#fff;text-align:left;padding:12px 13px;border-radius:9px;cursor:pointer;color:#1a2530}
      .lrf-cr-result:last-child{border-bottom:0}.lrf-cr-result:hover,.lrf-cr-result:focus{background:#fff8df;outline:none}
      .lrf-cr-result strong{display:block;font-size:14px}.lrf-cr-result small{display:block;margin-top:3px;color:#70695f;font-size:12px}
      .lrf-cr-selected{display:none;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:10px 12px;border:1px solid #d4af37;border-radius:12px;background:#fff9e7;color:#44350c}
      .lrf-cr-selected.show{display:flex}.lrf-cr-selected strong{font-size:14px}.lrf-cr-change{border:0;background:transparent;color:#8a6814;font-weight:800;cursor:pointer}
      .lrf-cr-hidden-details{display:none!important}
      #cr-input-text{min-height:155px!important;border-radius:14px!important;border:1px solid #d9cfbd!important;padding:14px!important;font-size:16px!important;line-height:1.45!important;resize:vertical}
      #btn-save-cr{min-height:50px;border-radius:13px!important;font-size:15px!important}
      @media(max-width:760px){
        #cr-modal .modal-content{width:calc(100vw - 24px)!important;max-width:none!important;max-height:calc(100vh - 26px)!important;overflow:auto!important;margin:13px!important;padding:20px 16px!important;border-radius:22px!important}
        #cr-modal .modal-header h2{font-size:22px!important;margin-bottom:8px!important}
        #form-new-cr{gap:16px!important}
        .lrf-cr-search{font-size:16px;min-height:56px}
        .lrf-cr-results{position:static;max-height:290px;margin-top:7px;box-shadow:none;border-radius:12px}
        .lrf-cr-result{padding:14px 12px}.lrf-cr-result strong{font-size:16px}.lrf-cr-result small{font-size:13px}
        #cr-input-text{min-height:180px!important}
        #form-new-cr .modal-footer{display:grid!important;grid-template-columns:1fr 1.3fr!important;gap:10px!important}
        #form-new-cr .modal-footer button{width:100%!important;min-height:52px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function install(){
    addStyle();
    const select=document.getElementById('cr-select-client');
    const form=document.getElementById('form-new-cr');
    if(!select||!form||document.getElementById('lrf-cr-client-search'))return;

    const selectWrap=select.parentElement;
    const picker=document.createElement('div');
    picker.className='lrf-cr-client-picker';
    picker.innerHTML=`
      <span class="lrf-cr-search-icon">🔍</span>
      <input id="lrf-cr-client-search" class="lrf-cr-search" type="search" autocomplete="off" placeholder="Écrire le nom du client…" aria-label="Rechercher un client">
      <div id="lrf-cr-client-results" class="lrf-cr-results" role="listbox"></div>
      <div id="lrf-cr-client-selected" class="lrf-cr-selected"><strong></strong><button type="button" class="lrf-cr-change">Changer</button></div>`;
    select.insertAdjacentElement('afterend',picker);

    // Pour rendre la saisie vraiment rapide : date = aujourd'hui et auteur = agent connecté.
    const detailsGrid=document.getElementById('cr-input-date')?.closest('div[style*="grid-template-columns"]');
    if(detailsGrid)detailsGrid.classList.add('lrf-cr-hidden-details');

    const search=picker.querySelector('#lrf-cr-client-search');
    const results=picker.querySelector('#lrf-cr-client-results');
    const selected=picker.querySelector('#lrf-cr-client-selected');
    const selectedLabel=selected.querySelector('strong');
    const changeBtn=selected.querySelector('.lrf-cr-change');

    const options=()=>[...select.options].filter(o=>o.value);
    function render(q=''){
      const term=q.trim().toLocaleLowerCase('fr');
      const matches=options().filter(o=>!term||o.textContent.toLocaleLowerCase('fr').includes(term)).slice(0,40);
      results.innerHTML=matches.length?matches.map(o=>{
        const txt=o.textContent.trim();
        const m=txt.match(/^(.*?)\s*\((.*?)\)\s*$/);
        return `<button type="button" class="lrf-cr-result" data-id="${esc(o.value)}"><strong>${esc(m?m[1]:txt)}</strong>${m?`<small>${esc(m[2])}</small>`:''}</button>`;
      }).join(''):'<div style="padding:14px;color:#777;text-align:center">Aucun client trouvé</div>';
      results.classList.add('open');
      results.querySelectorAll('.lrf-cr-result').forEach(btn=>btn.addEventListener('click',()=>choose(btn.dataset.id)));
    }
    function choose(id){
      const opt=options().find(o=>o.value===id);if(!opt)return;
      select.value=id;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      selectedLabel.textContent='✓ '+opt.textContent.trim();
      selected.classList.add('show');
      results.classList.remove('open');
      search.value='';
      search.style.display='none';
      picker.querySelector('.lrf-cr-search-icon').style.display='none';
      document.getElementById('cr-input-text')?.focus();
    }
    function resetChoice(){
      select.value='';
      selected.classList.remove('show');
      search.style.display='block';
      picker.querySelector('.lrf-cr-search-icon').style.display='block';
      search.value='';
      results.classList.remove('open');
      setTimeout(()=>search.focus(),0);
    }

    search.addEventListener('focus',()=>render(search.value));
    search.addEventListener('input',()=>render(search.value));
    changeBtn.addEventListener('click',resetChoice);
    document.addEventListener('click',e=>{if(!picker.contains(e.target))results.classList.remove('open')});

    const modal=document.getElementById('cr-modal');
    const openBtn=document.getElementById('btn-open-cr-modal');
    openBtn?.addEventListener('click',()=>setTimeout(()=>{resetChoice();search.focus()},30));

    // Le formulaire historique fait reset() après sauvegarde/fermeture : on synchronise notre interface.
    form.addEventListener('reset',()=>setTimeout(resetChoice,0));

    const observer=new MutationObserver(()=>{
      if(modal?.style.display==='flex'&&!selected.classList.contains('show')&&document.activeElement!==search)setTimeout(()=>search.focus(),30);
    });
    if(modal)observer.observe(modal,{attributes:true,attributeFilter:['style']});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
