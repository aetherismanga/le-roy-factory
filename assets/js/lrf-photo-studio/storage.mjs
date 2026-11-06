export const PROJECT_SCHEMA_VERSION=1;
const DATABASE='lrf-photo-studio',STORE='projects',KEY='current';
function dbOpen(){return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(new Error('Le stockage local est indisponible dans ce navigateur.'));
  const request=indexedDB.open(DATABASE,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('Le stockage local est refusé.'));
  request.onblocked=()=>reject(new Error('Fermez les autres onglets Photo Studio pour reprendre la sauvegarde.'));
});}
async function transaction(mode,action){const db=await dbOpen();return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let result;
  try{const request=action(store);request.onsuccess=()=>{result=request.result;};}catch(error){db.close();reject(error);return;}
  tx.oncomplete=()=>{db.close();resolve(result);};
  tx.onerror=tx.onabort=()=>{const error=tx.error;db.close();reject(new Error(error?.name==='QuotaExceededError'?'L’espace disponible sur cet appareil est insuffisant. Enregistrez votre image puis supprimez l’ancien projet.':'La sauvegarde sur cet appareil est indisponible. Vous pouvez toujours enregistrer votre image.'));};
});}
export function validateProject(project){
  if(!project||project.schemaVersion!==PROJECT_SCHEMA_VERSION)throw new Error('Cette sauvegarde utilise une version de projet incompatible.');
  if(!(project.sourceBlob instanceof Blob))throw new Error('La photo de cette sauvegarde est manquante.');
  return project;
}
export async function saveProject(project){const value={...project,schemaVersion:PROJECT_SCHEMA_VERSION,savedAt:new Date().toISOString()};validateProject(value);await transaction('readwrite',store=>store.put(value,KEY));return value.savedAt;}
export async function loadProject(){const value=await transaction('readonly',store=>store.get(KEY));return value?validateProject(value):null;}
export async function deleteProject(){await transaction('readwrite',store=>store.delete(KEY));}
