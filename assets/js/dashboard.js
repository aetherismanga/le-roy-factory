import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Vérification de connexion
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  // Prénom de l'agent
  const agentName = localStorage.getItem("agentName") || "Jérôme";
  const firstName = agentName.split(" ")[0];
  const welcomeTitle = document.getElementById("welcome-title");
  if (welcomeTitle) {
    welcomeTitle.textContent = `Bonjour ${firstName} 👋`;
  }

  // Date dynamique complète
  const dateEl = document.getElementById("current-date");
  if (dateEl) {
    const now = new Date();
    let formattedDate = now.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    dateEl.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  // Horloge digitale mise à jour toutes les secondes
  function updateDigitalClock() {
    const clockEl = document.getElementById("digital-clock");
    if (clockEl) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      clockEl.textContent = `${hours}:${minutes}:${seconds}`;
    }
  }
  updateDigitalClock();
  setInterval(updateDigitalClock, 1000);

  // Gestion du bouton de déconnexion
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("agentLoggedIn");
      localStorage.removeItem("agentName");
      localStorage.removeItem("agentEmail");
      window.location.href = "agent.html";
    });
  }

  // CHARGEMENT DES STATISTIQUES EN DIRECT DEPUIS FIREBASE FIRESTORE
  try {
    const querySnapshot = await getDocs(collection(db, "clients"));
    let totalCount = 0;
    let clientsCount = 0;
    let prospectsCount = 0;

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      totalCount++;
      const type = (data.type || "").toLowerCase();
      if (type === "client") {
        clientsCount++;
      } else if (type === "prospect") {
        prospectsCount++;
      }
    });

    // Injection dynamique dans les cartes du Dashboard
    // (Assure-toi que tes éléments HTML ont bien ces ID ou adapte-les)
    const countTotalEl = document.getElementById("count-total") || document.getElementById("dash-total-clients");
    const countClientsEl = document.getElementById("count-clients") || document.getElementById("dash-clients-actifs");
    const countProspectsEl = document.getElementById("count-prospects") || document.getElementById("dash-prospects");

    if (countTotalEl) countTotalEl.textContent = totalCount;
    if (countClientsEl) countClientsEl.textContent = clientsCount;
    if (countProspectsEl) countProspectsEl.textContent = prospectsCount;

  } catch (error) {
    console.error("Erreur lors de la récupération des chiffres Firebase sur le dashboard :", error);
  }

  // Interaction sur les boutons d'actions rapides
  const actionBtns = document.querySelectorAll(".action-btn");
  const toast = document.getElementById("action-toast");

  actionBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const actionName = btn.getAttribute("data-action");

      // Redirection et ouverture automatique de la fiche vierge
      if (actionName === "Nouveau client") {
        window.location.href = "clients.html?action=new-client";
        return;
      }
      if (actionName === "Nouveau prospect") {
        window.location.href = "clients.html?action=new-prospect";
        return;
      }

      // Autres actions
      if (toast) {
        toast.textContent = `Module « ${actionName} » — Bientôt disponible 🚀`;
        toast.classList.add("show");
        setTimeout(() => {
          toast.classList.remove("show");
        }, 3000);
      }
    });
  });
});
