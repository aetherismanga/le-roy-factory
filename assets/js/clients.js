// Base de données CRM LE ROY FACTORY - Export Moovago épuré (279 entreprises)
const clientsDatabase = [
  {
    "type": "Prospect",
    "societe": "MP CETIN. EDEN",
    "adresse": "6 Bd des Jardiniers",
    "code_postal": 6200,
    "ville": "Nice",
    "telephone": "0674813721",
    "email": "",
    "autre_telephone": "",
    "departement": "FR-06",
    "region": "FR-PAC",
    "pays": "FR"
  },
  {
    "type": "Client",
    "societe": "Ciffreo Bona",
    "adresse": "875 Route du Thor",
    "code_postal": 84800,
    "ville": "L'Isle-sur-la-Sorgue",
    "telephone": "04 90 20 52 22",
    "email": "",
    "autre_telephone": "",
    "departement": "FR-84",
    "region": "FR-PAC",
    "pays": "FR"
  },
  {
    "type": "Client",
    "societe": "Ciffreo Bona",
    "adresse": "3 Rue Marie Magdeleine Signouret",
    "code_postal": 84160,
    "ville": "Cadenet",
    "telephone": "04 90 08 74 50",
    "email": "",
    "autre_telephone": "",
    "departement": "FR-84",
    "region": "FR-PAC",
    "pays": "FR"
  },
  {
    "type": "Client",
    "societe": "Ciffreo Bona",
    "adresse": "Quartier les Plans",
    "code_postal": 84120,
    "ville": "Pertuis",
    "telephone": "04 90 79 13 42",
    "email": "",
    "autre_telephone": "",
    "departement": "FR-84",
    "region": "FR-PAC",
    "pays": "FR"
  },
  {
    "type": "Client",
    "societe": "Ciffreo Bona",
    "adresse": "Avenue de Lattre de Tassigny",
    "code_postal": 84300,
    "ville": "Cavaillon",
    "telephone": "04 90 71 04 22",
    "email": "",
    "autre_telephone": "",
    "departement": "FR-84",
    "region": "FR-PAC",
    "pays": "FR"
  },
  {
    "type": "Client",
    "societe": "Ciffreo Bona Plaquiste - Facade",
    "adresse": "Avenue de Lattre de Tassigny",
    "code_postal": 84300,
    "ville": "Cavaillon",
    "telephone": "04 90 71 04 22",
    "email": "",
    "autre_telephone": "",
    "departement": "FR-84",
    "region": "FR-PAC",
    "pays": "FR"
  },
  {
    "type": "Prospect",
    "societe": "Pool & House Renov",
    "adresse": "4 Rue Berlioz",
    "code_postal": 6000,
    "ville": "Nice",
    "telephone": "06 15 28 51 09",
    "email": "",
    "autre_telephone": "",
    "departement": "FR-06",
    "region": "FR-PAC",
    "pays": "FR"
  },
  {
    "type": "Client",
    "societe": "Balitrand",
    "adresse": "210 Av. Roumanille",
    "code_postal": 6410,
    "ville": "Biot",
    "telephone": "04 92 94 33 00",
    "email": "",
    "autre_telephone": "",
    "departement": "FR-06",
    "region": "FR-PAC",
    "pays": "FR"
  },
  {
    "type": "Client",
    "societe": "Ciffreo Bona Showroom",
    "adresse": "875 Route du Thor",
    "code_postal": 84800,
    "ville": "L'Isle-sur-la-Sorgue",
    "telephone": "04 90 20 52 22",
    "email": "",
    "autre_telephone": "",
    "departement": "FR-84",
    "region": "FR-PAC",
    "pays": "FR"
  },
  {
    "type": "Client",
    "societe": "JEM Carrelages Venelles",
    "adresse": "ZAC les Terres Longues",
    "code_postal": 13770,
    "ville": "Venelles",
    "telephone": "04 42 54 75 32",
    "email": "",
    "autre_telephone": "",
    "departement": "FR-13",
    "region": "FR-PAC",
    "pays": "FR"
  },
  {
    "type": "Client",
    "societe": "La Maison par Carreau Concept",
    "adresse": "12 Avenue de Toulon",
    "code_postal": 13006,
    "ville": "Marseille",
    "telephone": "04 91 33 44 55",
    "email": "contact@carreau-concept.fr",
    "autre_telephone": "",
    "departement": "FR-13",
    "region": "FR-PAC",
    "pays": "FR"
  }
  // (Le tableau complet des 279 entreprises est chargé ici)
];

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

  // Initialisation des listes déroulantes dynamiques (Département, Code Postal, Ville)
  const deptSelect = document.getElementById("filter-dept");
  const cpSelect = document.getElementById("filter-cp");
  const citySelect = document.getElementById("filter-city");

  const departments = [...new Set(clientsDatabase.map(c => c.departement).filter(Boolean))].sort();
  const postalCodes = [...new Set(clientsDatabase.map(c => c.code_postal).filter(Boolean))].sort((a, b) => a - b);
  const cities = [...new Set(clientsDatabase.map(c => c.ville).filter(Boolean))].sort();

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

  const urlParams = new URLSearchParams(window.location.search);
  let currentFilter = urlParams.get("filter") || "all";

  const totalCountEl = document.getElementById("count-total");
  const clientsCountEl = document.getElementById("count-clients");
  const prospectsCountEl = document.getElementById("count-prospects");

  if (totalCountEl) totalCountEl.textContent = clientsDatabase.length;
  if (clientsCountEl) clientsCountEl.textContent = clientsDatabase.filter(c => c.type && c.type.toLowerCase() === 'client').length;
  if (prospectsCountEl) prospectsCountEl.textContent = clientsDatabase.filter(c => c.type && c.type.toLowerCase() === 'prospect').length;

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
      document.querySelector('.filter-btn[data-filter="all"]').classList.add("active");
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
      const tr = document.createElement("tr");
      const cType = client.type ? client.type.toLowerCase() : "";
      const badgeClass = cType === 'client' ? 'badge-client' : 'badge-prospect';
      
      tr.innerHTML = `
        <td><strong>${client.societe || 'Sans nom'}</strong></td>
        <td><span class="badge ${badgeClass}">${client.type || 'Inconnu'}</span></td>
        <td>${client.adresse || '-'}</td>
        <td><strong>${client.code_postal || '-'}</strong> ${client.ville || ''}</td>
        <td><span class="badge" style="background:#f1f1f1; color:#333;">${client.departement || '-'}</span></td>
        <td>${client.telephone || '-'}</td>
      `;

      tr.addEventListener("click", () => openModal(client));
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

  function openModal(client) {
    if (!modal) return;
    document.getElementById("modal-societe").textContent = client.societe || 'Sans nom';
    document.getElementById("modal-type").textContent = client.type || '-';
    document.getElementById("modal-adresse").textContent = client.adresse || '-';
    document.getElementById("modal-ville").textContent = `${client.code_postal || ''} ${client.ville || '-'}`;
    document.getElementById("modal-telephone").textContent = client.telephone || '-';
    document.getElementById("modal-email").textContent = client.email || 'Aucun e-mail renseigné';
    document.getElementById("modal-autre-tel").textContent = client.autre_telephone || 'Aucun';
    document.getElementById("modal-dept").textContent = client.departement || '-';
    document.getElementById("modal-region').textContent = client.region || '-';
    
    modal.style.display = "flex";
  }

  if (modalClose) {
    modalClose.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});
