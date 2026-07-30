// Importation de la base de données Firebase
import { db } from "./firebase.js";
import { collection, getDocs, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Base de données de secours locale
const initialClientsDatabase = [
  {"type": "Prospect", "societe": "MP CETIN. EDEN", "contact": "", "agent": "Jérôme", "adresse": "6 Bd des Jardiniers", "code_postal": "06200", "ville": "Nice", "telephone": "0674813721", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona", "contact": "", "agent": "Jérôme", "adresse": "875 Route du Thor", "code_postal": "84800", "ville": "L'Isle-sur-la-Sorgue", "telephone": "04 90 20 52 22", "email": "", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []}
];

let clientsDatabase = [];
let tempDocuments = [];
let tempExtraPhones = [];
let tempComptesRendus = [];

let recognition = null;
let isRecording = false;

// LANCEMENT GLOBAL DIRECTEMENT DANS LE DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  const agentName = localStorage.getItem("agentName") || "Jérôme";
  const firstName = agentName.split(" ")[0];
  const greetingEl = document.getElementById("user-greeting");
  if (greetingEl) {
    greetingEl.textContent = `Bonjour ${firstName} 👋 — Espace Commercial LE ROY FACTORY`;
  }

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

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("agentLoggedIn");
      localStorage.removeItem("agentName");
      localStorage.removeItem("agentEmail");
      window.location.href = "agent.html";
    });
  }

  // 1. CHARGEMENT DIRECT DEPUIS FIREBASE
  try {
    const querySnapshot = await getDocs(collection(db, "clients"));
    clientsDatabase = [];
    querySnapshot.forEach((documentSnap) => {
      clientsDatabase.push(documentSnap.data());
    });
    console.log("🔥 Clients chargés depuis Firebase :", clientsDatabase.length);
  } catch (error) {
    console.error("Erreur chargement Firebase :", error);
    clientsDatabase = initialClientsDatabase;
  }

  // Si jamais la base retourne vide par sécurité
  if (clientsDatabase.length === 0) {
    clientsDatabase = initialClientsDatabase;
  }

  const deptSelect = document.getElementById("filter-dept");
  const cpSelect = document.getElementById("filter-cp");
  const citySelect = document.getElementById("filter-city");

  function populateFilterDropdowns() {
    if (deptSelect) deptSelect.innerHTML = '<option value="">Tous les départements</option>';
    if (cpSelect) cpSelect.innerHTML = '<option value="">Tous les codes postaux</option>';
    if (citySelect) citySelect.innerHTML = '<option value="">Toutes les villes</option>';

    const departments = [...new Set(clientsDatabase.map(c => c.departement).filter(Boolean))].sort((a, b) => 
      a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' })
    );

    const postalCodes = [...new Set(clientsDatabase.map(c => String(c.code_postal)).filter(c => c && c !== 'null' && c !== '-'))].sort((a, b) => 
      a.localeCompare(b, 'fr', { numeric: true })
    );

    const cities = [...new Set(clientsDatabase.map(c => c.ville).filter(Boolean))].sort((a, b) => 
      a.localeCompare(b, 'fr', { sensitivity: 'base' })
    );

    if (deptSelect) {
      departments.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        deptSelect.appendChild(opt);
      });
    }

    if (cpSelect) {
      postalCodes.forEach(cp => {
        const opt = document.createElement("option");
        opt.value = cp;
        opt.textContent = cp;
        cpSelect.appendChild(opt);
      });
    }

    if (citySelect) {
      cities.forEach(city => {
        const opt = document.createElement("option");
        opt.value = city;
        opt.textContent = city;
        citySelect.appendChild(opt);
      });
    }
  }

  populateFilterDropdowns();

  const urlParams = new URLSearchParams(window.location.search);
  let currentFilter = urlParams.get("filter") || "all";
  const actionParam = urlParams.get("action");

  function updateKPIs() {
    const totalCountEl = document.getElementById("count-total");
    const clientsCountEl = document.getElementById("count-clients");
    const prospectsCountEl = document.getElementById("count-prospects");

    if (totalCountEl) totalCountEl.textContent = clientsDatabase.length;
    if (clientsCountEl) clientsCountEl.textContent = clientsDatabase.filter(c => c.type && c.type.toLowerCase() === 'client').length;
    if (prospectsCountEl) prospectsCountEl.textContent = clientsDatabase.filter(c => c.type && c.type.toLowerCase() === 'prospect').length;
  }
  updateKPIs();

  const tableBody = document.getElementById("clients-table-body");
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  const noResultsDiv = document.getElementById("no-results");
  const filterBtns = document.querySelectorAll(".filter-btn[data-filter]");
  const resetBtn = document.getElementById("reset-filters");

  filterBtns.forEach(btn => {
    if (btn.getAttribute("data-filter") === currentFilter) {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.getAttribute("data-filter");
      renderTable();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (deptSelect) deptSelect.value = "";
      if (cpSelect) cpSelect.value = "";
      if (citySelect) citySelect.value = "";
      currentFilter = "all";
      filterBtns.forEach(b => b.classList.remove("active"));
      const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
      if (allBtn) allBtn.classList.add("active");
      renderTable();
    });
  }

  function renderTable() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedDept = deptSelect ? deptSelect.value : "";
    const selectedCp = cpSelect ? String(cpSelect.value) : "";
    const selectedCity = citySelect ? citySelect.value : "";

    if (!tableBody) return;
    tableBody.innerHTML = "";

    const filtered = clientsDatabase.filter(item => {
      const itemType = item.type ? item.type.toLowerCase() : "";
      const matchType = currentFilter === "all" || itemType === currentFilter;
      const matchDept = !selectedDept || item.departement === selectedDept;
      const matchCp = !selectedCp || String(item.code_postal) === selectedCp;
      const matchCity = !selectedCity || item.ville === selectedCity;

      const matchSearch = !searchTerm || 
        (item.societe && item.societe.toLowerCase().includes(searchTerm)) ||
        (item.contact && item.contact.toLowerCase().includes(searchTerm)) ||
        (item.ville && item.ville.toLowerCase().includes(searchTerm)) ||
        (item.code_postal && String(item.code_postal).includes(searchTerm)) ||
        (item.departement && item.departement.toLowerCase().includes(searchTerm)) ||
        (item.telephone && item.telephone.toLowerCase().includes(searchTerm)) ||
        (item.email && item.email.toLowerCase().includes(searchTerm));

      return matchType && matchDept && matchCp && matchCity && matchSearch;
    });

    if (filtered.length === 0) {
      if (noResultsDiv) noResultsDiv.style.display = "block";
      return;
    } else {
      if (noResultsDiv) noResultsDiv.style.display = "none";
    }

    filtered.forEach(client => {
      const realIndex = clientsDatabase.indexOf(client);
      const tr = document.createElement("tr");
      const cType = client.type ? client.type.toLowerCase() : "";
      const badgeClass = cType === 'client' ? 'badge-client' : 'badge-prospect';
      
      const hasCR = client.comptes_rendus && client.comptes_rendus.length > 0;

      tr.innerHTML = `
        <td>
          <strong>${client.societe || 'Sans nom'}</strong> ${client.documents && client.documents.length ? '📎' : ''} ${hasCR ? '📝' : ''}
          ${client.contact ? `<br><small style="color:#777;">👤 ${client.contact}</small>` : ''}
        </td>
        <td><span class="badge ${badgeClass}">${client.type || 'Inconnu'}</span></td>
        <td>${client.adresse || '-'}</td>
        <td><strong>${client.code_postal || '-'}</strong> ${client.ville || ''}</td>
        <td><span class="badge" style="background:#f1f1f1; color:#333;">${client.departement || '-'}</span></td>
        <td>${client.telephone || '-'}</td>
      `;

      tr.addEventListener("click", () => openModal(realIndex));
      tableBody.appendChild(tr);
    });
  }

  if (searchInput) searchInput.addEventListener("input", renderTable);
  if (searchBtn) searchBtn.addEventListener("click", renderTable);
  if (deptSelect) deptSelect.addEventListener("change", renderTable);
  if (cpSelect) cpSelect.addEventListener("change", renderTable);
  if (citySelect) citySelect.addEventListener("change", renderTable);

  renderTable();

  const modal = document.getElementById("client-modal");
  const modalClose = document.getElementById("modal-close-btn");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  const clientEditForm = document.getElementById("client-edit-form");
  const btnAddClient = document.getElementById("btn-add-client");
  const documentInput = document.getElementById("document-input");
  const documentsList = document.getElementById("documents-list");

  const cpInput = document.getElementById("edit-code-postal");
  const villeSelect = document.getElementById("edit-ville");
  const deptInput = document.getElementById("edit-departement");
  const extraPhonesContainer = document.getElementById("extra-phones-container");
  const btnAddPhone = document.getElementById("btn-add-phone");

  if (cpInput) {
    cpInput.addEventListener("input", (e) => {
      const code = e.target.value.trim();
      if (code.length >= 2) {
        deptInput.value = `FR-${code.substring(0, 2)}`;
      } else {
        deptInput.value = "";
      }

      if (code.length === 5) {
        fetch(`https://geo.api.gouv.fr/communes?codePostal=${code}&fields=nom&format=json`)
          .then(res => res.json())
          .then(data => {
            if (villeSelect) {
              villeSelect.innerHTML = "";
              if (data && data.length > 0) {
                data.forEach(c => {
                  const opt = document.createElement("option");
                  opt.value = c.nom;
                  opt.textContent = c.nom;
                  villeSelect.appendChild(opt);
                });
              } else {
                const opt = document.createElement("option");
                opt.value = "";
                opt.textContent = "Aucun village trouvé";
                villeSelect.appendChild(opt);
              }
            }
          })
          .catch(() => {
            if (villeSelect) villeSelect.innerHTML = `<option value="">Ville introuvable</option>`;
          });
      }
    });
  }

  function renderExtraPhones() {
    if (!extraPhonesContainer) return;
    extraPhonesContainer.innerHTML = "";

    tempExtraPhones.forEach((phone, idx) => {
      const row = document.createElement("div");
      row.className = "phone-row";
      row.innerHTML = `
        <input type="text" value="${phone}" placeholder="06 00 00 00 00" data-phone-idx="${idx}">
        <button type="button" class="btn-remove-phone" data-phone-idx="${idx}">&times;</button>
      `;
      extraPhonesContainer.appendChild(row);
    });

    extraPhonesContainer.querySelectorAll("input").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(e.target.getAttribute("data-phone-idx"), 10);
        tempExtraPhones[idx] = e.target.value;
      });
    });

    extraPhonesContainer.querySelectorAll(".btn-remove-phone").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.getAttribute("data-phone-idx"), 10);
        tempExtraPhones.splice(idx, 1);
        renderExtraPhones();
      });
    });
  }

  if (btnAddPhone) {
    btnAddPhone.addEventListener("click", () => {
      tempExtraPhones.push("");
      renderExtraPhones();
    });
  }

  function renderDocumentsList() {
    if (!documentsList) return;
    documentsList.innerHTML = "";

    if (tempDocuments.length === 0) {
      documentsList.innerHTML = `<li style="font-size: 0.85rem; color: #888;">Aucun document joint pour le moment.</li>`;
      return;
    }

    tempDocuments.forEach((doc, idx) => {
      const li = document.createElement("li");
      li.className = "document-item";
      li.innerHTML = `
        <a href="${doc.data}" target="_blank" download="${doc.name}">📄 ${doc.name}</a>
        <button type="button" class="btn-delete-doc" data-idx="${idx}">&times;</button>
      `;
      documentsList.appendChild(li);
    });

    document.querySelectorAll(".btn-delete-doc").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const docIdx = parseInt(e.target.getAttribute("data-idx"), 10);
        tempDocuments.splice(docIdx, 1);
        renderDocumentsList();
      });
    });
  }

  if (documentInput) {
    documentInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          tempDocuments.push({
            name: file.name,
            data: event.target.result
          });
          renderDocumentsList();
        };
        reader.readAsDataURL(file);
      });
      documentInput.value = "";
    });
  }

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const textArea = document.getElementById("cr-text-input");
      if (textArea) {
        textArea.value = transcript;
      }
    };

    recognition.onerror = (event) => {
      console.error("Erreur de reconnaissance vocale :", event.error);
      stopRecording();
    };

    recognition.onend = () => {
      if (isRecording) stopRecording();
    };
  }

  function startRecording() {
    if (!recognition) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur. Utilisez Google Chrome ou Safari.");
      return;
    }
    isRecording = true;
    recognition.start();
    const btn = document.getElementById("btn-voice-dictation");
    const icon = document.getElementById("voice-icon");
    const text = document.getElementById("voice-status-text");
    if (btn) btn.style.background = "#DC2626";
    if (icon) icon.textContent = "🔴";
    if (text) text.textContent = "Écoute en cours...";
  }

  function stopRecording() {
    if (recognition && isRecording) {
      recognition.stop();
    }
    isRecording = false;
    const btn = document.getElementById("btn-voice-dictation");
    const icon = document.getElementById("voice-icon");
    const text = document.getElementById("voice-status-text");
    if (btn) btn.style.background = "#111";
    if (icon) icon.textContent = "🎙️";
    if (text) text.textContent = "Dictée vocale";
  }

  document.getElementById("btn-voice-dictation")?.addEventListener("click", () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  function renderComptesRendus() {
    const container = document.getElementById("cr-history-list");
    if (!container) return;
    container.innerHTML = "";

    if (tempComptesRendus.length === 0) {
      container.innerHTML = `<p style="font-size: 0.85rem; color: #888; font-style: italic;">Aucun compte-rendu enregistré pour ce client.</p>`;
      return;
    }

    tempComptesRendus.sort((a, b) => new Date(b.date) - new Date(a.date));

    tempComptesRendus.forEach((cr, idx) => {
      const card = document.createElement("div");
      card.style.cssText = "background: #FFF; border: 1px solid #E5E7EB; border-left: 4px solid #D4AF37; padding: 0.85rem 1rem; border-radius: 6px; position: relative;";
      
      const formattedDate = new Date(cr.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
          <strong style="font-size: 0.85rem; color: #1A2530;">📅 Visite du ${formattedDate} — par ${cr.author}</strong>
          <button type="button" class="btn-delete-cr" data-cr-idx="${idx}" style="background: none; border: none; color: #DC2626; cursor: pointer; font-weight: bold;">&times;</button>
        </div>
        <p style="font-size: 0.9rem; color: #444; margin: 0; white-space: pre-wrap;">${cr.text}</p>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll(".btn-delete-cr").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.getAttribute("data-cr-idx"), 10);
        tempComptesRendus.splice(idx, 1);
        renderComptesRendus();
      });
    });
  }

  document.getElementById("btn-add-cr")?.addEventListener("click", () => {
    const dateVal = document.getElementById("cr-date-input").value;
    const authorVal = document.getElementById("cr-author-input").value;
    const textVal = document.getElementById("cr-text-input").value.trim();

    if (!textVal) {
      alert("Veuillez saisir ou dicter un texte pour le compte-rendu.");
      return;
    }

    tempComptesRendus.push({
      date: dateVal || new Date().toISOString().split('T')[0],
      author: authorVal || "Jérôme",
      text: textVal
    });

    document.getElementById("cr-text-input").value = "";
    if (isRecording) stopRecording();
    renderComptesRendus();
  });

  function openModal(index = -1, defaultType = "Client") {
    if (!modal) return;

    document.getElementById("edit-client-index").value = index;
    const badgeEl = document.getElementById("modal-status-badge");

    const currentAgent = localStorage.getItem("agentName") || "Jérôme Hugol";
    const agentFirstName = currentAgent.split(" ")[0];
    document.getElementById("cr-author-input").value = agentFirstName;
    document.getElementById("cr-date-input").value = new Date().toISOString().split('T')[0];

    if (index === -1) {
      document.getElementById("modal-societe-title").textContent = `Fiche Vierge — Nouveau ${defaultType}`;
      badgeEl.textContent = "Nouveau";
      badgeEl.className = defaultType === "Client" ? "badge badge-client" : "badge badge-prospect";

      document.getElementById("edit-societe").value = "";
      document.getElementById("edit-contact").value = "";
      document.getElementById("edit-type").value = defaultType;
      document.getElementById("edit-agent").value = agentFirstName;
      document.getElementById("edit-telephone").value = "";
      document.getElementById("edit-email").value = "";
      document.getElementById("edit-adresse").value = "";
      document.getElementById("edit-code-postal").value = "";
      
      if (villeSelect) {
        villeSelect.innerHTML = `<option value="">-- Entrez un Code Postal --</option>`;
      }
      document.getElementById("edit-departement").value = "";
      
      tempDocuments = [];
      tempExtraPhones = [];
      tempComptesRendus = [];
    } else {
      const client = clientsDatabase[index];
      if (!client) return;

      document.getElementById("modal-societe-title").textContent = client.societe || 'Fiche Client';
      const isClient = (client.type || '').toLowerCase() === 'client';
      badgeEl.textContent = client.type || 'Prospect';
      badgeEl.className = `badge ${isClient ? 'badge-client' : 'badge-prospect'}`;

      document.getElementById("edit-societe").value = client.societe || '';
      document.getElementById("edit-contact").value = client.contact || '';
      document.getElementById("edit-type").value = isClient ? 'Client' : 'Prospect';
      document.getElementById("edit-agent").value = client.agent || 'Jérôme';
      document.getElementById("edit-telephone").value = client.telephone || '';
      document.getElementById("edit-email").value = client.email || '';
      document.getElementById("edit-adresse").value = client.adresse || '';
      document.getElementById("edit-code-postal").value = client.code_postal || '';
      
      if (villeSelect) {
        villeSelect.innerHTML = `<option value="${client.ville || ''}">${client.ville || 'Sélectionner une ville'}</option>`;
      }

      document.getElementById("edit-departement").value = client.departement || '';
      
      tempDocuments = client.documents ? [...client.documents] : [];
      tempExtraPhones = client.autres_telephones ? [...client.autres_telephones] : (client.autre_telephone ? [client.autre_telephone] : []);
      tempComptesRendus = client.comptes_rendus ? [...client.comptes_rendus] : [];
    }

    renderExtraPhones();
    renderDocumentsList();
    renderComptesRendus();
    modal.style.display = "flex";
  }

  if (actionParam === "new-client") {
    openModal(-1, "Client");
  } else if (actionParam === "new-prospect") {
    openModal(-1, "Prospect");
  }

  if (btnAddClient) {
    btnAddClient.addEventListener("click", () => openModal(-1, "Client"));
  }

  if (clientEditForm) {
    clientEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const index = parseInt(document.getElementById("edit-client-index").value, 10);
      const societeName = document.getElementById("edit-societe").value.trim();
      const docId = societeName.replace(/[^a-zA-Z0-9]/g, "_");

      const clientData = {
        societe: societeName,
        contact: document.getElementById("edit-contact").value.trim(),
        type: document.getElementById("edit-type").value,
        agent: document.getElementById("edit-agent").value,
        telephone: document.getElementById("edit-telephone").value.trim(),
        email: document.getElementById("edit-email").value.trim(),
        autres_telephones: tempExtraPhones.filter(Boolean),
        adresse: document.getElementById("edit-adresse").value.trim(),
        code_postal: document.getElementById("edit-code-postal").value.trim(),
        ville: villeSelect ? villeSelect.value : "",
        departement: document.getElementById("edit-departement").value.trim(),
        documents: tempDocuments,
        comptes_rendus: tempComptesRendus
      };

      try {
        await setDoc(doc(db, "clients", docId), clientData);

        if (index === -1) {
          clientsDatabase.unshift(clientData);
        } else if (clientsDatabase[index]) {
          clientsDatabase[index] = clientData;
        }

        updateKPIs();
        populateFilterDropdowns();
        renderTable();

        modal.style.display = "none";
        alert("✅ Fiche enregistrée et synchronisée sur le cloud Firebase !");
      } catch (error) {
        console.error("Erreur lors de l'enregistrement Firebase :", error);
        alert("Erreur lors de la synchronisation cloud.");
      }
    });
  }

  if (modalClose) {
    modalClose.addEventListener("click", () => modal.style.display = "none");
  }

  if (btnCancelEdit) {
    btnCancelEdit.addEventListener("click", () => modal.style.display = "none");
  }

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});
