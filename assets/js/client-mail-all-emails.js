import { db } from "./firebase.js";
import { doc, getDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let clients = [];
let pendingClientId = null;
let modalRefreshTimer = null;

const valid = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
const norm = v => String(v || "").trim().toLowerCase();
const esc = v => String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");

function allEmails(client) {
  const result = [];
  const seen = new Set();
  const add = (email, label, kind = "societe") => {
    email = String(email || "").trim();
    const key = norm(email);
    if (!valid(email) || seen.has(key)) return;
    seen.add(key);
    result.push({ email, label, kind });
  };

  add(client?.email, "Adresse principale de la société", "principal");
  add(client?.eMail, "Adresse principale de la société", "principal");
  add(client?.mail, "Adresse principale de la société", "principal");

  if (Array.isArray(client?.emails)) {
    client.emails.forEach((email, index) => {
      add(email, index === 0 && norm(email) === norm(client?.email) ? "Adresse principale de la société" : `Adresse société ${index + 1}`, "societe");
    });
  }

  if (Array.isArray(client?.emails_contact)) {
    client.emails_contact.forEach((email, index) => add(email, `Adresse contact ${index + 1}`, "societe"));
  }

  (Array.isArray(client?.interlocuteurs) ? client.interlocuteurs : []).forEach(person => {
    const name = [person?.civilite, person?.prenom, person?.nom].filter(Boolean).join(" ").trim() || "Interlocuteur";
    const role = person?.fonction ? ` — ${person.fonction}` : "";
    add(person?.email, `${name}${role}`, "interlocuteur");
  });

  if (Array.isArray(client?.contacts)) {
    client.contacts.forEach((person, index) => {
      if (typeof person === "string") add(person, `Contact ${index + 1}`, "interlocuteur");
      else if (person && typeof person === "object") {
        const name = [person.prenom, person.nom].filter(Boolean).join(" ").trim() || `Contact ${index + 1}`;
        add(person.email || person.mail || person.eMail, name, "interlocuteur");
      }
    });
  }
  return result;
}

function renderRecipients(client) {
  const list = document.getElementById("client-mail-recipients");
  if (!list || !client) return;
  const checked = new Set([...list.querySelectorAll(".client-mail-recipient:checked")].map(x => norm(x.value)));
  const emails = allEmails(client);
  list.innerHTML = emails.length
    ? emails.map((item, index) => `
      <label class="mail-recipient-row ${item.kind === "interlocuteur" ? "person" : ""}" style="padding:.4rem .25rem;align-items:flex-start">
        <input type="checkbox" class="client-mail-recipient" value="${esc(item.email)}" ${(checked.has(norm(item.email)) || (checked.size === 0 && index === 0)) ? "checked" : ""} style="width:auto;margin-top:3px">
        <span><strong>${esc(item.email)}</strong><small style="display:block;color:#666;margin-top:2px">${esc(item.label)}</small></span>
      </label>`).join("")
    : `<div style="color:#777;padding:.5rem">Aucune adresse e-mail disponible.</div>`;
}

async function refreshFromFirestore(clientId) {
  if (!clientId) return;
  try {
    const snap = await getDoc(doc(db, "clients", clientId));
    if (!snap.exists()) return;
    renderRecipients({ id: snap.id, ...snap.data() });
  } catch (error) {
    console.error("Erreur lecture destinataires client :", error);
  }
}

function scheduleRefresh(clientId) {
  [20, 80, 180, 350, 650, 1000, 1500, 2200].forEach(delay => setTimeout(() => refreshFromFirestore(clientId), delay));
}

function startPersistentRefresh(clientId) {
  clearInterval(modalRefreshTimer);
  modalRefreshTimer = setInterval(() => {
    const overlay = document.getElementById("client-mail-overlay");
    if (!overlay || getComputedStyle(overlay).display === "none") {
      clearInterval(modalRefreshTimer);
      modalRefreshTimer = null;
      return;
    }
    refreshFromFirestore(clientId);
  }, 500);
  setTimeout(() => {
    if (modalRefreshTimer) {
      clearInterval(modalRefreshTimer);
      modalRefreshTimer = null;
    }
  }, 6000);
}

function clientForRow(row) {
  if (!row) return null;
  const id = row.dataset.clientId;
  if (id) return clients.find(c => c.id === id) || { id };
  const cells = row.querySelectorAll("td");
  const company = (cells[1]?.textContent || "").trim();
  return clients.find(c => norm(c.societe) === norm(company)) || null;
}

function refreshButtons() {
  document.querySelectorAll("#clients-table-body tr").forEach(row => {
    const client = clientForRow(row);
    if (!client || !client.id) return;
    const full = clients.find(c => c.id === client.id);
    if (!full) return;
    const button = row.querySelector(".btn-mail-row, .btn-edit-row");
    if (!button) return;
    const hasAny = allEmails(full).length > 0;
    if (button.classList.contains("btn-mail-row")) {
      button.disabled = !hasAny;
      button.textContent = hasAny ? "✉ Envoyer un mail" : "✉ Pas d’e-mail";
    }
  });
}

function init() {
  document.addEventListener("click", event => {
    const button = event.target.closest(".btn-mail-row");
    if (!button) return;
    const row = button.closest("#clients-table-body tr");
    const client = clientForRow(row);
    if (!client?.id) return;
    pendingClientId = client.id;
    scheduleRefresh(client.id);
    startPersistentRefresh(client.id);
  }, true);

  const overlay = document.getElementById("client-mail-overlay");
  if (overlay) {
    new MutationObserver(() => {
      if (getComputedStyle(overlay).display !== "none" && pendingClientId) {
        scheduleRefresh(pendingClientId);
        startPersistentRefresh(pendingClientId);
      }
    }).observe(overlay, { attributes: true, attributeFilter: ["style"] });
  }

  const tableBody = document.getElementById("clients-table-body");
  if (tableBody) new MutationObserver(refreshButtons).observe(tableBody, { childList: true });

  onSnapshot(collection(db, "clients"), snap => {
    clients = [];
    snap.forEach(d => clients.push({ id: d.id, ...d.data() }));
    refreshButtons();
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
