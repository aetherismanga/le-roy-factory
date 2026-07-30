// Database of authorized agents with the correct email
const agentsDatabase = [
  {
    name: "Jérôme Hugol",
    email: "jerome@leroyfactory.fr", 
    password: "0000"
  },
  {
    name: "Coryne Le Roy",
    email: "coryne@leroyfactory.fr",
    password: "0000"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  console.log("Le script agent.js est bien chargé !");
  
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorNotification = document.getElementById("error-notification");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const emailVal = emailInput.value.trim().toLowerCase();
      const passwordVal = passwordInput.value;

      console.log("Formulaire soumis ! Tentative de connexion pour :", emailVal);
      
      const agent = agentsDatabase.find(
        a => a.email.toLowerCase() === emailVal && a.password === passwordVal
      );

      if (agent) {
        console.log("Connexion réussie pour :", agent.name);
        
        localStorage.setItem("agentLoggedIn", "true");
        localStorage.setItem("agentName", agent.name);
        localStorage.setItem("agentEmail", agent.email);
        
        window.location.href = "dashboard.html";
      } else {
        console.log("Identifiants incorrects !");
        
        if (errorNotification) {
          errorNotification.textContent = "Adresse e-mail ou mot de passe incorrect.";
          errorNotification.style.display = "block";
        }
        
        if (passwordInput) {
          passwordInput.value = '';
        }
      }
    });
  } else {
    console.error("Erreur critique : le formulaire #login-form est introuvable sur cette page !");
  }
});
