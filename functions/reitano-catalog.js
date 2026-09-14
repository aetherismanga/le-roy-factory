
const { onRequest } = require('firebase-functions/v2/https');
const nodemailer = require('nodemailer');
const { clientFromSessionToken } = require('./pro-session');
const { getAgentFromRequest } = require('./auth');
const catalogue = require('./reitano-products.json');

const ALLOWED = new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr']);
const RECIPIENTS = ['jerome@leroyfactory.fr','coryne@leroyfactory.fr'];
const attempts = new Map();
function cors(req,res){const origin=String(req.headers.origin||'');res.set('Access-Control-Allow-Origin',ALLOWED.has(origin)?origin:'https://leroyfactory.fr');res.set('Vary','Origin');res.set('Access-Control-Allow-Headers','Content-Type, Authorization');res.set('Access-Control-Allow-Methods','POST, OPTIONS');res.set('Cache-Control','no-store, private');if(req.method==='OPTIONS'){res.status(204).send('');return true}return false}
function clean(value,max=160){return String(value??'').trim().slice(0,max)}
function esc(value){return clean(value,1200).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function validEmail(value){return /^\S+@\S+\.\S+$/.test(clean(value,180))}
function compact(value){return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function partnerAccess(client){const list=Array.isArray(client?.partenaires)?client.partenaires:[];return list.some(value=>['reitano','reitanorubinetterie'].includes(compact(value)))}
function prices(){const result={};Object.values(catalogue.products).forEach(product=>{result[product.key]=Math.round(product.sourceHT*.5*100)/100});return result}
function customer(client){return{clientId:client.id,codeClient:clean(client.codeClient,30).toUpperCase(),societe:clean(client.societe||'Client professionnel'),contact:clean(client.contact||client.nomContact||''),email:clean(client.email||client.mail||'').toLowerCase(),telephone:clean(client.telephone||client.tel||'',50)}}
function limiter(req){const key=clean(req.ip||req.headers['x-forwarded-for']||'unknown',100),now=Date.now(),recent=(attempts.get(key)||[]).filter(time=>now-time<3600000);if(recent.length>=8)return false;recent.push(now);attempts.set(key,recent);return true}
async function auth(req){const agent=await getAgentFromRequest(req);if(agent)return{admin:true,customer:{clientId:'admin',codeClient:'ADMIN',societe:agent.email==='jerome@leroyfactory.fr'?'Jérôme Hugol':'Coryne',contact:'Administrateur LE ROY FACTORY',email:agent.email,telephone:''}};const result=await clientFromSessionToken(req.body?.sessionToken,{renew:true});if(!result||!partnerAccess(result.client))return null;return{admin:false,customer:customer(result.client),client:result.client}}
function transporter(){const pass=process.env.SMTP_PASSWORD_JEROME;if(!pass)throw new Error('Secret SMTP indisponible.');return nodemailer.createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:'jerome@leroyfactory.fr',pass}})}
function fr(value){return Number(value).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}

