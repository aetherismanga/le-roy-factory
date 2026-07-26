const agentsDatabase = [
  {
    name: "Jerome Hugol",
    email: "agenceleroyfactory@gmail.com",
    password: "0000"
  },
  {
    name: "Corinne Le Roy",
    email: "coryneleroyfactory@gmail.com",
    password: "0000"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorNotification = document.getElementById("error-notification");

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

        window.location.href = "dashboard.html";
      } else {
        errorNotification.textContent = "Adresse e-mail ou mot de passe incorrect.";
        errorNotification.style.display = "block";
      }
    });
  }
});
