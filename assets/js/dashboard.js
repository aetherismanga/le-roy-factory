document.addEventListener("DOMContentLoaded", () => {
  // Vérification de la session agent
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  // Récupération du nom de l'agent connecté
  const agentName = localStorage.getItem("agentName") || "Agent";
  const firstName = agentName.split(" ")[0];

  const userGreeting = document.getElementById("user-greeting");
  const welcomeTitle = document.getElementById("welcome-title");
  
  if (userGreeting) {
    userGreeting.textContent = `Bonjour ${firstName} 👋 — Espace Commercial Sécurisé`;
  }
  if (welcomeTitle) {
    welcomeTitle.textContent = `Tableau de bord de ${agentName}`;
  }

  // Mise à jour en temps réel de la date et de l'heure
  const dateElement = document.getElementById("current-date");
  const timeElement = document.getElementById("current-time");

  function updateDateTime() {
    const now = new Date();
    if (dateElement) {
      let dateFormatted = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      dateElement.textContent = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
    }
    if (timeElement) {
      timeElement.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
  }
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Gestion de la déconnexion
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("agentLoggedIn");
      localStorage.removeItem("agentName");
      localStorage.removeItem("agentEmail");
      window.location.href = "agent.html";
    });
  }

  // Interaction et navigation des cartes du tableau de bord
  const cards = document.querySelectorAll(".dash-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll('.dash-card.is-selected').forEach(c => c.classList.remove('is-selected'));
      card.classList.add('is-selected');

      const moduleName = card.getAttribute("data-module");
      
      // Redirection vers le module Clients & Prospects
      if (moduleName === "clients" || moduleName === "prospects") {
        setTimeout(() => {
          window.location.href = "clients.html";
        }, 150);
      } else {
        console.log(`Module ${moduleName} en cours de développement...`);
      }
    });
  });
});
