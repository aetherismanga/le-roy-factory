import { db } from "./firebase.js";
import { collection, doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Synchronisation fiable des partenaires cochés dans la fiche CRM vers Firestore.
// Le portail Accès PRO lit exactement ce champ `partenaires`.
let clients = [];
let activeClientId = null;
let saveTimer = null;

const clean = v => String(v ?? "").trim();
const norm = v => clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const postal = v => clean(v).replace(/\D/g, "").padStart(5, "0");

function resolveClient() {
  if (activeClientId) {
    const byId = clients.find(c => c.id === activeClientId);
    if (byId) return byId;
  }

  // Le code LRF est l'identifiant le plus sûr de la fiche ouverte.
  const code = clean(document.getElementById("edit-code-client")?.value).toUpperCase();
  if (code) {
    const byCode = clients.find(c => clean(c.codeClient).toUpperCase() === code);
    if (byCode) {
      activeClientId = byCode.id;
      return byCode;
    }
  }

  // Secours pour les anciennes fiches sans code LRF affiché dans la modale.
  const societe = norm(document.getElementById("edit-societe")?.value);
  const cp = postal(document.getElementById("edit-code-postal")?.value);
  const ville = norm(document.getElementById("edit-ville")?.value);
  if (!societe) return null;

  const byCompany = clients.find(c =>
    norm(c.societe) === societe &&
    (!cp || postal(c.codePostal || c.code_postal) === cp) &&
    (!ville || norm(c.ville) === ville)
  ) || clients.find(c => norm(c.societe) === societe);

  if (byCompany) activeClientId = byCompany.id;
  return byCompany || null;
}

function selectedPartnerIds() {
  return [...document.querySelectorAll("#crm-partner-grid .partner-card-mini.active[data-pid]")]
    .map(el => clean(el.dataset.pid))
    .filter(Boolean);
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
  if (type === "saving") {
    state.style.background = "#FFF7D9";
    state.style.color = "#775900";
    state.style.border = "1px solid #E8D18A";
  } else if (type === "error") {
    state.style.background = "#FFF0EF";
    state.style.color = "#9F2F28";
    state.style.border = "1px solid #EBC1BC";
  } else {
    state.style.background = "#EAF7EF";
    state.style.color = "#17623A";
    state.style.border = "1px solid #B8DEC6";
  }
}

async function persistPartners() {
  const client = resolveClient();
  if (!client) {
    saveState("Impossible d'identifier la fiche client ouverte.", "error");
    return;
  }

  const ids = [...new Set(selectedPartnerIds())];
  saveState("Enregistrement des partenaires…", "saving");
  try {
    await updateDoc(doc(db, "clients", client.id), {
      partenaires: ids,
      partenairesUpdatedAt: new Date().toISOString()
    });
    client.partenaires = [...ids];
    saveState(`✓ ${ids.length} partenaire${ids.length > 1 ? "s" : ""} enregistré${ids.length > 1 ? "s" : ""} — Accès PRO synchronisé`);
    window.dispatchEvent(new CustomEvent("lrf-client-partners-saved", { detail: { clientId: client.id, partenaires: ids } }));
  } catch (error) {
    console.error("Synchronisation partenaires client", error);
    saveState("Erreur : les partenaires n'ont pas pu être enregistrés.", "error");
  }
}

function scheduleSave(delay = 140) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistPartners, delay);
}

// Capture l'ID exact de la ligne avant que les autres scripts ouvrent la modale.
document.addEventListener("click", event => {
  const row = event.target.closest("#clients-table-body tr");
  if (row) {
    const rowId = clean(row.dataset.clientId || row.dataset.id || row.getAttribute("data-client-id") || row.getAttribute("data-id"));
    if (rowId && clients.some(c => c.id === rowId)) activeClientId = rowId;
  }

  if (event.target.closest("#btn-add-client")) activeClientId = null;

  // crm-moovago bascule la classe active puis recrée la grille : on enregistre juste après.
  if (event.target.closest("#crm-partner-grid .partner-card-mini[data-pid]")) scheduleSave(160);
}, true);

// Le bouton principal reste également un filet de sécurité.
document.getElementById("client-form")?.addEventListener("submit", () => scheduleSave(220), true);

const modal = document.getElementById("client-modal");
if (modal) {
  new MutationObserver(() => {
    if (getComputedStyle(modal).display !== "none") {
      setTimeout(() => {
        resolveClient();
        const c = resolveClient();
        if (c) saveState(`${(c.partenaires || []).length} partenaire${(c.partenaires || []).length > 1 ? "s" : ""} actuellement enregistré${(c.partenaires || []).length > 1 ? "s" : ""}`);
      }, 120);
    }
  }).observe(modal, { attributes: true, attributeFilter: ["style"] });
}

onSnapshot(collection(db, "clients"), snap => {
  clients = [];
  snap.forEach(d => clients.push({ id: d.id, ...d.data() }));
});
