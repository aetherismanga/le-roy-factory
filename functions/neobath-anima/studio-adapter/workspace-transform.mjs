// Keep Studio One's actual project dialogs, cards, import/export and controls.
// Add the private Anima storage transport without changing their interface.
function once(source,needle,replacement){if(!source.includes(needle))throw Error('Studio One workspace contract changed: '+needle.slice(0,70));return source.replace(needle,replacement);}
export function transformWorkspace(source){
  source=once(source,"const VARIANT='studio-one';","const VARIANT='neobath-anima';");
  source=once(source,"const owner=()=>account?.client?.codeClient||account?.client?.email||'';","const owner=()=>account?.client?(account.isAdmin?'neobath-anima-team':account.client.codeClient):'';");
  source=once(source,"status('Projet enregistré sur cet appareil.');lock();return r;",`try {
    const snapshot=clone(r),result=await projectRequest('save',{record:snapshot}),server=result.record||result.project;
    if(!server)throw Error('Le serveur n’a pas confirmé la sauvegarde.');
    const current=readProjects().find(p=>p.id===snapshot.id);
    const same=current&&JSON.stringify({data:current.data,title:current.title,customer:current.customer})===JSON.stringify({data:snapshot.data,title:snapshot.title,customer:snapshot.customer});
    r={...server,...(!same&&current?{data:current.data,title:current.title,customer:current.customer,date:current.date,dirty:true}:{}),remote:true,ownerKey:owner(),syncedFingerprint:JSON.stringify({data:server.data,title:server.title,customer:server.customer})};
    putProject(r);status('Projet enregistré · disponible pour Jérôme et Coryne.');
  }catch(error){status('Projet conservé sur cet appareil. '+error.message);}
  lock();return r;`);
  source=once(source,"async function refreshCloud(){lock();return readProjects();}",`async function refreshCloud(){
    const result=await projectRequest('list',{}),removed=new Set(result.deletedIds||[]);
    const local=readProjects().filter(r=>!removed.has(r.id)),records=new Map(local.map(r=>[r.id,r]));
    for(const remote of result.projects||[]){
      const old=records.get(remote.id),fingerprint=old&&JSON.stringify({data:old.data,title:old.title,customer:old.customer});
      const changed=old&&old.syncedFingerprint&&old.syncedFingerprint!==fingerprint;
      if(old&&changed){records.set(remote.id,{...old,remote:true,ownerKey:owner(),conflict:(remote.revision||0)>(old.revision||0),serverCopy:remote});}
      else records.set(remote.id,{...remote,remote:true,dirty:false,ownerKey:owner(),syncedFingerprint:JSON.stringify({data:remote.data,title:remote.title,customer:remote.customer})});
    }
    localStorage.setItem(SAVED_KEY,JSON.stringify([...records.values()].sort((a,b)=>String(b.updatedAt||b.date).localeCompare(String(a.updatedAt||a.date)))));
    lock();return readProjects();
  }`);
  source=once(source,"async function showProjects(refresh=true){checkpoint();modal(","async function showProjects(refresh=true){checkpoint();if(refresh){try{await refreshCloud();}catch(error){status('Les projets en ligne sont indisponibles. Vos copies locales restent accessibles.');}}modal(");
  source=once(source,"if(r.status!=='draft')throw Error('Un projet validé ne peut pas être supprimé.');localStorage.setItem(SAVED_KEY,",`if(r.status!=='draft')throw Error('Un projet validé ne peut pas être supprimé.');if(r.remote||r.revision>0)await projectRequest('delete',{id:r.id,revision:r.revision||0});localStorage.setItem(SAVED_KEY,`);
  // The saved RANDAL example gallery is not an Anima composition.
  source=once(source,"publicButton.dataset.publicCompositions='true';","publicButton.dataset.publicCompositions='true';publicButton.hidden=true;");
  return source;
}
