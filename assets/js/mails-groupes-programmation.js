import { auth } from "./firebase.js";
import { mailCompositionSnapshot } from "./mails-groupes.js?v=20261105-audit1";
const SCHEDULE_URL = "https://us-central1-le-roy-factory.cloudfunctions.net/scheduleGroupEmail";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 18 * 1024 * 1024;

const SIGNATURES = {
  jerome: `<br><br><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1A2530"><tr><td style="padding-right:20px"><strong>Jérôme Hugol</strong><br><em>Agence Le Roy Factory</em><br>Téléphone : <a href="tel:0766040361">07 66 04 03 61</a><br>E-mail : <a href="mailto:jerome@leroyfactory.fr">jerome@leroyfactory.fr</a><br>Site : <a href="https://leroyfactory.fr">https://leroyfactory.fr</a></td><td style="padding-left:20px;border-left:2px solid #D4AF37"><img src="https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/logo03lrf.png" width="120"></td></tr></table>`,
  coryne: `<br><br><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1A2530"><tr><td style="padding-right:20px"><strong>Coryne</strong><br><em>Agence Le Roy Factory</em><br>Téléphone : <a href="tel:0613093606">06 13 09 36 06</a><br>E-mail : <a href="mailto:coryne@leroyfactory.fr">coryne@leroyfactory.fr</a><br>Site : <a href="https://leroyfactory.fr">https://leroyfactory.fr</a></td><td style="padding-left:20px;border-left:2px solid #D4AF37"><img src="https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/logo03lrf.png" width="120"></td></tr></table>`,
  both: `<br><br><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1A2530"><tr><td style="padding-right:20px"><strong>Coryne & Jérôme</strong><br><em>Agence Le Roy Factory</em><br>Jérôme : 07 66 04 03 61 — jerome@leroyfactory.fr<br>Coryne : 06 13 09 36 06 — coryne@leroyfactory.fr<br>Site : <a href="https://leroyfactory.fr">https://leroyfactory.fr</a></td><td style="padding-left:20px;border-left:2px solid #D4AF37"><img src="https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/logo03lrf.png" width="120"></td></tr></table>`
};

let schedulingMail = false;

function injectStyles() {
  if (document.getElementById("scheduled-mail-style")) return;
  const s = document.createElement("style");
  s.id = "scheduled-mail-style";
  s.textContent = `
    .scheduled-mail-box{margin-top:1rem;border:1px solid #E7D391;background:#FFFCF3;border-radius:10px;padding:1rem}
    .scheduled-mail-title{font-weight:800;color:#1A2530;margin-bottom:.35rem;display:flex;align-items:center;gap:.5rem}
    .scheduled-mail-help{font-size:.8rem;color:#666;margin-bottom:.8rem}
    .scheduled-mail-row{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:.75rem;align-items:end}
    .scheduled-mail-row label{display:block;font-size:.82rem;font-weight:700;margin-bottom:.3rem}
    .scheduled-mail-row input{width:100%;box-sizing:border-box;padding:.7rem;border:1px solid #D1D5DB;border-radius:7px;background:#fff}
    .btn-schedule-mail{padding:.75rem 1.1rem;border-radius:7px;border:1px solid #D4AF37;background:#111;color:#F5D85A;font-weight:800;cursor:pointer;white-space:nowrap}
    .btn-schedule-mail:disabled{opacity:.55;cursor:not-allowed}
    @media(max-width:650px){.scheduled-mail-row{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function injectBox() {
  if (document.getElementById("scheduled-mail-box")) return;
  const prepare = document.getElementById("btn-open-confirm");
  if (!prepare) return;
  const actions = prepare.parentElement;
  const box = document.createElement("div");
  box.id = "scheduled-mail-box";
  box.className = "scheduled-mail-box";
  box.innerHTML = `
    <div class="scheduled-mail-title">🕒 Mail programmé</div>
    <div class="scheduled-mail-help">Choisissez une date et une heure. Le mail sera envoyé automatiquement, même si le CRM est fermé.</div>
    <div class="scheduled-mail-row">
      <div><label for="scheduled-mail-datetime">Date et heure d’envoi</label><input type="datetime-local" id="scheduled-mail-datetime"></div>
      <button type="button" class="btn-schedule-mail" id="btn-schedule-mail">📅 Programmer l’envoi</button>
    </div>`;
  actions.parentElement.insertBefore(box, actions);
  setMinimumDate();
  document.getElementById("btn-schedule-mail")?.addEventListener("click", scheduleMail);
}

function setMinimumDate() {
  const input = document.getElementById("scheduled-mail-datetime");
  if (!input) return;
  const d = new Date(Date.now() + 5 * 60000);
  const pad = n => String(n).padStart(2, "0");
  input.min = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


async function scheduleMail() {
  if(schedulingMail)return;
  const whenValue = document.getElementById("scheduled-mail-datetime")?.value || "";
  const when = whenValue ? new Date(whenValue) : null;
  const {emails,clientIds,subject,bodyHtml,bodyText,senderMode,attachments}=mailCompositionSnapshot();

  if (!emails.length) return alert("Sélectionnez au moins un destinataire.");
  if (!subject) return alert("Saisissez l’objet du mail.");
  if (!bodyText && !bodyHtml.includes("<img")) return alert("Rédigez le message.");
  if (!when || Number.isNaN(when.getTime())) return alert("Choisissez la date et l’heure d’envoi.");
  if (when.getTime() < Date.now() + 60000) return alert("Choisissez une date d’envoi dans le futur.");

  const htmlContent = `${bodyHtml}${SIGNATURES[senderMode] || SIGNATURES.jerome}`;
  const total = attachments.reduce((s,a)=>s+(a.size||0),0);
  if (total > MAX_TOTAL_SIZE) return alert("Les pièces jointes du mail programmé dépassent la taille autorisée.");

  const label = when.toLocaleString("fr-FR", { dateStyle:"full", timeStyle:"short" });
  if (!confirm(`Programmer cet e-mail pour ${label} ?\n\n${emails.length} destinataire(s)`)) return;

  const btn = document.getElementById("btn-schedule-mail");
  schedulingMail=true;btn.disabled = true;
  btn.textContent = "Programmation...";
  try {
    const token=await auth.currentUser?.getIdToken();
    if(!token)throw new Error("Votre session a expiré. Reconnectez-vous au CRM avant de programmer le mail.");
    const res = await fetch(SCHEDULE_URL, {
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
      body:JSON.stringify({ senderMode, bccRecipients:emails, subject, htmlContent, attachments, scheduledAt:when.toISOString(), clientIds })
    });
    const result = await res.json().catch(()=>({}));
    if(res.status===401)throw new Error("Votre session a expiré. Reconnectez-vous au CRM avant de programmer le mail.");
    if (!res.ok || !result.success) throw new Error(result.error || "Erreur de programmation");
    alert(`✅ Mail programmé pour ${label}.\nIl sera envoyé automatiquement à ${emails.length} destinataire(s).`);
    document.getElementById("scheduled-mail-datetime").value = "";
    setMinimumDate();
  } catch (e) {
    console.error(e);
    alert(`❌ Impossible de programmer le mail : ${e.message || "Erreur inconnue"}`);
  } finally {
    schedulingMail=false;btn.disabled = false;
    btn.textContent = "📅 Programmer l’envoi";
  }
}

function init() {
  injectStyles();
  injectBox();
  const timer = setInterval(() => { injectBox(); if (document.getElementById("scheduled-mail-box")) clearInterval(timer); }, 500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
