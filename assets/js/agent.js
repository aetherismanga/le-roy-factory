// Structure claire et évolutive pour l'ajout futur d'autres agents commerciaux
const agentsDatabase = [
  {
    name: "Jérôme Hugol",
    email: "agenceleroyfactory@gmail.com",
    password: "0000"
  },
  {
    name: "Coryne Le Roy",
    email: "coryneleroyfactory@gmail.com",
    password: "0000"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorNotification = document.getElementById("error-notification");

  // Gestion de la connexion sur agent.html
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const emailVal = emailInput.value.trim().toLowerCase();
      const passwordVal = passwordInput.value;

      const agent = agentsDatabase.find(
        a => a.email.toLowerCase() === emailVal && a.password === passwordVal
      );

      if (agent) {
        localStorage.setItem("agentLoggedIn", "true");
        localStorage.setItem("agentName", agent.name);
        localStorage.setItem("agentEmail", agent.email);

        // Transition douce vers le tableau de bord
        window.location.href = "dashboard.html";
      } else {
        if (errorNotification) {
          errorNotification.textContent = "Adresse e-mail ou mot de passe incorrect.";
          errorNotification.style.display = "block";
        }
      }
    });
  }

  // Sécurité et initialisation du tableau de bord dashboard.html
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (window.location.pathname.includes("dashboard.html")) {
    if (!isLoggedIn) {
      window.location.href = "agent.html";
      return;
    }

    const agentName = localStorage.getItem("agentName") || "Agent";
    const firstName = agentName.split(" ")[0];

    const userGreeting = document.getElementById("user-greeting");
    if (userGreeting) {
      userGreeting.textContent = `Bonjour ${firstName} 👋 — Espace Commercial Sécurisé`;
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

    // Sélection unique des cartes au clic (harmonisée avec le reste du site)
    document.addEventListener("click", (e) => {
      const card = e.target.closest('.dash-card');
      if (card) {
        document.querySelectorAll('.dash-card.is-selected').forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
      }
    });
  }
});
