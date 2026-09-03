// Charge le coeur historique des statistiques et ajoute les situations ELIOS juillet/août 2026.
// Le coeur est archivé séparément pour garder cette mise à jour petite et réversible.
const coreUrl=new URL('./statistiques-core.js?v=20260903-elios-aout2',import.meta.url);
let source=await fetch(coreUrl,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`Chargement statistiques impossible (${r.status})`);return r.text()});
const oldImport="import { ELIOS_STATS_CLIENTS } from './statistiques-elios-data.js';";
const newImports="import { ELIOS_STATS_CLIENTS as ELIOS_STATS_CLIENTS_2026_08 } from './statistiques-elios-data.js';\nimport { ELIOS_STATS_CLIENTS as ELIOS_STATS_CLIENTS_2026_07 } from './statistiques-elios-juillet-2026-archive.js';";
const oldBranch="if(partner==='elios-ceramica'&&key==='2026-07')return ELIOS_STATS_CLIENTS.map(r=>({...r,factory:r.elios,partner}));";
const newBranches="if(partner==='elios-ceramica'&&key==='2026-07')return ELIOS_STATS_CLIENTS_2026_07.map(r=>({...r,factory:r.elios,partner}));\n  if(partner==='elios-ceramica'&&key==='2026-08')return ELIOS_STATS_CLIENTS_2026_08.map(r=>({...r,factory:r.elios,partner}));";
if(!source.includes(oldImport)||!source.includes(oldBranch))throw new Error('Version du coeur statistiques inattendue');
source=source.replace(oldImport,newImports).replace(oldBranch,newBranches);
const moduleBase=new URL('./',coreUrl);
source=source.replace(/from\s+(['"])(\.\/[^'"]+)\1/g,(_m,q,rel)=>`from ${q}${new URL(rel,moduleBase).href}${q}`);
const blobUrl=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
try{await import(blobUrl)}finally{setTimeout(()=>URL.revokeObjectURL(blobUrl),0)}
