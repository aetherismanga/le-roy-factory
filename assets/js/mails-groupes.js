import { db } from "./firebase.js";
import { collection, getDocs, addDoc, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let allContacts = [];
let filteredContacts = [];
let selectedContacts = [];
let attachedFiles = [];
let inlineImages = [];
let selectedDepartments = new Set();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo par fichier
const MAX_TOTAL_SIZE = 18 * 1024 * 1024; // garde une marge pour l'encodage Base64 / Cloud Function

const SIGNATURES = {
  jerome: `
<br><br>
<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; color: #1A2530;">
  <tr>
    <td style="padding-right: 20px; vertical-align: middle;">
      <strong>Jérôme Hugol</strong><br>
      <em>Agence Le Roy Factory</em><br>
      Téléphone : <a href="tel:0766040361" style="color: #D4AF37; text-decoration: none;">07 66 04 03 61</a><br>
      E-mail : <a href="mailto:jerome@leroyfactory.fr" style="color: #D4AF37; text-decoration: none;">jerome@leroyfactory.fr</a><br>
      Site : <a href="https://leroyfactory.fr" target="_blank" style="color: #D4AF37; text-decoration: none;">https://leroyfactory.fr</a>
    </td>
    <td style="padding-left: 20px; border-left: 2px solid #D4AF37; vertical-align: middle;">
      <img src="https://leroyfactory.fr/assets/img/logo03lrf.png" alt="Le Roy Factory" width="120" style="display: block; width: 120px; height: auto;">
    </td>
  </tr>
</table>
  `,
  coryne: `
<br><br>
<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; color: #1A2530;">
  <tr>
    <td style="padding-right: 20px; vertical-align: middle;">
      <strong>Coryne</strong><br>
      <em>Agence Le Roy Factory</em><br>
      Téléphone : <a href="tel:0613093606" style="color: #D4AF37; text-decoration: none;">06 13 09 36 06</a><br>
      E-mail : <a href="mailto:coryne@leroyfactory.fr" style="color: #D4AF37; text-decoration: none;">coryne@leroyfactory.fr</a><br>
      Site : <a href="https://leroyfactory.fr" target="_blank" style="color: #D4AF37; text-decoration: none;">https://leroyfactory.fr</a>
    </td>
    <td style="padding-left: 20px; border-left: 2px solid #D4AF37; vertical-align: middle;">
      <img src="https://leroyfactory.fr/assets/img/logo03lrf.png" alt="Le Roy Factory" width="120" style="display: block; width: 120px; height: auto;">
    </td>
  </tr>
</table>
  `,
  both: `
<br><br>
<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; color: #1A2530;">
  <tr>
    <td style="padding-right: 20px; vertical-align: middle;">
      <strong>Coryne &amp; Jérôme</strong><br>
      <em>Agence Le Roy Factory</em><br>
      Téléphone Jérôme : <a href="tel:0766040361" style="color: #D4AF37; text-decoration: none;">07 66 04 03 61</a><br>
      Téléphone Coryne : <a href="tel:0613093606" style="color: #D4AF37; text-decoration: none;">06 13 09 36 06</a><br>
      E-mail : <a href="mailto:jerome@leroyfactory.fr" style="color: #D4AF37; text-decoration: none;">jerome@leroyfactory.fr</a> | <a href="mailto:coryne@leroyfactory.fr" style="color: #D4AF37; text-decoration: none;">coryne@leroyfactory.fr</a><br>
      Site : <a href="https://leroyfactory.fr" target="_blank" style="color: #D4AF37; text-decoration: none;">https://leroyfactory.fr</a>
    </td>
    <td style="padding-left: 20px; border-left: 2px solid #D4AF37; vertical-align: middle;">
      <img src="https://leroyfactory.fr/assets/img/logo03lrf.png" alt="Le Roy Factory" width="120" style="display: block; width: 120px; height: auto;">
    </td>
  </tr>
</table>
  `
};

document.addEventListener("DOMContentLoaded", async () => {
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.removeItem("agentLoggedIn");
    window.location.href = "agent.html";
  });

  setupTabs();
  setupRichEditor();
  setupAttachmentInput();
  setupEventListeners();
  await loadContacts();
  await loadHistory();
  updateSignature();
});

