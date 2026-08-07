import { db } from "./firebase.js";
import { collection, getDocs, addDoc, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let allContacts = [];
let filteredContacts = [];
let selectedContacts = [];
let attachedFiles = [];

// Signatures prédéfinies
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
      <img src="https://leroyfactory.fr/assets/img/logo03lrf.png" alt="Le Roy Factory" width="80" style="display: block; width: 80px; height: auto;">
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
      <img src="https://leroyfactory.fr/assets/img/logo03lrf.png" alt="Le Roy Factory" width="80" style="display: block; width: 80px; height: auto;">
    </td>
  </tr>
</table>
  `,
  both: `
<br><br>
<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; color: #1A2530;">
  <tr>
    <td style="padding-right: 20px; vertical-align: middle;">
      <strong>Coryne &amp; Jérôme Hugol</strong><br>
      <em>Agence Le Roy Factory</em><br>
      Téléphone Jérôme : <a href="tel:0766040361" style="color: #D4AF37; text-decoration: none;">07 66 04 03 61</a><br>
      Téléphone Coryne : <a href="tel:0613093606" style="color: #D4AF37; text-decoration: none;">06 13 09 36 06</a><br>
      E-mail : <a href="mailto:jerome@leroyfactory.fr" style="color: #D4AF37; text-decoration: none;">jerome@leroyfactory.fr</a> | <a href="mailto:coryne@leroyfactory.fr" style="color: #D4AF37; text-decoration: none;">coryne@leroyfactory.fr</a><br>
      Site : <a href="https://leroyfactory.fr" target="_blank" style="color: #D4AF37; text-decoration: none;">https://leroyfactory.fr</a>
    </td>
    <td style="padding-left: 20px; border-left: 2px solid #D4AF37; vertical-align: middle;">
      <img src="https://leroyfactory.fr/assets/img/logo03lrf.png" alt="Le Roy Factory" width="80" style="display: block; width: 80px; height: auto;">
    </td>
  </tr>
</table>
  `
};

document.addEventListener("DOMContentLoaded", async () => {
  // Sécurité session
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  // Horloge
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Déconnexion
  document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.removeItem("agentLoggedIn");
    window.location.href = "agent.html";
  });

  // Gestion des Onglets (Nouveau Mail / Historique)
  setupTabs();

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
    let formatted = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
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

// 1. Chargement et nettoyage des contacts depuis Firestore
async function loadContacts() {
  const tbody = document.getElementById("recipients-tbody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">Chargement des contacts...</td></tr>`;
  }

  try {
    const querySnapshot = await getDocs(collection(db, "clients"));
    allContacts = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();

      // Récupération souple de l'e-mail
      const rawEmail = data.email || data.eMail || data.mail || data.Mail || data.Email || "";
      const cleanEmail = String(rawEmail).trim();

      if (cleanEmail && cleanEmail.includes("@")) {
        // Extraction et Uniformisation du Département (34 -> FR-34)
        let rawDept = String(data.departement || data.Dept || "").trim();
        if (!rawDept && (data.codePostal || data.cp)) {
          rawDept = String(data.codePostal || data.cp).trim().substring(0, 2);
        }

        let cleanDept = "-";
        if (rawDept) {
          let numOnly = rawDept.replace(/[^0-9A-Ba-b]/g, "");
          if (numOnly) {
            cleanDept = "FR-" + numOnly.toUpperCase();
          } else {
            cleanDept = rawDept.toUpperCase();
          }
        }

        // Nom de Société / Nom
        const displaySociete = data.societe || data.nomSociete || data.entreprise || data.nom || data.nomContact || "Sans nom";

        // Secteur / Agent souple
        const agentRaw = String(data.agent || data.secteur || data.Agent || "").toLowerCase();
        let agentClean = "Jérôme";
        if (agentRaw.includes("coryne")) {
          agentClean = "Coryne";
        }

        // Type
        const typeRaw = String(data.type || data.Type || "client").toLowerCase();

        allContacts.push({
          id: docSnap.id,
          nom: displaySociete,
          type: typeRaw.includes("prospect") ? "prospect" : "client",
          departement: cleanDept,
          agent: agentClean,
          email: cleanEmail
        });
      }
    });

    populateDepartmentFilter();
    applyFilters();
  } catch (error) {
    console.error("Erreur chargement contacts:", error);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: red; padding: 20px;">Erreur lors du chargement des contacts.</td></tr>`;
    }
  }
}

