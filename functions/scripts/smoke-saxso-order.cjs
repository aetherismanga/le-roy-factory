'use strict';
const admin=require('firebase-admin');
const {randomUUID}=require('node:crypto');
const {PDFDocument}=require('pdf-lib');
const {eligibleProClient,depFromCp}=require('../pro-client-access.cjs');
const {rows}=require('../../assets/data/saxso-net-index.json');
admin.initializeApp({projectId:'le-roy-factory'});
const endpoint='https://us-central1-le-roy-factory.cloudfunctions.net/saxsoOrder';
const headers={Origin:'https://leroyfactory.fr','Content-Type':'application/json'};
const post=body=>fetch(endpoint,{method:'POST',headers,body:JSON.stringify(body)});
async function main(){
  const unauthorized=await post({action:'pdf'});
  if(unauthorized.status!==401)throw Error('Contrôle des accès PRO inattendu : '+unauthorized.status);
  const docs=await admin.firestore().collection('clients').where('partenaires','array-contains','saxso').get();
  const client=docs.docs.map(doc=>doc.data()).find(data=>eligibleProClient(data,data.departement||depFromCp(data.codePostal||data.code_postal)));
  if(!client) throw Error('Aucun compte actif pour vérifier la lecture.');
  const credentials={codeClient:client.codeClient,departement:client.departement||depFromCp(client.codePostal||client.code_postal)};
  const prof=await post({...credentials,action:'profile'});
  if(prof.status!==200 || !(await prof.json()).customer) throw Error('Vérification de la lecture du profil impossible : '+prof.status);
  const item=rows.find(row=>row.label.startsWith('Desert Light') && row.variantIds.length);
  const result=await post({...credentials,action:'pdf',requestId:randomUUID(),lines:[{variantId:item.variantIds[0],palettes:1}],comment:'Vérification de lecture.',customer:{store:'Vérification',address:'Adresse de contrôle',email:'test@example.invalid',contact:'Contrôle PDF',phone:'0102030405'}});
  if(result.status!==200) throw Error('Vérification de lecture du PDF impossible : '+result.status);
  const pdf=await PDFDocument.load(await result.arrayBuffer());
  if(pdf.getPageCount()<1) throw Error('Réponse PDF invalide.');
  console.log('Profile and PDF verified with a permitted customer. No order or email sent.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
