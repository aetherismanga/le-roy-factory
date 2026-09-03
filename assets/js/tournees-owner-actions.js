import { db } from './firebase.js';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  limit
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const $ = (selector) => document.querySelector(selector);
const clean = (value) => String(value ?? '').trim();
const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const currentAgent = {
  name: clean(localStorage.getItem('agentName')) || 'Agent',
  email: clean(localStorage.getItem('agentEmail')).toLowerCase()
};

let cachedTours = [];
let observer = null;
let reloadTimer = null;
let pendingOwner = null;
let openedTourId = null;

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function ownerInfo(tour = {}) {
  const rawName = clean(tour.createdBy || tour.agentName || tour.ownerName);
  const rawEmail = clean(tour.createdByEmail || tour.agentEmail || tour.ownerEmail).toLowerCase();
  const signature = normalize(`${rawName} ${rawEmail}`);

  if (signature.includes('jerome') || rawEmail === 'jerome@leroyfactory.fr') {
    return {
      key: 'jerome',
      name: 'Jérôme Hugol',
      short: 'Jérôme',
      email: 'jerome@leroyfactory.fr'
    };
  }

  if (signature.includes('coryne') || rawEmail === 'coryne@leroyfactory.fr') {
    return {
      key: 'coryne',
      name: 'Coryne Le Roy',
      short: 'Coryne',
      email: 'coryne@leroyfactory.fr'
    };
  }

  return {
    key: 'unknown',
    name: rawName || 'Auteur non identifié',
    short: rawName || 'Auteur non identifié',
    email: rawEmail
  };
}

function currentOwner() {
  return ownerInfo({ createdBy: currentAgent.name, createdByEmail: currentAgent.email });
}

function isMine(owner) {
  if (owner.email && currentAgent.email) return owner.email === currentAgent.email;
  return normalize(owner.name) === normalize(currentAgent.name);
}

function addStyles() {
  if ($('#tour-owner-actions-style')) return;
  const style = document.createElement('style');
  style.id = 'tour-owner-actions-style';
  style.textContent = `
    .tour-saved-item.owner-jerome{border-left:5px solid #d3a62d;box-shadow:0 8px 20px rgba(166,122,18,.10)}
    .tour-saved-item.owner-coryne{border-left:5px solid #19a79f;box-shadow:0 8px 20px rgba(18,130,124,.10)}
    .tour-saved-item.owner-unknown{border-left:5px solid #a5a7ad}
    .tour-owner-line{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin:5px 0 4px}
    .tour-owner-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:999px;font-size:.69rem;font-weight:900;letter-spacing:.01em;border:1px solid transparent;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 3px 8px rgba(0,0,0,.08)}
    .tour-owner-badge.owner-jerome{background:linear-gradient(145deg,#fff2b5,#f4c84e);color:#5d4300;border-color:#d5aa2f}
    .tour-owner-badge.owner-coryne{background:linear-gradient(145deg,#dffbf8,#77ddd4);color:#075b56;border-color:#45bcb3}
    .tour-owner-badge.owner-unknown{background:linear-gradient(145deg,#f4f4f5,#dedfe2);color:#5f636b;border-color:#c7c9ce}
    .tour-owner-mine{font-size:.65rem;font-weight:850;color:#746b60;background:#f7f2e8;border:1px solid #e5d9c8;border-radius:999px;padding:3px 7px}
    .tour-saved-actions{display:flex;align-items:center;gap:7px;justify-content:flex-end}
    .tour-delete-btn{border:1px solid #dc6b5f;background:linear-gradient(180deg,#fff5f2,#ffdcd6);color:#9f261d;border-radius:9px;padding:8px 10px;font-weight:900;cursor:pointer;box-shadow:inset 0 1px 0 #fff,0 4px 10px rgba(171,48,36,.10);transition:transform .15s ease,box-shadow .15s ease}
    .tour-delete-btn:hover{transform:translateY(-1px);box-shadow:inset 0 1px 0 #fff,0 6px 14px rgba(171,48,36,.16)}
    .tour-delete-btn:disabled{opacity:.55;cursor:wait;transform:none}
    .tour-current-owner{display:inline-flex;align-items:center;gap:7px;margin-top:7px;padding:6px 10px;border-radius:12px;font-size:.74rem;font-weight:850;border:1px solid #e1d6c6;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.05)}
    .tour-current-owner.owner-jerome{border-color:#ddc06c;background:linear-gradient(145deg,#fffdf6,#fff1bb);color:#654900}
    .tour-current-owner.owner-coryne{border-color:#7cd5ce;background:linear-gradient(145deg,#f7fffe,#dffaf7);color:#075b56}
    .tour-current-owner.owner-unknown{border-color:#d2d3d6;background:#f7f7f8;color:#60636a}
    .tour-owner-legend{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:7px 0 2px}
    @media(max-width:650px){
      .tour-saved-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}
      .tour-saved-actions .tour-open-btn,.tour-saved-actions .tour-delete-btn{width:100%;min-height:42px}
      .tour-owner-legend{align-items:flex-start}
    }
  `;
  document.head.appendChild(style);
}

