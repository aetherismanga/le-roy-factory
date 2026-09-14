(()=>{
  'use strict';
  if(window.__LRF_CONTACT_IMPORT__)return;
  window.__LRF_CONTACT_IMPORT__=true;

  const $=s=>document.querySelector(s);
  const clean=v=>String(v??'').trim();
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);

  function installStyles(){
    if($('#lrf-contact-import-style'))return;
    const style=document.createElement('style');
    style.id='lrf-contact-import-style';
    style.textContent=`
      .lrf-contact-import-wrap{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0 2px}
      #lrf-import-contact-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:10px 15px;border:1px solid #d4af37;border-radius:12px;background:linear-gradient(180deg,#fffdf7,#f8edc7);color:#493609;font-weight:850;cursor:pointer;box-shadow:0 4px 12px rgba(150,108,13,.10)}
      #lrf-import-contact-btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(150,108,13,.15)}
      #lrf-import-contact-btn:disabled{opacity:.6;cursor:wait;transform:none}
      .lrf-contact-import-help{font-size:.76rem;color:#756b5d;line-height:1.35}
      .lrf-contact-import-status{width:100%;font-size:.8rem;font-weight:750;color:#176b4a;min-height:18px}
      .lrf-ios-contact-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.38);display:flex;align-items:flex-end;justify-content:center;padding:12px;padding-bottom:max(12px,env(safe-area-inset-bottom,0px))}
      .lrf-ios-contact-sheet{width:min(520px,100%);background:#fff;border-radius:24px 24px 18px 18px;padding:20px;box-shadow:0 18px 55px rgba(0,0,0,.28);font-family:inherit}
      .lrf-ios-contact-sheet h3{margin:0 38px 8px 0;font-size:1.2rem;color:#292319}
      .lrf-ios-contact-sheet p{margin:0 0 14px;color:#655d52;line-height:1.4;font-size:.92rem}
      .lrf-ios-contact-actions{display:grid;gap:10px}
      .lrf-ios-contact-actions button{width:100%;min-height:54px;border-radius:15px;border:1px solid #d9c57b;background:linear-gradient(180deg,#fffdf7,#fff4cf);color:#3e3212;font-weight:850;font-size:1rem;padding:11px 14px}
      .lrf-ios-contact-actions button.secondary{min-height:46px;background:#f7f7f7;border-color:#ddd;color:#555;font-size:.9rem;font-weight:750}
      .lrf-ios-contact-close{float:right;width:40px;height:40px;border-radius:50%;border:0;background:#f5f2eb;font-size:1.55rem;line-height:1;cursor:pointer;color:#444;display:grid;place-items:center}
      .lrf-ios-contact-note{margin-top:12px;padding:10px 12px;border-radius:12px;background:#f8f5ed;font-size:.78rem;color:#6e665c;line-height:1.35}
      @media(max-width:760px){
        .lrf-contact-import-wrap{display:grid;grid-template-columns:1fr;margin:10px 0 4px}
        #lrf-import-contact-btn{width:100%;min-height:52px;border-radius:14px;font-size:1rem}
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
      const i=raw.indexOf(':');if(i<0)continue;
      const key=raw.slice(0,i).toUpperCase();
      const value=decodeVcardValue(raw.slice(i+1));
      if(!value)continue;
      if((key==='FN'||key.startsWith('FN;'))&&!out.name)out.name=value;
      else if((key==='N'||key.startsWith('N;'))&&!out.name){
        const p=value.split(';').map(decodeVcardValue);out.name=[p[1],p[0]].filter(Boolean).join(' ');
      }else if(key==='ORG'||key.startsWith('ORG;'))out.org=value.split(';')[0];
      else if(key==='TEL'||key.startsWith('TEL;')){if(!out.phones.includes(value))out.phones.push(value);}
      else if(key==='EMAIL'||key.startsWith('EMAIL;')){if(!out.emails.includes(value))out.emails.push(value);}
      else if(key==='ADR'||key.startsWith('ADR;')){
        const p=value.split(';').map(decodeVcardValue);
        out.street=[p[2],p[1]].filter(Boolean).join(' ');
        out.city=p[3]||'';out.postal=p[5]||'';
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
    if(overwrite||!clean(el.value)){
      el.value=value;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function phoneInputs(){
    const host=$('#phones-container');if(!host)return[];
    return [...host.querySelectorAll('input')].filter(x=>['tel','text'].includes((x.type||'text').toLowerCase()));
  }

  function prepareAppleAutofill(){
    const attrs=[
      ['edit-contact','name'],
      ['edit-email','email'],
      ['edit-societe','organization'],
      ['edit-adresse','street-address'],
      ['edit-code-postal','postal-code'],
      ['edit-ville','address-level2']
    ];
    attrs.forEach(([id,auto])=>{
      const el=document.getElementById(id);if(!el)return;
      el.setAttribute('autocomplete',auto);
      el.setAttribute('autocapitalize',auto==='email'?'off':'words');
    });
    let inputs=phoneInputs();
    if(!inputs.length){$('#btn-add-phone')?.click();inputs=phoneInputs();}
    inputs.forEach(input=>{
      input.type='tel';
      input.setAttribute('autocomplete','tel');
      input.setAttribute('inputmode','tel');
      input.setAttribute('autocapitalize','off');
    });
  }

  function focusAppleContactField(){
    prepareAppleAutofill();
    const input=$('#edit-contact')||phoneInputs()[0]||$('#edit-email');
    if(!input)return;
    input.focus({preventScroll:false});
    setTimeout(()=>input.scrollIntoView({behavior:'smooth',block:'center'}),80);
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
    if(status)status.textContent=`✅ Contact importé${data.name?` : ${data.name}`:''}`;
  }

  async function pickNativeContact(){
    if(!navigator.contacts?.select)return false;
    try{
      let props=['name','email','tel'];
      if(navigator.contacts.getProperties){
        const supported=await navigator.contacts.getProperties();
        props=props.filter(p=>supported.includes(p));
      }
      if(!props.length)return false;
      const rows=await navigator.contacts.select(props,{multiple:false});
      if(rows?.[0]){applyContact(normalizePicked(rows[0]));return true;}
      return true;
    }catch(err){
      if(err?.name==='AbortError')return true;
      console.warn('[Import contact] Sélecteur natif indisponible',err);
      return false;
    }
  }

  function closeIOSSheet(){
    $('#lrf-ios-contact-overlay')?.remove();
  }

  function showIOSFallback(file){
    closeIOSSheet();
    prepareAppleAutofill();
    const overlay=document.createElement('div');
    overlay.id='lrf-ios-contact-overlay';
    overlay.className='lrf-ios-contact-overlay';
    overlay.innerHTML=`
      <div class="lrf-ios-contact-sheet" role="dialog" aria-modal="true" aria-labelledby="lrf-ios-contact-title">
        <button type="button" class="lrf-ios-contact-close" aria-label="Fermer">×</button>
        <h3 id="lrf-ios-contact-title">Ajouter un contact</h3>
        <p>Appuyez ci-dessous, puis choisissez <strong>Remplissage auto → Contact</strong> sur le clavier de l’iPhone.</p>
        <div class="lrf-ios-contact-actions">
          <button type="button" id="lrf-ios-autofill-contact">👤 Choisir un contact iPhone</button>
          <button type="button" id="lrf-ios-vcf-contact" class="secondary">Importer un fichier .vcf</button>
        </div>
        <div class="lrf-ios-contact-note">Nom, e-mail, téléphone et adresse sont préparés automatiquement pour le remplissage Apple.</div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeIOSSheet();});
    overlay.querySelector('.lrf-ios-contact-close')?.addEventListener('click',closeIOSSheet);
    overlay.querySelector('#lrf-ios-autofill-contact')?.addEventListener('click',()=>{
      closeIOSSheet();
      focusAppleContactField();
      const status=$('#lrf-contact-import-status');
      if(status)status.textContent='📱 Sur le clavier : Remplissage auto → Contact';
    });
    overlay.querySelector('#lrf-ios-vcf-contact')?.addEventListener('click',()=>{
      closeIOSSheet();file.value='';file.click();
    });
  }

  function install(){
    const phoneField=$('#phones-container')?.closest('.form-field');
    if(!phoneField||$('#lrf-import-contact-btn'))return;
    installStyles();
    if(isIOS)prepareAppleAutofill();

    const file=document.createElement('input');
    file.type='file';file.id='lrf-contact-file';file.hidden=true;
    file.accept='.vcf,text/vcard,text/x-vcard,text/directory';

    const wrap=document.createElement('div');wrap.className='lrf-contact-import-wrap';
    const help=isIOS?'iPhone : Remplissage auto depuis vos Contacts':'Android : sélection directe des contacts si disponible';
    const label=isIOS?'👤 Ajouter depuis Contacts':'📲 Importer un contact';
    wrap.innerHTML=`<button type="button" id="lrf-import-contact-btn">${label}</button><span class="lrf-contact-import-help">${help}</span><span id="lrf-contact-import-status" class="lrf-contact-import-status"></span>`;
    phoneField.insertBefore(wrap,$('#phones-container'));
    phoneField.appendChild(file);

    const btn=$('#lrf-import-contact-btn');
    btn.addEventListener('click',async()=>{
      btn.disabled=true;
      const status=$('#lrf-contact-import-status');if(status)status.textContent='';
      const handled=await pickNativeContact();
      btn.disabled=false;
      if(handled){if(status&&!status.textContent.startsWith('✅'))status.textContent='';return;}
      if(isIOS){showIOSFallback(file);return;}
      if(status)status.textContent='Choisissez le fichier contact (.vcf).';
      file.value='';file.click();
    });

    file.addEventListener('change',async()=>{
      const selected=file.files?.[0];if(!selected)return;
      const status=$('#lrf-contact-import-status');
      try{
        const text=await selected.text();
        const data=parseVcard(text);
        if(!data.name&&!data.phones.length&&!data.emails.length)throw new Error('Aucun contact lisible');
        applyContact(data);
      }catch(err){
        console.error(err);if(status)status.textContent='❌ Ce fichier contact ne peut pas être lu.';
      }
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  new MutationObserver(()=>install()).observe(document.documentElement,{childList:true,subtree:true});
})();
