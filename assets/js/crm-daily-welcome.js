import {
  authenticatedFirstName, createWelcomeTracker, dailyMessage,
  millisecondsUntilNextLocalDay, welcomeStorageKey
} from './crm-daily-welcome-core.mjs';

let tracker;
let dismissCurrent = () => {};
let stopCurrent;

function getTracker() {
  if (!tracker) {
    let storage;
    try { storage = window.localStorage; } catch (_) { /* restricted browser */ }
    tracker = createWelcomeTracker(storage);
  }
  return tracker;
}

/** The caller supplies a profile obtained from the authenticated session. */
export function showDailyWelcome(profile, { date = new Date(), duration = 6000 } = {}) {
  if (!document.body || document.visibilityState === 'hidden') return false;
  if (!getTracker().claim(profile, date).show) return false;
  dismissCurrent();

  const card = document.createElement('aside');
  card.className = 'lrf-daily-welcome';
  card.setAttribute('role', 'status');
  card.setAttribute('aria-live', 'polite');
  card.setAttribute('aria-atomic', 'true');

  const originalLogo = document.querySelector('.sidebar-brand img, .crm-brand img, img[data-lrf-logo]');
  if (originalLogo) {
    const logo = document.createElement('img');
    logo.className = 'lrf-daily-logo';
    logo.src = originalLogo.currentSrc || originalLogo.src;
    logo.alt = 'LE ROY FACTORY';
    logo.width = 44;
    logo.height = 44;
    logo.addEventListener('error', () => logo.remove(), { once: true });
    card.append(logo);
  }

  const content = document.createElement('div');
  content.className = 'lrf-daily-content';
  const heading = document.createElement('strong');
  heading.className = 'lrf-daily-greeting';
  const name = authenticatedFirstName(profile);
  heading.textContent = name ? `Bonjour ${name} !` : 'Bonjour !';
  const message = document.createElement('p');
  message.className = 'lrf-daily-message';
  message.textContent = dailyMessage(date);
  content.append(heading, message);

  const close = document.createElement('button');
  close.className = 'lrf-daily-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Fermer le message de bienvenue');
  close.textContent = '×';
  card.append(content, close);
  document.body.append(card);

  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    card.remove();
    if (dismissCurrent === dismiss) dismissCurrent = () => {};
  };
  dismissCurrent = dismiss;
  close.addEventListener('click', dismiss);
  card.addEventListener('keydown', event => { if (event.key === 'Escape') dismiss(); });
  const scheduleDismiss = () => { clearTimeout(timer); timer = setTimeout(dismiss, duration); };
  // Allow time to read when interacting with the card; never take keyboard focus.
  card.addEventListener('mouseenter', () => clearTimeout(timer));
  card.addEventListener('mouseleave', scheduleDismiss);
  card.addEventListener('focusin', () => clearTimeout(timer));
  card.addEventListener('focusout', scheduleDismiss);
  scheduleDismiss();
  return true;
}

/** Serialize the first display across simultaneous tabs when Web Locks exists. */
export async function showDailyWelcomeSafely(profile, options = {}) {
  const key = welcomeStorageKey(profile?.uid);
  if (!key) return false;
  const run = () => options.isCurrent?.() === false ? false : showDailyWelcome(profile, options);
  let locks;
  try { locks = window.navigator?.locks; } catch (_) { /* restricted browser */ }
  if (!locks?.request) return run();
  let started = false;
  try {
    return await locks.request(key, () => { started = true; return run(); });
  } catch (_) {
    // Security restrictions can deny Web Locks even when the API exists.
    // If the callback already ran, never run it a second time.
    return started ? false : run();
  }
}

/**
 * Integrate after installing the session gate:
 * startDailyWelcome({ getProfile: waitForAgent });
 * Nothing is fetched or written to Firebase by this module.
 */
export function startDailyWelcome({ getProfile } = {}) {
  if (stopCurrent) return stopCurrent;
  if (typeof getProfile !== 'function') throw new TypeError('Une session authentifiée est nécessaire.');
  let stopped = false;
  let currentProfile = null;
  let refreshGeneration = 0;
  let midnightTimer;

  const scheduleMidnight = () => {
    clearTimeout(midnightTimer);
    midnightTimer = setTimeout(refresh, millisecondsUntilNextLocalDay() + 100);
  };
  const present = profile => {
    const changedAccount = currentProfile?.uid !== profile?.uid;
    currentProfile = profile;
    if (changedAccount || !profile) dismissCurrent();
    const generation = refreshGeneration;
    const uid = profile?.uid;
    if (profile) void showDailyWelcomeSafely(profile, {
      isCurrent: () => !stopped && generation === refreshGeneration && currentProfile?.uid === uid
    });
    scheduleMidnight();
  };
  async function refresh() {
    if (stopped) return;
    const generation = ++refreshGeneration;
    try {
      const profile = await getProfile();
      if (!stopped && generation === refreshGeneration) present(profile);
    } catch (_) {
      if (!stopped && generation === refreshGeneration) present(null);
    }
  }
  const onAuth = event => {
    ++refreshGeneration;
    if (!stopped) present(event.detail || null);
  };
  const onVisibility = () => { if (document.visibilityState !== 'hidden') void refresh(); };
  window.addEventListener('lrf-agent-auth-ready', onAuth);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', onVisibility);

  stopCurrent = () => {
    stopped = true;
    ++refreshGeneration;
    clearTimeout(midnightTimer);
    dismissCurrent();
    window.removeEventListener('lrf-agent-auth-ready', onAuth);
    window.removeEventListener('pageshow', refresh);
    window.removeEventListener('focus', refresh);
    document.removeEventListener('visibilitychange', onVisibility);
    stopCurrent = undefined;
  };
  void refresh();
  return stopCurrent;
}
