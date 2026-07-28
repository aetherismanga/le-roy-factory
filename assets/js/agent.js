// Database of authorized agents with the correct email
const agentsDatabase = [
  {
    name: "Jérôme Hugol",
    // MODIFICATION DIRECTE ICI : Remplacement de l'email erroné
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
  console.log("Le script agent.js est bien chargé !");
  
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorNotification = document.getElementById("error-notification");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      // Sanitization of user input for robust comparison
      const emailVal = emailInput.value.trim().toLowerCase();
      const passwordVal = passwordInput.value;

      console.log("Formulaire soumis ! Tentative de connexion pour :", emailVal);
      
      // Find agent matching both credentials
      const agent = agentsDatabase.find(
        a => a.email.toLowerCase() === emailVal && a.password === passwordVal
      );

      if (agent) {
        console.log("Connexion réussie pour :", agent.name);
        
        // Persist session in localStorage
        localStorage.setItem("agentLoggedIn", "true");
        localStorage.setItem("agentName", agent.name);
        localStorage.setItem("agentEmail", agent.email);
        
        // Redirect to secure area
        window.location.href = "dashboard.html";
      } else {
        console.log("Identifiants incorrects !");
        
        // Provide user feedback on failure
        if (errorNotification) {
          errorNotification.textContent = "Adresse e-mail ou mot de passe incorrect.";
          errorNotification.style.display = "block";
        }
        
        // Optional: clear password field for security/usability
        if (passwordInput) {
          passwordInput.value = '';
        }
      }
    });
  } else {
    // Critical error if HTML structure is missing required ID
    console.error("Erreur critique : le formulaire #login-form est introuvable sur cette page !");
  }
});
