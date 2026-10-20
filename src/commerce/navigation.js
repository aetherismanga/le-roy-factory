export const RANDAL_RETURN_URL='https://leroyfactory.fr/configurateurs-randal.html';

export function returnToRandal(){
 try{window.top.location.href=RANDAL_RETURN_URL;}catch{window.location.assign(RANDAL_RETURN_URL);}
}

// Use the same three choices in the guided journey and in the full workshop.
// A failed save keeps the project open; cancelling never changes its data.
export function createProjectNavigation({getProject,save}){
 const style=document.createElement('style');
 style.textContent=`.quit-configurator{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:8px 12px;border:1px solid #c9c7ba;border-radius:8px;background:#fffef9;color:#343b32;font:600 11px/1.2 Arial,sans-serif;text-decoration:none;white-space:nowrap;touch-action:manipulation}.quit-configurator:focus-visible{outline:3px solid #9b815c;outline-offset:3px}.project-leave-dialog{width:470px;max-width:calc(100% - 28px);max-height:calc(100dvh - 28px);padding:30px;border:1px solid #ded9cc;border-radius:18px;background:#fffef9;color:#292c28;box-shadow:0 24px 100px #17231d40;overflow:auto}.project-leave-dialog::backdrop{background:#17231d80;backdrop-filter:blur(6px)}.project-leave-dialog .leave-eyebrow{font:600 9px Arial,sans-serif;letter-spacing:2px;color:#8d7958;margin:0 0 15px}.project-leave-dialog h2{font:400 30px/1.14 Georgia,serif;letter-spacing:-.6px;margin:0 0 14px}.project-leave-dialog p{font:13px/1.65 Arial,sans-serif;color:#6a6d62}.project-leave-dialog .leave-project{font-weight:600;color:#333b30;overflow-wrap:anywhere}.leave-actions{display:grid;gap:9px;margin-top:22px}.leave-actions button{width:100%;min-height:46px;border:1px solid #d1d4c6;border-radius:9px;padding:12px 14px;background:#fffef9;color:#343b32;font:600 12px Arial,sans-serif;cursor:pointer}.leave-actions [data-leave-save]{background:#293a2f;border-color:#293a2f;color:white}.leave-actions [data-leave-cancel]{border-color:transparent;background:transparent;font-weight:400}.leave-actions button:disabled{opacity:.5;cursor:wait}.leave-status:empty{display:none}.project-leave-dialog .leave-status{color:#995427;font-size:12px}@media(max-width:760px){.project-leave-dialog{padding:24px}.project-leave-dialog h2{font-size:27px}.quit-configurator{font-size:10px;padding:7px 9px}}`;
 document.head.append(style);
 const dialog=document.createElement('dialog');dialog.id='project-leave-dialog';dialog.className='project-leave-dialog';dialog.setAttribute('aria-labelledby','project-leave-title');dialog.setAttribute('aria-describedby','project-leave-description');
 dialog.innerHTML='<p class="leave-eyebrow">VOTRE PROJET RANDAL</p><h2 id="project-leave-title">Enregistrer votre projet ?</h2><p class="leave-project"></p><p id="project-leave-description"></p><div class="leave-actions"><button type="button" data-leave-save>Enregistrer et continuer</button><button type="button" data-leave-discard>Continuer sans enregistrer</button><button type="button" data-leave-cancel>Annuler</button></div><p class="leave-status" role="status" aria-live="polite"></p>';
 document.body.append(dialog);
 const status=dialog.querySelector('.leave-status'),buttons=[...dialog.querySelectorAll('button')];let pending=null,busy=false;
 function cancel(){if(busy)return;const task=pending;pending=null;dialog.close();task?.resolve(false);}
 async function continueProject(shouldSave){
  if(!pending||busy)return;busy=true;buttons.forEach(b=>b.disabled=true);status.textContent='';
  try{
   if(shouldSave&&await save(getProject())===false)throw Error('La sauvegarde n’a pas abouti. Votre projet reste ouvert.');
   const task=pending;pending=null;dialog.close();task.action();task.resolve(true);
  }catch(e){status.textContent=e.message||'Enregistrement impossible. Votre projet reste ouvert.';}
  finally{busy=false;buttons.forEach(b=>b.disabled=false);}
 }
 dialog.querySelector('[data-leave-save]').onclick=()=>continueProject(true);
 dialog.querySelector('[data-leave-discard]').onclick=()=>continueProject(false);
 dialog.querySelector('[data-leave-cancel]').onclick=cancel;
 dialog.addEventListener('cancel',e=>{e.preventDefault();cancel();});
 function request(action,kind='exit'){
  if(pending)return pending.promise;
  const project=getProject();if(!project){action();return Promise.resolve(true);}
  dialog.querySelector('.leave-project').textContent=project.title||'Ma salle de bains';
  dialog.querySelector('#project-leave-description').textContent=kind==='new'?'Avant de commencer une nouvelle composition, souhaitez-vous enregistrer ce projet sur cet appareil ?':'Avant de retourner sur RANDAL, souhaitez-vous enregistrer ce projet sur cet appareil ?';
  status.textContent='';const promise=new Promise(resolve=>{pending={action,resolve};});pending.promise=promise;dialog.showModal();return promise;
 }
 const quit=document.querySelector('#quit-configurator');if(quit)quit.onclick=e=>{e.preventDefault();request(returnToRandal);};
 return {request};
}
