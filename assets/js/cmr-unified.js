// CMR unifié — LE ROY FACTORY
// Objectif : un seul formulaire Firestore pour créer/modifier les comptes-rendus,
// quel que soit le point d'entrée (page CMR, fiche client ou bouton mobile +).

const page = (location.pathname.split('/').pop() || '').toLowerCase();

const norm = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

function isoWeek(dateValue) {
  const d = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
}

function buildClientCrUrl({ create = false } = {}) {
  const societe = document.getElementById('edit-societe')?.value?.trim() || '';
  const cp = document.getElementById('edit-code-postal')?.value?.trim() || '';
  if (!societe) return null;
  const params = new URLSearchParams();
  if (create) params.set('new', '1');
  params.set('clientName', societe);
  if (cp) params.set('cp', cp);
  return `comptes-rendus.html?${params.toString()}`;
}

function unifyClientCrEntry() {
  const dateInput = document.getElementById('cr-date-input');
  if (!dateInput) return;

  // Conserver les anciens champs dans le DOM pour ne rien casser dans le code historique,
  // mais ne plus les montrer ni les utiliser comme point de saisie.
  const legacyBox = dateInput.parentElement?.parentElement?.parentElement;
  if (!legacyBox || legacyBox.dataset.cmrUnified === '1') return;
  legacyBox.dataset.cmrUnified = '1';

  Array.from(legacyBox.children).forEach(child => {
    child.style.display = 'none';
  });

  const panel = document.createElement('div');
  panel.className = 'lrf-cmr-unified-client-panel';
  panel.style.cssText = 'display:flex;flex-direction:column;gap:.75rem;';
  panel.innerHTML = `
    <div style="font-size:.9rem;color:#4b5563;line-height:1.45;">
      Les comptes-rendus utilisent maintenant le même formulaire partout et sont enregistrés directement dans Firebase.
    </div>
    <div style="display:flex;gap:.65rem;flex-wrap:wrap;">
      <button type="button" id="lrf-client-new-cr" class="btn-primary-gold" style="flex:1 1 220px;justify-content:center;">➕ Rédiger un compte-rendu</button>
      <button type="button" id="lrf-client-view-cr" class="filter-btn" style="flex:1 1 220px;justify-content:center;">📋 Voir / modifier les comptes-rendus</button>
    </div>
  `;
  legacyBox.appendChild(panel);

  const go = (create) => {
    const url = buildClientCrUrl({ create });
    if (!url) {
      alert('Enregistrez d’abord la fiche client avant de créer un compte-rendu.');
      return;
    }
    location.href = url;
  };

  panel.querySelector('#lrf-client-new-cr')?.addEventListener('click', () => go(true));
  panel.querySelector('#lrf-client-view-cr')?.addEventListener('click', () => go(false));
}

function installVoiceCommand() {
  const textarea = document.getElementById('cr-input-text');
  if (!textarea || document.getElementById('lrf-cr-voice-btn')) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const wrap = textarea.parentElement;
  if (!wrap) return;

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:.65rem;flex-wrap:wrap;margin:0 0 .6rem;';
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'lrf-cr-voice-btn';
  button.className = 'filter-btn';
  button.style.cssText = 'background:#111;color:#FFD700;border-color:#D4AF37;font-weight:700;';
  button.innerHTML = '🎙️ Dicter le compte-rendu';
  const status = document.createElement('span');
  status.id = 'lrf-cr-voice-status';
  status.style.cssText = 'font-size:.78rem;color:#6b7280;';
  status.textContent = SpeechRecognition ? 'Commande vocale disponible' : 'Commande vocale non disponible sur ce navigateur';
  row.append(button, status);
  wrap.insertBefore(row, textarea);

  if (!SpeechRecognition) {
    button.disabled = true;
    button.style.opacity = '.55';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.continuous = true;
  recognition.interimResults = true;
  let listening = false;
  let baseText = '';

  const resetUi = () => {
    listening = false;
    button.innerHTML = '🎙️ Dicter le compte-rendu';
    button.style.background = '#111';
    status.textContent = 'Commande vocale disponible';
  };

  recognition.onresult = (event) => {
    let finalText = '';
    let interimText = '';
    for (let i = 0; i < event.results.length; i += 1) {
      const part = event.results[i][0]?.transcript || '';
      if (event.results[i].isFinal) finalText += `${part} `;
      else interimText += part;
    }
    const pieces = [baseText.trim(), finalText.trim(), interimText.trim()].filter(Boolean);
    textarea.value = pieces.join(' ').replace(/\s+/g, ' ').trim();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };

  recognition.onerror = (event) => {
    console.warn('CMR dictée vocale', event.error);
    status.textContent = event.error === 'not-allowed' ? 'Microphone non autorisé' : 'Dictée interrompue';
    resetUi();
  };
  recognition.onend = () => resetUi();

  button.addEventListener('click', () => {
    if (listening) {
      listening = false;
      try { recognition.stop(); } catch (_) {}
      resetUi();
      return;
    }
    baseText = textarea.value || '';
    listening = true;
    button.innerHTML = '🔴 Arrêter la dictée';
    button.style.background = '#7f1d1d';
    status.textContent = 'Écoute en cours…';
    try { recognition.start(); }
    catch (err) {
      console.warn('Démarrage dictée impossible', err);
      resetUi();
    }
  });

  ['btn-save-cr', 'btn-cancel-cr', 'btn-close-cr-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      if (!listening) return;
      listening = false;
      try { recognition.stop(); } catch (_) {}
      resetUi();
    });
  });
}

