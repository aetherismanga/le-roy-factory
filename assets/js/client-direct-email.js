import { db } from "./firebase.js";
import { collection, doc, updateDoc, addDoc, onSnapshot, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const SEND_URL = "https://us-central1-le-roy-factory.cloudfunctions.net/sendGroupEmail";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 18 * 1024 * 1024;

const SIGNATURES = {
  jerome: `<br><br><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1A2530"><tr><td style="padding-right:20px;vertical-align:middle"><strong>Jérôme Hugol</strong><br><em>Agence Le Roy Factory</em><br>Téléphone : <a href="tel:0766040361" style="color:#D4AF37;text-decoration:none">07 66 04 03 61</a><br>E-mail : <a href="mailto:jerome@leroyfactory.fr" style="color:#D4AF37;text-decoration:none">jerome@leroyfactory.fr</a><br>Site : <a href="https://leroyfactory.fr" style="color:#D4AF37;text-decoration:none">https://leroyfactory.fr</a></td><td style="padding-left:20px;border-left:2px solid #D4AF37;vertical-align:middle"><img src="https://leroyfactory.fr/assets/img/logo03lrf.png" alt="Le Roy Factory" width="120" style="display:block;width:120px;height:auto"></td></tr></table>`,
  coryne: `<br><br><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1A2530"><tr><td style="padding-right:20px;vertical-align:middle"><strong>Coryne</strong><br><em>Agence Le Roy Factory</em><br>Téléphone : <a href="tel:0613093606" style="color:#D4AF37;text-decoration:none">06 13 09 36 06</a><br>E-mail : <a href="mailto:coryne@leroyfactory.fr" style="color:#D4AF37;text-decoration:none">coryne@leroyfactory.fr</a><br>Site : <a href="https://leroyfactory.fr" style="color:#D4AF37;text-decoration:none">https://leroyfactory.fr</a></td><td style="padding-left:20px;border-left:2px solid #D4AF37;vertical-align:middle"><img src="https://leroyfactory.fr/assets/img/logo03lrf.png" alt="Le Roy Factory" width="120" style="display:block;width:120px;height:auto"></td></tr></table>`
};

let clients = [];
let activeEditClientId = null;
let pendingNewClientEmails = null;
let currentMailClient = null;
let mailAttachments = [];
let initialized = false;

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function extractEmails(client) {
  const found = [];
  const push = (value) => {
    if (typeof value !== "string") return;
    const parts = value.split(/[;,\s]+/).map(v => v.trim()).filter(Boolean);
    parts.forEach(v => { if (validEmail(v) && !found.some(e => e.toLowerCase() === v.toLowerCase())) found.push(v); });
  };

  push(client?.email);
  push(client?.eMail);
  push(client?.mail);
  push(client?.Email);
  push(client?.Mail);

  if (Array.isArray(client?.emails)) client.emails.forEach(push);
  if (Array.isArray(client?.emails_contact)) client.emails_contact.forEach(push);
  if (Array.isArray(client?.contacts)) {
    client.contacts.forEach(c => {
      if (typeof c === "string") push(c);
      else if (c && typeof c === "object") {
        push(c.email); push(c.mail); push(c.eMail);
      }
    });
  }

  if (client && typeof client === "object") {
    Object.entries(client).forEach(([key, value]) => {
      if (!/mail/i.test(key) || ["email", "emails", "mail", "eMail", "Email", "Mail"].includes(key)) return;
      if (typeof value === "string") push(value);
      if (Array.isArray(value)) value.forEach(v => typeof v === "string" && push(v));
    });
  }

  return found;
}

function injectStyles() {
  if (document.getElementById("client-direct-email-styles")) return;
  const style = document.createElement("style");
  style.id = "client-direct-email-styles";
  style.textContent = `
    .btn-mail-row{background:#fff;border:1px solid #D4AF37;color:#1A2530;border-radius:7px;padding:.38rem .7rem;font-weight:700;cursor:pointer;white-space:nowrap}
    .btn-mail-row:hover{background:#FFF8DC}
    .btn-mail-row[disabled]{opacity:.5;cursor:not-allowed;background:#F3F4F6;border-color:#D1D5DB}
    .email-extra-row{display:flex;gap:.5rem;margin:.45rem 0}
    .email-extra-row input{flex:1}
    .client-mail-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:none;align-items:center;justify-content:center;padding:1rem}
    .client-mail-dialog{width:min(760px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.35);padding:1.4rem}
    .client-mail-head{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;border-bottom:2px solid #D4AF37;padding-bottom:.8rem;margin-bottom:1rem}
    .client-mail-close{border:0;background:transparent;font-size:1.7rem;cursor:pointer;line-height:1}
    .client-mail-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
    .client-mail-field{margin-bottom:1rem}
    .client-mail-field label{display:block;font-weight:700;font-size:.88rem;margin-bottom:.35rem;color:#1A2530}
    .client-mail-field input,.client-mail-field select,.client-mail-field textarea{width:100%;box-sizing:border-box;border:1px solid #D1D5DB;border-radius:7px;padding:.72rem;font:inherit}
    .mail-recipient-list{border:1px solid #E5E7EB;border-radius:8px;padding:.65rem;background:#FAFAFA;display:flex;flex-direction:column;gap:.45rem}
    .mail-recipient-row{display:flex;align-items:center;gap:.55rem;font-size:.9rem}
    .mail-files-list{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.5rem}
    .mail-file-chip{background:#F8F6F2;border:1px solid #E5D39A;border-radius:999px;padding:.35rem .65rem;font-size:.8rem;display:flex;gap:.4rem;align-items:center}
    .mail-file-chip button{border:0;background:transparent;cursor:pointer;color:#B91C1C}
    .client-mail-actions{display:flex;justify-content:flex-end;gap:.7rem;border-top:1px solid #E5E7EB;padding-top:1rem;margin-top:1rem}
    @media(max-width:680px){.client-mail-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function injectEmailEditor() {
  const primary = document.getElementById("edit-email");
  if (!primary || document.getElementById("extra-emails-wrap")) return;
  const parent = primary.closest(".form-field");
  const label = parent?.querySelector("label");
  if (label) label.textContent = "Email professionnel principal";
  const wrap = document.createElement("div");
  wrap.id = "extra-emails-wrap";
  wrap.className = "form-field full-width";
  wrap.innerHTML = `<label>Autres adresses e-mail</label><div id="extra-emails-container"></div><button type="button" id="btn-add-email" class="btn-add-phone-link">+ Ajouter une autre adresse e-mail</button>`;
  parent?.insertAdjacentElement("afterend", wrap);
  document.getElementById("btn-add-email")?.addEventListener("click", () => addExtraEmailRow(""));
}

function addExtraEmailRow(value = "") {
  const container = document.getElementById("extra-emails-container");
  if (!container) return;
  const row = document.createElement("div");
  row.className = "email-extra-row";
  row.innerHTML = `<input type="email" class="extra-email-input crm-select" value="${esc(value)}" placeholder="Ex: direction@entreprise.fr"><button type="button" class="filter-btn" style="color:#B91C1C">×</button>`;
  row.querySelector("button")?.addEventListener("click", () => row.remove());
  container.appendChild(row);
}

function populateEditEmails(client) {
  injectEmailEditor();
  const container = document.getElementById("extra-emails-container");
  if (container) container.innerHTML = "";
  const emails = extractEmails(client || {});
  const primary = document.getElementById("edit-email");
  if (primary) primary.value = emails[0] || primary.value || "";
  emails.slice(1).forEach(addExtraEmailRow);
}

function collectEditEmails() {
  const values = [document.getElementById("edit-email")?.value || "", ...Array.from(document.querySelectorAll(".extra-email-input")).map(i => i.value)]
    .map(v => String(v).trim()).filter(validEmail);
  return [...new Map(values.map(v => [v.toLowerCase(), v])).values()];
}

function findClientForRow(row) {
  if (!row) return null;
  const id = row.dataset.clientId;
  if (id) return clients.find(c => c.id === id) || null;
  const cells = row.querySelectorAll("td");
  const societe = cells[1]?.textContent?.trim() || "";
  const phone = cells[4]?.textContent?.trim() || "";
  return clients.find(c => (c.societe || "").trim() === societe && (!phone || phone === "-" || String(c.telephone || "").trim() === phone)) || clients.find(c => (c.societe || "").trim() === societe) || null;
}

function latestExchange(client) {
  const candidates = [];
  const crs = client?.comptes_rendus || client?.comptesRendus || [];
  if (Array.isArray(crs)) crs.forEach(cr => {
    const d = cr?.date ? new Date(cr.date) : null;
    if (d && !Number.isNaN(d.getTime())) candidates.push({ date:d, label:`Compte-rendu ${d.toLocaleDateString("fr-FR")}` });
  });
  const mails = client?.historiqueMails || [];
  if (Array.isArray(mails)) mails.forEach(m => {
    const d = m?.date ? new Date(m.date.split("/").reverse().join("-")) : null;
    if (d && !Number.isNaN(d.getTime())) candidates.push({ date:d, label:`Mail ${m.date}` });
  });
  candidates.sort((a,b) => b.date - a.date);
  return candidates[0]?.label || "Aucun";
}

function enhanceRows() {
  document.querySelectorAll("#clients-table-body tr").forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 7) return;
    const client = findClientForRow(row);
    if (!client) return;
    row.dataset.clientId = client.id;
    const btn = row.querySelector(".btn-edit-row, .btn-mail-row");
    if (btn) {
      const hasEmail = extractEmails(client).length > 0;
      btn.className = "btn-mail-row";
      btn.textContent = hasEmail ? "✉ Envoyer un mail" : "✉ Pas d’e-mail";
      btn.disabled = !hasEmail;
      btn.title = hasEmail ? "Envoyer un e-mail à ce client" : "Ajoutez d'abord une adresse e-mail dans la fiche client";
    }
    cells[5].textContent = latestExchange(client);
  });
}

function injectMailModal() {
  if (document.getElementById("client-mail-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "client-mail-overlay";
  overlay.className = "client-mail-overlay";
  overlay.innerHTML = `<div class="client-mail-dialog" role="dialog" aria-modal="true"><div class="client-mail-head"><div><h2 style="margin:0;color:#1A2530">✉ Envoyer un mail</h2><div id="client-mail-company" style="color:#666;margin-top:.25rem"></div></div><button type="button" class="client-mail-close" id="client-mail-close">×</button></div><div class="client-mail-grid"><div class="client-mail-field"><label>Expéditeur</label><select id="client-mail-sender"><option value="jerome">Jérôme — jerome@leroyfactory.fr</option><option value="coryne">Coryne — coryne@leroyfactory.fr</option></select></div><div class="client-mail-field"><label>Destinataire(s)</label><div id="client-mail-recipients" class="mail-recipient-list"></div></div></div><div class="client-mail-field"><label>Objet *</label><input id="client-mail-subject" type="text" placeholder="Objet du mail"></div><div class="client-mail-field"><label>Message *</label><textarea id="client-mail-body" rows="8" placeholder="Rédigez votre message..."></textarea></div><div class="client-mail-field"><label>📎 Pièces jointes — plusieurs fichiers possibles (10 Mo max par fichier)</label><input id="client-mail-files" type="file" multiple><div id="client-mail-files-list" class="mail-files-list"></div></div><div class="client-mail-actions"><button type="button" class="filter-btn" id="client-mail-cancel">Annuler</button><button type="button" class="btn-primary-gold" id="client-mail-send">✉ Envoyer</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById("client-mail-close")?.addEventListener("click", closeMailModal);
  document.getElementById("client-mail-cancel")?.addEventListener("click", closeMailModal);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeMailModal(); });
  document.getElementById("client-mail-files")?.addEventListener("change", handleMailFiles);
  document.getElementById("client-mail-send")?.addEventListener("click", sendDirectMail);
}

