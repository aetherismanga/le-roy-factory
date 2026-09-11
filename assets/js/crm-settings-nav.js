(() => {
  'use strict';
  if (window.__LRF_SETTINGS_NAV__) return;
  window.__LRF_SETTINGS_NAV__ = true;

  function labelOf(link) {
    return (link.querySelector('.menu-text')?.textContent || link.textContent || '').trim().toLowerCase().replace('›', '').trim();
  }
  function isSettingsPage() { const p=location.pathname.toLowerCase(); return p.endsWith('/parametres.html') || p.endsWith('parametres.html'); }
  function isAnalysisPage() { const p=location.pathname.toLowerCase(); return p.endsWith('/analyse-clients-lrf.html') || p.endsWith('analyse-clients-lrf.html'); }
  function isClientsPage() { const p=location.pathname.toLowerCase(); return p.endsWith('/clients.html') || p.endsWith('clients.html'); }

  function installSettingsCloseButton() {
    if (!isSettingsPage() || document.getElementById('lrf-settings-close')) return;
    const topbar = document.querySelector('.settings-topbar'); if (!topbar) return;
    const close = document.createElement('button');
    close.id='lrf-settings-close'; close.type='button'; close.setAttribute('aria-label','Fermer les paramètres'); close.title='Fermer'; close.textContent='×';
    close.addEventListener('click',()=>{ if(history.length>1)history.back(); else location.href='dashboard.html'; });
    topbar.appendChild(close);
  }

  function fixSettingsPagePosition() {
    if (!isSettingsPage()) return;
    try { history.scrollRestoration='manual'; } catch (_) {}
    if (!document.getElementById('lrf-settings-mobile-fix')) {
      const style=document.createElement('style'); style.id='lrf-settings-mobile-fix'; style.textContent=`
        html:has(body.crm-body){scroll-behavior:auto!important}body.crm-body .crm-main-content.settings-page{align-self:stretch;min-height:100svh;position:relative;top:0!important}body.crm-body .settings-topbar{padding-right:74px!important}
        #lrf-settings-close{position:absolute;right:18px;top:50%;transform:translateY(-50%);z-index:6;width:46px;height:46px;border-radius:15px;border:1px solid rgba(212,175,55,.65);background:rgba(255,255,255,.96);color:#171717;font-size:2rem;line-height:1;display:grid;place-items:center;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.15)}
        @media(max-width:900px){html,body.crm-body{min-height:100%!important;height:auto!important;overflow-x:hidden!important}body.crm-body .crm-main-content.settings-page{width:100%!important;min-width:0!important;min-height:100svh!important;margin:0!important;padding:0 0 24px!important;transform:none!important}body.crm-body .settings-topbar{position:relative!important;top:0!important;margin:0!important;min-height:auto!important;padding:18px 72px 16px 16px!important;z-index:2!important}body.crm-body .settings-topbar .welcome-box{margin:0!important;padding:0!important}body.crm-body .settings-topbar h1{margin:0 0 5px!important;font-size:1.35rem!important;line-height:1.15!important}body.crm-body .settings-topbar p{margin:0!important;font-size:.82rem!important;line-height:1.35!important}body.crm-body .settings-shell{margin:0!important;padding:18px 14px 28px!important}body.crm-body .settings-intro{margin:0 0 14px!important}body.crm-body .settings-folder{min-height:0!important;padding:20px!important}#lrf-settings-close{right:14px;width:44px;height:44px;border-radius:14px;font-size:1.9rem}}
      `; document.head.appendChild(style);
    }
    installSettingsCloseButton();
    const reset=()=>{document.documentElement.scrollTop=0;document.body.scrollTop=0;window.scrollTo({top:0,left:0,behavior:'auto'})};
    reset();requestAnimationFrame(reset);setTimeout(reset,0);setTimeout(reset,80);setTimeout(reset,250);
  }

  function loadClientRevenueAnalysis() {
    if (!isAnalysisPage() || window.__LRF_CLIENT_CA_LOADER__) return;
    window.__LRF_CLIENT_CA_LOADER__=true;
    import('./analyse-clients-ca.js?v=20260909-ca1').catch(error=>{window.__LRF_CLIENT_CA_LOADER__=false;console.error('Analyse CA clients LRF : chargement impossible',error)});
  }
  function loadAnalysisLiveFixes() {
    if (!isAnalysisPage() || window.__LRF_ANALYSIS_FIX_LOADER__) return;
    window.__LRF_ANALYSIS_FIX_LOADER__=true;
    import('./lrf-analysis-live-fixes.js?v=20260911-orders2').catch(error=>{window.__LRF_ANALYSIS_FIX_LOADER__=false;console.error('Correctifs analyse clients LRF : chargement impossible',error)});
  }
  function loadRetiredClientGuard() {
    if (!isClientsPage() || window.__LRF_RETIRED_CLIENT_GUARD_LOADER__) return;
    window.__LRF_RETIRED_CLIENT_GUARD_LOADER__=true;
    import('./lrf-retired-client-guard.js?v=20260911-retired1').catch(error=>{window.__LRF_RETIRED_CLIENT_GUARD_LOADER__=false;console.error('Masquage client retiré : chargement impossible',error)});
  }
  function loadClientPartnerAccess() {
    if (!isClientsPage() || window.__LRF_CLIENT_PARTNER_ACCESS_LOADER__) return;
    window.__LRF_CLIENT_PARTNER_ACCESS_LOADER__=true;
    import('./crm-client-partner-access.js?v=20260911-partners1').catch(error=>{window.__LRF_CLIENT_PARTNER_ACCESS_LOADER__=false;console.error('Gestion partenaires client : chargement impossible',error)});
  }

  function install() {
    const menu=document.querySelector('.sidebar-menu'); if(!menu)return false;
    menu.querySelectorAll('.lrf-settings-sub').forEach(item=>item.remove());
    const settingsLink=[...menu.querySelectorAll('li > a')].find(link=>labelOf(link)==='paramètres'); if(!settingsLink)return false;
    const parent=settingsLink.closest('li'); parent?.classList.add('lrf-settings-parent'); parent?.classList.remove('lrf-settings-open');
    settingsLink.href='parametres.html'; settingsLink.removeAttribute('role'); settingsLink.removeAttribute('aria-expanded'); delete settingsLink.dataset.lrfSettingsBound;
    const path=location.pathname.toLowerCase(); const inSettings=path.endsWith('/parametres.html')||path.endsWith('parametres.html')||isAnalysisPage(); settingsLink.classList.toggle('active',inSettings);
    fixSettingsPagePosition(); loadClientRevenueAnalysis(); loadAnalysisLiveFixes(); loadRetiredClientGuard(); loadClientPartnerAccess(); return true;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  window.addEventListener('pageshow',()=>{if(isSettingsPage())fixSettingsPagePosition()});
  window.addEventListener('load',()=>{if(isSettingsPage())fixSettingsPagePosition()},{once:true});
  setTimeout(install,350); setTimeout(loadClientRevenueAnalysis,500); setTimeout(loadAnalysisLiveFixes,550); setTimeout(loadRetiredClientGuard,600); setTimeout(loadClientPartnerAccess,650);
})();
