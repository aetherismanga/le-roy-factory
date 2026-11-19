'use strict';
const {createHash} = require('node:crypto');
const {failure} = require('./fenice-request-core');
const hash = value => createHash('sha256').update(value).digest('hex');
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const destinations = ['export@saxso.it','jerome@leroyfactory.fr'];

function field(value, max, {required=true,multiline=false}={}) {
  if (value == null && !required) return '';
  const controls = multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/;
  if (typeof value !== 'string' || value.length > max || controls.test(value) || (required && !value.trim())) {
    throw failure('Vérifiez les informations saisies et les champs obligatoires.');
  }
  return value.trim().replace(/\r\n?/g,'\n');
}
function customerDetails(data={}) {
  const store=field(data.store,160), email=field(data.email,254), address=field(data.address,500,{multiline:true});
  const contact=field(data.contact,120), phone=field(data.phone,40);
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email)) throw failure('Adresse e-mail invalide.');
  if (!/^[+()0-9 .-]+$/.test(phone) || phone.replace(/\D/g,'').length < 6) throw failure('Téléphone du contact invalide.');
  return {store,email,address,contact,phone};
}
function checkedId(value) {
  if (typeof value!=='string' || !uuid.test(value)) throw failure('Référence de commande invalide.');
  return value.toLowerCase();
}
function prepareOrder(body, book, sending) {
  const requestId=checkedId(body.requestId), customer=customerDetails(body.customer);
  const comment=field(body.comment,1800,{required:false,multiline:true});
  if (!Array.isArray(body.lines) || !body.lines.length || body.lines.length>100) throw failure('Choisissez de 1 à 100 lignes de commande.');
  const seen=new Set();
  const lines=body.lines.map(item=>{
    const id=item?.variantId, pallets=item?.palettes;
    if (!Number.isSafeInteger(pallets) || pallets<=0 || pallets>999 || seen.has(id)) throw failure('Quantités ou lignes dupliquées à vérifier.');
    seen.add(id);
    const row=book.get(id);
    if (!row || !(row.perPallet>0 && Number.isSafeInteger(row.cents) && row.cents>0)) throw failure('Le tarif ou le conditionnement de cette référence reste à confirmer.');
    const quantity=Math.round(row.perPallet*pallets*10000)/10000;
    return {variantId:id,label:row.label,reference:row.references?.[id] || '',unit:row.unit,perPallet:row.perPallet,palettes:pallets,quantity,unitCents:row.cents,
      weightKg:row.weightPerUnit>0 ? Math.round(row.weightPerUnit*quantity*100)/100 : null,
      cents:Math.round(row.cents*Math.round(quantity*10000)/10000)};
  });
  const pallets=lines.reduce((n,line)=>n+line.palettes,0);
  if (sending && pallets<4) throw failure('Commande à partir de 4 palettes, références panachables.');
  const cents=lines.reduce((n,line)=>n+line.cents,0);
  if (body.expectedTotalCents!=null && body.expectedTotalCents!==cents) throw failure('Le total a changé. Rechargez le tarif avant de valider.',409);
  return {orderId:'SAX-'+requestId.toUpperCase(),requestId,customer,comment,lines,pallets,cents};
}
function crmContacts(client) {
  return [client.interlocuteurs,client.contacts].flatMap(value=>Array.isArray(value)?value:[])
    .filter(contact=>contact && typeof contact==='object');
}
function crmCustomer(client={}, agent={}, contact=crmContacts(client)[0]) {
  const string=value=>typeof value==='string'?value.trim():'';
  const first=(...values)=>values.map(string).find(Boolean)||'';
  const street=first(client.adresseLivraison,client.adresse);
  const city=[first(client.codePostalLivraison,client.codePostal,client.code_postal),first(client.villeLivraison,client.ville)].filter(Boolean).join(' ');
  const delivery=[street,city].filter(Boolean).join('\n');
  const name=[string(contact?.prenom),string(contact?.nom)].filter(Boolean).join(' ');
  const emails=Array.isArray(client.emails)?client.emails.map(e=>typeof e==='string'?e:e?.email||e?.mail):[];
  const phones=Array.isArray(client.telephones)?client.telephones:[];
  return {store:string(client.societe),email:first(contact?.email,contact?.mail,client.email,client.mail,client.eMail,...emails,agent.email),address:delivery,
    contact:first(name,client.contact,client.nom),phone:first(contact?.mobile,contact?.telephone,contact?.fixe,client.telephone,...phones)};
}
function crmSellerProfiles(client,key) {
  return crmContacts(client).map(contact=>{
    const profile=crmCustomer(client,{},contact);
    if(!profile.contact) return null;
    const id=hash(key+'|'+JSON.stringify([contact.id||'',profile.contact,contact.email||contact.mail||'',profile.phone]));
    return {...profile,id:id.slice(0,8)+'-'+id.slice(8,12)+'-5'+id.slice(13,16)+'-a'+id.slice(17,20)+'-'+id.slice(20,32)};
  }).filter(Boolean);
}
module.exports={prepareOrder,crmCustomer,crmSellerProfiles,customerDetails,checkedId,hash,destinations};