function openMailModal(client) {
  currentMailClient = client;
  mailAttachments = [];
  renderMailFiles();
  const overlay = document.getElementById("client-mail-overlay");
  document.getElementById("client-mail-company").textContent = client.societe || "Client";
  document.getElementById("client-mail-subject").value = "";
  document.getElementById("client-mail-body").value = "";
  document.getElementById("client-mail-files").value = "";
  const agent = (localStorage.getItem("agentName") || "").toLowerCase();
  document.getElementById("client-mail-sender").value = agent.includes("coryne") ? "coryne" : "jerome";
  const emails = extractEmails(client);
  const recipients = document.getElementById("client-mail-recipients");
  recipients.innerHTML = emails.map((email, idx) => `<label class="mail-recipient-row"><input type="checkbox" class="client-mail-recipient" value="${esc(email)}" ${idx === 0 ? "checked" : ""}> <span>${esc(email)}${idx === 0 ? " <strong>(principal)</strong>" : ""}</span></label>`).join("");
  overlay.style.display = "flex";
}

function closeMailModal() {
  const overlay = document.getElementById("client-mail-overlay");
  if (overlay) overlay.style.display = "none";
  currentMailClient = null;
  mailAttachments = [];
}

function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ id:`${Date.now()}-${Math.random()}`, filename:file.name, size:file.size, content:reader.result.split(",")[1], encoding:"base64", contentType:file.type || undefined });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleMailFiles(event) {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) { alert(`Le fichier « ${file.name} » dépasse 10 Mo.`); continue; }
    const currentTotal = mailAttachments.reduce((s,f) => s + f.size, 0);
    if (currentTotal + file.size > MAX_TOTAL_SIZE) { alert(`Le fichier « ${file.name} » ferait dépasser la taille totale autorisée.`); continue; }
    try { mailAttachments.push(await fileToAttachment(file)); } catch { alert(`Impossible de lire « ${file.name} »`); }
  }
  event.target.value = "";
  renderMailFiles();
}

