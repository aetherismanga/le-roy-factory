(() => {
  'use strict';
  if (window.__LRF_SETTINGS_NAV__) return;
  window.__LRF_SETTINGS_NAV__ = true;

  function labelOf(link) {
    return (link.querySelector('.menu-text')?.textContent || link.textContent || '')
      .trim()
      .toLowerCase()
      .replace('›', '')
      .trim();
  }

  function install() {
    const menu = document.querySelector('.sidebar-menu');
    if (!menu) return false;

    // L'ancien système ouvrait un sous-menu sous « Paramètres ».
    // On le supprime : Paramètres est désormais une vraie page du CRM.
    menu.querySelectorAll('.lrf-settings-sub').forEach(item => item.remove());

    const settingsLink = [...menu.querySelectorAll('li > a')]
      .find(link => labelOf(link) === 'paramètres');
    if (!settingsLink) return false;

    const parent = settingsLink.closest('li');
    parent?.classList.add('lrf-settings-parent');
    parent?.classList.remove('lrf-settings-open');

    settingsLink.href = 'parametres.html';
    settingsLink.removeAttribute('role');
    settingsLink.removeAttribute('aria-expanded');
    delete settingsLink.dataset.lrfSettingsBound;

    const path = location.pathname.toLowerCase();
    const inSettings = path.endsWith('/parametres.html') || path.endsWith('parametres.html') ||
      path.endsWith('/analyse-clients-lrf.html') || path.endsWith('analyse-clients-lrf.html');
    settingsLink.classList.toggle('active', inSettings);

    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  // Certaines pages du CRM construisent la navigation après le chargement.
  setTimeout(install, 350);
})();
