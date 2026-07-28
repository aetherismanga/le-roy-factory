// Base de données CRM LE ROY FACTORY avec persistance des modifications
const initialClientsDatabase = [
  {"type": "Prospect", "societe": "MP CETIN. EDEN", "contact": "", "agent": "Jérôme", "adresse": "6 Bd des Jardiniers", "code_postal": "06200", "ville": "Nice", "telephone": "0674813721", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "Ciffreo Bona", "contact": "", "agent": "Jérôme", "adresse": "875 Route du Thor", "code_postal": "84800", "ville": "L'Isle-sur-la-Sorgue", "telephone": "04 90 20 52 22", "email": "", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "Ciffreo Bona", "contact": "", "agent": "Jérôme", "adresse": "3 Rue Marie Magdeleine Signouret", "code_postal": "84160", "ville": "Cadenet", "telephone": "04 90 08 74 50", "email": "", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": []},
  {"type": "Prospect", "societe": "4 Rue Berlioz", "contact": "", "agent": "Coryne", "adresse": "4 Rue Berlioz", "code_postal": "06000", "ville": "Nice", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "Balitrand", "contact": "", "agent": "Coryne", "adresse": "280 Rue Bastide de Verdaches", "code_postal": "13290", "ville": "Aix-en-Provence", "telephone": "04 42 97 74 74", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "Ciffreo Bona Plaquiste - Facade", "contact": "", "agent": "Coryne", "adresse": "132 Avenue de la Roubine", "code_postal": "06150", "ville": "Cannes", "telephone": "04 92 19 42 30", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": []},
  {"type": "Prospect", "societe": "Pool & House Renov", "contact": "", "agent": "Coryne", "adresse": "28 Allee des Jacinthes", "code_postal": "06800", "ville": "Cagnes-sur-Mer", "telephone": "06 12 95 16 76", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "Ciffreo Bona Showroom", "contact": "", "agent": "Coryne", "adresse": "211 Avenue Francis Tonner", "code_postal": "06150", "ville": "Cannes", "telephone": "04 92 19 49 49", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "Ciffreo Bona", "contact": "", "agent": "Coryne", "adresse": "2143 Avenue Guillaume Dulac", "code_postal": "13600", "ville": "La Ciotat", "telephone": "04 42 08 21 21", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "JEM Carrelages Venelles", "contact": "", "agent": "Coryne", "adresse": "104 Avenue des Logissons", "code_postal": "13770", "ville": "Venelles", "telephone": "04 42 22 86 55", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": []},
  {"type": "Prospect", "societe": "La Maison par Carreau Concept", "contact": "", "agent": "Coryne", "adresse": "1955 Chemin de Saint-Bernard", "code_postal": "06220", "ville": "Vallauris", "telephone": "04 93 67 28 04", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": []},
  {"type": "Prospect", "societe": "C.B.L Carrelages Batiment du littoral", "contact": "", "agent": "Coryne", "adresse": "1887 Chemin de Saint-Bernard Porte", "code_postal": "06220", "ville": "Vallauris", "telephone": "04 93 64 60 60", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "Costamagna Distribution Mouans-Sartoux", "contact": "", "agent": "Coryne", "adresse": "370 Chemin des Plaines", "code_postal": "06370", "ville": "Mouans-Sartoux", "telephone": "04 89 97 75 05", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "Espace Aubade Laur & Abad Nimes", "contact": "", "agent": "Jérôme", "adresse": "291 Avenue du Docteur Fleming", "code_postal": "30900", "ville": "Nimes", "telephone": "04 66 28 86 86", "email": "", "autres_telephones": [], "departement": "FR-30", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "Espace Aubade Comtat et Allardet Le Tholonet (Aix Carrelages)", "contact": "", "agent": "Coryne", "adresse": "1160 Avenue Paul Jullien", "code_postal": "13100", "ville": "Le Tholonet", "telephone": "04 42 66 91 92", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "Carreaux Shop Brignoles aubade", "contact": "", "agent": "Coryne", "adresse": "190 Boulevard Bernard Long", "code_postal": "83170", "ville": "Brignoles", "telephone": "04 89 11 18 66", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "Espace Aubade Comtat & Allardet Le Cannet-des-Maures", "contact": "", "agent": "Coryne", "adresse": "5 Ancienne Route d'Italie", "code_postal": "83340", "ville": "Le Cannet-des-Maures", "telephone": "04 94 50 95 06", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": []},
  {"type": "Client", "societe": "Espace Aubade Socatra Carrelages Trans-en-Provence", "contact": "", "agent": "Coryne", "adresse": "926 Route de Draguignan", "code_postal": "83720", "ville": "Trans-en-Provence", "telephone": "04 98 10 43 00", "email": "socatra@comtat-allardet.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": []}
];

// Récupération des données sauvegardées
let clientsDatabase = JSON.parse(localStorage.getItem("clientsDatabaseCustom")) || initialClientsDatabase;
let tempDocuments = [];
let tempExtraPhones = [];

document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  const agentName = localStorage.getItem("agentName") || "Agent";
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

  // Tri ordonné des listes déroulantes des filtres généraux
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
      
      tr.innerHTML = `
        <td>
          <strong>${client.societe || 'Sans nom'}</strong> ${client.documents && client.documents.length ? '📎' : ''}
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

  // ÉDITION / CRÉATION ET GESTION MULTI-TÉLÉPHONES / AUTO-COMPLÉTION CP
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

  // GESTION DU DÉTECTEUR DU CODE POSTAL AUTOMATIQUE (API COMMUNE FRANCE)
  if (cpInput) {
    cpInput.addEventListener("input", (e) => {
      const code = e.target.value.trim();
      
      // Mise à jour automatique du département
      if (code.length >= 2) {
        const deptNum = code.substring(0, 2);
        deptInput.value = `FR-${deptNum}`;
      } else {
        deptInput.value = "";
      }

      // Recherche des villes si 5 chiffres
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

  // GESTION MULTI-TÉLÉPHONES
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

  // Rendu liste documents
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

  // Ouvrir la modale (Création Vierge ou Édition)
  function openModal(index = -1, defaultType = "Client") {
    if (!modal) return;

    document.getElementById("edit-client-index").value = index;
    const badgeEl = document.getElementById("modal-status-badge");

    if (index === -1) {
      // FICHE VIERGE
      document.getElementById("modal-societe-title").textContent = `Fiche Vierge — Nouveau ${defaultType}`;
      badgeEl.textContent = "Nouveau";
      badgeEl.className = defaultType === "Client" ? "badge badge-client" : "badge badge-prospect";

      document.getElementById("edit-societe").value = "";
      document.getElementById("edit-contact").value = "";
      document.getElementById("edit-type").value = defaultType;
      document.getElementById("edit-agent").value = "Jérôme";
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
    } else {
      // ÉDITION FICHE EXISTANTE
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
    }

    renderExtraPhones();
    renderDocumentsList();
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
    clientEditForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const index = parseInt(document.getElementById("edit-client-index").value, 10);

      const clientData = {
        societe: document.getElementById("edit-societe").value.trim(),
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
        documents: tempDocuments
      };

      if (index === -1) {
        clientsDatabase.unshift(clientData);
      } else if (clientsDatabase[index]) {
        clientsDatabase[index] = clientData;
      }

      localStorage.setItem("clientsDatabaseCustom", JSON.stringify(clientsDatabase));

      updateKPIs();
      populateFilterDropdowns();
      renderTable();

      modal.style.display = "none";
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