function installWeekDisplay() {
  const dateInput = document.getElementById('cr-input-date');
  const textarea = document.getElementById('cr-input-text');
  const form = document.getElementById('form-new-cr');
  if (!dateInput || !textarea || !form || document.getElementById('lrf-cr-week')) return;

  const badge = document.createElement('div');
  badge.id = 'lrf-cr-week';
  badge.style.cssText = 'margin-top:.35rem;font-size:.78rem;font-weight:700;color:#6f5711;';
  dateInput.insertAdjacentElement('afterend', badge);

  const refresh = () => {
    const week = isoWeek(dateInput.value);
    badge.textContent = week ? `Semaine ${week}` : '';
  };
  dateInput.addEventListener('change', refresh);
  dateInput.addEventListener('input', refresh);
  refresh();

  // Le numéro de semaine reste présent dans le texte enregistré, comme demandé dans le CRM.
  form.addEventListener('submit', () => {
    const week = isoWeek(dateInput.value);
    const text = textarea.value.trim();
    if (week && text && !/^semaine\s+\d+/i.test(text)) {
      textarea.value = `Semaine ${week} — ${text}`;
    }
  }, true);
}

function handleCentralCrDeepLink() {
  const params = new URLSearchParams(location.search);
  const wantNew = params.get('new') === '1';
  const wantedId = params.get('client') || '';
  const wantedName = params.get('clientName') || '';
  const wantedCp = params.get('cp') || '';
  if (!wantNew && !wantedId && !wantedName) return;

  const select = document.getElementById('cr-select-client');
  const openBtn = document.getElementById('btn-open-cr-modal');
  const search = document.getElementById('cr-search-input');
  if (!select) return;

  let done = false;
  const tryApply = () => {
    if (done) return true;
    const options = Array.from(select.options);
    const match = options.find(opt => {
      if (!opt.value) return false;
      if (wantedId && opt.value === wantedId) return true;
      if (!wantedName) return false;
      const label = norm(opt.textContent);
      const nameOk = label.includes(norm(wantedName));
      const cpOk = !wantedCp || label.includes(norm(wantedCp));
      return nameOk && cpOk;
    });
    if (!match) return false;

    done = true;
    if (wantNew) {
      openBtn?.click();
      setTimeout(() => {
        select.value = match.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, 0);
    } else if (search) {
      const company = (match.textContent || wantedName).split('(')[0].trim();
      search.value = company;
      search.dispatchEvent(new Event('input', { bubbles: true }));
      search.focus();
    }
    return true;
  };

  if (tryApply()) return;
  const observer = new MutationObserver(() => {
    if (tryApply()) observer.disconnect();
  });
  observer.observe(select, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 12000);
}

function fixMobileCrShortcut() {
  const fix = () => {
    document.querySelectorAll('.lrf-mobile-action-sheet a').forEach(link => {
      if ((link.textContent || '').toLowerCase().includes('compte-rendu')) {
        link.href = 'comptes-rendus.html?new=1';
      }
    });
  };
  fix();
  const observer = new MutationObserver(fix);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 5000);
}

function init() {
  fixMobileCrShortcut();
  if (page === 'clients.html') {
    unifyClientCrEntry();
  }
  if (page === 'comptes-rendus.html') {
    installVoiceCommand();
    installWeekDisplay();
    handleCentralCrDeepLink();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