function updateDateTime() {
  const now = new Date();
  const dateEl = document.getElementById("current-date");
  const timeEl = document.getElementById("current-time");
  if (dateEl) {
    const formatted = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
  if (timeEl) timeEl.textContent = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function setupTabs() {
  const btnCompose = document.getElementById("tab-compose-btn");
  const btnHistory = document.getElementById("tab-history-btn");
  const secCompose = document.getElementById("section-compose");
  const secHistory = document.getElementById("section-history");

  btnCompose?.addEventListener("click", () => {
    btnCompose.classList.add("active");
    btnHistory?.classList.remove("active");
    if (secCompose) secCompose.style.display = "block";
    if (secHistory) secHistory.style.display = "none";
  });

  btnHistory?.addEventListener("click", () => {
    btnHistory.classList.add("active");
    btnCompose?.classList.remove("active");
    if (secHistory) secHistory.style.display = "block";
    if (secCompose) secCompose.style.display = "none";
  });
}

function setupRichEditor() {
  const textarea = document.getElementById("email-body");
  if (!textarea) return;

  textarea.style.display = "none";
  textarea.removeAttribute("required");

  const helper = document.createElement("div");
  helper.style.cssText = "font-size:.78rem;color:#666;margin-bottom:.45rem;";
  helper.innerHTML = "💡 Vous pouvez écrire normalement et <strong>coller une image directement</strong> dans le message (Ctrl+V).";

  const editor = document.createElement("div");
  editor.id = "email-body-editor";
  editor.contentEditable = "true";
  editor.setAttribute("role", "textbox");
  editor.setAttribute("aria-multiline", "true");
  editor.dataset.placeholder = textarea.placeholder || "Rédigez votre message ici...";
  editor.style.cssText = "min-height:190px;padding:1rem;border:1px solid #D1D5DB;border-radius:6px;background:#fff;line-height:1.5;overflow:auto;outline:none;white-space:normal;";

  const style = document.createElement("style");
  style.textContent = `
    #email-body-editor:empty:before { content: attr(data-placeholder); color: #9CA3AF; }
    #email-body-editor:focus { border-color: #D4AF37; box-shadow: 0 0 0 2px rgba(212,175,55,.12); }
    #email-body-editor img { max-width: 100%; height: auto; display: block; margin: .75rem 0; border-radius: 6px; }
    .dept-multi-box { position: relative; }
    .dept-multi-button { width:100%; text-align:left; display:flex; justify-content:space-between; align-items:center; cursor:pointer; }
    .dept-multi-panel { display:none; position:absolute; z-index:1000; left:0; right:0; max-height:260px; overflow:auto; background:#fff; border:1px solid #D1D5DB; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,.14); padding:.5rem; margin-top:.25rem; }
    .dept-multi-panel.open { display:block; }
    .dept-check-row { display:flex; align-items:center; gap:.5rem; padding:.45rem .5rem; border-radius:5px; cursor:pointer; }
    .dept-check-row:hover { background:#F8F6F2; }
    .dept-check-row input { width:16px; height:16px; }
  `;
  document.head.appendChild(style);

  textarea.parentNode.insertBefore(helper, textarea);
  textarea.parentNode.insertBefore(editor, textarea.nextSibling);

  editor.addEventListener("paste", handleEditorPaste);
}

function getEditor() {
  return document.getElementById("email-body-editor");
}

async function handleEditorPaste(event) {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItems = items.filter(item => item.type.startsWith("image/"));
  if (imageItems.length === 0) return;

  event.preventDefault();

  for (const item of imageItems) {
    const file = item.getAsFile();
    if (!file) continue;

    if (file.size > MAX_FILE_SIZE) {
      alert("L'image collée dépasse 10 Mo et ne peut pas être ajoutée.");
      continue;
    }

    if (getTotalPayloadSize() + file.size > MAX_TOTAL_SIZE) {
      alert("La taille totale des pièces jointes et images dépasse la limite autorisée. Supprimez un fichier avant d'ajouter cette image.");
      continue;
    }

    const dataUrl = await readFileAsDataURL(file);
    const base64 = dataUrl.split(",")[1];
    const cid = `inline-${Date.now()}-${Math.random().toString(36).slice(2)}@leroyfactory`;
    const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg");
    const filename = `image-message-${inlineImages.length + 1}.${ext}`;

    inlineImages.push({
      filename,
      size: file.size,
      content: base64,
      encoding: "base64",
      contentType: file.type,
      cid,
      inline: true
    });

    insertHtmlAtCursor(`<img src="cid:${cid}" alt="Image intégrée" style="max-width:100%;height:auto;display:block;margin:12px 0;">`);
  }
}

function insertHtmlAtCursor(html) {
  const editor = getEditor();
  if (!editor) return;
  editor.focus();

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    editor.insertAdjacentHTML("beforeend", html);
    return;
  }

  let range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) {
    editor.insertAdjacentHTML("beforeend", html);
    return;
  }

  range.deleteContents();
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const frag = document.createDocumentFragment();
  let node;
  let lastNode = null;
  while ((node = temp.firstChild)) lastNode = frag.appendChild(node);
  range.insertNode(frag);
  if (lastNode) {
    range = range.cloneRange();
    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function setupAttachmentInput() {
  const fileInput = document.getElementById("file-attachment");
  if (!fileInput) return;
  fileInput.multiple = true;

  const label = fileInput.previousElementSibling;
  if (label) label.textContent = "📎 Pièces jointes (plusieurs fichiers possibles - max 10 Mo par fichier)";
}

async function loadContacts() {
  const tbody = document.getElementById("recipients-tbody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Chargement des contacts...</td></tr>`;

  try {
    const querySnapshot = await getDocs(collection(db, "clients"));
    allContacts = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const rawEmail = data.email || data.eMail || data.mail || data.Mail || data.Email || "";
      const cleanEmail = String(rawEmail).trim();
      if (!cleanEmail || !cleanEmail.includes("@")) return;

      let rawDept = String(data.departement || data.Dept || "").trim();
      if (!rawDept && (data.codePostal || data.cp)) rawDept = String(data.codePostal || data.cp).trim().substring(0, 2);

      let cleanDept = "-";
      if (rawDept) {
        const numOnly = rawDept.replace(/[^0-9A-Ba-b]/g, "");
        cleanDept = numOnly ? "FR-" + numOnly.toUpperCase() : rawDept.toUpperCase();
      }

      const displaySociete = data.societe || data.nomSociete || data.entreprise || data.nom || data.nomContact || "Sans nom";
      const agentRaw = String(data.agent || data.secteur || data.Agent || "").toLowerCase();
      const agentClean = agentRaw.includes("coryne") ? "Coryne" : "Jérôme";
      const typeRaw = String(data.type || data.Type || "client").toLowerCase();

      allContacts.push({
        id: docSnap.id,
        nom: displaySociete,
        type: typeRaw.includes("prospect") ? "prospect" : "client",
        departement: cleanDept,
        agent: agentClean,
        email: cleanEmail
      });
    });

    populateDepartmentFilter();
    applyFilters();
  } catch (error) {
    console.error("Erreur chargement contacts:", error);
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;padding:20px;">Erreur lors du chargement des contacts.</td></tr>`;
  }
}

function populateDepartmentFilter() {
  const oldSelect = document.getElementById("filter-dept");
  if (!oldSelect) return;

  const departments = [...new Set(allContacts.map(c => c.departement).filter(d => d && d !== "-"))].sort();
  selectedDepartments.clear();

  const wrapper = document.createElement("div");
  wrapper.className = "dept-multi-box";
  wrapper.id = "filter-dept-multi";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "crm-select dept-multi-button";
  button.id = "filter-dept-button";
  button.innerHTML = `<span id="filter-dept-label">Tous les départements</span><span>▾</span>`;

  const panel = document.createElement("div");
  panel.className = "dept-multi-panel";
  panel.id = "filter-dept-panel";

  const allRow = document.createElement("label");
  allRow.className = "dept-check-row";
  allRow.innerHTML = `<input type="checkbox" id="dept-all" checked> <strong>Tous les départements</strong>`;
  panel.appendChild(allRow);

  departments.forEach(dept => {
    const row = document.createElement("label");
    row.className = "dept-check-row";
    row.innerHTML = `<input type="checkbox" class="dept-checkbox" value="${escapeHtml(dept)}"> Département ${escapeHtml(dept)}`;
    panel.appendChild(row);
  });

  wrapper.appendChild(button);
  wrapper.appendChild(panel);
  oldSelect.replaceWith(wrapper);

  button.addEventListener("click", () => panel.classList.toggle("open"));

  document.getElementById("dept-all")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      selectedDepartments.clear();
      panel.querySelectorAll(".dept-checkbox").forEach(cb => { cb.checked = false; });
      updateDepartmentLabel();
      applyFilters();
    } else if (selectedDepartments.size === 0) {
      e.target.checked = true;
    }
  });

  panel.querySelectorAll(".dept-checkbox").forEach(cb => {
    cb.addEventListener("change", (e) => {
      if (e.target.checked) selectedDepartments.add(e.target.value);
      else selectedDepartments.delete(e.target.value);

      const all = document.getElementById("dept-all");
      if (all) all.checked = selectedDepartments.size === 0;
      updateDepartmentLabel();
      applyFilters();
    });
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) panel.classList.remove("open");
  });
}

