'use strict';
// One explicit, reviewed import. No deployment, user creation or rule changes.
const admin=require('firebase-admin');
const {decodeReport,mergeReport}=require('../seo-report-core.cjs');
const {verifiedAgentClaims}=require('../agent-policy.cjs');
async function main(){
 const incoming=decodeReport(process.env.SEO_REPORT_GZIP_BASE64);
 admin.initializeApp({projectId:'le-roy-factory'});
 for(const email of ['jerome@leroyfactory.fr','coryne@leroyfactory.fr']){
  const u=await admin.auth().getUserByEmail(email);
  if(u.disabled||!verifiedAgentClaims({uid:u.uid,email:u.email,email_verified:u.emailVerified,...u.customClaims}))throw Error('Existing verified agent role required before import.');
 }
 const db=admin.firestore(),ref=db.collection('parametres').doc('seoSearchConsole');
 await db.runTransaction(async transaction=>{
  const snapshot=await transaction.get(ref);
  const merged=mergeReport(snapshot.exists?snapshot.data():{},incoming);
  transaction.set(ref,{...merged,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
 });
 console.log('Verified Google Search Console history saved in the protected agent settings. No CRM record, permission or site function changed.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
