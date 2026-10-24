import {scanLegacyStorage,recoveryBackup,readRecoveryFile} from './legacy-recovery-core.mjs';
const $=id=>document.getElementById(id),list=$('projects'),status=$('status');
let local,session,accessIssue='';
try{local=window.localStorage;}catch{accessIssue='Le stockage local est bloqué dans ce navigateur.';}
try{session=window.sessionStorage;}catch{accessIssue+=' Le brouillon de cet onglet est inaccessible.';}
const found=scanLegacyStorage(local,session);let entries=found.entries;
const notices=[accessIssue,...found.issues].filter(Boolean);
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function filename(entry,suffix){return 'studio-one-'+String(entry.record.name||entry.index+1).normalize('NFD').replace(/[^a-z0-9]+/gi,'-').slice(0,70)+'-'+suffix+'.json';}
async function convert(entry,box,button){
 button.disabled=true;box.replaceChildren(node('p','Vérification du format, des références et de la géométrie…'));
 try{
  const {convertLegacyRecord,encodeRecoveredProject}=await import('./legacy-recovery-converter.mjs');
  const result=await convertLegacyRecord(entry.record);
  box.replaceChildren(node('p',result.ok?'Conversion proposée — à vérifier avant de l’enregistrer dans le nouvel atelier.':'Conversion automatique indisponible pour ce projet.','result'));
  const ul=node('ul');for(const note of result.notes)ul.append(node('li',note));box.append(ul);
  if(result.ok){
   const save=node('button','Télécharger le projet converti');save.onclick=()=>download(result.project,filename(entry,'converti'));box.append(save);
   const link=node('a','Ouvrir cette copie dans le nouvel atelier','button primary');link.href='studio-one-configurateur.html?page=atelier.html#projet='+encodeRecoveredProject(result.project);link.target='_blank';link.rel='noopener';box.append(link);
   box.append(node('p','L’ouverture transmet uniquement cette copie filtrée au nouvel atelier. Enregistrez-la ensuite dans cet atelier. Téléchargez aussi l’archive historique pour conserver toutes les informations récupérées.','muted'));
  }else box.append(node('p','L’archive historique reste téléchargeable et les données de ce navigateur ne sont pas modifiées.'));
 }catch{box.replaceChildren(node('p','La vérification de conversion est indisponible. Téléchargez l’archive historique ; vos données restent intactes.'));}
 finally{button.disabled=false;}
}
function render(){
 status.textContent=entries.length?entries.length+' projet(s) ou brouillon(s) retrouvé(s) sur cette origine.':'Aucun ancien projet trouvé dans ce navigateur sur cette origine.';
 $('download-all').disabled=!entries.length;list.replaceChildren();
 for(const entry of entries){
  const card=node('article',undefined,'project');card.append(node('h2',entry.record.name||'Projet historique '+(entry.index+1)));
  card.append(node('p',[entry.record.client,entry.record.date,entry.storage==='sessionStorage'?'Brouillon de cet onglet':entry.storage==='file'?'Fichier importé':'Sauvegarde locale'].filter(Boolean).join(' · '),'muted'));
  card.append(node('p',(entry.record.data?.items?.length||0)+' élément(s). '+(entry.record.ambience?.room?'Dimensions de pièce présentes.':'Dimensions de pièce absentes : aucune dimension ne sera inventée.')));
  const actions=node('div',undefined,'actions'),backup=node('button','Télécharger l’archive historique');backup.onclick=()=>download(recoveryBackup([entry]),filename(entry,'archive'));actions.append(backup);
  const button=node('button','Vérifier une conversion');button.disabled=!entry.recognized;const detail=node('div',undefined,'conversion');button.onclick=()=>convert(entry,detail,button);actions.append(button);card.append(actions,detail);
  if(!entry.recognized)card.append(node('p','Format non reconnu pour la conversion : les champs publics récupérables sont disponibles dans l’archive.','muted'));
  list.append(card);
 }
}
$('download-all').onclick=()=>download(recoveryBackup(entries),'studio-one-archives-historiques.json');
$('recovery-file').onchange=async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>20000000)throw Error('Fichier trop volumineux (20 Mo maximum).');const imported=readRecoveryFile(JSON.parse(await file.text()));entries.push(...imported);render();$('file-status').textContent=imported.length+' projet(s) ajouté(s) à cette liste uniquement.';}catch(error){$('file-status').textContent=error.message||'Fichier illisible.';}event.target.value='';};
if(notices.length){$('issues').hidden=false;$('issues').textContent=notices.join(' ');}
render();
