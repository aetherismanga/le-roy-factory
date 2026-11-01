// Partner attribution is public presentation data, never an account or an entitlement.
import {sessionStorage} from '../../../shared/lrf-3d/demo-session.js';

const KEY='studio-one-partner-entry-v1';
const MAX_AGE=4*60*60*1000;
const PARTNERS=Object.freeze({
 cerastone:Object.freeze({id:'cerastone',name:'CeraStone',website:'https://www.cera-stone.fr/',returnURL:'https://cera-stone-atelier.ccjacou.chatgpt.site/#studio',recipient:'jerome@leroyfactory.fr'})
});
export const knownPartner=id=>typeof id==='string'?PARTNERS[id.toLowerCase()]||null:null;

export function createPartnerContext({url=globalThis.location?.href,storage=sessionStorage,now=()=>Date.now()}={}){
 let partner=null;
 try{
  const params=new URL(url).searchParams;
  if(params.has('partner')){
   partner=knownPartner(params.get('partner'));
   if(partner)storage.setItem(KEY,JSON.stringify({id:partner.id,enteredAt:now()}));else storage.removeItem(KEY);
   return partner;
  }
  const previous=JSON.parse(storage.getItem(KEY)||'null'),age=now()-previous?.enteredAt;
  if(previous&&Number.isFinite(age)&&age>=0&&age<MAX_AGE)partner=knownPartner(previous.id);
  else if(previous)storage.removeItem(KEY);
 }catch{}
 return partner;
}
const context=createPartnerContext();
export const currentPartner=()=>context;
export function partnerForProject(project){
 if(project?.referral)return knownPartner(project.referral.partnerId);
 return context;
}
export function withPartnerReferral(project,partner=partnerForProject(project)){
 if(!partner)return project;
 return {...project,referral:{version:1,partnerId:partner.id,partnerName:partner.name,sourceWebsite:partner.website}};
}
export function callbackRecipients(project,fallback){const partner=partnerForProject(project);return partner?[partner.recipient]:fallback;}
export function mountPartnerBranding(){
 const partner=context;if(!partner||typeof document==='undefined')return;
 const description=document.querySelector('.landing-description');
 if(description)description.textContent=partner.name+' vous accompagne dans votre projet de salle de bains.';
 const signature=document.querySelector('.brand-signature');if(signature)signature.textContent=partner.name+' · LE ROY FACTORY';
 const back=document.getElementById('quit-configurator');if(back){back.href=partner.returnURL;back.target='_top';back.textContent='← '+partner.name;back.title='Retour à '+partner.name;back.setAttribute('aria-label','Retour au site '+partner.name);}
}
