// Charge le coeur historique des statistiques et ajoute les situations ELIOS et VIEW juillet/août 2026.
// Le coeur est archivé séparément pour garder ces mises à jour petites et réversibles.
const coreUrl=new URL('./statistiques-core.js?v=20260903-elios-aout2',import.meta.url);
let source=await fetch(coreUrl,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`Chargement statistiques impossible (${r.status})`);return r.text()});

const oldEliosImport="import { ELIOS_STATS_CLIENTS } from './statistiques-elios-data.js';";
const newEliosImports="import { ELIOS_STATS_CLIENTS as ELIOS_STATS_CLIENTS_2026_08 } from './statistiques-elios-data.js';\nimport { ELIOS_STATS_CLIENTS as ELIOS_STATS_CLIENTS_2026_07 } from './statistiques-elios-juillet-2026-archive.js';";
const oldEliosBranch="if(partner==='elios-ceramica'&&key==='2026-07')return ELIOS_STATS_CLIENTS.map(r=>({...r,factory:r.elios,partner}));";
const newEliosBranches="if(partner==='elios-ceramica'&&key==='2026-07')return ELIOS_STATS_CLIENTS_2026_07.map(r=>({...r,factory:r.elios,partner}));\n  if(partner==='elios-ceramica'&&key==='2026-08')return ELIOS_STATS_CLIENTS_2026_08.map(r=>({...r,factory:r.elios,partner}));";

const oldViewImport="import { VIEW_STATS_CLIENTS_2026_07 } from './statistiques-view-data.js';";
const newViewImports="import { VIEW_STATS_CLIENTS_2026_08 } from './statistiques-view-data.js';\nimport { VIEW_STATS_CLIENTS_2026_07 } from './statistiques-view-juillet-2026-archive.js';";
const oldViewBranch="if(partner==='view-ceramica'&&key==='2026-07')return VIEW_STATS_CLIENTS_2026_07.map(r=>({...r,partner}));";
const newViewBranches="if(partner==='view-ceramica'&&key==='2026-07')return VIEW_STATS_CLIENTS_2026_07.map(r=>({...r,partner}));\n  if(partner==='view-ceramica'&&key==='2026-08')return VIEW_STATS_CLIENTS_2026_08.map(r=>({...r,partner}));";

if(!source.includes(oldEliosImport)||!source.includes(oldEliosBranch)||!source.includes(oldViewImport)||!source.includes(oldViewBranch))throw new Error('Version du coeur statistiques inattendue');
source=source
  .replace(oldEliosImport,newEliosImports)
  .replace(oldEliosBranch,newEliosBranches)
  .replace(oldViewImport,newViewImports)
  .replace(oldViewBranch,newViewBranches);

const moduleBase=new URL('./',coreUrl);
source=source.replace(/from\s+(['"])(\.\/[^'"]+)\1/g,(_m,q,rel)=>`from ${q}${new URL(rel,moduleBase).href}${q}`);
const blobUrl=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
try{await import(blobUrl)}finally{setTimeout(()=>URL.revokeObjectURL(blobUrl),0)}