// 2. Filtre dynamique des départements
function populateDepartmentFilter() {
  const deptSelect = document.getElementById("filter-dept");
  if (!deptSelect) return;

  const departments = [...new Set(allContacts.map(c => c.departement).filter(d => d && d !== "-"))].sort();
  deptSelect.innerHTML = `<option value="all">Tous les départements</option>`;

  departments.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = `Département ${d}`;
    deptSelect.appendChild(opt);
  });
}

// 3. Filtrage dynamique
function applyFilters() {
  const typeFilter = document.getElementById("filter-type")?.value || "all";
  const deptFilter = document.getElementById("filter-dept")?.value || "all";
  const sectorFilter = (document.getElementById("filter-sector")?.value || "all").toLowerCase();
  const searchFilter = (document.getElementById("search-input")?.value || "").toLowerCase().trim();

  filteredContacts = allContacts.filter(c => {
    const matchType = typeFilter === "all" || c.type === typeFilter;
    const matchDept = deptFilter === "all" || c.departement === deptFilter;
    
    let matchSector = true;
    if (sectorFilter !== "all") {
      matchSector = c.agent.toLowerCase().includes(sectorFilter);
    }

    const matchSearch = !searchFilter || 
      c.nom.toLowerCase().includes(searchFilter) || 
      c.email.toLowerCase().includes(searchFilter);

    return matchType && matchDept && matchSector && matchSearch;
  });

  renderTable();
}

// 4. Rendu du tableau (Exactement 6 colonnes alignées avec le HTML)
function renderTable() {
  const tbody = document.getElementById("recipients-tbody");
  const countDisplayedEl = document.getElementById("count-displayed");
  const countSelectedEl = document.getElementById("count-selected");
  const warningLimit = document.getElementById("warning-limit");
  const headerCheckbox = document.getElementById("header-select-all") || document.getElementById("chk-toggle-all");

  if (!tbody) return;

  if (filteredContacts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">Aucun contact trouvé.</td></tr>`;
  } else {
    tbody.innerHTML = filteredContacts.map(c => {
      const isChecked = selectedContacts.some(sc => sc.id === c.id);
      return `
        <tr>
          <td style="text-align: center;"><input type="checkbox" class="contact-checkbox" data-id="${c.id}" ${isChecked ? "checked" : ""}></td>
          <td><strong>${escapeHtml(c.nom)}</strong></td>
          <td><span class="badge badge-${c.type}">${c.type.toUpperCase()}</span></td>
          <td>${escapeHtml(c.departement)}</td>
          <td>${escapeHtml(c.agent)}</td>
          <td>${escapeHtml(c.email)}</td>
        </tr>
      `;
    }).join("");
  }

  if (countDisplayedEl) countDisplayedEl.textContent = filteredContacts.length;
  if (countSelectedEl) countSelectedEl.textContent = selectedContacts.length;

  // Mise à jour synchrone de la case d'en-tête
  if (headerCheckbox) {
    const allFilteredAreSelected = filteredContacts.length > 0 && filteredContacts.every(fc => selectedContacts.some(sc => sc.id === fc.id));
    headerCheckbox.checked = allFilteredAreSelected;
  }

  if (warningLimit) {
    if (selectedContacts.length > 30) {
      warningLimit.style.display = "block";
      warningLimit.textContent = "⚠️ Vous avez sélectionné plus de 30 destinataires. L'envoi peut prendre quelques secondes de plus.";
    } else {
      warningLimit.style.display = "none";
    }
  }

  // Événements cases à cocher
  document.querySelectorAll(".contact-checkbox").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const contactId = e.target.dataset.id;
      const contact = allContacts.find(c => c.id === contactId);
      if (e.target.checked) {
        if (contact && !selectedContacts.some(sc => sc.id === contact.id)) {
          selectedContacts.push(contact);
        }
      } else {
        selectedContacts = selectedContacts.filter(sc => sc.id !== contactId);
      }
      renderTable();
    });
  });
}

