import { db } from "./firebase.js";
import { collection, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PARTNERS = {
  "elios-ceramica":["Elios Ceramica","elios.png"],"view-ceramica":["View Ceramica","view.png"],"la-fenice":["La Fenice","lafenice.png"],
  "reviglass":["Reviglass","reviglass.png"],"biopietra":["Biopietra","biopietra.png"],"petracers":["Petracer's","petracer.png"],
  "pecchioli-firenze":["Pecchioli Firenze","pecchioli.png"],"bulbo":["Bulbo","bulbo.png"],"randal-pro":["Randal Pro","randal.png"],
  "neobath":["Neobath","neobath.png"],"koibath":["Koibath","koibath.png"],"aquahome":["Aquahome","aquahome.png"],"opal":["Opal","opal.png"],"bilt":["Bilt","bilt.png"]
};

const GROUP_PATTERNS = [
  /\bCIFFREO\s+BONA\b/i,/\bRICHARDSON\b/i,/\bCOSTAMAGNA\b/i,/\bBONIFAY\b/i,/\bAMBIANCE\s+CARRELAGES?\b/i,
  /\bESPACE\s+AUBADE\b/i,/\bSAMSE\b/i,/\bSYLVESTRE\s+MATERIAUX\b/i,/\bCLAIRAZUR\s+SPA\b/i
];

const ACTIVITY = [
  ["","Non renseigné"],["groupe","Groupe"],["negoce-independant","Négoce indépendant"],["pisciniste","Pisciniste"],
  ["architecte","Architecte"],["cuisiniste","Cuisiniste"],["carreleur","Carreleur"],["plombier","Plombier"]
];

let clients = [];
let selectedPartners = new Set();
let editingId = null;
let autoGroupsDone = false;
let autoIndependentDone = false;

const norm = v => String(v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const esc = v => String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

function findClientBySociete(name) {
  const n = norm(name);
  return clients.find(c => norm(c.societe) === n) || null;
}

function clientForRow(row) {
  if (!row) return null;
  const id = row.dataset.clientId;
  if (id) {
    const c = clients.find(x => x.id === id);
    if (c) return c;
  }
  const td = row.querySelectorAll("td");
  return findClientBySociete(td[1]?.childNodes?.[0]?.textContent?.trim() || td[1]?.textContent?.trim() || "");
}

function firstPhone(c) {
  const values = [
    ...(Array.isArray(c?.telephones) ? c.telephones : []),
    c?.telephone,
    c?.mobile,
    c?.portable
  ].map(v => String(v || "").trim()).filter(Boolean);
  return values[0] || "";
}

function fullAddress(c) {
  return [c?.adresse, c?.codePostal || c?.code_postal, c?.ville]
    .map(v => String(v || "").trim())
    .filter(Boolean)
    .join(", ");
}

function mountMobileQuickActions(c) {
  const modal = document.getElementById("client-modal");
  const header = modal?.querySelector(".modal-header");
  if (!modal || !header) return;

  let box = document.getElementById("lrf-client-mobile-quick-actions");
  if (!box) {
    box = document.createElement("div");
    box.id = "lrf-client-mobile-quick-actions";
    box.className = "lrf-client-mobile-quick-actions";
    header.insertAdjacentElement("afterend", box);
  }

  const summary = document.getElementById("lrf-client-summary");
  if (summary?.parentNode && box.nextElementSibling !== summary) {
    summary.parentNode.insertBefore(box, summary);
  }

  if (!c) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }

  const phone = firstPhone(c);
  const address = fullAddress(c);
  box.hidden = false;
  box.innerHTML = `
    <button type="button" class="lrf-client-quick-btn lrf-client-call" ${phone ? "" : "disabled"}>📞 <span>Appeler</span></button>
    <button type="button" class="lrf-client-quick-btn lrf-client-go" ${address ? "" : "disabled"}>📍 <span>Y aller</span></button>`;

  const call = box.querySelector(".lrf-client-call");
  const go = box.querySelector(".lrf-client-go");
  if (phone) call.addEventListener("click", () => {
    const tel = phone.replace(/[^+\d]/g, "");
    window.location.href = `tel:${tel}`;
  });
  if (address) go.addEventListener("click", () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    const w = window.open(url, "_blank", "noopener");
    if (!w) window.location.href = url;
  });
}

