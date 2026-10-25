/** Authenticated portraits + the existing LRF radio player, without legacy widgets. */
const PORTRAITS = Object.freeze({
  'jerome@leroyfactory.fr': Object.freeze({ name: 'Jérôme', src: '/assets/img/jeromelogo.png', initial: 'J' }),
  'coryne@leroyfactory.fr': Object.freeze({ name: 'Coryne', src: '/assets/img/corynelogo.png', initial: 'C' })
});

export function agentPortrait(profile) {
  if (typeof profile?.uid !== 'string' || !profile.uid.trim()) return null;
  return PORTRAITS[String(profile.email || '').trim().toLowerCase()] || null;
}

let stopCurrent;

export function startAgentMusic({ getProfile, loadRadio = () => import('./crm-radio-player.js') } = {}) {
  if (stopCurrent) return stopCurrent;
  if (typeof getProfile !== 'function') throw new TypeError('Une session authentifiée est nécessaire.');
  let stopped = false, generation = 0, host, button, radioReady;
  const media = window.matchMedia('(max-width: 900px)');

  function mount() {
    const home = document.getElementById('v2-agent-portrait-slot');
    const target = home || (media.matches ? document.querySelector('.crm-v2-appbar') : null)
      || document.querySelector('.crm-topbar') || document.querySelector('.crm-v2-appbar');
    if (!target || !host || !button) return;
    if (home && host.parentNode !== home) home.replaceChildren(host);
    else if (host.parentNode !== target) target.append(host);
    host.classList.toggle('crm-v2-agent-music-home', Boolean(home));
  }

  async function ensureRadio() {
    if (!host) {
      // This small bridge lets the existing player create its own accessible
      // button with its existing click listener; it is not a clock/weather host.
      host = document.createElement('div');
      host.className = 'crm-v2-agent-music info-widgets';
      document.body.append(host);
    }
    if (!host.isConnected) document.body.append(host);
    if (!radioReady) radioReady = Promise.resolve().then(loadRadio).catch(error => { radioReady = undefined; throw error; });
    await radioReady;
    button = document.getElementById('lrf-radio-btn');
    if (!button) throw new Error('Le lecteur radio n’est pas disponible.');
    if (button.parentNode !== host) host.append(button);
    return button;
  }

  async function present(profile, requestGeneration) {
    if (stopped || requestGeneration !== generation) return;
    if (!profile?.uid) { host?.remove(); return; }
    try {
      const trigger = await ensureRadio();
      if (stopped || requestGeneration !== generation) return;
      mount();
      const portrait = agentPortrait(profile);
      trigger.classList.add('crm-v2-portrait-trigger');
      trigger.type = 'button';
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', 'lrf-radio-panel');
      trigger.setAttribute('aria-label', portrait ? `Photo de ${portrait.name} — ouvrir la radio` : 'Ouvrir la radio');
      trigger.title = portrait ? `${portrait.name} · Radios en direct` : 'Radios en direct';
      trigger.replaceChildren();
      const fallback = document.createElement('span');
      fallback.className = 'crm-v2-portrait-fallback';
      fallback.textContent = portrait?.initial || '♪';
      fallback.setAttribute('aria-hidden', 'true');
      trigger.append(fallback);
      if (portrait) {
        const image = document.createElement('img');
        image.id = 'lrf-agent-avatar';
        image.src = portrait.src;
        image.alt = `Photo de ${portrait.name}`;
        image.width = 64; image.height = 64;
        image.decoding = 'async'; image.loading = 'eager';
        image.addEventListener('error', () => { image.hidden = true; });
        trigger.append(image);
      }
      const badge = document.createElement('span');
      badge.className = 'crm-v2-portrait-radio'; badge.textContent = '♫'; badge.setAttribute('aria-hidden', 'true');
      trigger.append(badge);
    } catch (_) {
      if (!stopped && requestGeneration === generation) {
        host?.remove();
        // Keep the existing profile link as fallback if the radio script fails.
      }
    }
  }

  async function refresh() {
    const requestGeneration = ++generation;
    try { await present(await getProfile(), requestGeneration); }
    catch (_) { if (requestGeneration === generation) host?.remove(); }
  }
  const onAuth = event => { const requestGeneration = ++generation; void present(event.detail || null, requestGeneration); };
  const afterClick = event => {
    if (!event.target.closest('#lrf-radio-btn, #lrf-agent-avatar')) return;
    queueMicrotask(() => {
      const panel = document.getElementById('lrf-radio-panel');
      if (panel && !panel.hidden) panel.querySelector('.lrf-radio-close')?.focus();
    });
  };
  const onEscape = event => {
    const panel = document.getElementById('lrf-radio-panel');
    if (event.key !== 'Escape' || !panel || panel.hidden) return;
    event.preventDefault();
    panel.querySelector('.lrf-radio-close')?.click();
    button?.focus();
  };
  const onResize = () => mount();
  window.addEventListener('lrf-agent-auth-ready', onAuth);
  document.addEventListener('click', afterClick, true);
  document.addEventListener('keydown', onEscape);
  media.addEventListener('change', onResize);
  stopCurrent = () => {
    stopped = true; ++generation;
    window.removeEventListener('lrf-agent-auth-ready', onAuth);
    document.removeEventListener('click', afterClick, true);
    document.removeEventListener('keydown', onEscape);
    media.removeEventListener('change', onResize);
    host?.remove(); stopCurrent = undefined;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true });
  else void refresh();
  return stopCurrent;
}
