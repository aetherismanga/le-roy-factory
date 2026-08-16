import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PARTNERS={"elios-ceramica":["Elios Ceramica","elios.png"],"view-ceramica":["View Ceramica","view.png"],"la-fenice":["La Fenice","lafenice.png"],"reviglass":["Reviglass","reviglass.png"],"biopietra":["Biopietra","biopietra.png"],"petracers":["Petracer's","petracer.png"],"pecchioli-firenze":["Pecchioli Firenze","pecchioli.png"],"bulbo":["Bulbo","bulbo.png"],"randal-pro":["Randal Pro","randal.png"],"neobath":["Neobath","neobath.png"],"koibath":["Koibath","koibath.png"],"aquahome":["Aquahome","aquahome.png"],"opal":["Opal","opal.png"],"bilt":["Bilt","bilt.png"]};
let selected=new Set();
let partnerByEmail=new Map();
const norm=v=>String(v||"").trim().toLowerCase();
const valid=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());

async function buildIndex(){
  const snap=await getDocs(collection(db,"clients"));
  partnerByEmail.clear();
  snap.forEach(d=>{
    const c=d.data();
    const partners=Array.isArray(c.partenaires)?c.partenaires:[];
    const emails=[];
    if(valid(c.email)) emails.push(c.email);
    (c.emails||[]).forEach(e=>{if(valid(e)) emails.push(e)});
    (c.interlocuteurs||[]).forEach(i=>{if(valid(i.email)) emails.push(i.email)});
    emails.forEach(e=>partnerByEmail.set(norm(e),partners));
  });
}

function injectStyles(){
  if(document.getElementById("mg-partner-style")) return;
  const s=document.createElement("style");
  s.id="mg-partner-style";
  s.textContent=`.mg-partner-box{position:relative}.mg-partner-btn{width:100%;padding:.65rem .8rem;border:1px solid #D1D5DB;background:#fff;border-radius:7px;display:flex;justify-content:space-between;cursor:pointer}.mg-partner-panel{display:none;position:absolute;z-index:3000;left:0;right:0;top:calc(100% + 5px);background:#fff;border:1px solid #ddd;border-radius:9px;box-shadow:0 10px 28px rgba(0,0,0,.16);padding:.55rem;max-height:360px;overflow:auto}.mg-partner-panel.open{display:block}.mgp-row{display:flex;align-items:center;gap:.55rem;padding:.4rem;border-radius:6px;cursor:pointer}.mgp-row:hover{background:#faf7ed}.mgp-row img{width:38px;height:26px;object-fit:contain}`;
  document.head.appendChild(s);
}

function injectFilter(){
  if(document.getElementById("mg-partner-box")) return;
  const grid=document.querySelector(".filters-grid");
  if(!grid) return;
  const wrap=document.createElement("div");
  wrap.className="form-group-custom mg-partner-box";
  wrap.id="mg-partner-box";
  wrap.innerHTML=`<label>Partenaires</label><button type="button" class="mg-partner-btn" id="mgp-btn"><span id="mgp-label">Tous les partenaires</span><span>▾</span></button><div class="mg-partner-panel" id="mgp-panel"><div style="display:flex;justify-content:space-between;padding:.25rem .35rem .5rem"><strong>Filtrer les destinataires</strong><button type="button" id="mgp-clear" style="border:0;background:none;color:#9a6d00;cursor:pointer">Effacer</button></div>${Object.entries(PARTNERS).map(([id,[name,logo]])=>`<label class="mgp-row"><input type="checkbox" value="${id}"><img src="assets/img/${logo}" alt=""><span>${name}</span></label>`).join("")}</div>`;
  grid.appendChild(wrap);
  const panel=wrap.querySelector("#mgp-panel");
  wrap.querySelector("#mgp-btn").onclick=()=>panel.classList.toggle("open");
  wrap.querySelectorAll("input[type=checkbox]").forEach(cb=>cb.onchange=()=>{
    cb.checked?selected.add(cb.value):selected.delete(cb.value);
    updateLabel();
    applyFilter();
  });
  wrap.querySelector("#mgp-clear").onclick=()=>{
    selected.clear();
    wrap.querySelectorAll("input").forEach(x=>x.checked=false);
    updateLabel();
    applyFilter();
  };
  document.addEventListener("click",e=>{if(!wrap.contains(e.target)) panel.classList.remove("open")});
}

function updateLabel(){
  const e=document.getElementById("mgp-label");
  if(e) e.textContent=selected.size?`${selected.size} partenaire(s) sélectionné(s)`:"Tous les partenaires";
}

function applyFilter(){
  document.querySelectorAll("#recipients-tbody tr").forEach(tr=>{
    const cells=tr.querySelectorAll("td");
    if(cells.length<6) return;
    const email=norm(cells[5]?.textContent);
    const partners=partnerByEmail.get(email)||[];
    const ok=!selected.size||[...selected].some(id=>partners.includes(id));
    tr.style.display=ok?"":"none";
  });
}

function observeTable(){
  const tb=document.getElementById("recipients-tbody");
  if(!tb) return;
  new MutationObserver(()=>applyFilter()).observe(tb,{childList:true});
}

async function init(){
  injectStyles();
  injectFilter();
  await buildIndex();
  observeTable();
  applyFilter();
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
