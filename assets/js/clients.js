import { db, requireAgentSession, agentProfile } from "./firebase.js";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { normalizeClient, canonicalClientPatch } from "./client-schema.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user=await requireAgentSession({redirect:true});
  if(!user)return;
  const profile=agentProfile(user);
  const firstName=(profile?.name||"Agent").split(" ")[0];
  const greetingEl=document.getElementById("user-greeting");
  if(greetingEl)greetingEl.textContent=`Gestion du portefeuille de ${firstName} — LE ROY FACTORY`;

  const tableBody=document.getElementById("clients-table-body");
  const searchInput=document.getElementById("search-input");
  const modal=document.getElementById("client-modal");
  const modalCloseBtn=document.getElementById("modal-close-btn");
  const btnCancelEdit=document.getElementById("btn-cancel-edit");
  const clientEditForm=document.getElementById("client-edit-form");
  let clientsCache=[];

  async function loadClients(){
    try{
      const querySnapshot=await getDocs(collection(db,"clients"));clientsCache=[];
      querySnapshot.forEach(docSnap=>clientsCache.push(normalizeClient(docSnap.data(),docSnap.id)));
      clientsCache.sort((a,b)=>a.societe.localeCompare(b.societe,"fr"));
      renderTable(clientsCache);updateStats(clientsCache);handleUrlEditParam();
    }catch(error){console.error("Erreur lors du chargement des clients :",error);alert("Impossible de charger le portefeuille clients.")}
  }

  function renderTable(data){
    if(!tableBody)return;tableBody.innerHTML="";
    const noResults=document.getElementById("no-results");
    if(!data.length){if(noResults)noResults.style.display="block";return}
    if(noResults)noResults.style.display="none";
    data.forEach(client=>{
      const tr=document.createElement("tr");tr.dataset.id=client.id;
      const isClient=client.typeNormalized==="client";const badgeColor=isClient?"#047857":"#D4AF37";
      tr.innerHTML=`<td><strong>${escapeHtml(client.societe)}</strong><br><small style="color:#666;">${escapeHtml(client.contact)}</small></td><td><span class="badge" style="background:${badgeColor};color:#fff;padding:2px 8px;border-radius:4px;font-size:.75rem;">${escapeHtml(client.type||"Prospect")}</span></td><td>${escapeHtml(client.adresse)}</td><td>${escapeHtml(`${client.codePostal} ${client.ville}`.trim())}</td><td>${escapeHtml(client.departement)}</td><td><a href="tel:${escapeAttr(client.telephone)}" style="color:#111;font-weight:600;">${escapeHtml(client.telephone)}</a></td>`;
      tr.style.cursor="pointer";tr.addEventListener("click",()=>openEditModal(client));tableBody.appendChild(tr);
    });
  }

  function updateStats(data){
    const active=data.filter(c=>c.typeNormalized==="client"&&!c.archived&&!c.archive);const prospects=data.filter(c=>c.typeNormalized==="prospect"&&!c.archived&&!c.archive);
    if(document.getElementById("count-total"))document.getElementById("count-total").textContent=active.length+prospects.length;
    if(document.getElementById("count-clients"))document.getElementById("count-clients").textContent=active.length;
    if(document.getElementById("count-prospects"))document.getElementById("count-prospects").textContent=prospects.length;
  }

  function setValue(id,value){const el=document.getElementById(id);if(el)el.value=value??""}
  window.openEditModal=function(raw){
    const client=normalizeClient(raw,raw.id||"");
    setValue("edit-client-index",client.id);const title=document.getElementById("modal-societe-title");if(title)title.textContent=client.societe||"Fiche client";
    setValue("edit-societe",client.societe);setValue("edit-contact",client.contact);setValue("edit-type",client.type);setValue("edit-agent",client.agent||firstName);setValue("edit-telephone",client.telephone);setValue("edit-email",client.email);setValue("edit-adresse",client.adresse);setValue("edit-code-postal",client.codePostal);setValue("edit-ville",client.ville);setValue("edit-departement",client.departement);
    if(modal)modal.style.display="flex";
  };

  function handleUrlEditParam(){
    const editClientId=new URLSearchParams(location.search).get("edit");if(!editClientId)return;
    const target=clientsCache.find(c=>c.id===editClientId);if(target){openEditModal(target);return}
    getDoc(doc(db,"clients",editClientId)).then(s=>{if(s.exists())openEditModal(normalizeClient(s.data(),s.id))}).catch(err=>console.error("Erreur récupération client direct :",err));
  }

  modalCloseBtn?.addEventListener("click",()=>{if(modal)modal.style.display="none"});
  btnCancelEdit?.addEventListener("click",()=>{if(modal)modal.style.display="none"});

  clientEditForm?.addEventListener("submit",async e=>{
    e.preventDefault();const docId=document.getElementById("edit-client-index")?.value||"";
    const raw={
      societe:document.getElementById("edit-societe")?.value||"",contact:document.getElementById("edit-contact")?.value||"",type:document.getElementById("edit-type")?.value||"Client",agent:document.getElementById("edit-agent")?.value||firstName,
      telephone:document.getElementById("edit-telephone")?.value||"",email:document.getElementById("edit-email")?.value||"",adresse:document.getElementById("edit-adresse")?.value||"",codePostal:document.getElementById("edit-code-postal")?.value||"",ville:document.getElementById("edit-ville")?.value||"",departement:document.getElementById("edit-departement")?.value||""
    };
    const patch={...canonicalClientPatch(raw),updatedAt:serverTimestamp(),updatedBy:user.email||"agent"};
    if(!patch.societe)return alert("La société est obligatoire.");
    try{
      if(docId&&docId!=="-1"){await updateDoc(doc(db,"clients",docId),patch);alert("✅ Fiche mise à jour avec succès !")}
      else{await addDoc(collection(db,"clients"),{...patch,createdAt:serverTimestamp(),createdBy:user.email||"agent"});alert("✅ Nouveau client enregistré avec succès !")}
      if(modal)modal.style.display="none";await loadClients();
    }catch(error){console.error("Erreur lors de l'enregistrement :",error);alert("Erreur lors de l'enregistrement de la fiche.")}
  });

  searchInput?.addEventListener("input",e=>{
    const term=String(e.target.value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
    const filtered=clientsCache.filter(c=>[c.societe,c.ville,c.telephone,c.email,c.codePostal,c.departement,c.contact].some(v=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").includes(term)));
    renderTable(filtered);
  });

  function escapeHtml(value){return String(value||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
  function escapeAttr(value){return escapeHtml(value).replace(/`/g,"&#096;")}
  await loadClients();
});
