import { db } from "./firebase.js";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Vérification de la session agent
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  const agentName = localStorage.getItem("agentName") || "Agent";
  const firstName = agentName.split(" ")[0];
  const greetingEl = document.getElementById("user-greeting");
  if (greetingEl) {
    greetingEl.textContent = `Gestion du portefeuille de ${firstName} — LE ROY FACTORY`;
  }

  // Éléments du DOM
  const tableBody = document.getElementById("clients-table-body");
  const searchInput = document.getElementById("search-input");
  const modal = document.getElementById("client-modal");
  const btnAddClient = document.getElementById("btn-add-client");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  const clientEditForm = document.getElementById("client-edit-form");

  let clientsCache = [];

  // Fonction pour charger et afficher les clients depuis Firebase
  async function loadClients() {
    try {
      const querySnapshot = await getDocs(collection(db, "clients"));
      clientsCache = [];
      querySnapshot.forEach((docSnap) => {
        clientsCache.push({ id: docSnap.id, ...docSnap.data() });
      });

      renderTable(clientsCache);
      updateStats(clientsCache);

      // --- INTEGRATION : OUVERTURE AUTO DEPUIS LA CARTE ---
      handleUrlEditParam();

    } catch (error) {
      console.error("Erreur lors du chargement des clients :", error);
    }
  }

  // Rendu du tableau
  function renderTable(data) {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (data.length === 0) {
      document.getElementById("no-results").style.display = "block";
      return;
    } else {
      document.getElementById("no-results").style.display = "none";
    }

    data.forEach((client) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-id", client.id); // Indispensable pour retrouver la ligne

      const badgeColor = (client.type || "").toLowerCase() === "client" ? "#047857" : "#D4AF37";

      tr.innerHTML = `
        <td><strong>${client.societe || ""}</strong><br><small style="color:#666;">${client.contact || ""}</small></td>
        <td><span class="badge" style="background:${badgeColor}; color:#fff; padding:2px 8px; border-radius:4px; font-size:0.75rem;">${client.type || "Prospect"}</span></td>
        <td>${client.adresse || ""}</td>
        <td>${client.codePostal || client.code_postal || ""} ${client.ville || ""}</td>
        <td>${client.departement || ""}</td>
        <td><a href="tel:${client.telephone || ""}" style="color:#111; font-weight:600;">${client.telephone || ""}</a></td>
      `;

      // Clic sur une ligne pour ouvrir la modification
      tr.style.cursor = "pointer";
      tr.addEventListener("click", () => {
        openEditModal(client);
      });

      tableBody.appendChild(tr);
    });
  }

  // Mise à jour des compteurs statistiques
  function updateStats(data) {
    const total = data.length;
    const clientsActifs = data.filter(c => (c.type || "").toLowerCase() === "client").length;
    const prospects = data.filter(c => (c.type || "").toLowerCase() === "prospect").length;

    if (document.getElementById("count-total")) document.getElementById("count-total").textContent = total;
    if (document.getElementById("count-clients")) document.getElementById("count-clients").textContent = clientsActifs;
    if (document.getElementById("count-prospects")) document.getElementById("count-prospects").textContent = prospects;
  }

  // Ouvrir la modale d'édition pour un client donné
  window.openEditModal = function(client) {
    document.getElementById("edit-client-index").value = client.id;
    document.getElementById("modal-societe-title").textContent = client.societe;
    document.getElementById("edit-societe").value = client.societe || "";
    document.getElementById("edit-contact").value = client.contact || "";
    document.getElementById("edit-type").value = client.type || "Client";
    document.getElementById("edit-agent").value = client.agent || firstName;
    document.getElementById("edit-telephone").value = client.telephone || "";
    document.getElementById("edit-email").value = client.email || "";
    document.getElementById("edit-adresse").value = client.adresse || "";
    document.getElementById("edit-code-postal").value = client.codePostal || client.code_postal || "";
    document.getElementById("edit-departement").value = client.departement || "";
    
    // Affichage de la modale
    if (modal) modal.style.display = "flex";
  };

  // --- FONCTION DE GESTION DU PARAMÈTRE URL ?edit=ID ---
  function handleUrlEditParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const editClientId = urlParams.get('edit');

    if (editClientId) {
      // Recherche du client correspondant dans le cache chargé depuis Firebase
      const targetClient = clientsCache.find(c => c.id === editClientId);
      if (targetClient) {
        openEditModal(targetClient);
      } else {
        // Fallback : tentative de récupération directe du document Firebase si non trouvé dans le cache global
        getDoc(doc(db, "clients", editClientId)).then((docSnap) => {
          if (docSnap.exists()) {
            openEditModal({ id: docSnap.id, ...docSnap.data() });
          }
        }).catch(err => console.error("Erreur récupération client direct :", err));
      }
    }
  }

  // Fermeture modale
  modalCloseBtn?.addEventListener("click", () => { modal.style.display = "none"; });
  btnCancelEdit?.addEventListener("click", () => { modal.style.display = "none"; });

  // Soumission du formulaire d'édition / création
  clientEditForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const docId = document.getElementById("edit-client-index").value;

    const updatedData = {
      societe: document.getElementById("edit-societe").value,
      contact: document.getElementById("edit-contact").value,
      type: document.getElementById("edit-type").value,
      agent: document.getElementById("edit-agent").value,
      telephone: document.getElementById("edit-telephone").value,
      email: document.getElementById("edit-email").value,
      adresse: document.getElementById("edit-adresse").value,
      codePostal: document.getElementById("edit-code-postal").value,
      ville: document.getElementById("edit-ville") ? document.getElementById("edit-ville").value : "",
      departement: document.getElementById("edit-departement").value
    };

    try {
      if (docId && docId !== "-1") {
        // Mise à jour
        await updateDoc(doc(db, "clients", docId), updatedData);
        alert("✅ Fiche mise à jour avec succès !");
      } else {
        // Création nouveau
        await addDoc(collection(db, "clients"), updatedData);
        alert("✅ Nouveau client enregistré avec succès !");
      }
      modal.style.display = "none";
      loadClients();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement :", error);
      alert("Erreur lors de l'enregistrement de la fiche.");
    }
  });

  // Recherche dynamique
  searchInput?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = clientsCache.filter(c => 
      (c.societe && c.societe.toLowerCase().includes(term)) ||
      (c.ville && c.ville.toLowerCase().includes(term)) ||
      (c.telephone && c.telephone.includes(term))
    );
    renderTable(filtered);
  });

  // Lancement du chargement initial
  loadClients();
});
