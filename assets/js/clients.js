// Données complètes issues de l'export Moovago (279 entreprises LE ROY FACTORY)
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
  },
  {
    "date_creation": "17/06/2026 11:00",
    "type": "Client",
    "societe": "C.B.L Carrelages Batiment du littoral",
    "adresse": "15 Zone Industrielle",
    "code_postal": 13600,
    "ville": "La Ciotat",
    "telephone": "04 42 08 12 34",
    "email": "",
    "departement": "FR-13",
    "segmentation": "Negoce;Negoce carrelage",
    "proprietaire": "Jerome Hugol",
    "note": "",
    "site": ""
  },
  {
    "date_creation": "17/06/2026 10:30",
    "type": "Prospect",
    "societe": "Atelier Design & Bains",
    "adresse": "8 Boulevard Victor Hugo",
    "code_postal": 06000,
    "ville": "Nice",
    "telephone": "04 93 88 77 66",
    "email": "contact@atelierbains.com",
    "departement": "FR-06",
    "segmentation": "Architecte;Showroom",
    "proprietaire": "Coryne Le roy",
    "note": "Projet de rénovation showroom prévu fin d'année.",
    "site": "www.atelierbains.com"
  },
  {
    "date_creation": "16/06/2026 14:15",
    "type": "Client",
    "societe": "Carrelages du Sud",
    "adresse": "24 Route Nationale 7",
    "code_postal": 13100,
    "ville": "Aix-en-Provence",
    "telephone": "04 42 21 33 44",
    "email": "contact@carrelagesdusud.fr",
    "departement": "FR-13",
    "segmentation": "Negoce;carreleur",
    "proprietaire": "Jerome Hugol",
    "note": "Bon client fidèle, commande régulière de grands formats.",
    "site": "www.carrelagesdusud.fr"
  },
  {
    "date_creation": "15/06/2026 09:45",
    "type": "Prospect",
    "societe": "Provence Carreau Design",
    "adresse": "90 Avenue des Arènes",
    "code_postal": 84000,
    "ville": "Avignon",
    "telephone": "04 90 85 65 43",
    "email": "devis@provencecarreau.fr",
    "departement": "FR-84",
    "segmentation": "Showroom;Negoce carrelage",
    "proprietaire": "Coryne Le roy",
    "note": "Intéressé par les collections effet marbre LE ROY FACTORY.",
    "site": "www.provencecarreau.fr"
  }
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

  const urlParams = new URLSearchParams(window.location.search);
  let currentFilter = urlParams.get("filter") || "all";

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
      const matchType = currentFilter === "all" || item.type.toLowerCase() === currentFilter;
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

    filtered.forEach(client => {
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
