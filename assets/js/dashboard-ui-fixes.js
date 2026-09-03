import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

if(!window.__LRF_DASH_UI_FIXES__){
  window.__LRF_DASH_UI_FIXES__=true;

  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const norm=v=>String(v??'').trim().toLowerCase();
  function parseDate(v){if(!v)return null;if(v?.toDate)return v.toDate();const s=String(v).trim();const fr=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);if(fr){let y=+fr[3];if(y<100)y+=2000;const d=new Date(y,+fr[2]-1,+fr[1]);return Number.isNaN(d.getTime())?null:d}const d=new Date(s);return Number.isNaN(d.getTime())?null:d}
  async function safeCollection(name){try{const snap=await getDocs(collection(db,name)),out=[];snap.forEach(d=>out.push({id:d.id,...d.data()}));return out}catch(e){console.warn(`Collection ${name} indisponible`,e);return[]}}

  function installStyles(){
    if(document.getElementById('lrf-dashboard-ui-fixes-css'))return;
    const s=document.createElement('style');s.id='lrf-dashboard-ui-fixes-css';s.textContent=`
      html body.crm-body .dash-actions .dash-action,
      html body.crm-body .dash-actions .dash-action.tour,
      html body.crm-body .dash-actions .dash-action.saved-tour{
        color:#252525!important;border:1px solid #d9cfbf!important;
        background:linear-gradient(180deg,#fff,#fff9ef)!important;
        box-shadow:0 4px 10px rgba(70,45,20,.055)!important;
        transition:transform .15s ease,background .15s ease,border-color .15s ease,box-shadow .15s ease!important;
      }
      html body.crm-body .dash-actions .dash-action:hover,
      html body.crm-body .dash-actions .dash-action:focus-visible{
        color:#3d2a00!important;border-color:#d3a126!important;
        background:linear-gradient(180deg,#fff9e7,#f6e3ad)!important;
        box-shadow:0 7px 16px rgba(132,88,8,.14),0 0 0 2px rgba(238,187,54,.10)!important;
        transform:translateY(-1px)!important;
      }
      html body.crm-body .activity-row.activity-click{
        width:100%;appearance:none;-webkit-appearance:none;background:transparent;color:inherit;text-align:left;
        border:0;border-bottom:1px solid #f0e9de;cursor:pointer;border-radius:9px;
        transition:background .14s ease,transform .14s ease,box-shadow .14s ease;
      }
      html body.crm-body .activity-row.activity-click:last-child{border-bottom:0}
      html body.crm-body .activity-row.activity-click:hover,
      html body.crm-body .activity-row.activity-click:focus-visible{background:#fff4da;transform:translateX(2px);box-shadow:inset 3px 0 #e6aa20;outline:0}
      .lrf-activity-overlay{position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(13,13,13,.58);backdrop-filter:blur(3px)}
      .lrf-activity-overlay[hidden]{display:none!important}.lrf-activity-dialog{width:min(760px,96vw);max-height:90vh;overflow:auto;border-radius:20px;background:#fffdf8;border:1px solid #d9b86b;box-shadow:0 24px 70px rgba(0,0,0,.32);padding:20px;color:#25221d}
      .lrf-activity-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;border-bottom:1px solid #eadfc9;padding-bottom:12px;margin-bottom:14px}.lrf-activity-head h2{margin:0;font-size:1.15rem}.lrf-activity-close{width:38px;height:38px;border-radius:50%;border:1px solid #d6b35e;background:#fff9e9;cursor:pointer;font-size:22px}
      .lrf-activity-meta{display:grid;grid-template-columns:145px 1fr;gap:7px 12px;font-size:.86rem}.lrf-activity-meta b{color:#695126}.lrf-activity-message{margin-top:15px;border:1px solid #e8dfd1;border-radius:13px;background:#fff;padding:12px}.lrf-mail-frame{width:100%;min-height:280px;border:0;background:#fff}.lrf-activity-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}.lrf-activity-link{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 13px;border-radius:10px;border:1px solid #d2ae55;background:#fff8e4;color:#4d3806;font-weight:800;text-decoration:none;cursor:pointer}.lrf-activity-link:hover{background:#f7df9e}
      .lrf-legacy-mail{padding:11px 12px;border-radius:11px;background:#fff6d9;border:1px solid #e6ce83;color:#66500e;font-size:.82rem;line-height:1.45}
      @media(max-width:600px){.lrf-activity-dialog{padding:15px}.lrf-activity-meta{grid-template-columns:1fr;gap:2px}.lrf-activity-meta b{margin-top:8px}}
    `;document.head.appendChild(s);
  }

  function emailsForClient(c){const out=[];const add=v=>{v=String(v||'').trim();if(v&&v.includes('@')&&!out.some(x=>norm(x)===norm(v)))out.push(v)};add(c.email);add(c.eMail);add(c.mail);add(c.Email);add(c.Mail);(c.emails||[]).forEach(add);(c.emails_contact||[]).forEach(add);(c.interlocuteurs||[]).forEach(p=>add(p?.email));(c.contacts||[]).forEach(p=>typeof p==='string'?add(p):add(p?.email||p?.mail||p?.eMail));return out}
  function dayKey(v){const d=parseDate(v);return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:''}
  function findArchive(mail,client,archives){const subj=norm(mail.objet||mail.subject),date=dayKey(mail.date),clientEmails=emailsForClient(client).map(norm),mailRecipients=(mail.destinataires||mail.recipients||[]).map(norm);return archives.find(a=>{if(subj&&norm(a.objet||a.subject)!==subj)return false;if(date&&dayKey(a.date)!==date)return false;const rec=(a.destinataires||a.recipients||[]).map(norm);if(mailRecipients.length&&rec.some(r=>mailRecipients.includes(r)))return true;if(clientEmails.length&&rec.some(r=>clientEmails.includes(r)))return true;return !mailRecipients.length&&!clientEmails.length})||null}

  function ensureModal(){
    let o=document.getElementById('lrf-activity-overlay');if(o)return o;
    o=document.createElement('div');o.id='lrf-activity-overlay';o.className='lrf-activity-overlay';o.hidden=true;o.innerHTML='<div class="lrf-activity-dialog" role="dialog" aria-modal="true" aria-labelledby="lrf-activity-title"><div class="lrf-activity-head"><div><h2 id="lrf-activity-title">Activité commerciale</h2><div id="lrf-activity-client" class="priority-meta"></div></div><button class="lrf-activity-close" type="button" aria-label="Fermer">×</button></div><div id="lrf-activity-content"></div></div>';document.body.appendChild(o);o.querySelector('.lrf-activity-close').onclick=()=>o.hidden=true;o.addEventListener('click',e=>{if(e.target===o)o.hidden=true});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!o.hidden)o.hidden=true});return o
  }

  function gmailHref(activity){const mail=activity.data||{},subject=mail.objet||mail.subject||'',recipients=(mail.destinataires||mail.recipients||[]).join(' '),q=['in:sent',subject?`"${subject}"`:'',recipients,activity.client?.societe||''].filter(Boolean).join(' ');return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(q)}`}
  function value(obj,keys){for(const k of keys){const v=obj?.[k];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return''}

  function openActivity(activity){
    const overlay=ensureModal(),content=overlay.querySelector('#lrf-activity-content'),title=overlay.querySelector('#lrf-activity-title'),clientEl=overlay.querySelector('#lrf-activity-client');title.textContent=activity.kind==='mail'?'✉️ Mail envoyé':'📝 Compte-rendu';clientEl.textContent=activity.client?.societe||'';
    const d=activity.d?.toLocaleString('fr-FR')||'';
    if(activity.kind==='mail'){
      const m=activity.data||{},archive=activity.archive||{},subject=m.objet||archive.objet||'Sans objet',sender=m.expediteur||archive.expediteur||'',recipients=m.destinataires||archive.destinataires||[],html=archive.htmlContent||archive.bodyHtml||m.htmlContent||m.bodyHtml||'';
      content.innerHTML=`<div class="lrf-activity-meta"><b>Date</b><span>${esc(d)}</span><b>Expéditeur</b><span>${esc(sender||'Non renseigné')}</span><b>Objet</b><span>${esc(subject)}</span><b>Destinataire(s)</b><span>${esc(Array.isArray(recipients)?recipients.join(', '):recipients||'Non archivé')}</span></div>${html?'<div class="lrf-activity-message"><iframe class="lrf-mail-frame" sandbox title="Contenu du mail"></iframe></div>':'<div class="lrf-legacy-mail" style="margin-top:15px">Ce mail est antérieur à l’archivage intégral : le CRM avait conservé ses informations d’envoi, mais pas son corps. Les nouveaux mails seront désormais enregistrés avec leur contenu complet.</div>'}<div class="lrf-activity-actions"><a class="lrf-activity-link" target="_blank" rel="noopener" href="${gmailHref(activity)}">✉️ Ouvrir / rechercher dans Gmail</a><a class="lrf-activity-link" href="clients.html?edit=${encodeURIComponent(activity.client?.id||'')}">👥 Ouvrir la fiche client</a></div>`;
      if(html){const frame=content.querySelector('.lrf-mail-frame');if(frame)frame.srcdoc=html}
    }else{
      const x=activity.data||{};const interloc=value(x,['interlocuteur','contact','nomContact']),note=value(x,['note','notes','commentaire','commentaires','resume','résumé','compteRendu','description']),next=value(x,['prochaineAction','prochainContact','relance','action']);
      content.innerHTML=`<div class="lrf-activity-meta"><b>Date</b><span>${esc(d)}</span><b>Type</b><span>${esc(x.type||activity.label||'Compte-rendu')}</span>${interloc?`<b>Interlocuteur</b><span>${esc(interloc)}</span>`:''}${next?`<b>Suite prévue</b><span>${esc(next)}</span>`:''}</div>${note?`<div class="lrf-activity-message" style="white-space:pre-wrap">${esc(note)}</div>`:''}<div class="lrf-activity-actions"><a class="lrf-activity-link" href="clients.html?edit=${encodeURIComponent(activity.client?.id||'')}">👥 Ouvrir la fiche client</a><a class="lrf-activity-link" href="comptes-rendus.html">📝 Ouvrir les comptes-rendus</a></div>`;
    }
    overlay.hidden=false;
  }

  async function renderActivities(){
    const host=document.getElementById('dash-activities');if(!host)return false;
    const [clients,archives]=await Promise.all([safeCollection('clients'),safeCollection('historique_mail_content')]);const acts=[];
    clients.filter(c=>!c.archived&&!c.archive).forEach(c=>{
      (c.comptes_rendus||c.comptesRendus||[]).forEach(x=>{const d=parseDate(x.date||x.dateCreation);if(d)acts.push({kind:'cr',d,label:x.type||'Compte-rendu',client:c,data:x})});
      (c.historiqueMails||[]).forEach(x=>{const d=parseDate(x.date);if(d)acts.push({kind:'mail',d,label:'Mail envoyé',client:c,data:x,archive:findArchive(x,c,archives)})});
    });
    acts.sort((a,b)=>b.d-a.d);const visible=acts.slice(0,8);host.innerHTML=visible.length?visible.map((a,i)=>`<button type="button" class="activity-row activity-click" data-lrf-activity="${i}"><div><div class="priority-name">${esc(a.label)}</div><div class="priority-meta">${esc(a.client?.societe||'')}</div></div><span class="priority-meta">${a.d.toLocaleDateString('fr-FR')}</span></button>`).join(''):'<div class="dash-empty">Aucune activité enregistrée.</div>';host.querySelectorAll('[data-lrf-activity]').forEach(btn=>btn.addEventListener('click',()=>openActivity(visible[Number(btn.dataset.lrfActivity)])));return true
  }

  async function init(){installStyles();let tries=0;const timer=setInterval(async()=>{tries++;if(document.getElementById('dash-activities')){clearInterval(timer);await renderActivities()}else if(tries>80)clearInterval(timer)},100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}