function status(message, type = 'ok') {
  const el = $('#tour-status');
  if (!el) return;
  el.className = `tour-status ${type}`;
  el.textContent = message;
}

function showCurrentOwner(owner) {
  const subtitle = $('#tour-result-sub');
  if (!subtitle || !owner) return;

  let badge = $('#tour-current-owner');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'tour-current-owner';
    subtitle.insertAdjacentElement('afterend', badge);
  }

  badge.className = `tour-current-owner owner-${owner.key}`;
  badge.innerHTML = `👤 Tournée de <strong>${esc(owner.name)}</strong>${isMine(owner) ? ' <span>· vous</span>' : ''}`;
}

function addLegend() {
  const heading = document.querySelector('.tour-saved > h3');
  if (!heading || $('#tour-owner-legend')) return;
  const legend = document.createElement('div');
  legend.id = 'tour-owner-legend';
  legend.className = 'tour-owner-legend';
  legend.innerHTML = `
    <span class="tour-owner-badge owner-jerome">👤 Jérôme</span>
    <span class="tour-owner-badge owner-coryne">👤 Coryne</span>
    <span style="font-size:.68rem;color:#766d62">Vous voyez tous les deux toutes les tournées.</span>
  `;
  heading.insertAdjacentElement('afterend', legend);
}

async function fetchTours() {
  try {
    let snap;
    try {
      snap = await getDocs(query(collection(db, 'tournees'), orderBy('createdAt', 'desc'), limit(20)));
    } catch {
      snap = await getDocs(collection(db, 'tournees'));
    }
    cachedTours = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[Tournées propriétaires] Chargement impossible', error);
    cachedTours = [];
  }
}

function disconnectObserver() {
  if (observer) observer.disconnect();
}

function reconnectObserver() {
  const box = $('#tour-saved-list');
  if (!box || !observer) return;
  observer.observe(box, { childList: true, subtree: true });
}

