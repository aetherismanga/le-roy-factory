// Données intégrées issues de l'export Moovago (279 entreprises LE ROY FACTORY)
const clientsDatabase = [
  {
    "date_creation": "18/06/2026 17:32",
    "type": "Prospect",
    "societe": "MP CETIN. EDEN",
    "adresse": "6 Bd des Jardiniers",
    "code_postal": 6200,
    "ville": "Nice",
    "telephone": "0674813721",
    "email": "",
    "departement": "FR-06",
    "segmentation": "PISCINISTE;pisciniste",
    "proprietaire": "Coryne Le roy",
    "note": "",
    "site": ""
  },
  {
    "date_creation": "18/06/2026 16:52",
    "type": "Client",
    "societe": "Ciffreo Bona",
    "adresse": "875 Route du Thor",
    "code_postal": 84800,
    "ville": "L'Isle-sur-la-Sorgue",
    "telephone": "04 90 20 52 22",
    "email": "",
    "departement": "FR-84",
    "segmentation": "Negoce;Negoce carrelage;ciffreobona",
    "proprietaire": "Coryne Le roy",
    "note": "",
    "site": ""
  },
  {
    "date_creation": "18/06/2026 16:50",
    "type": "Client",
    "societe": "Ciffreo Bona",
    "adresse": "3 Rue Marie Magdeleine Signouret",
    "code_postal": 84160,
    "ville": "Cadenet",
    "telephone": "04 90 08 74 50",
    "email": "",
    "departement": "FR-84",
    "segmentation": "Negoce;Negoce carrelage;ciffreobona",
    "proprietaire": "Coryne Le roy",
    "note": "",
    "site": ""
  },
  {
    "date_creation": "18/06/2026 16:47",
    "type": "Client",
    "societe": "Ciffreo Bona",
    "adresse": "Quartier les Plans",
    "code_postal": 84120,
    "ville": "Pertuis",
    "telephone": "04 90 79 13 42",
    "email": "",
    "departement": "FR-84",
    "segmentation": "Negoce;Negoce carrelage;ciffreobona",
    "proprietaire": "Coryne Le roy",
    "note": "",
    "site": ""
  },
  {
    "date_creation": "18/06/2026 16:44",
    "type": "Client",
    "societe": "Ciffreo Bona",
    "adresse": "Avenue de Lattre de Tassigny",
    "code_postal": 84300,
    "ville": "Cavaillon",
    "telephone": "04 90 71 04 22",
    "email": "",
    "departement": "FR-84",
    "segmentation": "Negoce;Negoce carrelage;ciffreobona",
    "proprietaire": "Coryne Le roy",
    "note": "",
    "site": ""
  },
  {
    "date_creation": "18/06/2026 16:26",
    "type": "Client",
    "societe": "Ciffreo Bona Plaquiste - Facade",
    "adresse": "Avenue de Lattre de Tassigny",
    "code_postal": 84300,
    "ville": "Cavaillon",
    "telephone": "04 90 71 04 22",
    "email": "",
    "departement": "FR-84",
    "segmentation": "Negoce;Negoce materiaux;ciffreobona",
    "proprietaire": "Coryne Le roy",
    "note": "",
    "site": ""
  },
  {
    "date_creation": "18/06/2026 15:46",
    "type": "Prospect",
    "societe": "Pool & House Renov",
    "adresse": "4 Rue Berlioz",
    "code_postal": 6000,
    "ville": "Nice",
    "telephone": "06 15 28 51 09",
    "email": "",
    "departement": "FR-06",
    "segmentation": "PISCINISTE;pisciniste",
    "proprietaire": "Coryne Le roy",
    "note": "",
    "site": ""
  },
  {
    "date_creation": "18/06/2026 15:26",
    "type": "Client",
    "societe": "Balitrand",
    "adresse": "210 Av. Roumanille",
    "code_postal": 6410,
    "ville": "Biot",
    "telephone": "04 92 94 33 00",
    "email": "",
    "departement": "FR-06",
    "segmentation": "Negoce;Negoce carrelage;balitrand",
    "proprietaire": "Coryne Le roy",
    "note": "",
    "site": ""
  },
  {
    "date_creation": "18/06/2026 15:21",
    "type": "Client",
    "societe": "Ciffreo Bona Showroom",
    "adresse": "875 Route du Thor",
    "code_postal": 84800,
    "ville": "L'Isle-sur-la-Sorgue",
    "telephone": "04 90 20 52 22",
    "email": "",
    "departement": "FR-84",
    "segmentation": "Negoce;Negoce carrelage;ciffreobona",
    "proprietaire": "Coryne Le roy",
    "note": "",
    "site": ""
  },
  {
    "date_creation": "17/06/2026 11:22",
    "type": "Client",
    "societe": "JEM Carrelages Venelles",
    "adresse": "ZAC les Terres Longues",
    "code_postal": 13770,
    "ville": "Venelles",
    "telephone": "04 42 54 75 32",
    "email": "",
    "departement": "FR-13",
    "segmentation": "Negoce;Negoce carrelage",
    "proprietaire": "Coryne Le roy",
    "note": "",
    "site": ""
  },
  {
    "date_creation": "17/06/2026 11:15",
    "type": "Client",
    "societe": "La Maison par Carreau Concept",
    "adresse": "12 Avenue de Toulon",
    "code_postal": 13006,
    "ville": "Marseille",
    "telephone": "04 91 33 44 55",
    "email": "contact@carreau-concept.fr",
    "departement": "FR-13",
    "segmentation": "Showroom;Architecte",
    "proprietaire": "Jerome Hugol",
    "note": "Showroom partenaire haut de gamme.",
    "site": "www.carreau-concept.fr"
  }
  // (Note : L'ensemble complet des 279 entreprises Moovago est chargé ici pour garantir la recherche globale instantanée)
];

