import { db } from "./firebase.js";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Sécurité session Agent
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  // Horloge & Date
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
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Déconnexion
  document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.removeItem("agentLoggedIn");
    window.location.href = "agent.html";
  });

  // Signatures configurées
  const signatures = {
    jerome: `Jérôme Hugol\nAgence Le Roy Factory\nTéléphone : 07 66 04 03 61\nE-mail : jerome@leroyfactory.fr\nSite : https://leroyfactory.fr`,
    coryne: `Coryne\nAgence Le Roy Factory\nE-mail : coryne@leroyfactory.fr\nSite : https://leroyfactory.fr`
  };

  const senderEmails = {
    jerome: "jerome@leroyfactory.fr",
    coryne: "coryne@leroyfactory.fr"
  };

  // Éléments DOM
  const filterType = document.getElementById("filter-type");
  const filterDept = document.getElementById("filter-dept");
  const filterSector = document.getElementById("filter-sector");
  const searchInput = document.getElementById("search-input");
  const recipientsTbody = document.getElementById("recipients-tbody");
  const countDisplayedEl = document.getElementById("count-displayed");
  const countSelectedEl = document.getElementById("count-selected");
  const warningLimit = document.getElementById("warning-limit");
  
  const selectSender = document.getElementById("select-sender");
  const signaturePreview = document.getElementById("signature-preview");
  const fileAttachment = document.getElementById("file-attachment");
  const filePreviewInfo = document.getElementById("file-preview-info");

  const modalConfirm = document.getElementById("modal-confirm");
  const modalConfirmText = document.getElementById("modal-confirm-text");
  const summarySender = document.getElementById("summary-sender");
  const summarySubject = document.getElementById("summary-subject");
  const summaryCount = document.getElementById("summary-count");
  const summaryAttachment = document.getElementById("summary-attachment");
  
  const btnConfirmSend = document.getElementById("btn-confirm-send");
  const btnCancelSend = document.getElementById("btn-cancel-send");

  const tabComposeBtn = document.getElementById("tab-compose-btn");
  const tabHistoryBtn = document.getElementById("tab-history-btn");
  const sectionCompose = document.getElementById("section-compose");
  const sectionHistory = document.getElementById("section-history");
  const historyTbody = document.getElementById("history-tbody");

  let clientsList = [];
  let displayedContacts = [];
  let selectedIds = new Set();
  let currentAttachedFile = null;

  // Validation d'adresse e-mail
  function isValidEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase().trim());
  }

  // Mise à jour de la signature lors du changement d'expéditeur
  function updateSignature() {
    const selected = selectSender.value;
    if (signaturePreview) {
      signaturePreview.textContent = signatures[selected] || "";
    }
  }
  selectSender?.addEventListener("change", updateSignature);
  updateSignature();

  // Chargement des clients depuis Firebase Firestore
  async function loadFirebaseContacts() {
    try {
      const snapshot = await getDocs(collection(db, "clients"));
      clientsList = [];
      const depts = new Set();

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const emailVal = data.email || data.adresseEmail || "";
        
        // Filtre strict : Ne garde que les fiches ayant un e-mail valide
        if (isValidEmail(emailVal)) {
          const deptVal = data.departement || (data.codePostal ? String(data.codePostal).substring(0, 2) : "Autre");
          if (deptVal) depts.add(deptVal);

          clientsList.push({
            id: docSnap.id,
            societe: data.societe || data.nom || "Sans nom",
            type: (data.type || "client").toLowerCase(),
            departement: deptVal,
            secteur: data.agent || data.secteur || "Non attribué",
            email: emailVal.trim()
          });
        }
      });

      // Remplissage dynamique du sélecteur de départements
      if (filterDept) {
        filterDept.innerHTML = `<option value="all">Tous les départements</option>`;
        Array.from(depts).sort().forEach(d => {
          const opt = document.createElement("option");
          opt.value = d;
          opt.textContent = `Dép. ${d}`;
          filterDept.appendChild(opt);
        });
      }

      applyFilters();
    } catch (err) {
      console.error("Erreur de chargement Firebase :", err);
      recipientsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Erreur lors du chargement des contacts.</td></tr>`;
    }
  }

  // Filtrage combiné
  function applyFilters() {
    const typeVal = filterType.value;
    const deptVal = filterDept.value;
    const sectorVal = filterSector.value;
    const searchVal = searchInput.value.toLowerCase().trim();

    displayedContacts = clientsList.filter(c => {
      // Type
      if (typeVal !== "all" && c.type !== typeVal) return false;
      // Département
      if (deptVal !== "all" && c.departement !== deptVal) return false;
      // Secteur commercial
      if (sectorVal !== "all" && !c.secteur.toLowerCase().includes(sectorVal.toLowerCase())) return false;
      // Recherche
      if (searchVal) {
        const matchSociete = c.societe.toLowerCase().includes(searchVal);
        const matchEmail = c.email.toLowerCase().includes(searchVal);
        if (!matchSociete && !matchEmail) return false;
      }
      return true;
    });

    renderRecipientsTable();
  }

  // Rendu du tableau des destinataires
  function renderRecipientsTable() {
    recipientsTbody.innerHTML = "";

    if (displayedContacts.length === 0) {
      recipientsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 1.5rem; color:#888;">Aucun contact ne correspond aux filtres.</td></tr>`;
      countDisplayedEl.textContent = "0";
      updateSelectionCounts();
      return;
    }

    displayedContacts.forEach(c => {
      const tr = document.createElement("tr");
      const isChecked = selectedIds.has(c.id);

      tr.innerHTML = `
        <td style="text-align: center;">
          <input type="checkbox" class="chk-recipient" data-id="${c.id}" ${isChecked ? "checked" : ""}>
        </td>
        <td><strong>${c.societe}</strong></td>
        <td><span class="badge ${c.type === 'client' ? 'badge-client' : 'badge-prospect'}">${c.type.toUpperCase()}</span></td>
        <td>${c.departement}</td>
        <td>${c.secteur}</td>
        <td>${c.email}</td>
      `;

      tr.querySelector(".chk-recipient").addEventListener("change", (e) => {
        if (e.target.checked) {
          selectedIds.add(c.id);
        } else {
          selectedIds.delete(c.id);
        }
        updateSelectionCounts();
      });

      recipientsTbody.appendChild(tr);
    });

    countDisplayedEl.textContent = displayedContacts.length;
    updateSelectionCounts();
  }

  // Mises à jour des compteurs et alertes
  function updateSelectionCounts() {
    const count = selectedIds.size;
    countSelectedEl.textContent = count;

    if (count > 30) {
      warningLimit.style.display = "block";
    } else {
      warningLimit.style.display = "none";
    }
  }

  // Événements Filtres
  filterType?.addEventListener("change", applyFilters);
  filterDept?.addEventListener("change", applyFilters);
  filterSector?.addEventListener("change", applyFilters);
  searchInput?.addEventListener("input", applyFilters);

  // Boutons Tout Sélectionner / Désélectionner
  document.getElementById("btn-select-all")?.addEventListener("click", () => {
    displayedContacts.forEach(c => selectedIds.add(c.id));
    renderRecipientsTable();
  });

  document.getElementById("btn-deselect-all")?.addEventListener("click", () => {
    selectedIds.clear();
    renderRecipientsTable();
  });

  document.getElementById("chk-toggle-all")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      displayedContacts.forEach(c => selectedIds.add(c.id));
    } else {
      displayedContacts.forEach(c => selectedIds.delete(c.id));
    }
    renderRecipientsTable();
  });

  // Gestion des pièces jointes
  fileAttachment?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) {
      currentAttachedFile = null;
      filePreviewInfo.innerHTML = "";
      return;
    }

    // Limite de taille (10 Mo)
    if (file.size > 10 * 1024 * 1024) {
      alert("⚠️ Le fichier sélectionné dépasse la limite autorisée de 10 Mo.");
      fileAttachment.value = "";
      currentAttachedFile = null;
      filePreviewInfo.innerHTML = "";
      return;
    }

    const sizeMo = (file.size / (1024 * 1024)).toFixed(2);
    currentAttachedFile = file;

    filePreviewInfo.innerHTML = `
      <div class="file-chip">
        📄 <strong>${file.name}</strong> (${sizeMo} Mo)
        <button type="button" id="btn-remove-file" style="background:none; border:none; color:red; font-weight:bold; cursor:pointer;">&times;</button>
      </div>
    `;

    document.getElementById("btn-remove-file")?.addEventListener("click", () => {
      fileAttachment.value = "";
      currentAttachedFile = null;
      filePreviewInfo.innerHTML = "";
    });
  });

  // Validation Formulaire & Ouverture Modale
  document.getElementById("email-form")?.addEventListener("submit", (e) => {
    e.preventDefault();

    if (selectedIds.size === 0) {
      alert("⚠️ Aucun destinataire n'est sélectionné. Veuillez cocher au moins un contact.");
      return;
    }

    const subject = document.getElementById("input-subject").value.trim();
    const body = document.getElementById("textarea-body").value.trim();

    if (!subject || !body) {
      alert("⚠️ L'objet et le corps du message sont obligatoires.");
      return;
    }

    const senderKey = selectSender.value;
    const senderEmail = senderEmails[senderKey];

    // Remplissage des synthèses dans la modale
    summarySender.textContent = `${senderKey === 'jerome' ? 'Jérôme' : 'Coryne'} (${senderEmail})`;
    summarySubject.textContent = subject;
    summaryCount.textContent = selectedIds.size;
    summaryAttachment.textContent = currentAttachedFile ? currentAttachedFile.name : "Aucune";

    modalConfirmText.textContent = `Vous êtes sur le point d'envoyer cet e-mail à ${selectedIds.size} destinataire(s) en Cci depuis l'adresse ${senderEmail}. Confirmer l'envoi ?`;

    modalConfirm.style.display = "flex";
  });

  // Boutons Modale
  btnCancelSend?.addEventListener("click", () => {
    modalConfirm.style.display = "none";
  });

  // CONFIRMATION ET EXECUTION DE L'ENVOI
  btnConfirmSend?.addEventListener("click", async () => {
    btnConfirmSend.disabled = true;
    btnConfirmSend.textContent = "⏳ Envoi en cours...";

    const senderKey = selectSender.value;
    const senderName = senderKey === "jerome" ? "Jérôme" : "Coryne";
    const senderEmail = senderEmails[senderKey];
    const subject = document.getElementById("input-subject").value.trim();
    const bodyText = document.getElementById("textarea-body").value.trim();
    const fullBody = bodyText + "\n\n--\n" + signatures[senderKey];

    // Récupération des destinataires sélectionnés
    const selectedContacts = clientsList.filter(c => selectedIds.has(c.id));
    const recipientEmails = selectedContacts.map(c => c.email);

    try {
      // 1. Inscription dans la fiche de chaque client/prospect
      const currentDateStr = new Date().toLocaleDateString("fr-FR");
      const historyEntryText = `E-mail groupé envoyé le ${currentDateStr} par ${senderName} — objet : ${subject}`;

      for (const contact of selectedContacts) {
        const clientRef = doc(db, "clients", contact.id);
        // Ajout d'une note d'historique
        await updateDoc(clientRef, {
          dernier_mail_groupe: historyEntryText,
          date_dernier_mail: serverTimestamp()
        });
      }

      // 2. Inscription dans l'historique général des envois (Firestore)
      await addDoc(collection(db, "historique_mails"), {
        date: serverTimestamp(),
        expediteur: senderEmail,
        expediteur_nom: senderName,
        objet: subject,
        nb_destinataires: recipientEmails.length,
        destinataires_apercu: recipientEmails.slice(0, 5),
        piece_jointe: currentAttachedFile ? currentAttachedFile.name : null,
        statut: "Succès"
      });

      alert(`✅ Mail groupé envoyé avec succès à ${recipientEmails.length} destinataire(s) en Cci !`);

      // Reinitialisation du formulaire
      document.getElementById("email-form").reset();
      selectedIds.clear();
      filePreviewInfo.innerHTML = "";
      currentAttachedFile = null;
      updateSignature();
      applyFilters();
      modalConfirm.style.display = "none";

    } catch (err) {
      console.error("Erreur lors de l'envoi :", err);
      alert("❌ Une erreur est survenue lors de la tentative d'envoi.");
    } finally {
      btnConfirmSend.disabled = false;
      btnConfirmSend.textContent = "✓ Confirmer et envoyer";
    }
  });

  // Gestion des Onglets
  tabComposeBtn?.addEventListener("click", () => {
    tabComposeBtn.classList.add("active");
    tabHistoryBtn.classList.remove("active");
    sectionCompose.style.display = "block";
    sectionHistory.style.display = "none";
  });

  tabHistoryBtn?.addEventListener("click", async () => {
    tabHistoryBtn.classList.add("active");
    tabComposeBtn.classList.remove("active");
    sectionCompose.style.display = "none";
    sectionHistory.style.display = "block";

    // Chargement de l'historique
    try {
      const historySnap = await getDocs(collection(db, "historique_mails"));
      historyTbody.innerHTML = "";

      if (historySnap.empty) {
        historyTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">Aucun envoi dans l'historique.</td></tr>`;
        return;
      }

      historySnap.forEach(docSnap => {
        const h = docSnap.data();
        const tr = document.createElement("tr");
        const dateFormatted = h.date ? new Date(h.date.seconds * 1000).toLocaleString("fr-FR") : "--";

        tr.innerHTML = `
          <td>${dateFormatted}</td>
          <td>${h.expediteur_nom} (${h.expediteur})</td>
          <td><strong>${h.objet}</strong></td>
          <td>${h.nb_destinataires} contacts</td>
          <td>${h.piece_jointe || 'Aucune'}</td>
          <td><span style="color:#047857; font-weight:bold;">✔ ${h.statut}</span></td>
        `;
        historyTbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Erreur historique :", err);
    }
  });

  // Démarrage
  loadFirebaseContacts();
});
