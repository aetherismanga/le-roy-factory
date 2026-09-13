import { auth, getAgentProfile } from './firebase.js?v=20260913-testcenter1';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const API = 'https://us-central1-le-roy-factory.cloudfunctions.net/siteControl';
const RUNS_API = 'https://api.github.com/repos/aetherismanga/le-roy-factory/actions/workflows/lrf-client-virtuel.yml/runs?per_page=12';
const LABELS = {
  'desktop-chrome': 'PC Chrome',
  'iphone-webkit': 'iPhone Safari',
  'android-chrome': 'Android Chrome',
  all: 'Tout le site', navigation: 'Navigation principale', accueil: 'Accueil', selections: 'Sélections',
  elios: 'Elios', configurateurs: 'Configurateurs', catalogues: 'Catalogues', contact: 'Contact',
  quick: 'Rapide', normal: 'Normal', full: 'Complet',
  hourly: 'Toutes les heures', '6h': 'Toutes les 6 h', '12h': 'Toutes les 12 h',
  daily: 'Tous les jours', weekdays: 'Du lundi au vendredi', weekly: 'Chaque semaine'
};

const $ = (id) => document.getElementById(id);
let profile = null;
let lastSaved = null;

function notify(message, type = 'info') {
  const box = $('testcenter-message');
  if (!box) return;
  box.textContent = message;
  box.dataset.type = type;
  box.hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { box.hidden = true; }, 5200);
}

function setBusy(busy) {
  ['save-test-settings', 'run-test-now'].forEach((id) => {
    const el = $(id);
    if (el) el.disabled = busy;
  });
}

function waitForAgent() {
  return new Promise((resolve) => {
    const off = onAuthStateChanged(auth, (user) => {
      const p = getAgentProfile(user);
      if (!p) {
        const returnTo = encodeURIComponent('controle-site.html');
        location.replace(`agent.html?return=${returnTo}`);
        return;
      }
      off();
      resolve(p);
    });
  });
}

async function apiPost(action, config) {
  const user = auth.currentUser;
  if (!user) throw new Error('Session agent expirée.');
  const token = await user.getIdToken();
  const response = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action, config })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || 'Commande refusée.');
  return data;
}

async function loadConfig() {
  const response = await fetch(API, { cache: 'no-store' });
  if (!response.ok) throw new Error('Le service de contrôle ne répond pas encore.');
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Configuration indisponible.');
  lastSaved = data.config;
  applyConfig(data.config);
  updateOverview(data.config, data.manualRequest);
}

function applyConfig(config = {}) {
  $('robot-enabled').checked = config.enabled !== false;
  $('test-runs').value = Math.min(20, Math.max(1, Number(config.runs || 1)));
  const selected = new Set(config.devices || []);
  document.querySelectorAll('[data-device]').forEach((input) => { input.checked = selected.has(input.value); });
  $('test-scope').value = config.scope || 'all';
  $('test-intensity').value = config.intensity || 'normal';
  const schedule = config.schedule || {};
  $('schedule-enabled').checked = schedule.enabled !== false;
  $('schedule-cadence').value = schedule.cadence || 'daily';
  $('schedule-time').value = schedule.time || '07:00';
  $('schedule-weekday').value = String(schedule.weekday || 1);
  syncScheduleFields();
  syncMasterStatus();
}

function readConfig() {
  const devices = [...document.querySelectorAll('[data-device]:checked')].map((input) => input.value);
  if (!devices.length) throw new Error('Choisis au moins un appareil.');
  return {
    enabled: $('robot-enabled').checked,
    runs: Math.min(20, Math.max(1, Number($('test-runs').value || 1))),
    devices,
    scope: $('test-scope').value,
    intensity: $('test-intensity').value,
    schedule: {
      enabled: $('schedule-enabled').checked,
      cadence: $('schedule-cadence').value,
      time: $('schedule-time').value || '07:00',
      weekday: Number($('schedule-weekday').value || 1)
    }
  };
}

function syncMasterStatus() {
  const enabled = $('robot-enabled').checked;
  const badge = $('robot-state-badge');
  badge.textContent = enabled ? 'ACTIF' : 'PAUSE';
  badge.classList.toggle('off', !enabled);
  $('robot-state-text').textContent = enabled
    ? 'Les contrôles programmés sont autorisés.'
    : 'Les contrôles programmés sont désactivés. Le bouton « Lancer maintenant » reste disponible.';
}

function syncScheduleFields() {
  const enabled = $('schedule-enabled').checked;
  $('schedule-options').classList.toggle('is-disabled', !enabled);
  $('schedule-cadence').disabled = !enabled;
  $('schedule-time').disabled = !enabled;
  $('schedule-weekday').disabled = !enabled;
  $('weekday-field').hidden = $('schedule-cadence').value !== 'weekly';
}