function updateDepartmentLabel() {
  const label = document.getElementById("filter-dept-label");
  if (!label) return;
  if (selectedDepartments.size === 0) {
    label.textContent = "Tous les départements";
  } else if (selectedDepartments.size <= 3) {
    label.textContent = [...selectedDepartments].map(d => d.replace("FR-", "")).join(", ");
  } else {
    label.textContent = `${selectedDepartments.size} départements sélectionnés`;
  }
}

function applyFilters() {
  const typeFilter = document.getElementById("filter-type")?.value || "all";
  const sectorFilter = (document.getElementById("filter-sector")?.value || "all").toLowerCase();
  const searchFilter = (document.getElementById("search-input")?.value || "").toLowerCase().trim();

  filteredContacts = allContacts.filter(c => {
    const matchType = typeFilter === "all" || c.type === typeFilter;
    const matchDept = selectedDepartments.size === 0 || selectedDepartments.has(c.departement);
    const matchSector = sectorFilter === "all" || c.agent.toLowerCase().includes(sectorFilter);
    const matchSearch = !searchFilter || c.nom.toLowerCase().includes(searchFilter) || c.email.toLowerCase().includes(searchFilter);
    return matchType && matchDept && matchSector && matchSearch;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById("recipients-tbody");
  const countDisplayedEl = document.getElementById("count-displayed");
  const countSelectedEl = document.getElementById("count-selected");
  const warningLimit = document.getElementById("warning-limit");
  const headerCheckbox = document.getElementById("header-select-all") || document.getElementById("chk-toggle-all");
  if (!tbody) return;

  if (filteredContacts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">Aucun contact trouvé.</td></tr>`;
  } else {
    tbody.innerHTML = filteredContacts.map(c => {
      const isChecked = selectedContacts.some(sc => sc.id === c.id);
      return `<tr>
        <td style="text-align:center;"><input type="checkbox" class="contact-checkbox" data-id="${c.id}" ${isChecked ? "checked" : ""}></td>
        <td><strong>${escapeHtml(c.nom)}</strong></td>
        <td><span class="badge badge-${c.type}">${c.type.toUpperCase()}</span></td>
        <td>${escapeHtml(c.departement)}</td>
        <td>${escapeHtml(c.agent)}</td>
        <td>${escapeHtml(c.email)}</td>
      </tr>`;
    }).join("");
  }

  if (countDisplayedEl) countDisplayedEl.textContent = filteredContacts.length;
  if (countSelectedEl) countSelectedEl.textContent = selectedContacts.length;

  if (headerCheckbox) {
    headerCheckbox.checked = filteredContacts.length > 0 && filteredContacts.every(fc => selectedContacts.some(sc => sc.id === fc.id));
  }

  if (warningLimit) warningLimit.style.display = selectedContacts.length > 30 ? "block" : "none";

  document.querySelectorAll(".contact-checkbox").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const contactId = e.target.dataset.id;
      const contact = allContacts.find(c => c.id === contactId);
      if (e.target.checked) {
        if (contact && !selectedContacts.some(sc => sc.id === contact.id)) selectedContacts.push(contact);
      } else {
        selectedContacts = selectedContacts.filter(sc => sc.id !== contactId);
      }
      renderTable();
    });
  });
}

