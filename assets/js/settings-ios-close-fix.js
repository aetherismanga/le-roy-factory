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
          padding-top:calc(16px + env(safe-area-inset-top, 0px))!important;
          padding-right:82px!important;
          min-height:calc(84px + env(safe-area-inset-top, 0px))!important;
          overflow:visible!important;
        }
        #lrf-settings-close{
          position:fixed!important;
          top:calc(10px + env(safe-area-inset-top, 0px))!important;
          right:max(12px, env(safe-area-inset-right, 0px))!important;
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
        body.crm-body.crm-menu-open #lrf-settings-close{
          display:none!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function hardenCloseButton() {
    const close = document.getElementById('lrf-settings-close');
    if (!close) return false;
    close.setAttribute('aria-label','Fermer les paramètres');
    close.setAttribute('role','button');
    close.tabIndex = 0;
    close.style.pointerEvents = 'auto';
    close.style.touchAction = 'manipulation';
    if (!close.dataset.lrfIosTouchFix) {
      close.dataset.lrfIosTouchFix = '1';
      let handled = false;
      const goBack = () => {
        if (handled) return;
        handled = true;
        setTimeout(() => { handled = false; }, 500);
        if (history.length > 1) history.back();
        else location.href = 'dashboard.html';
      };
      close.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        goBack();
      }, { passive:false });
    }
    return true;
  }

  function install() {
    installStyle();
    if (hardenCloseButton()) return;
    const observer = new MutationObserver(() => {
      if (hardenCloseButton()) observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(() => observer.disconnect(),5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  window.addEventListener('pageshow',install);
})();
