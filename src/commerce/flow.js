import {validateProject} from '../projects.js';
import {quoteProject,money} from './pricing.js';
export const FLOW_KEY='studio-one-flow-v2';
export const QUOTE_KEY='studio-one-quote-project-v2';
export const QUOTE_CONTEXT='studio-one-quote-context-v2';
export const ACTIVE_ID='studio-one-active-project-id-v2';
export const CURRENT_KEY='studio-one-current-project';
export const SAVED_KEY='studio-one-projects';
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
export function orderText(project,{name='',email='',client=null}={}){
 const p=checkedProject(project),q=quoteProject(p),parts=['DEMANDE DE COMMANDE — RANDAL STUDIO ONE',p.title||'Ma salle de bains',''];
 if(client?.codeClient)parts.push('Compte client : '+client.codeClient,'Société : '+(client.societe||''));
 if(name)parts.push('Contact : '+String(name).trim());if(email)parts.push('E-mail : '+String(email).trim());parts.push('');
 q.rows.forEach(r=>parts.push(r.name,r.detail,'Référence : '+r.ref,'Quantité : 1','Prix public TTC : '+money(r.publicTTC),...(r.note?[r.note]:[]),''));
 parts.push('TOTAL MOBILIER PUBLIC TTC : '+money(q.publicTTC),'TVA 20 % incluse.');
 if(q.missing.length)parts.push('Sous-total des lignes renseignées : '+money(q.subtotal));
 if(q.excluded.length)parts.push(q.excluded.length+' équipement(s) ou accessoire(s) sans tarif intégré : hors total mobilier.');
 parts.push('Revêtements, pose et transport exclus.','Merci de confirmer les références, compatibilités, disponibilités et délais.','Cette demande est soumise à confirmation et ne constitue pas une commande ferme.');return parts.join('\n');
}
export function composeLinks(body,subject){
 const to=ORDER_TO.join(','),params={to,subject,body};
 return {mailto:'mailto:'+to+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body),gmail:'https://mail.google.com/mail/?'+new URLSearchParams({view:'cm',fs:'1',to,su:subject,body}).toString(),outlook:'https://outlook.office.com/mail/deeplink/compose?'+new URLSearchParams(params).toString()};
}
