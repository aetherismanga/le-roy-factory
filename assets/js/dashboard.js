document.addEventListener("DOMContentLoaded", () => {
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

  // Interaction sur les boutons d'actions rapides
  const actionBtns = document.querySelectorAll(".action-btn");
  const toast = document.getElementById("action-toast");

  actionBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const actionName = btn.getAttribute("data-action");

      // Redirection intelligente si clic sur Nouveau client ou Nouveau prospect
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