function renderMailFiles() {
  const box = document.getElementById("client-mail-files-list");
  if (!box) return;
  box.innerHTML = mailAttachments.map(f => `<span class="mail-file-chip">📄 ${esc(f.filename)} <button type="button" data-id="${esc(f.id)}">×</button></span>`).join("");
  box.querySelectorAll("button[data-id]").forEach(btn => btn.addEventListener("click", () => {
    mailAttachments = mailAttachments.filter(f => f.id !== btn.dataset.id);
    renderMailFiles();
  }));
}

async function sendDirectMail() {
  if (!currentMailClient) return;
  const recipients = Array.from(document.querySelectorAll(".client-mail-recipient:checked")).map(i => i.value);
  const senderMode = document.getElementById("client-mail-sender").value;
  const subject = document.getElementById("client-mail-subject").value.trim();
  const body = document.getElementById("client-mail-body").value.trim();
  if (!recipients.length) return alert("Sélectionnez au moins une adresse e-mail.");
  if (!subject) return alert("Saisissez l'objet du mail.");
  if (!body) return alert("Rédigez le message.");
  const btn = document.getElementById("client-mail-send");
  btn.disabled = true;
  btn.textContent = "Envoi en cours...";
  const htmlContent = `${esc(body).replace(/\n/g, "<br>")}${SIGNATURES[senderMode] || SIGNATURES.jerome}`;
  try {
    const response = await fetch(SEND_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ senderMode, bccRecipients:recipients, subject, htmlContent, attachments:mailAttachments }) });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "Erreur d'envoi");
    const dateFr = new Date().toLocaleDateString("fr-FR");
    const agentLabel = senderMode === "coryne" ? "Coryne" : "Jérôme";
    await updateDoc(doc(db, "clients", currentMailClient.id), { historiqueMails: arrayUnion({ date:dateFr, expediteur:agentLabel, objet:subject, destinataires:recipients }) });
    await addDoc(collection(db, "historique_mails"), { date:new Date().toISOString(), expediteur:senderMode === "coryne" ? "coryne@leroyfactory.fr" : "jerome@leroyfactory.fr", objet:subject, nbDestinataires:recipients.length, destinataires:recipients, clientId:currentMailClient.id, client:currentMailClient.societe || "", statut:"Succès" });
    alert(`✅ E-mail envoyé avec succès à ${recipients.length} adresse(s).`);
    closeMailModal();
  } catch (err) {
    console.error(err);
    alert(`❌ Échec de l'envoi : ${err.message || "Erreur inconnue"}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "✉ Envoyer";
  }
}

function setupEvents() {
  document.addEventListener("click", event => {
    const row = event.target.closest("#clients-table-body tr");
    if (!row) return;
    const client = findClientForRow(row);
    if (client) activeEditClientId = client.id;
    const mailBtn = event.target.closest(".btn-edit-row, .btn-mail-row");
    if (mailBtn) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (client && extractEmails(client).length) openMailModal(client);
    }
  }, true);

  document.getElementById("btn-add-client")?.addEventListener("click", () => {
    activeEditClientId = null;
    setTimeout(() => populateEditEmails(null), 0);
  }, true);

  const form = document.getElementById("client-form");
  form?.addEventListener("submit", () => {
    const emails = collectEditEmails();
    const primary = document.getElementById("edit-email");
    if (primary) primary.value = emails[0] || "";
    if (activeEditClientId) {
      updateDoc(doc(db, "clients", activeEditClientId), { email:emails[0] || "", emails }).catch(console.error);
    } else {
      pendingNewClientEmails = { emails, societe:document.getElementById("edit-societe")?.value.trim() || "", primary:emails[0] || "", startedAt:Date.now() };
    }
  }, true);

  const modal = document.getElementById("client-modal");
  if (modal) {
    const observer = new MutationObserver(() => {
      if (getComputedStyle(modal).display !== "none") {
        const urlId = new URLSearchParams(location.search).get("edit");
        if (!activeEditClientId && urlId) activeEditClientId = urlId;
        const client = clients.find(c => c.id === activeEditClientId) || null;
        setTimeout(() => populateEditEmails(client), 0);
      }
    });
    observer.observe(modal, { attributes:true, attributeFilter:["style"] });
  }

  const table = document.getElementById("clients-table-body");
  if (table) {
    const tableObserver = new MutationObserver(() => requestAnimationFrame(enhanceRows));
    tableObserver.observe(table, { childList:true, subtree:false });
  }
}

function handlePendingNewClient() {
  if (!pendingNewClientEmails || Date.now() - pendingNewClientEmails.startedAt > 15000) return;
  const match = clients.find(c => {
    const sameSociete = (c.societe || "").trim() === pendingNewClientEmails.societe;
    const samePrimary = !pendingNewClientEmails.primary || (c.email || "").trim().toLowerCase() === pendingNewClientEmails.primary.toLowerCase();
    return sameSociete && samePrimary && !Array.isArray(c.emails);
  });
  if (match) {
    updateDoc(doc(db, "clients", match.id), { email:pendingNewClientEmails.primary, emails:pendingNewClientEmails.emails }).catch(console.error);
    pendingNewClientEmails = null;
  }
}

function initClientDirectEmail() {
  if (initialized) return;
  initialized = true;
  injectStyles();
  injectEmailEditor();
  injectMailModal();
  setupEvents();
  onSnapshot(collection(db, "clients"), snapshot => {
    clients = [];
    snapshot.forEach(s => clients.push({ id:s.id, ...s.data() }));
    handlePendingNewClient();
    setTimeout(enhanceRows, 0);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initClientDirectEmail, { once:true });
} else {
  initClientDirectEmail();
}
