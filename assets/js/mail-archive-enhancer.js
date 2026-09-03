import { db } from './firebase.js';
import { addDoc, collection } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

if(!window.__LRF_MAIL_ARCHIVE_ENHANCER__){
  window.__LRF_MAIL_ARCHIVE_ENHANCER__=true;
  const previousFetch=window.fetch.bind(window);
  const SEND_URL='https://us-central1-le-roy-factory.cloudfunctions.net/sendGroupEmail';

  window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:String(input?.url||'');
    let outgoing=null;
    if(url===SEND_URL&&String(init?.method||'GET').toUpperCase()==='POST'&&typeof init?.body==='string'){
      try{outgoing=JSON.parse(init.body)}catch(_){outgoing=null}
    }
    const response=await previousFetch(input,init);
    if(outgoing&&response.ok&&outgoing.htmlContent){
      try{
        const result=await response.clone().json();
        if(result?.success){
          const recipients=Array.isArray(outgoing.bccRecipients)?outgoing.bccRecipients:[];
          const senderMode=outgoing.senderMode||'jerome';
          const sender=senderMode==='coryne'?'coryne@leroyfactory.fr':senderMode==='both'?'jerome@leroyfactory.fr & coryne@leroyfactory.fr':'jerome@leroyfactory.fr';
          await addDoc(collection(db,'historique_mail_content'),{
            date:new Date().toISOString(),
            expediteur:sender,
            senderMode,
            objet:String(outgoing.subject||''),
            destinataires:recipients,
            nbDestinataires:recipients.length,
            htmlContent:String(outgoing.htmlContent||''),
            attachments:(outgoing.attachments||[]).map(a=>({filename:a?.filename||'',contentType:a?.contentType||'',size:Number(a?.size)||0,inline:!!a?.inline})),
            sourcePage:location.pathname.split('/').pop()||'',
            statut:'Succès'
          });
        }
      }catch(error){
        console.warn('Archivage détaillé du mail impossible',error);
      }
    }
    return response;
  };
}
