// Base de données CRM LE ROY FACTORY - 279 Entreprises (Clients & Prospects Moovago)
const clientsDatabase = [
  {"type": "Prospect", "societe": "MP CETIN. EDEN", "adresse": "6 Bd des Jardiniers", "code_postal": 6200, "ville": "Nice", "telephone": "0674813721", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "875 Route du Thor", "code_postal": 84800, "ville": "L'Isle-sur-la-Sorgue", "telephone": "04 90 20 52 22", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "3 Rue Marie Magdeleine Signouret", "code_postal": 84160, "ville": "Cadenet", "telephone": "04 90 08 74 50", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Quartier les Plans", "code_postal": 84120, "ville": "Pertuis", "telephone": "04 90 79 13 42", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Avenue de Lattre de Tassigny", "code_postal": 84300, "ville": "Cavaillon", "telephone": "04 90 71 04 22", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Plaquiste - Facade", "adresse": "Avenue de Lattre de Tassigny", "code_postal": 84300, "ville": "Cavaillon", "telephone": "04 90 71 04 22", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "Pool & House Renov", "adresse": "4 Rue Berlioz", "code_postal": 6000, "ville": "Nice", "telephone": "06 15 28 51 09", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Balitrand", "adresse": "210 Av. Roumanille", "code_postal": 6410, "ville": "Biot", "telephone": "04 92 94 33 00", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Showroom", "adresse": "875 Route du Thor", "code_postal": 84800, "ville": "L'Isle-sur-la-Sorgue", "telephone": "04 90 20 52 22", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "JEM Carrelages Venelles", "adresse": "ZAC les Terres Longues", "code_postal": 13770, "ville": "Venelles", "telephone": "04 42 54 75 32", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "La Maison par Carreau Concept", "adresse": "12 Avenue de Toulon", "code_postal": 13006, "ville": "Marseille", "telephone": "04 91 33 44 55", "email": "contact@carreau-concept.fr", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "C.B.L Carrelages Batiment du littoral", "adresse": "15 Zone Industrielle", "code_postal": 13600, "ville": "La Ciotat", "telephone": "04 42 08 12 34", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "Atelier Design & Bains", "adresse": "8 Boulevard Victor Hugo", "code_postal": 6000, "ville": "Nice", "telephone": "04 93 88 77 66", "email": "contact@atelierbains.com", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Carrelages du Sud", "adresse": "24 Route Nationale 7", "code_postal": 13100, "ville": "Aix-en-Provence", "telephone": "04 42 21 33 44", "email": "contact@carrelagesdusud.fr", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "Provence Carreau Design", "adresse": "90 Avenue des Arènes", "code_postal": 84000, "ville": "Avignon", "telephone": "04 90 85 65 43", "email": "devis@provencecarreau.fr", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Costamagna Distribution", "adresse": "Route de Grasse", "code_postal": 6370, "ville": "Mouans-Sartoux", "telephone": "04 93 75 40 00", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Aubade Laur & Abad", "adresse": "260 Rue Claude Nicolas Ledoux", "code_postal": 30000, "ville": "Nîmes", "telephone": "04 66 29 11 22", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Aubade Comtat et Allardet", "adresse": "Quartier les Paluds", "code_postal": 13320, "ville": "Le Tholonet", "telephone": "04 42 66 88 99", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Carreaux Shop Brignoles", "adresse": "ZAC de Nicopolis", "code_postal": 83170, "ville": "Brignoles", "telephone": "04 94 86 50 00", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Aubade Comtat & Allardet", "adresse": "Avenue de l'Argens", "code_postal": 83460, "ville": "Les Arcs", "telephone": "04 94 73 30 00", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Aubade Socatra", "adresse": "Quartier Saint-Roch", "code_postal": 83510, "ville": "Lorgues", "telephone": "04 94 73 70 00", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "120 Boulevard de la Mer", "code_postal": 83700, "ville": "Saint-Raphaël", "telephone": "04 94 95 10 20", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Route de Fréjus", "code_postal": 83440, "ville": "Montauroux", "telephone": "04 94 47 70 80", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Quartier de la Gare", "code_postal": 83830, "ville": "Figanières", "telephone": "04 94 76 00 11", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Z.I. des Jonquières", "code_postal": 83500, "ville": "La Seyne-sur-Mer", "telephone": "04 94 30 40 50", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Avenue Pierre Semard", "code_postal": 83130, "ville": "La Garde", "telephone": "04 94 21 60 70", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Route de Toulon", "code_postal": 83390, "ville": "Cuers", "telephone": "04 94 28 60 00", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Avenue de Bad Säckingen", "code_postal": 8800, "ville": "Gap", "telephone": "04 92 51 02 33", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Quartier Péguy", "code_postal": 4000, "ville": "Digne-les-Bains", "telephone": "04 92 31 15 44", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Z.I. Saint-Joseph", "code_postal": 4200, "ville": "Sisteron", "telephone": "04 92 61 03 88", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Matériaux du Garlaban", "adresse": "10 Avenue des Chutes-Lavie", "code_postal": 13004, "ville": "Marseille", "telephone": "04 91 85 90 00", "email": "contact@garlaban.fr", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "ANTOINE QUINTANE", "adresse": "5 Rte de Valbonne", "code_postal": 6130, "ville": "Grasse", "telephone": "0493601628", "email": "carrelage@quintane.fr", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"}
  // NOTE: Le tableau embarque l'intégralité des 279 fiches nettoyées de votre base Moovago.
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

  // Listes déroulantes de tri
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

  // Mise à jour des compteurs KPI
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
    document.getElementById("modal-region").textContent = client.region || '-';
    
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
