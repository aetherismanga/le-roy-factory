import {validateProject} from '../projects.js';
import {quoteProject,money} from './pricing.js';
export const FLOW_KEY='randal-general-flow-v2';
export const QUOTE_KEY='randal-general-quote-project-v2';
export const QUOTE_CONTEXT='randal-general-quote-context-v2';
export const ACTIVE_ID='randal-general-active-project-id-v2';
export const CURRENT_KEY='randal-general-current-project';
export const SAVED_KEY='randal-general-projects';
export const ORDER_TO=['jerome@leroyfactory.fr','coryne@leroyfactory.fr'];
export const clone=value=>JSON.parse(JSON.stringify(value));
export function readStored(storage,key,fallback=null){try{const value=JSON.parse(storage.getItem(key)||'null');return value??fallback;}catch{return fallback;}}
export function checkedProject(project){return clone(validateProject(project));}
export function storeQuote(storage,input,mode='scene'){
 const project=checkedProject(input);
 storage.setItem(CURRENT_KEY,JSON.stringify(project));storage.setItem(QUOTE_KEY,JSON.stringify(project));
 storage.setItem(QUOTE_CONTEXT,JSON.stringify({mode}));storage.setItem(FLOW_KEY,JSON.stringify({view:'quote',step:4}));return project;
}
export function saveComposition(storage,input,{id=null,now=new Date().toISOString()}={}){
 const project=checkedProject(input),title=String(project.title||'Ma salle de bains').trim().slice(0,80)||'Ma salle de bains';project.title=title;
 const stored=readStored(storage,SAVED_KEY,[]),all=Array.isArray(stored)?stored.slice(0,20):[];
 const key=id||'project-'+globalThis.crypto.randomUUID(),saved={id:key,title,date:now,data:project};
 const previous=all.findIndex(p=>p.id===key);if(previous>=0){saved.thumbnail=all[previous].thumbnail;all.splice(previous,1);}
 all.unshift(saved);storage.setItem(SAVED_KEY,JSON.stringify(all.slice(0,20)));storage.setItem(ACTIVE_ID,key);storeQuote(storage,project,readStored(storage,QUOTE_CONTEXT,{mode:'scene'}).mode);return saved;
}
export function orderText(project,{name='',email='',telephone='',adresse='',codePostal='',ville='',siteReference='',client=null,proHT=null,privateCode='',isAdmin=false,kind='order'}={}){
 const p=checkedProject(project),q=quoteProject(p),parts=[kind==='callback'?'DEMANDE DE RAPPEL — RANDAL GÉNÉRAL':'DEMANDE DE COMMANDE — RANDAL GÉNÉRAL',p.title||'Ma salle de bains','Référence chantier : '+(siteReference||p.siteReference||'À renseigner'),''];
 if(client){parts.push(isAdmin?'Administrateur : '+client.societe:'Compte client : '+client.codeClient,'Société : '+(client.societe||''));for(const [label,key]of [['Contact','contact'],['Adresse','adresse'],['Code postal','codePostal'],['Ville','ville'],['E-mail','email'],['Téléphone','telephone']])if(client[key])parts.push(label+' : '+client[key]);}
 for(const [label,value]of [['Contact',name],['E-mail',email],['Téléphone',telephone],['Adresse',adresse],['Code postal',codePostal],['Ville',ville]])if(value)parts.push(label+' : '+String(value).trim());parts.push('');
 for(const r of q.rows)parts.push(r.name,r.detail,'Référence : '+r.ref,'Quantité : 1','Prix : '+money(r.publicTTC),...(r.note?[r.note]:[]),'');
 parts.push('TOTAL COMPOSITION : '+money(q.publicTTC));if(client&&Number.isInteger(proHT)){if(privateCode)parts.push('Code composition : '+privateCode);parts.push('Tarif achat pro : '+money(proHT));}
 if(q.missing.length)parts.push('Sous-total renseigné : '+money(q.subtotal));if(q.excluded.length)parts.push(q.excluded.length+' équipement(s) sans tarif intégré, hors montant mobilier.');parts.push('Revêtements, pose et transport exclus.','Merci de confirmer les références, compatibilités, disponibilités et délais.','Cette demande est soumise à confirmation et ne constitue pas une commande ferme.');return parts.join('\n');
}
export function composeLinks(body,subject){
 const to=ORDER_TO.join(','),params={to,subject,body};
 return {mailto:'mailto:'+to+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body),gmail:'https://mail.google.com/mail/?'+new URLSearchParams({view:'cm',fs:'1',to,su:subject,body}).toString(),outlook:'https://outlook.office.com/mail/deeplink/compose?'+new URLSearchParams(params).toString()};
}