function updateOverview(config, manualRequest = null) {
  const status = config.enabled ? '🟢 Actif' : '⏸️ En pause';
  $('overview-status').textContent = status;
  $('overview-devices').textContent = (config.devices || []).map((d) => LABELS[d] || d).join(' · ');
  $('overview-plan').textContent = `${config.runs || 1} passage${Number(config.runs) > 1 ? 's' : ''} · ${LABELS[config.scope] || config.scope} · ${LABELS[config.intensity] || config.intensity}`;
  const s = config.schedule || {};
  $('overview-schedule').textContent = s.enabled
    ? `${LABELS[s.cadence] || s.cadence} · ${s.time || '07:00'}${s.cadence === 'weekly' ? ` · jour ${s.weekday}` : ''}`
    : 'Planification désactivée';
  $('overview-request').textContent = manualRequest?.requestedAt
    ? `Dernière demande manuelle : ${formatDate(manualRequest.requestedAt)}`
    : 'Aucune demande manuelle récente';
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short'
    }).format(new Date(value));
  } catch (_) {
    return String(value || '');
  }
}

async function saveSettings() {
  try {
    setBusy(true);
    const config = readConfig();
    const result = await apiPost('save', config);
    lastSaved = result.config;
    updateOverview(result.config);
    notify('Réglages du client virtuel enregistrés.', 'success');
  } catch (error) {
    notify(error.message || 'Impossible d’enregistrer.', 'error');
  } finally {
    setBusy(false);
  }
}

async function runNow() {
  try {
    setBusy(true);
    const config = readConfig();
    const result = await apiPost('run', config);
    lastSaved = result.config;
    updateOverview(result.config, { requestedAt: new Date().toISOString() });
    notify('Contrôle demandé. Le veilleur GitHub le prendra au prochain passage automatique.', 'success');
    $('manual-request-id').textContent = result.requestId ? `Demande ${String(result.requestId).slice(0, 8)}` : '';
  } catch (error) {
    notify(error.message || 'Impossible de lancer le contrôle.', 'error');
  } finally {
    setBusy(false);
  }
}

function statusMeta(run, testStep) {
  if (run.status !== 'completed') return { icon: '🟡', label: 'En cours', cls: 'running' };
  if (testStep?.conclusion === 'success') return { icon: '✅', label: 'Réussi', cls: 'success' };
  if (testStep?.conclusion === 'failure' || run.conclusion === 'failure') return { icon: '❌', label: 'Échec', cls: 'failure' };
  return { icon: '⚪', label: run.conclusion || 'Terminé', cls: 'neutral' };
}

async function fetchActualRuns() {
  const runsResponse = await fetch(RUNS_API, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
  if (!runsResponse.ok) throw new Error('Historique GitHub momentanément indisponible.');
  const payload = await runsResponse.json();
  const output = [];
  for (const run of (payload.workflow_runs || []).slice(0, 12)) {
    if (output.length >= 6) break;
    try {
      const jobsResponse = await fetch(run.jobs_url, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
      if (!jobsResponse.ok) continue;
      const jobsPayload = await jobsResponse.json();
      const steps = (jobsPayload.jobs || []).flatMap((job) => job.steps || []);
      const testStep = steps.find((step) => step.name === 'Faire naviguer le client virtuel');
      if (!testStep || testStep.conclusion === 'skipped') continue;
      output.push({ run, testStep });
    } catch (_) {}
  }
  return output;
}

async function loadHistory() {
  const list = $('test-history');
  list.innerHTML = '<div class="history-empty">Chargement des derniers contrôles…</div>';
  try {
    const items = await fetchActualRuns();
    if (!items.length) {
      list.innerHTML = '<div class="history-empty">Aucun contrôle exécuté trouvé pour le moment.</div>';
      return;
    }
    list.innerHTML = items.map(({ run, testStep }) => {
      const meta = statusMeta(run, testStep);
      const eventLabel = run.event === 'push' ? 'Après modification du site' : run.event === 'workflow_dispatch' ? 'Lancement GitHub' : 'Test Center / programmé';
      return `<a class="history-row" href="${run.html_url}" target="_blank" rel="noopener">
        <span class="history-icon">${meta.icon}</span>
        <span class="history-main"><strong>${meta.label}</strong><small>${eventLabel} · ${formatDate(run.created_at)}</small></span>
        <span class="history-number">#${run.run_number}</span><span class="history-arrow">→</span>
      </a>`;
    }).join('');
  } catch (error) {
    list.innerHTML = `<div class="history-empty history-error">${error.message}</div>`;
  }
}

function bind() {
  $('robot-enabled').addEventListener('change', syncMasterStatus);
  $('schedule-enabled').addEventListener('change', syncScheduleFields);
  $('schedule-cadence').addEventListener('change', syncScheduleFields);
  $('save-test-settings').addEventListener('click', saveSettings);
  $('run-test-now').addEventListener('click', runNow);
  $('refresh-history').addEventListener('click', loadHistory);
  $('test-runs').addEventListener('input', () => {
    const value = Math.min(20, Math.max(1, Number($('test-runs').value || 1)));
    $('runs-label').textContent = `${value} passage${value > 1 ? 's' : ''}`;
  });
}

async function init() {
  try {
    profile = await waitForAgent();
    document.documentElement.style.visibility = 'visible';
    $('testcenter-agent').textContent = `Connecté : ${profile.name}`;
    bind();
    await Promise.allSettled([loadConfig(), loadHistory()]);
    $('test-runs').dispatchEvent(new Event('input'));
  } catch (error) {
    document.documentElement.style.visibility = 'visible';
    notify(error.message || 'Erreur de chargement du Test Center.', 'error');
  }
}

init();
