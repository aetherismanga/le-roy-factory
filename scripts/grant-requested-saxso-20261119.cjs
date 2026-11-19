'use strict';
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const targets=[
  {name:'Latino Ceram',names:['latinoceram','latinoceramlattes','latinocerammontpellier']},
  {name:'Carrelage du Monde',names:['carrelagedumonde','carrelagesdumonde']},
  {name:'Mondial Marbre',names:['mondialmarbre','mondialmarbres','mondialmarbremarseille']},
  {name:'Mondial Carrelage',names:['mondialcarrelage','mondialcarrelages','mondialcarrelagesvendargues']}
];
const active=client=>client.archived!==true&&client.archive!==true&&String(client.codeClient||'').toUpperCase()!=='LRF-00001';
const company=client=>normalize(client.societe||client.entreprise||client.nom);
function resolveTargets(rows){
  const selected=targets.map(target=>{
    const matches=rows.filter(client=>active(client)&&target.names.includes(company(client)));
    if(matches.length!==1){
      const candidates=rows.filter(client=>active(client)&&target.names.some(name=>company(client).includes(name)||name.includes(company(client)))&&company(client))
        .map(client=>({societe:client.societe||client.entreprise||client.nom,ville:client.ville||''}));
      throw Error(JSON.stringify({target:target.name,exactMatches:matches.length,candidates}));
    }
    return {target,client:matches[0]};
  });
  if(new Set(selected.map(row=>row.client.id)).size!==targets.length)throw Error('Les quatre clients doivent être distincts.');
  return selected;
}
async function grant(db,FieldValue){
  const {depFromCp,eligibleProClient}=require('../functions/pro-client-access.cjs');
  const snapshot=await db.collection('clients').select('societe','entreprise','nom','ville','archived','archive','codeClient').get();
  const selected=resolveTargets(snapshot.docs.map(doc=>({...doc.data(),id:doc.id})));
  await db.runTransaction(async transaction=>{
    const records=[];
    for(const row of selected){
      const ref=db.collection('clients').doc(row.client.id),doc=await transaction.get(ref);
      if(!doc.exists)throw Error('Client absent : '+row.target.name);
      const client=doc.data();
      if(!active(client)||!row.target.names.includes(company(client)))throw Error('Fiche modifiée : '+row.target.name);
      const dep=client.departement||depFromCp(client.codePostal||client.code_postal);
      if(!eligibleProClient(client,dep))throw Error('Accès PRO inactif ou incomplet : '+row.target.name);
      if(client.partenaires!==undefined&&!Array.isArray(client.partenaires))throw Error('Partenaires invalides : '+row.target.name);
      records.push({ref});
    }
    for(const row of records)transaction.update(row.ref,{partenaires:FieldValue.arrayUnion('saxso')});
  });
  const verified=[];
  for(const row of selected){
    const doc=await db.collection('clients').doc(row.client.id).get();
    if(!doc.data()?.partenaires?.includes('saxso'))throw Error('Vérification impossible : '+row.target.name);
    // No account codes, departments, contact details or other permissions in logs.
    verified.push({client:row.target.name,saxsoAuthorized:true});
  }
  return verified;
}
if(require.main===module){
  if(process.env.CRM_SAXSO_GRANT_MODE!=='requested-four-clients')throw Error('Mode de maintenance non défini.');
  const admin=require('../functions/node_modules/firebase-admin');
  admin.initializeApp({projectId:'le-roy-factory'});
  grant(admin.firestore(),admin.firestore.FieldValue).then(result=>console.log('SAXSO_ACCESS_VERIFIED '+JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={normalize,targets,resolveTargets,grant};