function styles() {
  if (document.getElementById("crm-enhance-style")) return;
  const s = document.createElement("style");
  s.id = "crm-enhance-style";
  s.textContent = `.partner-filter{position:relative;min-width:210px}.partner-filter-btn{width:100%;padding:.65rem .8rem;background:#fff;border:1px solid #D1D5DB;border-radius:7px;display:flex;justify-content:space-between;cursor:pointer}.partner-filter-panel{display:none;position:absolute;z-index:5000;right:0;top:calc(100% + 5px);width:330px;max-height:420px;overflow:auto;background:#fff;border:1px solid #ddd;border-radius:10px;padding:.65rem;box-shadow:0 12px 35px rgba(0,0,0,.18)}.partner-filter-panel.open{display:block}.pf-row{display:flex;align-items:center;gap:.6rem;padding:.45rem;border-radius:7px;cursor:pointer}.pf-row:hover{background:#faf7ed}.pf-row img{width:42px;height:28px;object-fit:contain}.row-partners{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.row-partners img{width:30px;height:20px;object-fit:contain;border:1px solid #eee;border-radius:4px;background:white;padding:2px}.activity-pill{display:inline-block;margin-left:6px;padding:2px 6px;border-radius:999px;background:#F3F4F6;color:#374151;font-size:.68rem;font-weight:700}.form-field.activity-field select{width:100%}.lrf-client-mobile-quick-actions{display:none}@media(max-width:900px){.lrf-client-mobile-quick-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 14px 4px;padding:0}.lrf-client-mobile-quick-actions[hidden]{display:none!important}.lrf-client-quick-btn{min-height:54px;border-radius:13px;font:inherit;font-size:1rem;font-weight:850;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.lrf-client-call{border:1px solid #087b66;background:linear-gradient(180deg,#19a786,#087b66);color:#fff;box-shadow:inset 0 1px rgba(255,255,255,.35),0 5px 12px rgba(8,123,102,.18)}.lrf-client-go{border:1px solid #d4af37;background:linear-gradient(180deg,#1c1c1c,#0d0d0d);color:#ffd43b;box-shadow:inset 0 1px rgba(255,255,255,.08),0 5px 12px rgba(0,0,0,.16)}.lrf-client-quick-btn:disabled{opacity:.42;cursor:not-allowed;box-shadow:none}}`;
  document.head.appendChild(s);
}

function injectActivity() {
  if (document.getElementById("edit-activity")) return;
  const type = document.getElementById("edit-type")?.closest(".form-field");
  if (!type) return;
  const d = document.createElement("div");
  d.className = "form-field activity-field";
  d.innerHTML = `<label for="edit-activity">Sous-catégorie / Activité</label><select id="edit-activity">${ACTIVITY.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select>`;
  type.insertAdjacentElement("afterend", d);
}

function setActivity(c) {
  injectActivity();
  const sel = document.getElementById("edit-activity");
  if (sel) sel.value = c?.categorieActivite || c?.sousCategorie || "";
}

function injectPartnerFilter() {
  if (document.getElementById("partner-filter-box")) return;
  const dept = document.getElementById("filter-departement") || document.getElementById("filter-dept");
  if (!dept) return;
  const box = document.createElement("div");
  box.id = "partner-filter-box";
  box.className = "partner-filter";
  box.innerHTML = `<button type="button" class="partner-filter-btn" id="pf-btn"><span id="pf-label">Tous les partenaires</span><span>▾</span></button><div class="partner-filter-panel" id="pf-panel"><div style="display:flex;justify-content:space-between;padding:.3rem .35rem .55rem"><strong>Partenaires</strong><button type="button" id="pf-clear" style="border:0;background:none;color:#9a6d00;cursor:pointer">Effacer</button></div>${Object.entries(PARTNERS).map(([id,[name,logo]])=>`<label class="pf-row"><input type="checkbox" value="${id}"><img src="assets/img/${logo}" alt=""><span>${name}</span></label>`).join("")}</div>`;
  dept.parentElement.insertAdjacentElement("afterend", box);
  box.querySelector("#pf-btn").onclick = () => box.querySelector("#pf-panel").classList.toggle("open");
  box.querySelectorAll("input[type=checkbox]").forEach(cb => cb.onchange = () => {
    cb.checked ? selectedPartners.add(cb.value) : selectedPartners.delete(cb.value);
    updatePfLabel();
    applyPartnerFilter();
  });
  box.querySelector("#pf-clear").onclick = () => {
    selectedPartners.clear();
    box.querySelectorAll("input").forEach(x => x.checked = false);
    updatePfLabel();
    applyPartnerFilter();
  };
  document.addEventListener("click", e => { if (!box.contains(e.target)) box.querySelector("#pf-panel").classList.remove("open"); });
}