function setupEventListeners() {
  document.getElementById("filter-type")?.addEventListener("change", applyFilters);
  document.getElementById("filter-sector")?.addEventListener("change", applyFilters);
  document.getElementById("search-input")?.addEventListener("input", applyFilters);

  const headerCheckbox = document.getElementById("header-select-all") || document.getElementById("chk-toggle-all");
  headerCheckbox?.addEventListener("change", (e) => {
    if (e.target.checked) {
      filteredContacts.forEach(c => {
        if (!selectedContacts.some(sc => sc.id === c.id)) selectedContacts.push(c);
      });
    } else {
      const filteredIds = filteredContacts.map(c => c.id);
      selectedContacts = selectedContacts.filter(sc => !filteredIds.includes(sc.id));
    }
    renderTable();
  });

  document.getElementById("btn-select-all")?.addEventListener("click", () => {
    filteredContacts.forEach(c => {
      if (!selectedContacts.some(sc => sc.id === c.id)) selectedContacts.push(c);
    });
    renderTable();
  });

  document.getElementById("btn-deselect-all")?.addEventListener("click", () => {
    selectedContacts = [];
    renderTable();
  });

  document.getElementById("select-sender")?.addEventListener("change", updateSignature);
  document.getElementById("file-attachment")?.addEventListener("change", handleFileSelect);
  document.getElementById("btn-open-confirm")?.addEventListener("click", openConfirmModal);
  document.getElementById("btn-cancel-send")?.addEventListener("click", closeModal);
  document.getElementById("btn-confirm-send")?.addEventListener("click", executeEmailSending);
}