// 5. Événements et Listeners
function setupEventListeners() {
  document.getElementById("filter-type")?.addEventListener("change", applyFilters);
  document.getElementById("filter-dept")?.addEventListener("change", applyFilters);
  document.getElementById("filter-sector")?.addEventListener("change", applyFilters);
  document.getElementById("search-input")?.addEventListener("input", applyFilters);

  // Case à cocher d'en-tête
  const headerCheckbox = document.getElementById("header-select-all") || document.getElementById("chk-toggle-all");
  headerCheckbox?.addEventListener("change", (e) => {
    if (e.target.checked) {
      filteredContacts.forEach(c => {
        if (!selectedContacts.some(sc => sc.id === c.id)) {
          selectedContacts.push(c);
        }
      });
    } else {
      const filteredIds = filteredContacts.map(c => c.id);
      selectedContacts = selectedContacts.filter(sc => !filteredIds.includes(sc.id));
    }
    renderTable();
  });

  // Boutons Tout sélectionner / Tout désélectionner
  document.getElementById("btn-select-all")?.addEventListener("click", () => {
    filteredContacts.forEach(c => {
      if (!selectedContacts.some(sc => sc.id === c.id)) {
        selectedContacts.push(c);
      }
    });
    renderTable();
  });

  document.getElementById("btn-deselect-all")?.addEventListener("click", () => {
    selectedContacts = [];
    renderTable();
  });

  document.getElementById("select-sender")?.addEventListener("change", updateSignature);

  const fileInput = document.getElementById("file-attachment");
  if (fileInput) {
    fileInput.addEventListener("change", handleFileSelect);
  }

  document.getElementById("btn-open-confirm")?.addEventListener("click", openConfirmModal);
  document.getElementById("btn-cancel-send")?.addEventListener("click", closeModal);
  document.getElementById("btn-confirm-send")?.addEventListener("click", executeEmailSending);
}

// 6. Signature
function updateSignature() {
  const senderVal = document.getElementById("select-sender")?.value || "jerome";
  const previewEl = document.getElementById("signature-preview");
  if (previewEl) {
    previewEl.innerHTML = SIGNATURES[senderVal] || SIGNATURES.jerome;
  }
}

// 7. Fichier joint unique avec conversion Base64 & Option de suppression
function handleFileSelect(e) {
  const input = e.target;
  const files = input.files;

  if (!files || files.length === 0) return;

  const file = files[0];
  if (file.size > 10 * 1024 * 1024) {
    alert("Le fichier dépasse la limite autorisée de 10 Mo.");
    input.value = "";
    renderFilePreview();
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    attachedFiles = [{
      filename: file.name,
      size: file.size,
      content: evt.target.result.split(',')[1],
      encoding: 'base64'
    }];
    input.value = ""; // Réinitialise l'input
    renderFilePreview();
  };
  reader.readAsDataURL(file);
}

function renderFilePreview() {
  const previewInfo = document.getElementById("file-preview-info");
  if (!previewInfo) return;

  if (attachedFiles.length === 0) {
    previewInfo.innerHTML = `<span style="font-size: 0.82rem; color: #666;">Aucune pièce jointe.</span>`;
    return;
  }

  const file = attachedFiles[0];
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

  previewInfo.innerHTML = `
    <div class="file-chip">
      <span>📄 <strong>${escapeHtml(file.filename)}</strong> (${sizeMB} Mo)</span>
      <button type="button" class="btn-remove-file" id="btn-remove-attachment" title="Supprimer la pièce jointe">✕</button>
    </div>
  `;

  document.getElementById("btn-remove-attachment")?.addEventListener("click", removeAttachment);
}

function removeAttachment() {
  attachedFiles = [];
  const fileInput = document.getElementById("file-attachment");
  if (fileInput) fileInput.value = "";
  renderFilePreview();
}

