(() => {
  'use strict';
  if (window.__LRF_SETTINGS_NAV__) return;
  window.__LRF_SETTINGS_NAV__ = true;

  function installStyle() {
    if (document.getElementById('lrf-settings-nav-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-settings-nav-style';
    style.textContent = `
      .sidebar-menu .lrf-settings-parent>a{cursor:pointer!important}
      .sidebar-menu .lrf-settings-parent>a .menu-text::after{content:'›';display:inline-block;margin-left:9px;font-size:1.15em;line-height:1;transition:transform .2s ease;color:#d4af37}
      .sidebar-menu .lrf-settings-parent.lrf-settings-open>a .menu-text::after{transform:rotate(90deg)}
      .sidebar-menu .lrf-settings-sub{display:none!important}
      .sidebar-menu .lrf-settings-parent.lrf-settings-open + .lrf-settings-sub{display:list-item!important}
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
    const settingsLink = links.find(a => (a.querySelector('.menu-text')?.textContent || a.textContent || '').trim().toLowerCase().replace('›','').trim() === 'paramètres');
    if (!settingsLink) return false;
    const parent = settingsLink.closest('li');
    if (!parent) return false;

    parent.classList.add('lrf-settings-parent');
    settingsLink.href = '#';
    settingsLink.setAttribute('role', 'button');
    settingsLink.setAttribute('aria-expanded', 'false');

    let sub = menu.querySelector('.lrf-settings-sub');
    if (!sub) {
      sub = document.createElement('li');
      sub.className = 'lrf-settings-sub';
      const active = location.pathname.toLowerCase().endsWith('/analyse-clients-lrf.html') || location.pathname.toLowerCase().endsWith('analyse-clients-lrf.html');
      sub.innerHTML = `<a href="analyse-clients-lrf.html" class="${active ? 'active' : ''}"><span class="icon">🔥</span><span class="menu-text">Analyse clients LRF</span></a>`;
      parent.insertAdjacentElement('afterend', sub);
      if (active) {
        parent.classList.add('lrf-settings-open');
        settingsLink.setAttribute('aria-expanded', 'true');
      }
    }

    if (!settingsLink.dataset.lrfSettingsBound) {
      settingsLink.dataset.lrfSettingsBound = '1';
      settingsLink.addEventListener('click', event => {
        event.preventDefault();
        const isOpen = parent.classList.toggle('lrf-settings-open');
        settingsLink.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }
    return true;
  }

  installStyle();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
  setTimeout(install, 350);
})();
