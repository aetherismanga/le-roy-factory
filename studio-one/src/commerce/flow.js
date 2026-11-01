import {translateText as t} from '../../../shared/lrf-3d/i18n/index.js';
import {drawerDescription} from '../../../shared/lrf-3d/drawer-options.js';
import {validateProject} from '../projects.js';
import {quoteProject,money} from './pricing.js';
import {withPartnerReferral,partnerForProject,callbackRecipients} from './partner-context.js';
export const FLOW_KEY='studio-one-flow-v2';
export const QUOTE_KEY='studio-one-quote-project-v2';
export const QUOTE_CONTEXT='studio-one-quote-context-v2';
export const ACTIVE_ID='studio-one-active-project-id-v2';
export const CURRENT_KEY='studio-one-current-project';
export const SAVED_KEY='studio-one-projects';
export const ORDER_TO=['jerome@leroyfactory.fr','coryne@leroyfactory.fr'];
export const clone=value=>JSON.parse(JSON.stringify(value));
export function readStored(storage,key,fallback=null){try{const value=JSON.parse(storage.getItem(key)||'null');return value??fallback;}catch{return fallback;}}
export function checkedProject(project){return clone(withPartnerReferral(validateProject(project)));}
export function storeQuote(storage,input,mode='scene'){
 const project=checkedProject(input);
 storage.setItem(CURRENT_KEY,JSON.stringify(project));storage.setItem(QUOTE_KEY,JSON.stringify(project));
 storage.setItem(QUOTE_CONTEXT,JSON.stringify({mode}));storage.setItem(FLOW_KEY,JSON.stringify({view:'quote',step:4}));return project;
}
export function saveComposition(storage,input,{id=null,now=new Date().toISOString()}={}){
 const project=checkedProject(input),title=String(project.title||'Ma salle de bains').trim().slice(0,80)||'Ma salle de bains';project.title=title;
 const stored=readStored(storage,SAVED_KEY,[]),all=Array.isArray(stored)?stored.slice():[];
 const prior=Array.isArray(stored)?stored.find(p=>p.id===id):null;if(prior&&['validated','sending'].includes(prior.status))throw Error('Projet validé : dupliquez-le pour le modifier.');
 const key=id||'project-'+globalThis.crypto.randomUUID(),saved={...(prior||{}),id:key,title,date:now,data:project,status:'draft',revision:prior?.revision||0,dirty:true,number:prior?.number||'LOCAL-'+key.slice(-8).toUpperCase()};
 const previous=all.findIndex(p=>p.id===key);if(previous>=0){saved.thumbnail=all[previous].thumbnail;all.splice(previous,1);}
 all.unshift(saved);storage.setItem(SAVED_KEY,JSON.stringify(all));storage.setItem(ACTIVE_ID,key);storeQuote(storage,project,readStored(storage,QUOTE_CONTEXT,{mode:'scene'}).mode);return saved;
}
export function orderText(project,{name='',email='',telephone='',adresse='',codePostal='',ville='',siteReference='',client=null,proHT=null,privateCode='',isAdmin=false,kind='order'}={}){
 const p=checkedProject(project),q=quoteProject(p),parts=[kind==='callback'?t('DEMANDE DE RAPPEL — STUDIO ONE'):t('DEMANDE DE COMMANDE — STUDIO ONE'),p.title||t('Ma salle de bains'),t('Référence chantier : ')+(siteReference||p.siteReference||t('À renseigner')),''];
 const partner=partnerForProject(p);if(partner)parts.push('Origine de la demande : '+partner.name,'Projet créé depuis le lien du site '+partner.name+'.','Site partenaire : '+partner.website,'');
 if(client){parts.push(isAdmin?t('Administrateur : ')+client.societe:t('Compte client : ')+client.codeClient,t('Société : ')+(client.societe||''));for(const [label,key]of [['Contact','contact'],['Adresse','adresse'],['Code postal','codePostal'],['Ville','ville'],['E-mail','email'],['Téléphone','telephone']])if(client[key])parts.push(t(label)+' : '+client[key]);}
 for(const [label,value]of [['Contact',name],['E-mail',email],['Téléphone',telephone],['Adresse',adresse],['Code postal',codePostal],['Ville',ville]])if(value)parts.push(t(label)+' : '+String(value).trim());parts.push('');
 for(const r of q.rows)parts.push(t(r.name),t(r.detail)+t(drawerDescription(p,q.rows,r)),t('Référence : ')+r.ref,t('Quantité : 1'),t('Prix : ')+money(r.publicTTC),...(r.note?[t(r.note)]:[]),'');
 parts.push(t('TOTAL COMPOSITION : ')+money(q.publicTTC));if(client&&privateCode)parts.push(t('Code composition : ')+privateCode);
 if(q.missing.length)parts.push(t('Sous-total renseigné : ')+money(q.subtotal));if(q.excluded.length)parts.push(q.excluded.length+t(' équipement(s) sans tarif intégré, hors montant mobilier.'));parts.push(t('Revêtements, pose et transport exclus.'),t('Merci de confirmer les références, compatibilités, disponibilités et délais.'),t('Cette demande est soumise à confirmation et ne constitue pas une commande ferme.'));return parts.join('\n');
}
export function composeLinks(body,subject,{project=null}={}){
 const partner=partnerForProject(project);if(partner)subject='['+partner.name+'] '+subject;
 const to=callbackRecipients(project,ORDER_TO).join(','),params={to,subject,body};
 return {mailto:'mailto:'+to+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body),gmail:'https://mail.google.com/mail/?'+new URLSearchParams({view:'cm',fs:'1',to,su:subject,body}).toString(),outlook:'https://outlook.office.com/mail/deeplink/compose?'+new URLSearchParams(params).toString()};
}