function decorateSavedList() {
  const box = $('#tour-saved-list');
  if (!box) return;

  disconnectObserver();
  addLegend();

  const items = [...box.querySelectorAll('.tour-saved-item')];
  items.forEach((item, index) => {
    const tour = cachedTours[index];
    if (!tour) return;

    const owner = ownerInfo(tour);
    item.dataset.tourId = tour.id;
    item.classList.remove('owner-jerome', 'owner-coryne', 'owner-unknown');
    item.classList.add(`owner-${owner.key}`);

    const info = item.firstElementChild;
    if (info) {
      info.querySelector('.tour-owner-line')?.remove();
      const line = document.createElement('div');
      line.className = 'tour-owner-line';
      line.innerHTML = `<span class="tour-owner-badge owner-${owner.key}">👤 ${esc(owner.short)}</span>${isMine(owner) ? '<span class="tour-owner-mine">Ma tournée</span>' : ''}`;
      const title = info.querySelector('h4');
      if (title) title.insertAdjacentElement('afterend', line);
      else info.prepend(line);
    }

    let actions = item.querySelector('.tour-saved-actions');
    const openBtn = item.querySelector('.tour-open-btn');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'tour-saved-actions';
      item.appendChild(actions);
      if (openBtn) actions.appendChild(openBtn);
    } else if (openBtn && openBtn.parentElement !== actions) {
      actions.appendChild(openBtn);
    }

    if (openBtn) {
      openBtn.dataset.tourId = tour.id;
      openBtn.dataset.ownerKey = owner.key;
      if (!openBtn.dataset.ownerHooked) {
        openBtn.dataset.ownerHooked = '1';
        openBtn.addEventListener('click', () => {
          const selected = cachedTours.find((t) => t.id === openBtn.dataset.tourId);
          const selectedOwner = ownerInfo(selected || tour);
          pendingOwner = selectedOwner;
          openedTourId = selected?.id || tour.id;
          setTimeout(() => showCurrentOwner(selectedOwner), 0);
        }, true);
      }
    }

    let deleteBtn = actions.querySelector('.tour-delete-btn');
    if (!deleteBtn) {
      deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'tour-delete-btn';
      deleteBtn.innerHTML = '🗑 Supprimer';
      actions.appendChild(deleteBtn);
    }

    deleteBtn.dataset.tourId = tour.id;
    deleteBtn.title = `Supprimer la tournée de ${owner.name}`;
    deleteBtn.onclick = async () => {
      const liveTour = cachedTours.find((t) => t.id === deleteBtn.dataset.tourId) || tour;
      const liveOwner = ownerInfo(liveTour);
      const dates = clean(liveTour.dateStart)
        ? `${liveTour.dateStart}${liveTour.dateEnd && liveTour.dateEnd !== liveTour.dateStart ? ` → ${liveTour.dateEnd}` : ''}`
        : 'sans date';
      const count = liveTour.days?.reduce((sum, day) => sum + (day.stops?.length || 0), 0) || 0;

      const ok = window.confirm(
        `Supprimer définitivement cette tournée ?\n\n` +
        `Créateur : ${liveOwner.name}\n` +
        `Dates : ${dates}\n` +
        `Visites : ${count}\n\n` +
        `Cette action est définitive.`
      );
      if (!ok) return;

      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Suppression…';
      try {
        await deleteDoc(doc(db, 'tournees', liveTour.id));
        cachedTours = cachedTours.filter((t) => t.id !== liveTour.id);
        item.remove();
        status(`Tournée de ${liveOwner.short} supprimée.`, 'ok');

        if (openedTourId === liveTour.id) {
          openedTourId = null;
          pendingOwner = null;
          $('#tour-current-owner')?.remove();
        }

        await fetchTours();
        scheduleDecorate(80);
      } catch (error) {
        console.error('[Tournées propriétaires] Suppression impossible', error);
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '🗑 Supprimer';
        status('Impossible de supprimer la tournée. Vérifiez les droits Firestore.', 'error');
      }
    };
  });

  reconnectObserver();
}

function scheduleDecorate(delay = 220) {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(async () => {
    disconnectObserver();
    await fetchTours();
    decorateSavedList();
  }, delay);
}

function observeSavedList() {
  const box = $('#tour-saved-list');
  if (!box) return;
  observer = new MutationObserver(() => scheduleDecorate(260));
  reconnectObserver();
}

function observeCurrentPlan() {
  const subtitle = $('#tour-result-sub');
  if (!subtitle) return;
  const resultObserver = new MutationObserver(() => {
    if (pendingOwner) showCurrentOwner(pendingOwner);
  });
  resultObserver.observe(subtitle, { childList: true, characterData: true, subtree: true });

  const calculateBtn = $('#tour-calculate');
  if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
      pendingOwner = currentOwner();
      openedTourId = null;
    }, true);
  }
}

function init() {
  addStyles();
  addLegend();
  observeSavedList();
  observeCurrentPlan();
  scheduleDecorate(350);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
