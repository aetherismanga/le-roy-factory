// Correctif fiche client pour l'application Android LE ROY FACTORY.
// Objectif : un seul scroll naturel sur toute la fiche, portrait/paysage,
// sans barre mobile par-dessus les actions, et accès direct aux partenaires.

(()=>{
  const isNative=!!window.Capacitor?.isNativePlatform?.();
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(!isNative||page!=='clients.html')return;

  const style=document.createElement('style');
  style.id='lrf-client-native-scroll-fix';
  style.textContent=`
    html.lrf-native-app body.lrf-client-modal-open{overflow:hidden!important;padding-bottom:0!important}
    html.lrf-native-app body.lrf-client-modal-open .lrf-mobile-actions,
    html.lrf-native-app body.lrf-client-modal-open #lrf-mobile-fab,
    html.lrf-native-app body.lrf-client-modal-open .lrf-mobile-action-sheet,
    html.lrf-native-app body.lrf-client-modal-open #crm-mobile-menu-btn{display:none!important}

    html.lrf-native-app #client-modal{
      position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;
      padding:0!important;margin:0!important;overflow-y:auto!important;overflow-x:hidden!important;
      align-items:flex-start!important;justify-content:flex-start!important;background:#fff!important;
      -webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;
    }
    html.lrf-native-app #client-modal .modal-content{
      display:block!important;position:relative!important;width:100%!important;max-width:none!important;
      min-height:100dvh!important;height:auto!important;max-height:none!important;margin:0!important;
      padding:0 0 max(28px,env(safe-area-inset-bottom))!important;border-radius:0!important;
      overflow:visible!important;background:#fff!important;box-sizing:border-box!important;
    }
    html.lrf-native-app #client-modal .modal-header{
      position:relative!important;inset:auto!important;margin:0!important;padding:22px 66px 16px 18px!important;
      min-height:0!important;max-height:none!important;overflow:visible!important;
    }
    html.lrf-native-app #client-modal .modal-header h2{font-size:1.28rem!important;line-height:1.15!important;margin:0 0 10px!important}
    html.lrf-native-app #client-modal .modal-close{
      position:absolute!important;top:12px!important;right:12px!important;left:auto!important;float:none!important;
      width:44px!important;height:44px!important;z-index:50!important;border-radius:50%!important;
      background:#f2f2f2!important;color:#555!important;
    }
    html.lrf-native-app #client-modal #lrf-client-summary{
      position:relative!important;margin:12px 14px 0!important;grid-template-columns:1fr 1fr!important;
      overflow:visible!important;
    }
    html.lrf-native-app #client-modal .lrf-summary-main{grid-column:1/-1!important}
    html.lrf-native-app #client-modal .lrf-summary-card{min-height:58px!important;padding:10px 12px!important}
    html.lrf-native-app #client-modal .lrf-summary-card[data-lrf-open-tab]{cursor:pointer!important;border-color:#D4AF37!important;background:#FFFDF7!important}
    html.lrf-native-app #client-modal .lrf-summary-card[data-lrf-open-tab]::after{content:'›';float:right;font-size:1.25rem;color:#9a7800;margin-top:-24px}

    html.lrf-native-app #client-modal #lrf-client-tabs{
      position:relative!important;top:auto!important;bottom:auto!important;margin:12px 14px 0!important;
      overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch!important;
      background:#fff!important;z-index:auto!important;
    }
    html.lrf-native-app #client-modal #client-form{
      display:block!important;position:relative!important;height:auto!important;max-height:none!important;
      overflow:visible!important;padding:0 14px 24px!important;margin:0!important;box-sizing:border-box!important;
    }
    html.lrf-native-app #client-modal .lrf-tab-pane.active{overflow:visible!important;max-height:none!important;height:auto!important}
    html.lrf-native-app #client-modal .modal-grid-edit{grid-template-columns:1fr!important;overflow:visible!important}
    html.lrf-native-app #client-modal .modal-grid-edit .full-width{grid-column:1!important}
    html.lrf-native-app #client-modal .crm-extra-section,
    html.lrf-native-app #client-modal .documents-section{overflow:visible!important;max-height:none!important}

    html.lrf-native-app #client-modal .modal-footer{
      position:static!important;inset:auto!important;margin:22px -14px 0!important;padding:14px!important;
      display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;
      background:#FBF9F5!important;border-top:1px solid #E7E2D9!important;backdrop-filter:none!important;
      transform:none!important;z-index:auto!important;
    }
    html.lrf-native-app #client-modal .modal-footer>*{min-width:0!important;width:100%!important;margin:0!important}

    @media (orientation:landscape) and (max-height:600px){
      html.lrf-native-app #client-modal .modal-header{padding:12px 62px 10px 14px!important}
      html.lrf-native-app #client-modal .modal-header h2{font-size:1.05rem!important;margin-bottom:6px!important}
      html.lrf-native-app #client-modal .modal-close{top:8px!important;right:10px!important;width:38px!important;height:38px!important}
      html.lrf-native-app #client-modal #lrf-client-summary{margin:8px 10px 0!important;grid-template-columns:repeat(4,1fr)!important;gap:6px!important}
      html.lrf-native-app #client-modal .lrf-summary-main{grid-column:1/-1!important;min-height:48px!important;padding:8px 10px!important}
      html.lrf-native-app #client-modal .lrf-summary-card{min-height:45px!important;padding:7px 8px!important}
      html.lrf-native-app #client-modal #lrf-client-tabs{margin:8px 10px 0!important}
      html.lrf-native-app #client-modal .lrf-tab{padding:8px 10px!important;font-size:.78rem!important}
      html.lrf-native-app #client-modal #client-form{padding:0 10px 18px!important}
    }
  `;
  document.head.appendChild(style);

  function modalIsOpen(){
    const modal=document.getElementById('client-modal');
    return !!modal&&getComputedStyle(modal).display!=='none';
  }

  function wireSummaryCards(){
    const root=document.getElementById('lrf-client-summary');
    if(!root)return;
    [...root.querySelectorAll('.lrf-summary-card')].forEach(card=>{
      const label=(card.querySelector('small')?.textContent||'').trim().toLowerCase();
      let tab='';
      if(label.includes('partenaire'))tab='partners';
      else if(label.includes('interlocuteur'))tab='contacts';
      else if(label.includes('historique'))tab='history';
      if(!tab)return;
      card.dataset.lrfOpenTab=tab;
      card.setAttribute('role','button');
      card.tabIndex=0;
      const open=()=>{
        document.querySelector(`#lrf-client-tabs .lrf-tab[data-tab="${tab}"]`)?.click();
        setTimeout(()=>document.getElementById('lrf-client-tabs')?.scrollIntoView({block:'start',behavior:'smooth'}),30);
      };
      if(!card.dataset.lrfWired){
        card.dataset.lrfWired='1';
        card.addEventListener('click',open);
        card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
      }
    });
  }

  function normalizeScroll(){
    if(!modalIsOpen())return;
    const modal=document.getElementById('client-modal');
    const form=document.getElementById('client-form');
    if(form){form.scrollTop=0;form.style.overflow='visible';form.style.height='auto';form.style.maxHeight='none';}
    modal.style.overflowY='auto';
    wireSummaryCards();
  }

  const modal=document.getElementById('client-modal');
  if(modal){
    new MutationObserver(()=>setTimeout(normalizeScroll,20)).observe(modal,{attributes:true,childList:true,subtree:true,attributeFilter:['style','class']});
  }
  document.addEventListener('click',()=>setTimeout(normalizeScroll,20),true);
  window.addEventListener('orientationchange',()=>setTimeout(normalizeScroll,180));
  window.addEventListener('resize',()=>{if(modalIsOpen())setTimeout(normalizeScroll,50)});
})();
