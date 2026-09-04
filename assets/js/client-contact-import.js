(()=>{
  'use strict';
  if(window.__LRF_CONTACT_IMPORT__)return;
  window.__LRF_CONTACT_IMPORT__=true;

  const $=s=>document.querySelector(s);
  const clean=v=>String(v??'').trim();

  function installStyles(){
    if($('#lrf-contact-import-style'))return;
    const style=document.createElement('style');
    style.id='lrf-contact-import-style';
    style.textContent=`
      .lrf-contact-import-wrap{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0 2px}
      #lrf-import-contact-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:9px 14px;border:1px solid #d4af37;border-radius:10px;background:linear-gradient(180deg,#fffaf0,#f7e5ad);color:#493609;font-weight:850;cursor:pointer;box-shadow:0 4px 12px rgba(150,108,13,.10)}
      #lrf-import-contact-btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(150,108,13,.15)}
      #lrf-import-contact-btn:disabled{opacity:.6;cursor:wait;transform:none}
      .lrf-contact-import-help{font-size:.75rem;color:#756b5d;line-height:1.35}
      .lrf-contact-import-status{width:100%;font-size:.78rem;font-weight:750;color:#176b4a;min-height:18px}
      @media(max-width:760px){
        .lrf-contact-import-wrap{display:grid;grid-template-columns:1fr;margin:10px 0 4px}
        #lrf-import-contact-btn{width:100%;min-height:50px;border-radius:14px;font-size:1rem}
        .lrf-contact-import-help{text-align:center;font-size:.72rem}
      }
    `;
    document.head.appendChild(style);
  }

  function decodeVcardValue(v=''){
    return v.replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\').trim();
  }

  function unfoldVcard(text=''){
    return text.replace(/\r\n[ \t]/g,'').replace(/\n[ \t]/g,'').replace(/\r/g,'');
  }

  function parseVcard(text=''){
    const lines=unfoldVcard(text).split('\n');
    const out={name:'',org:'',emails:[],phones:[],street:'',city:'',postal:''};
    for(const raw of lines){
      const i=raw.indexOf(':'); if(i<0)continue;
      const key=raw.slice(0,i).toUpperCase();
      const value=decodeVcardValue(raw.slice(i+1));
      if(!value)continue;
      if((key==='FN'||key.startsWith('FN;'))&&!out.name)out.name=value;
      else if((key==='N'||key.startsWith('N;'))&&!out.name){
        const p=value.split(';').map(decodeVcardValue);out.name=[p[1],p[0]].filter(Boolean).join(' ');
      }
      else if(key==='ORG'||key.startsWith('ORG;'))out.org=value.split(';')[0];
      else if(key==='TEL'||key.startsWith('TEL;')){if(!out.phones.includes(value))out.phones.push(value);}
      else if(key==='EMAIL'||key.startsWith('EMAIL;')){if(!out.emails.includes(value))out.emails.push(value);}
      else if(key==='ADR'||key.startsWith('ADR;')){
        const p=value.split(';').map(decodeVcardValue);
        out.street=[p[2],p[1]].filter(Boolean).join(' ');
        out.city=p[3]||'';
        out.postal=p[5]||'';
      }
    }
    return out;
  }

  function normalizePicked(contact={}){
    const name=Array.isArray(contact.name)?contact.name[0]:contact.name;
    const email=Array.isArray(contact.email)?contact.email:contact.email?[contact.email]:[];
    const tel=Array.isArray(contact.tel)?contact.tel:contact.tel?[contact.tel]:[];
    return {name:clean(name),org:'',emails:email.map(clean).filter(Boolean),phones:tel.map(clean).filter(Boolean),street:'',city:'',postal:''};
  }

  function setValue(id,value,overwrite=false){
    const el=document.getElementById(id);if(!el||!clean(value))return;
    if(overwrite||!clean(el.value)){el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  }

  function phoneInputs(){
    const host=$('#phones-container');if(!host)return[];
    return [...host.querySelectorAll('input')].filter(x=>['tel','text'].includes((x.type||'text').toLowerCase()));
  }

  function fillPhones(phones=[]){
    const vals=[...new Set(phones.map(clean).filter(Boolean))];if(!vals.length)return;
    let inputs=phoneInputs();
    if(!inputs.length){$('#btn-add-phone')?.click();inputs=phoneInputs();}
    vals.forEach((value,index)=>{
      while(inputs.length<=index){$('#btn-add-phone')?.click();inputs=phoneInputs();if(inputs.length<=index)break;}
      const input=inputs[index];if(input){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
    });
  }

  function applyContact(data){
    if(!data)return;
    setValue('edit-contact',data.name,true);
    if(data.emails?.[0])setValue('edit-email',data.emails[0],true);
    if(data.org)setValue('edit-societe',data.org,false);
    if(data.street)setValue('edit-adresse',data.street,false);
    if(data.postal)setValue('edit-code-postal',data.postal,false);
    if(data.city)setValue('edit-ville',data.city,false);
    fillPhones(data.phones||[]);
    const status=$('#lrf-contact-import-status');
    if(status)status.textContent=`✅ Contact importé${data.name?` : ${data.name}`:''}${data.phones?.length?` · ${data.phones.length} téléphone${data.phones.length>1?'s':''}`:''}`;
  }

  async function pickNativeContact(){
    if(!navigator.contacts?.select)return false;
    try{
      const rows=await navigator.contacts.select(['name','email','tel'],{multiple:false});
      if(rows?.[0]){applyContact(normalizePicked(rows[0]));return true;}
      return true;
    }catch(err){
      if(err?.name==='AbortError')return true;
      console.warn('[Import contact] Sélecteur natif indisponible',err);
      return false;
    }
  }

  function install(){
    const phoneField=$('#phones-container')?.closest('.form-field');
    if(!phoneField||$('#lrf-import-contact-btn'))return;
    installStyles();

    const file=document.createElement('input');
    file.type='file';file.id='lrf-contact-file';file.hidden=true;
    file.accept='.vcf,text/vcard,text/x-vcard,text/directory';

    const wrap=document.createElement('div');wrap.className='lrf-contact-import-wrap';
    wrap.innerHTML=`<button type="button" id="lrf-import-contact-btn">📲 Importer un contact</button><span class="lrf-contact-import-help">Android : sélection directe si disponible · iPhone : fichier contact .vcf</span><span id="lrf-contact-import-status" class="lrf-contact-import-status"></span>`;
    phoneField.insertBefore(wrap,$('#phones-container'));
    phoneField.appendChild(file);

    const btn=$('#lrf-import-contact-btn');
    btn.addEventListener('click',async()=>{
      btn.disabled=true;
      const status=$('#lrf-contact-import-status');if(status)status.textContent='Ouverture des contacts…';
      const handled=await pickNativeContact();
      btn.disabled=false;
      if(!handled){if(status)status.textContent='Choisissez le fichier contact (.vcf).';file.value='';file.click();}
      else if(status&&!status.textContent.startsWith('✅'))status.textContent='';
    });

    file.addEventListener('change',async()=>{
      const selected=file.files?.[0];if(!selected)return;
      const status=$('#lrf-contact-import-status');
      try{
        const text=await selected.text();
        const data=parseVcard(text);
        if(!data.name&&!data.phones.length&&!data.emails.length)throw new Error('Aucun contact lisible');
        applyContact(data);
      }catch(err){console.error(err);if(status)status.textContent='❌ Ce fichier contact ne peut pas être lu.';}
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  new MutationObserver(()=>install()).observe(document.documentElement,{childList:true,subtree:true});
})();