function updateSignature() {
  const senderVal = document.getElementById("select-sender")?.value || "jerome";
  const previewEl = document.getElementById("signature-preview");
  if (previewEl) previewEl.innerHTML = SIGNATURES[senderVal] || SIGNATURES.jerome;
}

async function handleFileSelect(e) {
  const input = e.target;
  const files = Array.from(input.files || []);
  if (files.length === 0) return;

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      alert(`Le fichier « ${file.name} » dépasse 10 Mo et n'a pas été ajouté.`);
      continue;
    }

    if (getTotalPayloadSize() + file.size > MAX_TOTAL_SIZE) {
      alert(`Le fichier « ${file.name} » n'a pas été ajouté car la taille totale dépasserait la limite d'envoi.`);
      continue;
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      attachedFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        filename: file.name,
        size: file.size,
        content: dataUrl.split(",")[1],
        encoding: "base64",
        contentType: file.type || undefined
      });
    } catch (err) {
      console.error("Erreur lecture fichier:", err);
      alert(`Impossible de lire le fichier « ${file.name} ».`);
    }
  }

  input.value = "";
  renderFilePreview();
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getTotalPayloadSize() {
  return [...attachedFiles, ...inlineImages].reduce((sum, file) => sum + (file.size || 0), 0);
}

function renderFilePreview() {
  const previewInfo = document.getElementById("file-preview-info");
  if (!previewInfo) return;

  if (attachedFiles.length === 0) {
    previewInfo.innerHTML = `<span style="font-size:.82rem;color:#666;">Aucune pièce jointe.</span>`;
    return;
  }

  previewInfo.innerHTML = attachedFiles.map(file => {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return `<div class="file-chip">
      <span>📄 <strong>${escapeHtml(file.filename)}</strong> (${sizeMB} Mo)</span>
      <button type="button" class="btn-remove-file" data-file-id="${file.id}" title="Supprimer cette pièce jointe">✕</button>
    </div>`;
  }).join(" ");

  previewInfo.querySelectorAll(".btn-remove-file").forEach(btn => {
    btn.addEventListener("click", () => removeAttachment(btn.dataset.fileId));
  });
}

function removeAttachment(fileId) {
  attachedFiles = attachedFiles.filter(file => file.id !== fileId);
  renderFilePreview();
}

function getMessageHtml() {
  return getEditor()?.innerHTML?.trim() || "";
}

function getMessageText() {
  return getEditor()?.innerText?.trim() || "";
}

