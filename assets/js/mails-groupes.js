import { db } from "./firebase.js";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Sécurité session Agent
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  // Horloge & Date
  function updateDateTime() {
    const now = new Date();
    const dateEl = document.getElementById("current-date");
    const timeEl = document.getElementById("current-time");
    if (dateEl) {
      let formatted = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
  }
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Déconnexion
  document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.removeItem("agentLoggedIn");
    window.location.href = "agent.html";
  });

  // Signatures configurées
  const signatures = {
    jerome: `Jérôme Hugol\nAgence Le Roy Factory\nTéléphone : 07 66 04 03 61\nE-mail : jerome@leroyfactory.fr\nSite : https://leroyfactory.fr`,
    coryne: `Coryne\nAgence Le Roy Factory\nE-mail : coryne@leroyfactory.fr\nSite : https://leroyfactory.fr`
  };

  const senderEmails = {
    jerome: "jerome@leroyfactory.fr",
    coryne: "coryne@leroyfactory.fr"
  };

  // Éléments DOM
  const filterType = document.getElementById("filter-type");
  const filterDept = document.getElementById("filter-dept");
  const filterSector = document.getElementById("filter-sector");
  const searchInput = document.getElementById("search-input");
  const recipientsTbody = document.getElementById("recipients-tbody");
  const countDisplayedEl = document.getElementById("count-displayed");
  const countSelectedEl = document.getElementById("count-selected");
  const warningLimit = document.getElementById("warning-limit");
  
  const selectSender = document.getElementById("select-sender");
  const signaturePreview = document.getElementById("signature-preview");
  const fileAttachment = document.getElementById("file-attachment");
  const filePreviewInfo = document.getElementById("file-preview-info");

  const modalConfirm = document.getElementById("modal-confirm");
  const modalConfirmText = document.getElementById("modal-confirm-text");
  const summarySender = document.getElementById("summary-sender");
  const summarySubject = document.getElementById("summary-subject");
  const summaryCount = document.getElementById("summary-count");
  const summaryAttachment = document.getElementById("summary-attachment");
  
  const btnConfirmSend = document.getElementById("btn-confirm-send");
  const btnCancelSend =