// 8. Modale de confirmation
function openConfirmModal() {
  const senderVal = document.getElementById("select-sender")?.value || "jerome";
  
  let senderEmailText = "jerome@leroyfactory.fr";
  if (senderVal === "coryne") {
    senderEmailText = "coryne@leroyfactory.fr";
  } else if (senderVal === "both") {
    senderEmailText = "Jérôme & Coryne (jerome@leroyfactory.fr & coryne@leroyfactory.fr)";
  }

  const subject = document.getElementById("email-subject")?.value?.trim();
  const body = document.getElementById("email-body")?.value?.trim();

  if (selectedContacts.length === 0) {
    alert("Veuillez sélectionner au moins un destinataire.");
    return;
  }
  if (!subject) {
    alert("Veuillez saisir un objet pour votre e-mail.");
    return;
  }
  if (!body) {
    alert("Veuillez rédiger le corps de votre message.");
    return;
  }

  document.getElementById("summary-sender").textContent = senderEmailText;
  document.getElementById("summary-subject").textContent = subject;
  document.getElementById("summary-count").textContent = `${selectedContacts.length} destinataire(s) en Cci`;
  document.getElementById("summary-attachment").textContent = attachedFiles.length > 0 ? attachedFiles[0].filename : "Aucune";

  const modal = document.getElementById("modal-confirm");
  if (modal) modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("modal-confirm");
  if (modal) modal.style.display = "none";
}

// 9. Envoi d'e-mail
async function executeEmailSending() {
  const btnConfirm = document.getElementById("btn-confirm-send");
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.textContent = "Envoi en cours...";
  }

  const senderVal = document.getElementById("select-sender")?.value || "jerome";
  const subject = document.getElementById("email-subject")?.value?.trim();
  const bodyText = document.getElementById("email-body")?.value?.trim();
  const fullHtmlContent = `${bodyText.replace(/\n/g, "<br>")}${SIGNATURES[senderVal]}`;

  const bccRecipients = selectedContacts.map(c => c.email);

  try {
    const response = await fetch("https://us-central1-le-roy-factory.cloudfunctions.net/sendGroupEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderMode: senderVal,
        bccRecipients: bccRecipients,
        subject: subject,
        htmlContent: fullHtmlContent,
        attachments: attachedFiles
      })
    });

    const result = await response.json();

    if (result.success) {
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
            historiqueMails: arrayUnion({
              date: dateStr,
              expediteur: agentName,
              objet: subject
            })
          });
        } catch (e) {
          console.warn("Impossible de mettre à jour le client:", contact.id);
        }
      }

      alert(`✅ E-mail envoyé avec succès à ${bccRecipients.length} destinataire(s) !`);
      closeModal();
      location.reload();
    } else {
      alert(`❌ Échec de l'envoi : ${result.error || "Erreur inconnue"}`);
    }
  } catch (err) {
    console.error("Erreur serveur:", err);
    alert("❌ Une erreur réseau s'est produite lors de l'envoi.");
  } finally {
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.textContent = "Confirmer l'envoi";
    }
  }
}

// 10. Historique
async function loadHistory() {
  const tbody = document.getElementById("history-tbody");
  if (!tbody) return;

  try {
    const querySnapshot = await getDocs(collection(db, "historique_mails"));
    if (querySnapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">Aucun envoi enregistré.</td></tr>`;
      return;
    }

    let historyList = [];
    querySnapshot.forEach(docSnap => {
      historyList.push(docSnap.data());
    });

    historyList.sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = historyList.map(item => {
      const formattedDate = new Date(item.date).toLocaleString("fr-FR");
      return `
        <tr>
          <td>${formattedDate}</td>
          <td>${escapeHtml(item.expediteur)}</td>
          <td><strong>${escapeHtml(item.objet)}</strong></td>
          <td>${item.nbDestinataires} contact(s)</td>
          <td><span class="badge badge-client">${escapeHtml(item.statut || "Envoyé")}</span></td>
        </tr>
      `;
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
    .replace(/"/g, "&quot;");
}