function openConfirmModal() {
  const senderVal = document.getElementById("select-sender")?.value || "jerome";
  let senderEmailText = "jerome@leroyfactory.fr";
  if (senderVal === "coryne") senderEmailText = "coryne@leroyfactory.fr";
  else if (senderVal === "both") senderEmailText = "Jérôme & Coryne (jerome@leroyfactory.fr & coryne@leroyfactory.fr)";

  const subject = document.getElementById("email-subject")?.value?.trim();
  const bodyText = getMessageText();
  const bodyHtml = getMessageHtml();

  if (selectedContacts.length === 0) return alert("Veuillez sélectionner au moins un destinataire.");
  if (!subject) return alert("Veuillez saisir un objet pour votre e-mail.");
  if (!bodyText && !bodyHtml.includes("<img")) return alert("Veuillez rédiger le corps de votre message.");

  document.getElementById("summary-sender").textContent = senderEmailText;
  document.getElementById("summary-subject").textContent = subject;
  document.getElementById("summary-count").textContent = `${selectedContacts.length} destinataire(s) en Cci`;
  document.getElementById("summary-attachment").textContent = attachedFiles.length > 0
    ? `${attachedFiles.length} fichier(s) : ${attachedFiles.map(f => f.filename).join(", ")}`
    : "Aucune";

  const modal = document.getElementById("modal-confirm");
  if (modal) modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("modal-confirm");
  if (modal) modal.style.display = "none";
}

async function executeEmailSending() {
  const btnConfirm = document.getElementById("btn-confirm-send");
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.textContent = "Envoi en cours...";
  }

  const senderVal = document.getElementById("select-sender")?.value || "jerome";
  const subject = document.getElementById("email-subject")?.value?.trim();
  const fullHtmlContent = `${getMessageHtml()}${SIGNATURES[senderVal]}`;
  const bccRecipients = selectedContacts.map(c => c.email);
  const attachments = [...attachedFiles, ...inlineImages];

  try {
    const response = await fetch("https://us-central1-le-roy-factory.cloudfunctions.net/sendGroupEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderMode: senderVal,
        bccRecipients,
        subject,
        htmlContent: fullHtmlContent,
        attachments
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error || "Erreur inconnue");

    let expLabel = "jerome@leroyfactory.fr";
    if (senderVal === "coryne") expLabel = "coryne@leroyfactory.fr";
    if (senderVal === "both") expLabel = "jerome@leroyfactory.fr & coryne@leroyfactory.fr";

    await addDoc(collection(db, "historique_mails"), {
      date: new Date().toISOString(),
      expediteur: expLabel,
      objet: subject,
      nbDestinataires: bccRecipients.length,
      destinataires: bccRecipients,
      statut: "Succès"
    });

    const dateStr = new Date().toLocaleDateString("fr-FR");
    let agentName = "Jérôme";
    if (senderVal === "coryne") agentName = "Coryne";
    if (senderVal === "both") agentName = "Jérôme & Coryne";

    for (const contact of selectedContacts) {
      try {
        const clientRef = doc(db, "clients", contact.id);
        await updateDoc(clientRef, {
          historiqueMails: arrayUnion({ date: dateStr, expediteur: agentName, objet: subject })
        });
      } catch (e) {
        console.warn("Impossible de mettre à jour le client:", contact.id, e);
      }
    }

    alert(`✅ E-mail envoyé avec succès à ${bccRecipients.length} destinataire(s) !`);
    closeModal();
    location.reload();
  } catch (err) {
    console.error("Erreur serveur:", err);
    alert(`❌ Échec de l'envoi : ${err.message || "Erreur réseau"}`);
  } finally {
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.textContent = "✓ Confirmer et envoyer";
    }
  }
}

async function loadHistory() {
  const tbody = document.getElementById("history-tbody");
  if (!tbody) return;

  try {
    const querySnapshot = await getDocs(collection(db, "historique_mails"));
    if (querySnapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;">Aucun envoi enregistré.</td></tr>`;
      return;
    }

    const historyList = [];
    querySnapshot.forEach(docSnap => historyList.push(docSnap.data()));
    historyList.sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = historyList.map(item => {
      const formattedDate = new Date(item.date).toLocaleString("fr-FR");
      return `<tr>
        <td>${formattedDate}</td>
        <td>${escapeHtml(item.expediteur)}</td>
        <td><strong>${escapeHtml(item.objet)}</strong></td>
        <td>${item.nbDestinataires} contact(s)</td>
        <td><span class="badge badge-client">${escapeHtml(item.statut || "Envoyé")}</span></td>
      </tr>`;
    }).join("");
  } catch (e) {
    console.error("Erreur chargement historique:", e);
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
