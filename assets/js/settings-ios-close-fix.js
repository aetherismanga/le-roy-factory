(() => {
  'use strict';
  const path = location.pathname.toLowerCase();
  if (!path.endsWith('parametres.html')) return;
  if (window.__LRF_SETTINGS_IOS_CLOSE_FIX__) return;
  window.__LRF_SETTINGS_IOS_CLOSE_FIX__ = true;

  function installStyle() {
    if (document.getElementById('lrf-settings-ios-close-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-settings-ios-close-style';
    style.textContent = `
      @media (max-width:900px){
        body.crm-body .settings-topbar{
          position:relative!important;
          z-index:100!important;
          min-height:calc(122px + env(safe-area-inset-top, 0px))!important;
          padding-top:calc(72px + env(safe-area-inset-top, 0px))!important;
          padding-right:76px!important;
          padding-bottom:16px!important;
          padding-left:76px!important;
          overflow:visible!important;
          display:flex!important;
          align-items:flex-end!important;
        }
        body.crm-body .settings-topbar .welcome-box{
          margin:0!important;
          padding:0!important;
          min-width:0!important;
        }
        #crm-mobile-menu-btn,
        .mobile-menu-btn{
          position:fixed!important;
          top:calc(12px + env(safe-area-inset-top, 0px))!important;
          left:calc(14px + env(safe-area-inset-left, 0px))!important;
          width:52px!important;
          height:52px!important;
          min-width:52px!important;
          min-height:52px!important;
          z-index:2147483645!important;
          border-radius:16px!important;
          touch-action:manipulation!important;
        }
        #lrf-settings-close{
          position:fixed!important;
          top:calc(12px + env(safe-area-inset-top, 0px))!important;
          right:calc(14px + env(safe-area-inset-right, 0px))!important;
          left:auto!important;
          bottom:auto!important;
          transform:none!important;
          width:54px!important;
          height:54px!important;
          min-width:54px!important;
          min-height:54px!important;
          border-radius:18px!important;
          z-index:2147483646!important;
          display:grid!important;
          place-items:center!important;
          pointer-events:auto!important;
          touch-action:manipulation!important;
          -webkit-tap-highlight-color:transparent!important;
          user-select:none!important;
          -webkit-user-select:none!important;
          background:rgba(255,255,255,.98)!important;
          color:#171717!important;
          border:1px solid rgba(199,163,59,.72)!important;
          box-shadow:0 10px 28px rgba(0,0,0,.18)!important;
          font-size:2.05rem!important;
          line-height:1!important;
          font-weight:400!important;
        }
        #lrf-settings-close:active{
          transform:scale(.94)!important;
          background:#fff8df!important;
        }
        body.crm-body .settings-shell{
          padding-top:32px!important;
        }
        body.crm-body .settings-intro{
          align-items:flex-start!important;
          gap:14px!important;
          margin-bottom:18px!important;
        }
        body.crm-body .settings-intro > div:first-child{
          padding-top:4px!important;
        }
        body.crm-body .settings-count{
          margin-top:16px!important;
          flex:0 0 auto!important;
          position:relative!important;
          z-index:1!important;
        }
        body.crm-body.crm-menu-open #lrf-settings-close{
          display:none!important;
        }
      }
      @media (max-width:430px){
        body.crm-body .settings-topbar{
          padding-left:72px!important;
          padding-right:72px!important;
        }
        body.crm-body .settings-shell{
          padding-top:36px!important;
        }
        body.crm-body .settings-intro{
          display:grid!important;
          grid-template-columns:minmax(0,1fr) auto!important;
          column-gap:10px!important;
          row-gap:8px!important;
        }
        body.crm-body .settings-count{
          margin-top:18px!important;
          align-self:start!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function bindCloseButton() {
    const current = document.getElementById('lrf-settings-close');
    if (!current) return false;
    if (current.dataset.lrfDashboardClose === '1') return true;

    // Remplace le bouton afin de supprimer l'ancien listener history.back().
    const close = current.cloneNode(true);
    close.dataset.lrfDashboardClose = '1';
    close.setAttribute('aria-label','Fermer les paramètres et retourner au CRM');
    close.title = 'Retour au CRM';
    close.tabIndex = 0;
    current.replaceWith(close);

    let navigating = false;
    const goDashboard = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (navigating) return;
      navigating = true;
      location.assign('dashboard.html');
    };

    close.addEventListener('click', goDashboard);
    close.addEventListener('touchend', goDashboard, { passive:false });
    close.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') goDashboard(event);
    });
    return true;
  }

  function install() {
    installStyle();
    bindCloseButton();
    const observer = new MutationObserver(() => bindCloseButton());
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  window.addEventListener('pageshow',install);
})();
