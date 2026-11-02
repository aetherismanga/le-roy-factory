'use strict';
// Studio One's project envelope and validation are reused for the private Anima variant.
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const crypto=require('node:crypto');
const {checkedInput,text,failure,assertEditable,assertRevision}=require('./configurator-projects-core');
const AGENTS=new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
let validator;
async function checkedRecord(input){
  const raw=checkedInput(input);
  if(raw.revision<0)throw failure('Version de projet invalide.');
  if(raw.kind!=='house'){
    validator ||= import('./neobath-anima/studio-adapter/projects.js');
    raw.data=(await validator).validateProject(raw.data);
  }
  raw.title=text(input.title,120)||'Mon projet Neobath Anima';
  return raw;
}
function createNeobathStudioProjectStore({db,sendMail,now=()=>new Date().toISOString()}){
  const collection=db.collection('neobath_anima_studio_projects');
  const checkAgent=a=>{if(!a?.uid||!AGENTS.has(a.email))throw failure('Accès agent requis.',403);};
  async function save(body,agent){
    checkAgent(agent);const raw=await checkedRecord(body.project||body.record),ref=collection.doc(raw.id);
    const record=await db.runTransaction(async tx=>{
      const snap=await tx.get(ref),old=snap.exists?snap.data():null;
      if(old?.deleted)throw failure('Ce projet a été supprimé. Dupliquez votre copie locale.',410);
      assertEditable(old);assertRevision(old,raw.revision);
      if(!old&&raw.revision!==0)throw failure('Ouvrez ou importez ce projet sous un nouveau numéro.',409);
      const date=now();const record={...raw,variant:'neobath-anima',status:'draft',revision:(old?.revision||0)+1,number:old?.number||'ANIMA-'+raw.id.slice(8,16).toUpperCase(),
        date,updatedAt:date,createdAt:old?.createdAt||date,createdBy:old?.createdBy||agent.email,updatedBy:agent.email,remote:true,dirty:false,ownerKey:'neobath-anima-team'};
      tx.set(ref,record);return record;
    });return {success:true,project:record,record};
  }
  async function send(body,agent,order){
    checkAgent(agent);const raw=await checkedRecord(body.record||body.project);
    const recipient=order||body.administrator?'jerome@leroyfactory.fr':text(body.recipient,254);
    if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient))throw failure('Adresse du destinataire invalide.');
    if(order&&!raw.customer.name)throw failure('Renseignez le client avant de préparer la commande.');
    const encoded=JSON.stringify({data:raw.data,title:raw.title,recipient,order});
    const operationId=typeof body.operationId==='string'&&/^[a-zA-Z0-9-]{8,100}$/.test(body.operationId)?body.operationId:'';
    const operation=crypto.createHash('sha256').update(encoded+':'+operationId).digest('hex');
    const opRef=db.collection('neobath_anima_mail_receipts').doc(operation);
    const hour=String(Math.floor(Date.parse(now())/3600000));
    const rate=db.collection('neobath_anima_mail_limits').doc(agent.uid+'-'+hour);
    const prior=await db.runTransaction(async tx=>{
      const op=(await tx.get(opRef)).data();if(op?.status==='sent')return op;
      if(op?.status==='sending'||op?.status==='uncertain')throw failure('Un envoi de ce projet est déjà en cours ou doit être vérifié avant de le relancer.',409);
      const count=(await tx.get(rate)).data()?.count||0;if(count>=12)throw failure('Douze envois par heure maximum. Réessayez plus tard.',429);
      if(order){const current=(await tx.get(collection.doc(raw.id))).data();assertEditable(current);assertRevision(current,raw.revision);tx.set(collection.doc(raw.id),{...(current||raw),status:'sending',mailOperation:operation,updatedAt:now()});}
      tx.set(rate,{count:count+1,updatedAt:now()});tx.set(opRef,{status:'sending',createdAt:now(),projectId:raw.id,recipient,order});return null;
    });
    if(prior)return {success:true,delivered:true,number:prior.number};
    const number=/^(?:LOCAL-[a-zA-Z0-9-]{1,70}|LRF-\d{4}-\d{6}|ANIMA-[a-zA-Z0-9-]{4,80})$/.test(body.record?.number||'')?body.record.number:'ANIMA-'+raw.id.slice(8,16).toUpperCase();
    const portable={format:'lrf-project',version:1,variant:'neobath-anima',record:{...raw,number,status:'draft',revision:0}};
    const mail={from:{name:'Neobath Anima · Le Roy Factory',address:'jerome@leroyfactory.fr'},to:recipient,replyTo:agent.email,
      subject:(order?'COMMANDE':'PROJET')+' NEOBATH ANIMA — '+raw.title.replace(/[\r\n]/g,' ')+' — '+number,
      text:['NEOBATH ANIMA · LE ROY FACTORY','Projet : '+number,'Nom : '+raw.title,'Client / chantier : '+(raw.customer.name||'À renseigner'),'Référence chantier : '+(raw.customer.site||raw.data.siteReference||''),'',order?'Demande de commande transmise par le compte agent vérifié. Les références, tarifs, compatibilités et disponibilités restent soumis à confirmation fabricant.':'Projet de configuration en pièce jointe. Pour le reprendre : Mes projets → Importer.','Le fichier ne contient aucun identifiant de connexion.'].join('\n'),
      attachments:[{filename:number+'.anima.lrf3d.json',content:JSON.stringify(portable,null,2),contentType:'application/json'}]};
    try{
      let result;
      if(sendMail)result=await sendMail(mail);
      else{
        if(!process.env.SMTP_PASSWORD_JEROME)throw Object.assign(failure('Le service de messagerie est indisponible. Votre projet est conservé.',503),{code:'SMTP_NOT_CONFIGURED'});
        const transport=require('nodemailer').createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:'jerome@leroyfactory.fr',pass:process.env.SMTP_PASSWORD_JEROME},connectionTimeout:15000,socketTimeout:30000});
        result=await transport.sendMail(mail);
      }
      if(!result.accepted?.length)throw Object.assign(failure('Le serveur de messagerie n’a pas accepté cet envoi.',503),{code:'EENVELOPE'});
      await opRef.set({status:'sent',number,projectId:raw.id,recipient,order,messageId:text(result.messageId,200),sentAt:now()});
      if(order)await db.runTransaction(async tx=>{const ref=collection.doc(raw.id),current=(await tx.get(ref)).data();if(current?.mailOperation!==operation)return;const {mailOperation,...rest}=current;tx.set(ref,{...rest,number,status:'validated',revision:(current.revision||0)+1,validatedAt:now(),updatedAt:now(),updatedBy:agent.email});});
      return {success:true,delivered:true,number};
    }catch(error){
      const rejected=['EAUTH','EENVELOPE','EMESSAGE','SMTP_NOT_CONFIGURED'].includes(error.code);
      await opRef.set({status:rejected?'rejected':'uncertain',number,projectId:raw.id,recipient,order,updatedAt:now()});
      if(order&&rejected)await db.runTransaction(async tx=>{const ref=collection.doc(raw.id),current=(await tx.get(ref)).data();if(current?.mailOperation!==operation)return;const {mailOperation,...rest}=current;tx.set(ref,{...rest,status:'draft',updatedAt:now()});});
      throw failure(rejected?'Envoi refusé. Votre projet est conservé et peut être renvoyé.':'Envoi non confirmé. Vérifiez sa réception avant de réessayer.',503);
    }
  }
  return {
    async ['projects-list'](_body,agent){checkAgent(agent);const snapshot=await collection.orderBy('updatedAt','desc').limit(200).get();const rows=snapshot.docs.map(d=>d.data());return {success:true,projects:rows.filter(r=>!r.deleted),deletedIds:rows.filter(r=>r.deleted).map(r=>r.id)};},
    ['projects-save']:save,
    async ['projects-delete'](body,agent){checkAgent(agent);if(!/^project-[a-zA-Z0-9-]{6,80}$/.test(body.id||'')||!Number.isSafeInteger(body.revision)||body.revision<0)throw failure('Projet ou version invalide.');const ref=collection.doc(body.id);await db.runTransaction(async tx=>{const snap=await tx.get(ref),old=snap.exists?snap.data():null;if(old?.deleted)return;assertEditable(old);assertRevision(old,body.revision);tx.set(ref,{id:body.id,deleted:true,revision:(old?.revision||0)+1,updatedAt:now(),updatedBy:agent.email});});return {success:true,id:body.id};},
    ['projects-email']:(body,agent)=>send(body,agent,false),
    ['projects-order']:(body,agent)=>send(body,agent,true)
  };
}
module.exports={createNeobathStudioProjectStore,checkedRecord};
