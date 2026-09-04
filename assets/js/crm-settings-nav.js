(() => {
  'use strict';
  if (window.__LRF_SETTINGS_NAV__) return;
  window.__LRF_SETTINGS_NAV__ = true;

  function installStyle() {
    if (document.getElementById('lrf-settings-nav-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-settings-nav-style';
    style.textContent = `
      .sidebar-menu .lrf-settings-sub>a{margin-left:18px!important;width:calc(100% - 28px)!important;min-height:40px!important;padding-top:8px!important;padding-bottom:8px!important;border-left:2px solid rgba(212,175,55,.48)!important;border-radius:9px!important;font-size:.86em!important;background:rgba(255,215,0,.035)!important}
      .sidebar-menu .lrf-settings-sub>a:hover,.sidebar-menu .lrf-settings-sub>a.active{background:rgba(212,175,55,.16)!important;color:#ffd52a!important;border-left-color:#ffd52a!important}
      .sidebar-menu .lrf-settings-sub .icon{font-size:.9em!important}
      @media(max-width:900px){.sidebar-menu .lrf-settings-sub>a{margin-left:14px!important;width:calc(100% - 22px)!important;min-height:44px!important}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    const menu = document.querySelector('.sidebar-menu');
    if (!menu) return false;
    const links = [...menu.querySelectorAll('li>a')];
    const settingsLink = links.find(a => (a.querySelector('.menu-text')?.textContent || a.textContent || '').trim().toLowerCase() === 'paramètres');
    if (!settingsLink) return false;
    const parent = settingsLink.closest('li');
    if (!parent) return false;
    parent.classList.add('lrf-settings-parent');
    settingsLink.href = 'analyse-clients-lrf.html';
    if (!menu.querySelector('.lrf-settings-sub')) {
      const li = document.createElement('li');
      li.className = 'lrf-settings-sub';
      const active = location.pathname.toLowerCase().endsWith('/analyse-clients-lrf.html') || location.pathname.toLowerCase().endsWith('analyse-clients-lrf.html');
      li.innerHTML = `<a href="analyse-clients-lrf.html" class="${active ? 'active' : ''}"><span class="icon">🔥</span><span class="menu-text">Analyse clients LRF</span></a>`;
      parent.insertAdjacentElement('afterend', li);
    }
    return true;
  }

  installStyle();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
  setTimeout(install, 350);
})();
