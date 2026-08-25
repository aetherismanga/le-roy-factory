import { auth, authReady, agentProfile } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

function safeNext() {
  const raw = new URLSearchParams(location.search).get("next") || "dashboard.html";
  const value = decodeURIComponent(raw);
  if (!/^[a-z0-9_-]+\.html(?:[?#].*)?$/i.test(value)) return "dashboard.html";
  return value;
}

function showError(message) {
  const box = document.getElementById("error-notification");
  if (!box) return;
  box.textContent = message;
  box.style.display = "block";
}

function hideError() {
  const box = document.getElementById("error-notification");
  if (box) box.style.display = "none";
}

async function initAgentLogin() {
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const remember = document.getElementById("remember");
  const submit = loginForm?.querySelector('button[type="submit"]');
  const forgot = document.querySelector(".forgot-link");

  const existing = auth.currentUser || await authReady;
  if (existing && agentProfile(existing)) {
    location.replace(safeNext());
    return;
  }
  if (existing && !agentProfile(existing)) await signOut(auth).catch(() => {});

  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    hideError();
    const email = String(emailInput?.value || "").trim().toLowerCase();
    const password = String(passwordInput?.value || "");
    if (!email || !password) return showError("Veuillez renseigner votre e-mail et votre mot de passe.");

    if (submit) {
      submit.disabled = true;
      submit.dataset.oldText = submit.textContent;
      submit.textContent = "Connexion…";
    }

    try {
      await setPersistence(auth, remember?.checked ? browserLocalPersistence : browserSessionPersistence);
      const credential = await signInWithEmailAndPassword(auth, email, password);
      if (!agentProfile(credential.user)) {
        await signOut(auth);
        throw new Error("unauthorized-agent");
      }
      location.replace(safeNext());
    } catch (error) {
      console.warn("Connexion agent refusée:", error?.code || error?.message || error);
      if (passwordInput) passwordInput.value = "";
      const code = String(error?.code || error?.message || "");
      if (code.includes("too-many-requests")) showError("Trop de tentatives. Réessayez dans quelques minutes.");
      else if (code.includes("network")) showError("Connexion impossible au service d’authentification. Vérifiez votre réseau.");
      else showError("Adresse e-mail ou mot de passe incorrect, ou compte non autorisé.");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = submit.dataset.oldText || "Se connecter";
      }
    }
  });

  forgot?.addEventListener("click", async event => {
    event.preventDefault();
    hideError();
    const email = String(emailInput?.value || "").trim().toLowerCase();
    if (!email) return showError("Saisissez d’abord votre adresse e-mail professionnelle.");
    try {
      await sendPasswordResetEmail(auth, email);
      showError("Un e-mail de réinitialisation vient d’être envoyé si ce compte existe.");
    } catch (error) {
      console.warn("Réinitialisation mot de passe:", error?.code || error);
      showError("Impossible d’envoyer l’e-mail de réinitialisation pour le moment.");
    }
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAgentLogin, { once: true });
else initAgentLogin();