exports.reitanoCatalog=onRequest({region:'us-central1',timeoutSeconds:60,memory:'256MiB',secrets:['SMTP_PASSWORD_JEROME']},async(req,res)=>{
  if(cors(req,res))return;
  if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
  const action=clean(req.body?.action,20).toLowerCase();
  try{
    if(action==='dealer'){
      if(!limiter(req)||clean(req.body?.societe_web))return res.status(429).json({success:false,error:'Merci de patienter avant une nouvelle demande.'});
      const body=req.body||{},nom=clean(body.nom,80),prenom=clean(body.prenom,80),ville=clean(body.ville,100),cp=clean(body.codePostal,5),telephone=clean(body.telephone,40),mail=clean(body.email,180).toLowerCase();
      if(!nom||!prenom||!ville||!/^\d{5}$/.test(cp)||!telephone||!validEmail(mail))return res.status(400).json({success:false,error:'Merci de compléter et valider tous les champs.'});
      const requested=body.product||{},product=catalogue.products[clean(requested.key,80)],publicTTC=product?Math.round(product.sourceHT*1.2*100)/100:null;
      const html=`<div style="font-family:Arial,sans-serif;color:#202225;line-height:1.55"><h2>Demande de magasin revendeur REITANO</h2><p><strong>Contact :</strong> ${esc(prenom)} ${esc(nom)}<br><strong>Localisation :</strong> ${esc(cp)} ${esc(ville)}<br><strong>Téléphone :</strong> ${esc(telephone)}<br><strong>E-mail :</strong> ${esc(mail)}</p><h3>Produit consulté</h3><p><strong>${esc(product?.name||requested.name||'Produit REITANO')}</strong><br>Référence : ${esc(product?.orderReference||requested.orderReference||requested.reference||'non renseignée')}<br>Collection : ${esc(product?.collection||requested.collection||'REITANO 2026')}<br>Prix public TTC : ${publicTTC==null?'sur demande':esc(fr(publicTTC))}</p><p>Merci de rechercher le revendeur le plus adapté à cette localisation.</p></div>`;
      await transporter().sendMail({from:'"Jérôme & Coryne - Le Roy Factory" <jerome@leroyfactory.fr>',to:RECIPIENTS,replyTo:mail,subject:`Revendeur REITANO — ${cp} ${ville} — ${product?.orderReference||requested.reference||'demande générale'}`,html});
      return res.json({success:true});
    }
    const identity=await auth(req);
    if(!identity)return res.status(401).json({success:false,error:'Accès REITANO non autorisé ou session expirée.'});
    if(action==='context')return res.json({success:true,admin:identity.admin,customer:identity.customer,prices:prices()});
    if(action!=='order')return res.status(400).json({success:false,error:'Action inconnue.'});
    if(identity.admin)return res.status(400).json({success:false,error:'Connectez le compte LRF du client pour envoyer sa commande.'});
    const raw=Array.isArray(req.body?.items)?req.body.items:[];
    if(!raw.length||raw.length>80)return res.status(400).json({success:false,error:'Le panier doit contenir entre 1 et 80 références.'});
    const items=[];
    for(const line of raw){const productKey=clean(line.key,80),product=catalogue.products[productKey],quantity=Math.floor(Number(line.quantity));if(!product)return res.status(400).json({success:false,error:`Référence non tarifée : ${clean(line.orderReference||line.reference,50)}.`});if(!Number.isFinite(quantity)||quantity<1||quantity>999)return res.status(400).json({success:false,error:`Quantité incorrecte pour ${product.orderReference}.`});const unitHT=Math.round(product.sourceHT*.5*100)/100;items.push({...product,quantity,unitHT,totalHT:Math.round(unitHT*quantity*100)/100})}
    const subtotal=Math.round(items.reduce((sum,item)=>sum+item.totalHT,0)*100)/100,vat=Math.round(subtotal*.2*100)/100,total=Math.round((subtotal+vat)*100)/100,note=clean(req.body?.note,800);
    const rows=items.map(item=>`<tr><td style="border:1px solid #ddd;padding:7px">${esc(item.name)}<br><small>${esc(item.finish)}</small></td><td style="border:1px solid #ddd;padding:7px">${esc(item.orderReference)}</td><td style="border:1px solid #ddd;padding:7px;text-align:center">${item.quantity}</td><td style="border:1px solid #ddd;padding:7px;text-align:right">${esc(fr(item.unitHT))}</td><td style="border:1px solid #ddd;padding:7px;text-align:right"><strong>${esc(fr(item.totalHT))}</strong></td></tr>`).join('');
    const c=identity.customer,html=`<div style="font-family:Arial,sans-serif;color:#202225;line-height:1.5"><h2>Commande REITANO</h2><p><strong>${esc(c.societe)}</strong> — ${esc(c.codeClient)}<br>${esc(c.contact)}${c.email?`<br>${esc(c.email)}`:''}${c.telephone?`<br>${esc(c.telephone)}`:''}</p><table style="width:100%;border-collapse:collapse"><thead><tr><th>Produit</th><th>Référence</th><th>Qté</th><th>PU HT</th><th>Total HT</th></tr></thead><tbody>${rows}</tbody></table><p style="text-align:right"><strong>Sous-total HT : ${esc(fr(subtotal))}<br>TVA 20 % : ${esc(fr(vat))}<br>Total TTC : ${esc(fr(total))}</strong></p>${note?`<p><strong>Observations :</strong><br>${esc(note)}</p>`:''}<p>Commande à contrôler et transmettre selon le circuit REITANO défini par LE ROY FACTORY.</p></div>`;
    await transporter().sendMail({from:'"Jérôme & Coryne - Le Roy Factory" <jerome@leroyfactory.fr>',to:RECIPIENTS,replyTo:c.email&&validEmail(c.email)?c.email:'jerome@leroyfactory.fr',subject:`Commande REITANO — ${c.societe} — ${items.length} référence${items.length>1?'s':''}`,html});
    return res.json({success:true,subtotal,vat,total});
  }catch(error){console.error('REITANO CATALOG',error);return res.status(500).json({success:false,error:'Le service REITANO est momentanément indisponible.'})}
});
