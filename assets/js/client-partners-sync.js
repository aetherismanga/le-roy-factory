import { db } from "./firebase.js";
import { collection, doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Source de vérité unique pour les partenaires d'une fiche client.
// Le portail Accès PRO lit le même champ Firestore `partenaires`.
let clients = [];
let activeClientId = null;
let renderTimer = null;
let saving = false;

const clean = v => String(v ?? "").trim();
const norm = v => clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const postal = v => clean(v).replace(/\D/g, "").padStart(5, "0");
const uniq = values => [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];

function modalOpen() {
  const modal = document.getElementById("client-modal");
  return !!modal && getComputedStyle(modal).display !== "none";
}

function resolveClient() {
  if (activeClientId) {
    const byId = clients.find(c => c.id === activeClientId);
    if (byId) return byId;
  }

  const code = clean(document.getElementById("edit-code-client")?.value).toUpperCase();
  if (code) {
    const byCode = clients.find(c => clean(c.codeClient || c.codeLRF || c.lrfCode).toUpperCase() === code);
    if (byCode) {
      activeClientId = byCode.id;
      return byCode;
    }
  }

  const societe = norm(document.getElementById("edit-societe")?.value);
  const cp = postal(document.getElementById("edit-code-postal")?.value);
  const ville = norm(document.getElementById("edit-ville")?.value);
  if (!societe) return null;

  const exact = clients.find(c =>
    norm(c.societe) === societe &&
    (!cp || postal(c.codePostal || c.code_postal) === cp) &&
    (!ville || norm(c.ville) === ville)
  );
  const byCompany = exact || clients.find(c => norm(c.societe) === societe);
  if (byCompany) activeClientId = byCompany.id;
  return byCompany || null;
}

function saveState(text, type = "ok") {
  const grid = document.getElementById("crm-partner-grid");
  if (!grid) return;
  let state = document.getElementById("lrf-partner-save-state");
  if (!state) {
    state = document.createElement("div");
    state.id = "lrf-partner-save-state";
    state.style.cssText = "margin:0 0 .7rem;padding:.55rem .75rem;border-radius:9px;font-size:.78rem;font-weight:750;transition:.2s";
    grid.insertAdjacentElement("beforebegin", state);
  }
  state.textContent = text;
  const styles = type === "saving"
    ? ["#FFF7D9", "#775900", "#E8D18A"]
    : type === "error"
      ? ["#FFF0EF", "#9F2F28", "#EBC1BC"]
      : ["#EAF7EF", "#17623A", "#B8DEC6"];
  state.style.background = styles[0];
  state.style.color = styles[1];
  state.style.border = `1px solid ${styles[2]}`;
}

function syncGridFromFirestore() {
  if (!modalOpen()) return;
  const grid = document.getElementById("crm-partner-grid");
  const client = resolveClient();
  if (!grid || !client) return;

  const selected = new Set(uniq(client.partenaires));
  grid.querySelectorAll(".partner-card-mini[data-pid]").forEach(card => {
    const id = clean(card.dataset.pid);
    card.classList.toggle("active", selected.has(id));
    card.setAttribute("aria-pressed", selected.has(id) ? "true" : "false");
  });
  saveState(`${selected.size} partenaire${selected.size > 1 ? "s" : ""} actuellement enregistré${selected.size > 1 ? "s" : ""}`);
  window.dispatchEvent(new CustomEvent("lrf-client-partners-rendered", { detail: { clientId: client.id, partenaires: [...selected] } }));
}

function scheduleGridSync(delay = 80) {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(syncGridFromFirestore, delay);
}

async function persistPartnerToggle(partnerId, shouldSelect) {
  const client = resolveClient();
  if (!client || !partnerId || saving) {
    if (!client) saveState("Impossible d'identifier la fiche client ouverte.", "error");
    return;
  }

  const ids = new Set(uniq(client.partenaires));
  if (shouldSelect) ids.add(partnerId);
  else ids.delete(partnerId);
  const next = [...ids];

  // Mise à jour optimiste pour empêcher un autre script de réafficher l'ancien état.
  client.partenaires = next;
  syncGridFromFirestore();
  saveState("Enregistrement des partenaires…", "saving");
  saving = true;
  try {
    await updateDoc(doc(db, "clients", client.id), {
      partenaires: next,
      partenairesUpdatedAt: new Date().toISOString()
    });
    saveState(`✓ ${next.length} partenaire${next.length > 1 ? "s" : ""} enregistré${next.length > 1 ? "s" : ""} — Accès PRO synchronisé`);
    window.dispatchEvent(new CustomEvent("lrf-client-partners-saved", { detail: { clientId: client.id, partenaires: next } }));
  } catch (error) {
    console.error("Synchronisation partenaires client", error);
    saveState("Erreur : les partenaires n'ont pas pu être enregistrés.", "error");
  } finally {
    saving = false;
    scheduleGridSync(40);
  }
}

// Capture l'identité exacte de la fiche avant l'ouverture de la modale.
document.addEventListener("click", event => {
  const row = event.target.closest("#clients-table-body tr");
  if (row) {
    const rowId = clean(row.dataset.clientId || row.dataset.id || row.getAttribute("data-client-id") || row.getAttribute("data-id"));
    if (rowId && clients.some(c => c.id === rowId)) activeClientId = rowId;
  }
  if (event.target.closest("#btn-add-client")) activeClientId = null;

  const card = event.target.closest("#crm-partner-grid .partner-card-mini[data-pid]");
  if (card) {
    // On calcule l'état voulu AVANT les rerenders de crm-moovago / crm-ui-modern.
    const id = clean(card.dataset.pid);
    const client = resolveClient();
    const selected = new Set(uniq(client?.partenaires));
    const shouldSelect = !selected.has(id);
    event.preventDefault();
    event.stopImmediatePropagation();
    persistPartnerToggle(id, shouldSelect);
  }
}, true);

const modal = document.getElementById("client-modal");
if (modal) {
  new MutationObserver(() => {
    if (modalOpen()) scheduleGridSync(60);
  }).observe(modal, { attributes: true, attributeFilter: ["style"], childList: true, subtree: true });
}

onSnapshot(collection(db, "clients"), snap => {
  clients = [];
  snap.forEach(d => clients.push({ id: d.id, ...d.data() }));
  if (activeClientId && !clients.some(c => c.id === activeClientId)) activeClientId = null;
  scheduleGridSync(30);
});

window.addEventListener("lrf-client-opened", event => {
  if (event.detail?.clientId) activeClientId = clean(event.detail.clientId);
  scheduleGridSync(30);
});
