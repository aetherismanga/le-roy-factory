// Optimisations natives de la page Clients pour l'application Android LE ROY FACTORY.
(()=>{
  const isNative=!!window.Capacitor?.isNativePlatform?.();
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(!isNative||page!=='clients.html')return;

  const style=document.createElement('style');
  style.id='lrf-client-native-fix-v2';
  style.textContent=`
    html.lrf-native-app body[data-lrf-page="clients"] .stats-grid{display:none!important}
    html.lrf-native-app body[data-lrf-page="clients"] .crm-toolbar{margin-top:0!important}
    html.lrf-native-app body.lrf-client-modal-open{overflow:hidden!important;padding-bottom:0!important}
    html.lrf-native-app body.lrf-client-modal-open .lrf-mobile-actions,
    html.lrf-native-app body.lrf-client-modal-open #lrf-mobile-fab,
    html.lrf-native-app body.lrf-client-modal-open .lrf-mobile-action-sheet,
    html.lrf-native-app body.lrf-client-modal-open #crm-mobile-menu-btn{display:none!important}
    html.lrf-native-app #client-modal{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;padding:0!important;margin:0!important;overflow-y:auto!important;overflow-x:hidden!important;align-items:flex-start!important;justify-content:flex-start!important;background:#fff!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important}
    html.lrf-native-app #client-modal .modal-content{display:block!important;position:relative!important;width:100%!important;max-width:none!important;min-height:100dvh!important;height:auto!important;max-height:none!important;margin:0!important;padding:0 0 max(28px,env(safe-area-inset-bottom))!important;border-radius:0!important;overflow:visible!important;background:#fff!important;box-sizing:border-box!important}
    html.lrf-native-app #client-modal .modal-header{position:relative!important;inset:auto!important;margin:0!important;padding:18px 62px 14px 16px!important;min-height:0!important;max-height:none!important;overflow:visible!important}
    html.lrf-native-app #client-modal .modal-header h2{font-size:1.22rem!important;line-height:1.12!important;margin:0 0 8px!important}
    html.lrf-native-app #client-modal .modal-close{position:absolute!important;top:10px!important;right:10px!important;left:auto!important;float:none!important;width:42px!important;height:42px!important;z-index:50!important;border-radius:50%!important;background:#f2f2f2!important;color:#555!important}
    html.lrf-native-app #client-modal #lrf-client-summary{position:relative!important;margin:10px 12px 0!important;display:block!important;overflow:visible!important}
    html.lrf-native-app #client-modal #lrf-client-summary .lrf-summary-main{display:block!important;margin:0!important;min-height:0!important;padding:10px 12px!important}
    html.lrf-native-app #client-modal #lrf-client-summary .lrf-summary-card{display:none!important}
    html.lrf-native-app #client-modal #lrf-client-tabs{position:relative!important;top:auto!important;bottom:auto!important;margin:10px 12px 0!important;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch!important;background:#fff!important;z-index:auto!important;scrollbar-width:none!important}
    html.lrf-native-app #client-modal #lrf-client-tabs::-webkit-scrollbar{display:none!important}
    html.lrf-native-app #client-modal .lrf-tab{transform:none!important;transition:none!important;animation:none!important;will-change:auto!important;padding:10px 11px!important}
    html.lrf-native-app #client-modal .lrf-tab:hover{transform:none!important}
    html.lrf-native-app #client-modal #client-form{display:block!important;position:relative!important;height:auto!important;max-height:none!important;overflow:visible!important;padding:0 12px 24px!important;margin:0!important;box-sizing:border-box!important}
    html.lrf-native-app #client-modal .lrf-tab-pane.active{overflow:visible!important;max-height:none!important;height:auto!important}
    html.lrf-native-app #client-modal .modal-grid-edit{grid-template-columns:1fr!important;overflow:visible!important}
    html.lrf-native-app #client-modal .modal-grid-edit .full-width{grid-column:1!important}
    html.lrf-native-app #client-modal .crm-extra-section,
    html.lrf-native-app #client-modal .documents-section{overflow:visible!important;max-height:none!important}
    html.lrf-native-app #client-modal .partner-card-mini{transform:none!important;transition:none!important;animation:none!important}
    html.lrf-native-app #client-modal .partner-card-mini:hover{transform:none!important}
    html.lrf-native-app #client-modal .modal-footer{position:static!important;inset:auto!important;margin:20px -12px 0!important;padding:12px!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;background:#FBF9F5!important;border-top:1px solid #E7E2D9!important;backdrop-filter:none!important;transform:none!important;z-index:auto!important}
    html.lrf-native-app #client-modal .modal-footer>*{min-width:0!important;width:100%!important;margin:0!important}
    @media (orientation:landscape) and (max-height:650px){
      html.lrf-native-app #client-modal .modal-header{padding:10px 56px 8px 10px!important}
      html.lrf-native-app #client-modal .modal-header h2{font-size:1rem!important;margin-bottom:4px!important}
      html.lrf-native-app #client-modal .modal-close{top:6px!important;right:8px!important;width:36px!important;height:36px!important}
      html.lrf-native-app #client-modal #lrf-client-summary{margin:6px 8px 0!important}
      html.lrf-native-app #client-modal #lrf-client-tabs{margin:6px 8px 0!important}
      html.lrf-native-app #client-modal .lrf-tab{padding:7px 9px!important;font-size:.76rem!important}
      html.lrf-native-app #client-modal #client-form{padding:0 8px 16px!important}
    }
  `;
  document.head.appendChild(style);

  function modalIsOpen(){const modal=document.getElementById('client-modal');return !!modal&&getComputedStyle(modal).display!=='none'}
  function normalize(){if(!modalIsOpen())return;const modal=document.getElementById('client-modal');const form=document.getElementById('client-form');if(form){form.style.overflow='visible';form.style.height='auto';form.style.maxHeight='none'}if(modal)modal.style.overflowY='auto'}
  const modal=document.getElementById('client-modal');
  if(modal)new MutationObserver(()=>setTimeout(normalize,30)).observe(modal,{attributes:true,attributeFilter:['style','class']});
  window.addEventListener('orientationchange',()=>setTimeout(normalize,180));
  window.addEventListener('resize',()=>{if(modalIsOpen())setTimeout(normalize,60)});

  function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
  const voiceName=new URLSearchParams(location.search).get('voiceClient');
  if(voiceName){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const rows=[...document.querySelectorAll('#clients-table-body tr')].filter(r=>r.querySelector('td'));
      if(!rows.length){if(tries>80)clearInterval(timer);return}
      const q=norm(voiceName);
      let best=null,bestScore=-1;
      for(const row of rows){
        const name=norm(row.children?.[1]?.textContent||'');
        if(!name)continue;
        let score=0;
        if(name===q)score=100;
        else if(name.includes(q)||q.includes(name))score=80;
        else{const words=q.split(' ').filter(Boolean);score=words.reduce((n,w)=>n+(name.includes(w)?10:0),0)}
        if(score>bestScore){bestScore=score;best=row}
      }
      if(best&&bestScore>0){clearInterval(timer);best.click();history.replaceState({},'',location.pathname)}
      else if(tries>40){clearInterval(timer);const input=document.getElementById('search-input');if(input){input.value=voiceName;input.dispatchEvent(new Event('input',{bubbles:true}))}}
    },150);
  }
})();
