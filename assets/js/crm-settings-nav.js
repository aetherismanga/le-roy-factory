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

  function loadClientRevenueAnalysis() {
    const path = location.pathname.toLowerCase();
    const isAnalysis = path.endsWith('/analyse-clients-lrf.html') || path.endsWith('analyse-clients-lrf.html');
    if (!isAnalysis || window.__LRF_CLIENT_CA_LOADER__) return;
    window.__LRF_CLIENT_CA_LOADER__ = true;
    import('./analyse-clients-ca.js?v=20260909-ca1').catch(error => {
      window.__LRF_CLIENT_CA_LOADER__ = false;
      console.error('Analyse CA clients LRF : chargement impossible', error);
    });
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

    loadClientRevenueAnalysis();
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  // Certaines pages du CRM construisent la navigation après le chargement.
  setTimeout(install, 350);
  setTimeout(loadClientRevenueAnalysis, 500);
})();
