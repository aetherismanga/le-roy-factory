import { reportField } from '../assets/js/crm-report-core.mjs';
import { reportPartners } from '../assets/js/crm-report-partners.mjs';
import { hash, planKey, reportHash, separateReport } from './crm-report-split-core.mjs';
const fields=['comptes_rendus','comptesRendus'];
function records(path,data) {
  return path.startsWith('clients/') ? fields.flatMap(field=>(Array.isArray(data[field])?data[field]:[]).filter(raw=>raw&&typeof raw==='object').map(raw=>({field,raw}))) : [{field:null,raw:data}];
}
export async function migrateReportSeparation(db, plans, {at=new Date().toISOString()}={}) {
  const snapshots=await Promise.all(['clients','comptes_rendus'].map(name=>db.collection(name).get()));
  const docs=snapshots.flatMap(snapshot=>snapshot.docs), paths=new Map(docs.map(doc=>[hash(doc.ref.path),doc.ref.path]));
  // Resolve every source, destination and text range before the first mutation.
  for(const doc of docs)for(const {raw} of records(doc.ref.path,doc.data())) {
    const key=planKey(doc.ref.path,raw), plan=plans[key];
    if(reportPartners(raw).length>1&&!plan)throw Error('An unreviewed multi-factory report remains; no migration was started.');
    if(plan) {
      if(hash(doc.ref.path)!==plan.sourcePathHash)throw Error('Reviewed source mismatch.');
      for(const part of separateReport(raw,plan,key,at))if(!paths.has(part.targetPathHash))throw Error('Reviewed target client is missing.');
    }
  }
  let applied=0,skipped=0,outputs=0;
  for(const [key,plan] of Object.entries(plans)) {
    const sourcePath=paths.get(plan.sourcePathHash);
    if(!sourcePath)throw Error('Source client is missing.');
    const targetPaths=[...new Set([sourcePath,...plan.parts.map(part=>paths.get(part.targetPathHash||plan.sourcePathHash))])];
    if(targetPaths.some(path=>!path))throw Error('Target client is missing.');
    const result=await db.runTransaction(async tx=>{
      const refs=targetPaths.map(path=>db.doc(path)),archiveRef=db.collection('crm_report_archives').doc('factory-split-'+key);
      const [current,archive]=await Promise.all([Promise.all(refs.map(ref=>tx.get(ref))),tx.get(archiveRef)]);
      if(current.some(doc=>!doc.exists))throw Error('A client was removed while the report was being separated.');
      const source=current[targetPaths.indexOf(sourcePath)].data();
      const matches=records(sourcePath,source).filter(({raw})=>planKey(sourcePath,raw)===key);
      if(!matches.length)return false;
      if(archive.exists)throw Error('This archived source was reintroduced; refusing duplicate separation.');
      // A reviewed report must occur at most once per mirror field.
      if(new Set(matches.map(match=>match.field)).size!==matches.length)throw Error('Ambiguous duplicate source report.');
      const raw=matches[0].raw;
      if(reportHash(raw)!==plan.originalHash)throw Error('The report changed after review.');
      const separated=separateReport(raw,plan,key,at), patches=new Map();
      if(!sourcePath.startsWith('clients/'))throw Error('Global campaign separation needs a dedicated reviewed migration.');
      const local=separated.filter(part=>paths.get(part.targetPathHash)===sourcePath).map(part=>part.report);
      const sourcePatch={};
      for(const field of fields)if(Array.isArray(source[field]))sourcePatch[field]=source[field].flatMap(report=>planKey(sourcePath,report)===key?local:[report]);
      patches.set(sourcePath,sourcePatch);
      for(const path of targetPaths.filter(path=>path!==sourcePath)) {
        const target=current[targetPaths.indexOf(path)].data();
        const incoming=separated.filter(part=>paths.get(part.targetPathHash)===path).map(part=>{
          const report={...part.report};
          for(const [field,value] of Object.entries({societe:target.societe,ville:target.ville,codePostal:target.codePostal||target.code_postal,adresseSociete:target.adresse||target.adresseSociete}))if(value!==undefined&&Object.hasOwn(report,field))report[field]=value;
          return report;
        });
        const patch={};
        const targetFields=fields.filter(field=>Array.isArray(target[field]));
        for(const field of targetFields.length?targetFields:[reportField(target)])patch[field]=[...(target[field]||[]),...incoming];
        patches.set(path,patch);
      }
      // Original and destination histories are archived in the same transaction.
      tx.set(archiveRef,{kind:'factory-report-separation',version:'20261110-single1',sourcePath,original:raw,createdAt:at,
        before:current.map((doc,i)=>({path:targetPaths[i],reports:Object.fromEntries(fields.filter(field=>Array.isArray(doc.data()[field])).map(field=>[field,doc.data()[field]]))})),
        outputs:separated.map(part=>({path:paths.get(part.targetPathHash),id:part.report.id,usine:part.report.usine}))});
      for(const [path,patch]of patches)tx.update(db.doc(path),patch);
      return true;
    });
    if(result){applied++;outputs+=plan.parts.length;}else skipped++;
  }
  const verified=(await Promise.all(['clients','comptes_rendus'].map(name=>db.collection(name).get()))).flatMap(snapshot=>snapshot.docs);
  let remaining=0;const seen=new Map();
  for(const doc of verified)for(const {raw}of records(doc.ref.path,doc.data())){
    if(reportPartners(raw).length>1)remaining++;
    if(raw.splitPlanId&&plans[raw.splitPlanId]){
      if(!seen.has(raw.splitPlanId))seen.set(raw.splitPlanId,new Set());
      seen.get(raw.splitPlanId).add(doc.ref.path+'\n'+raw.usine+'\n'+raw.id);
    }
  }
  if(remaining)throw Error('Multi-factory reports remain after the migration.');
  for(const [key,plan]of Object.entries(plans))if(seen.get(key)?.size!==plan.parts.length)throw Error('Separated output verification failed.');
  return{reviewed:Object.keys(plans).length,applied,alreadySeparated:skipped,createdFactoryReports:outputs,remainingMultiFactoryReports:remaining};
}
