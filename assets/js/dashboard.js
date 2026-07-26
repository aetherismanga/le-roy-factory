document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  const agentName = localStorage.getItem("agentName") || "Agent";
  const firstName = agentName.split(" ")[0];

  const userGreeting = document.getElementById("user-greeting");
  const welcomeTitle = document.getElementById("welcome-title");
  
  if (userGreeting) userGreeting.textContent = `Bonjour ${firstName} 👋`;
  if (welcomeTitle) welcomeTitle.textContent = `Tableau de bord de ${agentName}`;

  const datetimeElement = document.getElementById("current-datetime");
  function updateDateTime() {
    if (datetimeElement) {
      const now = new Date();
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      let formatted = now.toLocaleDateString('fr-FR', options);
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      datetimeElement.textContent = formatted;
    }
  }
  updateDateTime();
  setInterval(updateDateTime, 60000);

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("agentLoggedIn");
      localStorage.removeItem("agentName");
      localStorage.removeItem("agentEmail");
      window.location.href = "agent.html";
    });
  }

  const cards = document.querySelectorAll(".dash-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      const moduleName = card.getAttribute("data-module");
      console.log(`Accès au module : ${moduleName}`);
    });
  });
});
