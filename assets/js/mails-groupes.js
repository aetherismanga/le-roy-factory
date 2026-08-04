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
--<br>
<strong>Jérôme Hugol</strong><br>
<em>Agence Le Roy Factory</em><br>
Téléphone : <a href="tel:0766040361">07 66 04 03 61</a><br>
E-mail : <a href="mailto:jerome@leroyfactory.fr">jerome@leroyfactory.fr</a><br>
Site : <a href="https://leroyfactory.fr" target="_blank">https://leroyfactory.fr</a>
  `,
  coryne: `
<br><br>
--<br>
<strong>Coryne</strong><br>
<em>Agence Le Roy Factory</em><br>
E-mail : <a href="mailto:coryne@leroyfactory.fr">coryne@leroyfactory.fr</a><br>
Site : <a href="https://leroyfactory.fr" target="_blank">https://leroyfactory.fr</a>
  `
};

document.addEventListener("DOMContentLoaded", async () => {
  // Sécurité session
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  setupEventListeners();
  await loadContacts();
  updateSignature();
});

// 1. Chargement et nettoyage des contacts depuis Firestore
async function loadContacts() {
  const tbody = document.getElementById("recipients-tbody") || document.getElementById("contacts-tbody");
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

      // On n'accepte que les adresses valides avec un @
      if (cleanEmail && cleanEmail.includes("@")) {
        // Extraction et uniformisation du Département (ex: '34' -> 'FR-34', 'FR-34' -> 'FR-34')
        let rawDept = String(data.departement || data.Dept || "").trim();
        if (!rawDept && (data.codePostal || data.cp)) {
          rawDept = String(data.codePostal || data.cp).trim().substring(0, 2);
        }

        let cleanDept = "-";
        if (rawDept) {
          // Nettoyage pour éviter les doublons type FR-FR-34
          let numOnly = rawDept.replace(/[^0-9A-Ba-b]/g, "");
          if (numOnly) {
            cleanDept = "FR-" + numOnly.toUpperCase();
          } else {
            cleanDept = rawDept.toUpperCase();
          }
        }

        // Détermination du nom d'affichage (Société en priorité, sinon Nom du contact)
        const displayName = data.societe || data.nomSociete || data.entreprise || data.nom || data.nomContact || "Sans nom";

        // Secteur / Agent souple
        const agentRaw = String(data.agent || data.secteur || data.Agent || "").toLowerCase();
        let agentClean = "Jérôme";
        if (agentRaw.includes("coryne")) {
          agentClean = "Coryne";
        }

        // Type (client ou prospect)
        const typeRaw = String(data.type || data.Type || "client").toLowerCase();

        allContacts.push({
          id: docSnap.id,
          nom: displayName,
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
  const sectorFilter = (document.getElementById("filter-sector")?.value || document.getElementById("filter-agent")?.value || "all").toLowerCase();
  const searchFilter = (document.getElementById("search-input")?.value || document.getElementById("filter-search")?.value || "").toLowerCase().trim();

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

// 4. Rendu du tableau (Alignement exact 6 colonnes)
function renderTable() {
  const tbody = document.getElementById("recipients-tbody") || document.getElementById("contacts-tbody");
  const countDisplayedEl = document.getElementById("count-displayed");
  const countSelectedEl = document.getElementById("count-selected");
  const warningLimit = document.getElementById("warning-limit");

  if (!tbody) return;

  if (filteredContacts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">Aucun contact trouvé.</td></tr>`;
  } else {
    tbody.innerHTML = filteredContacts.map(c => {
      const isChecked = selectedContacts.some(sc => sc.id === c.id);
      return `
        <tr>
          <td><input type="checkbox" class="contact-checkbox" data-id="${c.id}" ${isChecked ? "checked" : ""}></td>
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

  if (warningLimit) {
    if (selectedContacts.length > 30) {
      warningLimit.style.display = "block";
      warningLimit.textContent = "Attention : Vous avez sélectionné plus de 30 destinataires. L'envoi peut prendre quelques secondes de plus.";
    } else {
      warningLimit.style.display = "none";
    }
  }

  // Événements sur les cases à cocher
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
  document.getElementById("filter-agent")?.addEventListener("change", applyFilters);
  document.getElementById("search-input")?.addEventListener("input", applyFilters);
  document.getElementById("filter-search")?.addEventListener("input", applyFilters);

  // Tout sélectionner / Tout désélectionner
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

  // Changement d'expéditeur / Signature
  document.getElementById("select-sender")?.addEventListener("change", updateSignature);

  // Pièce jointe
  const fileInput = document.getElementById("file-attachment");
  if (fileInput) {
    fileInput.addEventListener("change", handleFileSelect);
  }

  // Bouton Ouvrir Modale d'envoi
  document.getElementById("btn-open-confirm")?.addEventListener("click", openConfirmModal);
  document.getElementById("btn-cancel-send")?.addEventListener("click", closeModal);
  document.getElementById("btn-confirm-send")?.addEventListener("click", executeEmailSending);
}

// 6. Mise à jour de la signature
function updateSignature() {
  const senderVal = document.getElementById("select-sender")?.value || "jerome";
  const previewEl = document.getElementById("signature-preview");
  if (previewEl) {
    previewEl.innerHTML = SIGNATURES[senderVal] || SIGNATURES.jerome;
  }
}

// 7. Traitement des pièces jointes (Base64)
function handleFileSelect(e) {
  const files = e.target.files;
  const previewInfo = document.getElementById("file-preview-info");
  attachedFiles = [];

  if (!files || files.length === 0) {
    if (previewInfo) previewInfo.textContent = "Aucune pièce jointe.";
    return;
  }

  const file = files[0];
  if (file.size > 10 * 1024 * 1024) {
    alert("Le fichier dépasse la limite autorisée de 10 Mo.");
    e.target.value = "";
    if (previewInfo) previewInfo.textContent = "Fichier trop volumineux.";
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    attachedFiles.push({
      filename: file.name,
      content: evt.target.result.split(',')[1],
      encoding: 'base64'
    });
    if (previewInfo) {
      previewInfo.textContent = `Fichier prêt : ${file.name} (${(file.size / (1024*1024)).toFixed(2)} Mo)`;
    }
  };
  reader.readAsDataURL(file);
}

// 8. Modale de confirmation
function openConfirmModal() {
  const senderVal = document.getElementById("select-sender")?.value || "jerome";
  const senderEmail = senderVal === "coryne" ? "coryne@leroyfactory.fr" : "jerome@leroyfactory.fr";
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

  document.getElementById("summary-sender").textContent = senderEmail;
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

// 9. Envoi effectif via la Firebase Function
async function executeEmailSending() {
  const btnConfirm = document.getElementById("btn-confirm-send");
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.textContent = "Envoi en cours...";
  }

  const senderVal = document.getElementById("select-sender")?.value || "jerome";
  const senderEmail = senderVal === "coryne" ? "coryne@leroyfactory.fr" : "jerome@leroyfactory.fr";
  const subject = document.getElementById("email-subject")?.value?.trim();
  const bodyText = document.getElementById("email-body")?.value?.trim();
  const fullHtmlContent = `${bodyText.replace(/\n/g, "<br>")}${SIGNATURES[senderVal]}`;

  const bccRecipients = selectedContacts.map(c => c.email);

  try {
    const response = await fetch("https://us-central1-le-roy-factory.cloudfunctions.net/sendGroupEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderEmail: senderEmail,
        bccRecipients: bccRecipients,
        subject: subject,
        htmlContent: fullHtmlContent,
        attachments: attachedFiles
      })
    });

    const result = await response.json();

    if (result.success) {
      // Historique global
      await addDoc(collection(db, "historique_mails"), {
        date: new Date().toISOString(),
        expediteur: senderEmail,
        objet: subject,
        nbDestinataires: bccRecipients.length,
        destinataires: bccRecipients,
        statut: "Succès"
      });

      // Historique client individuel
      const dateStr = new Date().toLocaleDateString("fr-FR");
      const agentName = senderVal === "coryne" ? "Coryne" : "Jérôme";
      
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
          console.warn("Impossible d'inscrire l'historique pour le client:", contact.id);
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

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