function updatePfLabel() {
  const el = document.getElementById("pf-label");
  if (el) el.textContent = selectedPartners.size ? `${selectedPartners.size} partenaire(s) sélectionné(s)` : "Tous les partenaires";
}

function applyPartnerFilter() {
  document.querySelectorAll("#clients-table-body tr").forEach(row => {
    const c = clientForRow(row);
    if (!c) return;
    const p = new Set(c.partenaires || []);
    const ok = !selectedPartners.size || [...selectedPartners].some(id => p.has(id));
    row.style.display = ok ? "" : "none";
  });
}

function decorateRows() {
  document.querySelectorAll("#clients-table-body tr").forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 7) return;
    const c = clientForRow(row);
    if (!c) return;
    row.dataset.clientId = c.id;
    let wrap = cells[1].querySelector(".row-partners");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "row-partners";
      cells[1].appendChild(wrap);
    }
    wrap.innerHTML = (c.partenaires || []).filter(id => PARTNERS[id]).map(id => `<img src="assets/img/${PARTNERS[id][1]}" title="${esc(PARTNERS[id][0])}">`).join("");
    let pill = cells[0].querySelector(".activity-pill");
    const label = ACTIVITY.find(x => x[0] === (c.categorieActivite || c.sousCategorie))?.[1];
    if (label) {
      if (!pill) {
        pill = document.createElement("span");
        pill.className = "activity-pill";
        cells[0].appendChild(pill);
      }
      pill.textContent = label;
    } else pill?.remove();
  });
  applyPartnerFilter();
}

async function autoClassifyGroups() {
  if (autoGroupsDone) return;
  autoGroupsDone = true;
  const todo = clients.filter(c => !c.categorieActivite && !c.sousCategorie && GROUP_PATTERNS.some(r => r.test(c.societe || "")));
  for (const c of todo) {
    try { await updateDoc(doc(db,"clients",c.id), { categorieActivite:"groupe" }); }
    catch (e) { console.warn("Classement groupe", c.societe, e); }
  }
}

async function autoClassifyIndependent() {
  if (autoIndependentDone) return;
  autoIndependentDone = true;
  const todo = clients.filter(c => {
    const activity = norm(c.categorieActivite || c.sousCategorie);
    if (activity) return false;
    return !GROUP_PATTERNS.some(r => r.test(c.societe || ""));
  });
  for (const c of todo) {
    try { await updateDoc(doc(db,"clients",c.id), { categorieActivite:"negoce-independant" }); }
    catch (e) { console.warn("Classement négoce indépendant", c.societe, e); }
  }
}

function refreshOpenClient() {
  const c = clients.find(x => x.id === editingId) || null;
  setActivity(c);
  mountMobileQuickActions(c);
  setTimeout(() => mountMobileQuickActions(c), 120);
  setTimeout(() => mountMobileQuickActions(c), 350);
}

function init() {
  styles();
  injectActivity();
  injectPartnerFilter();

  document.addEventListener("click", e => {
    const row = e.target.closest("#clients-table-body tr");
    if (row) {
      const c = clientForRow(row);
      if (c) editingId = c.id;
    }
  }, true);

  const modal = document.getElementById("client-modal");
  if (modal) new MutationObserver(() => {
    if (getComputedStyle(modal).display !== "none") refreshOpenClient();
  }).observe(modal, { attributes:true, attributeFilter:["style"] });

  document.getElementById("btn-add-client")?.addEventListener("click", () => {
    editingId = null;
    setTimeout(() => {
      setActivity(null);
      mountMobileQuickActions(null);
    }, 0);
  }, true);

  document.getElementById("client-form")?.addEventListener("submit", () => {
    if (!editingId) return;
    const v = document.getElementById("edit-activity")?.value || "";
    updateDoc(doc(db,"clients",editingId), { categorieActivite:v }).catch(console.error);
  }, true);

  const tbody = document.getElementById("clients-table-body");
  if (tbody) new MutationObserver(() => setTimeout(decorateRows, 0)).observe(tbody, { childList:true });

  onSnapshot(collection(db,"clients"), snap => {
    clients = [];
    snap.forEach(d => clients.push({ id:d.id, ...d.data() }));
    setTimeout(decorateRows, 0);
    if (modal && getComputedStyle(modal).display !== "none") setTimeout(refreshOpenClient, 0);
    autoClassifyGroups();
    autoClassifyIndependent();
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
else init();