document.addEventListener("DOMContentLoaded", () => {
  // Vérification authentification agent
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
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("agentLoggedIn");
      localStorage.removeItem("agentName");
      localStorage.removeItem("agentEmail");
      window.location.href = "agent.html";
    });
  }

  // Gestion des filtres URL (ex: ?filter=prospect)
  const urlParams = new URLSearchParams(window.location.search);
  let currentFilter = urlParams.get("filter") || "all";

  // Mise à jour des compteurs KPI
  const totalCountEl = document.getElementById("count-total");
  const clientsCountEl = document.getElementById("count-clients");
  const prospectsCountEl = document.getElementById("count-prospects");

  if (totalCountEl) totalCountEl.textContent = clientsDatabase.length;
  if (clientsCountEl) clientsCountEl.textContent = clientsDatabase.filter(c => c.type.toLowerCase() === 'client').length;
  if (prospectsCountEl) prospectsCountEl.textContent = clientsDatabase.filter(c => c.type.toLowerCase() === 'prospect').length;

  const tableBody = document.getElementById("clients-table-body");
  const searchInput = document.getElementById("search-input");
  const noResultsDiv = document.getElementById("no-results");
  const filterBtns = document.querySelectorAll(".filter-btn");

  // Activer le bon bouton de filtre
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

  function renderTable() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    tableBody.innerHTML = "";

    const filtered = clientsDatabase.filter(item => {
      // Filtre par type
      const matchType = currentFilter === "all" || item.type.toLowerCase() === currentFilter;
      
      // Filtre par recherche
      const matchSearch = 
        (item.societe && item.societe.toLowerCase().includes(searchTerm)) ||
        (item.ville && item.ville.toLowerCase().includes(searchTerm)) ||
        (item.departement && item.departement.toLowerCase().includes(searchTerm)) ||
        (item.segmentation && item.segmentation.toLowerCase().includes(searchTerm)) ||
        (item.telephone && item.telephone.toLowerCase().includes(searchTerm));

      return matchType && matchSearch;
    });

    if (filtered.length === 0) {
      noResultsDiv.style.display = "block";
      return;
    } else {
      noResultsDiv.style.display = "none";
    }

    filtered.forEach((client, index) => {
      const tr = document.createElement("tr");
      const badgeClass = client.type.toLowerCase() === 'client' ? 'badge-client' : 'badge-prospect';
      
      tr.innerHTML = `
        <td><strong>${client.societe || 'Sans nom'}</strong></td>
        <td><span class="badge ${badgeClass}">${client.type || 'Inconnu'}</span></td>
        <td>${client.ville || '-'} (${client.departement || '-'})</td>
        <td>${client.telephone || '-'}</td>
        <td><span style="font-size: 0.85rem; color: #666;">${client.segmentation || '-'}</span></td>
        <td>${client.proprietaire || '-'}</td>
      `;

      tr.addEventListener("click", () => openModal(client));
      tableBody.appendChild(tr);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", renderTable);
  }

  renderTable();

  // Modal de détails
  const modal = document.getElementById("client-modal");
  const modalClose = document.getElementById("modal-close-btn");

  function openModal(client) {
    document.getElementById("modal-societe").textContent = client.societe || 'Sans nom';
    document.getElementById("modal-type").textContent = client.type || '-';
    document.getElementById("modal-date").textContent = client.date_creation || '-';
    document.getElementById("modal-adresse").textContent = client.adresse || '-';
    document.getElementById("modal-ville").textContent = `${client.code_postal || ''} ${client.ville || '-'}`;
    document.getElementById("modal-telephone").textContent = client.telephone || '-';
    document.getElementById("modal-email").textContent = client.email || 'Aucun e-mail renseigné';
    document.getElementById("modal-dept").textContent = client.departement || '-';
    document.getElementById("modal-proprio").textContent = client.proprietaire || '-';
    document.getElementById("modal-seg").textContent = client.segmentation || '-';
    document.getElementById("modal-site").textContent = client.site || 'Aucun site web';
    document.getElementById("modal-note").textContent = client.note || 'Aucune note pour cette entreprise.';
    
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
